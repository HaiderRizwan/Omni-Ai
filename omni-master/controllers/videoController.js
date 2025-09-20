const axios = require('axios');
const Video = require('../models/Video');
const AvatarVideo = require('../models/AvatarVideo'); // New model for avatar videos
const Avatar = require('../models/Avatar');
const Render = require('../models/Render');

const A2E_API_KEY = process.env.A2E_API_KEY;
const A2E_VIDEO_BASE_URL = process.env.A2E_VIDEO_BASE_URL || 'https://video.a2e.ai/api/v1';
const A2E_API_BASE_URL = process.env.A2E_API_BASE_URL || 'https://api.a2e.ai/api/v1';

// Multiple fallback URLs for video generation
const getVideoFallbackUrls = () => [
  'https://video.a2e.ai/api/v1',
  'https://video.a2e.com.cn/api/v1',
  'https://api.a2e.ai/api/v1',
  'https://api.avatar2everyone.com/api/v1'
];

// Helper function to get available voices
const getDefaultVoiceId = async () => {
  try {
    const response = await axios.get(`${A2E_VIDEO_BASE_URL}/anchor/voice_list?country=en&region=US&voice_map_type=en-US`, {
      headers: { 'Authorization': `Bearer ${A2E_API_KEY}` }
    });
    
    if (response.data.code === 0 && response.data.data && response.data.data.length > 0) {
      // Find first available voice from the nested structure
      for (const genderGroup of response.data.data) {
        if (genderGroup.children && genderGroup.children.length > 0) {
          return genderGroup.children[0].value; // Return first voice ID
        }
      }
    }
  } catch (error) {
    console.warn('Could not fetch voice list:', error.message);
  }
  
  // Fallback to a common voice ID
  return '66dc61ec5148817d26f5b79e'; // Alice voice ID from documentation
};

const generateTtsAudio = async (script, voiceId = null) => {
  // Use the documented video TTS endpoint
  const ttsPayload = {
    msg: script,
    country: 'en',
    region: 'US',
    speechRate: 1.0
  };
  
  // Add voice ID if provided (for custom voice clones), otherwise get default TTS
  if (voiceId) {
    ttsPayload.user_voice_id = voiceId;
  } else {
    // Get a default TTS voice ID
    const defaultVoiceId = await getDefaultVoiceId();
    ttsPayload.tts_id = defaultVoiceId;
  }
  
  const ttsResponse = await axios.post(`${A2E_VIDEO_BASE_URL}/video/send_tts`, ttsPayload, { 
    headers: { 'Authorization': `Bearer ${A2E_API_KEY}`, 'Content-Type': 'application/json' } 
  });

  if (ttsResponse.data.code !== 0) {
    console.error('A2E TTS API Error:', ttsResponse.data);
    throw new Error(`A2E TTS Error: ${ttsResponse.data.message || JSON.stringify(ttsResponse.data)}`);
  }
  // The data field directly contains the audio URL string
  return ttsResponse.data.data;
};

const processRenderJob = async (renderId) => {
  const render = await Render.findById(renderId).populate('avatar');
  try {
    if (!render) throw new Error('Render job not found');

    console.log('Processing render job:', renderId);
    console.log('Avatar metadata:', render.avatar.metadata);

    // Validate avatar has required A2E metadata
    if (!render.avatar.metadata || !render.avatar.metadata.a2eAnchorId) {
      throw new Error('Avatar is not A2E-compatible (missing a2eAnchorId)');
    }

    // Step 1: Generate TTS audio
    await render.updateOne({ status: 'tts_done' });
    const audioSrc = await generateTtsAudio(render.script, render.voiceId);
    await render.updateOne({ tts_url: audioSrc });
    console.log('TTS generated:', audioSrc);

    // Step 2: Generate video with A2E
    await render.updateOne({ status: 'a2e_started' });
    
    const videoPayload = {
      title: render.title || `Video ${Date.now()}`,
      anchor_id: render.avatar.metadata.a2eAnchorId,
      anchor_type: 1, // Custom avatar
      audioSrc: audioSrc,
      resolution: 1080,
      isSkipRs: true,
      isCaptionEnabled: false
    };
    
    console.log('Video generation payload:', videoPayload);
    
    const videoResponse = await axios.post(`${A2E_VIDEO_BASE_URL}/video/generate`, videoPayload, { 
      headers: { 'Authorization': `Bearer ${A2E_API_KEY}`, 'Content-Type': 'application/json' } 
    });

    if (videoResponse.data.code !== 0) {
      console.error('A2E video generation error:', videoResponse.data);
      throw new Error(`A2E video gen error: ${videoResponse.data.message || JSON.stringify(videoResponse.data)}`);
    }
    
    const a2eTaskId = videoResponse.data.data._id || videoResponse.data.data.task_id;
    console.log('A2E video task started:', a2eTaskId);
    
    await render.updateOne({ provider_job_id: a2eTaskId, status: 'rendering' });

    // Start polling for results
    pollForVideoResult(renderId, a2eTaskId);

  } catch (error) {
    console.error(`Error processing render ${renderId}:`, { 
      status: error.response?.status, 
      data: error.response?.data, 
      message: error.message 
    });
    if(render) await render.updateOne({ status: 'failed', error: { message: error.message } });
  }
};

const pollForVideoResult = async (renderId, a2eTaskId) => {
  const render = await Render.findById(renderId);
  try {
    console.log(`Starting to poll for video result. Render: ${renderId}, Task: ${a2eTaskId}`);
    
    for (let i = 0; i < 120; i++) { // Poll for up to 20 minutes
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds between polls
      
      let taskData;
      try {
        // Try the awsResult endpoint first (more reliable)
        const response = await axios.post(`${A2E_VIDEO_BASE_URL}/video/awsResult`, 
          { _id: a2eTaskId }, 
          { headers: { 'Authorization': `Bearer ${A2E_API_KEY}`, 'Content-Type': 'application/json' } }
        );
        taskData = response.data.data;
        console.log(`Poll ${i + 1}: Task status:`, taskData.status || taskData.current_status);
      } catch (e) {
        console.warn(`Poll ${i + 1}: Error checking status:`, e.message);
        // Try alternative endpoint if awsResult fails
        try {
          const fallback = await axios.get(`${A2E_VIDEO_BASE_URL}/video/task_info?task_id=${a2eTaskId}`, { 
            headers: { 'Authorization': `Bearer ${A2E_API_KEY}` } 
          });
        taskData = fallback.data.data;
        } catch (e2) {
          console.warn(`Poll ${i + 1}: Both endpoints failed:`, e2.message);
          continue; // Skip this poll iteration
        }
      }

      const status = taskData.status || taskData.current_status;
      
      if (status === 'completed') {
        console.log('Video generation completed!');
        await render.updateOne({ status: 'compositing' });
        
        const resultUrl = taskData.result || taskData.url || taskData.video_url || taskData.videoUrl;
        if (!resultUrl) {
          throw new Error('Video completed but no result URL found');
        }
        
        console.log('Video result URL:', resultUrl);
        const video = await Video.create({ 
          user: render.user, 
          render: render._id, 
          url_master: resultUrl, 
          provider: 'a2e',
          metadata: {
            a2eTaskId: a2eTaskId,
            generatedAt: new Date()
          }
        });
        
        await render.updateOne({ status: 'succeeded', video_url_master: video.url_master });
        console.log(`Video generation completed for render ${renderId}`);
        return;
        
      } else if (status === 'failed') {
        const errorMsg = taskData.error || taskData.failed_message || taskData.message || 'unknown error';
        console.error('A2E task failed:', errorMsg);
        throw new Error(`A2E task failed: ${errorMsg}`);
        
      } else if (status === 'processing' || status === 'queued' || status === 'initialized') {
        // Still processing, continue polling
        continue;
      } else {
        console.log(`Unknown status: ${status}, continuing to poll...`);
      }
    }
    
    throw new Error('Video generation timed out after 20 minutes.');
    
  } catch (error) {
    console.error(`Error polling for render ${renderId}:`, { 
      status: error.response?.status, 
      data: error.response?.data, 
      message: error.message 
    });
    await render.updateOne({ status: 'failed', error: { message: error.message } });
  }
};

module.exports = {
  processRenderJob,
  // Create a video generation job starting from a user's avatar (A2E-compatible)
  // POST /api/videos/generate
  generateVideoFromAvatar: async (req, res) => {
    try {
      console.log('=== VIDEO GENERATION REQUEST ===');
      console.log('Request body:', req.body);
      
      if (!A2E_API_KEY) {
        return res.status(500).json({ success: false, message: 'A2E_API_KEY not configured on server' });
      }

      const { prompt, mainCharacterId, duration, title, voiceId } = req.body || {};

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ success: false, message: 'Prompt (script) is required' });
      }

      if (!mainCharacterId) {
        return res.status(400).json({ success: false, message: 'mainCharacterId (avatar id) is required' });
      }

      const avatar = await Avatar.findOne({ _id: mainCharacterId, user: req.user._id });
      if (!avatar) {
        return res.status(404).json({ success: false, message: 'Avatar not found for this user' });
      }

      console.log('Avatar found:', {
        id: avatar._id,
        metadata: avatar.metadata
      });

      if (!avatar.metadata || !avatar.metadata.a2eAnchorId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Selected avatar is not A2E-compatible (missing a2eAnchorId). Please create a new avatar or migrate existing ones.' 
        });
      }

      // Create a render record that drives the background pipeline
      const render = await Render.create({
        user: req.user._id,
        avatar: avatar._id,
        script: prompt,
        title: title || `Video ${Date.now()}`,
        voiceId: voiceId || null,
        status: 'queued',
        metadata: {
          duration: Math.min(Math.max(parseInt(duration || 30, 10), 5), 300), // 5 sec to 5 min
          createdAt: new Date()
        }
      });

      console.log('Render job created:', render._id);

      // Fire-and-forget background processing
      setImmediate(() => processRenderJob(render._id));

      return res.status(202).json({
        success: true,
        message: 'Avatar video generation started',
        data: { 
          jobId: String(render._id), 
          estimatedSeconds: Math.min(Math.max(parseInt(duration || 30, 10), 30), 180),
          avatarId: mainCharacterId,
          script: prompt
        }
      });
    } catch (error) {
      console.error('Error creating avatar video job:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create avatar video job',
        error: error.message 
      });
    }
  },

  // Get job status compatible with AvatarVideoCreator polling
  // GET /api/videos/job/:jobId
  getVideoJob: async (req, res) => {
    try {
      const { jobId } = req.params;
      const render = await Render.findOne({ _id: jobId, user: req.user._id });
      if (!render) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }

      if (render.status === 'succeeded') {
        return res.json({
          success: true,
          data: {
            id: String(render._id),
            status: 'completed',
            results: [{ url: render.video_url_master }]
          }
        });
      }

      if (render.status === 'failed') {
        return res.json({
          success: true,
          data: {
            id: String(render._id),
            status: 'failed',
            error: render.error || { message: 'Render failed' }
          }
        });
      }

      // Any other state is still processing
      return res.json({
        success: true,
        data: {
          id: String(render._id),
          status: 'processing'
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch job status' });
    }
  },

  // Generate video from avatar with text using A2E API
  generateAvatarVideo: async (req, res) => {
    try {
      console.log('=== AVATAR VIDEO GENERATION START ===');
      console.log('Request body:', req.body);
      console.log('Has file:', !!req.file);
      
      const { avatarId, script, voiceId, title, options = {} } = req.body;
      const audioFile = req.file; // For audio upload mode

      if (!avatarId || !script) {
        return res.status(400).json({
          success: false,
          message: 'Avatar ID and script are required'
        });
      }

      // Parse options if it's a string (from FormData)
      let parsedOptions = options;
      if (typeof options === 'string') {
        try {
          parsedOptions = JSON.parse(options);
        } catch (e) {
          parsedOptions = {};
        }
      }

      // Get avatar details
      const avatar = await Avatar.findOne({ _id: avatarId, user: req.user._id });
      if (!avatar) {
        return res.status(404).json({
          success: false,
          message: 'Avatar not found'
        });
      }

      // Check if avatar has A2E anchor ID
      const a2eAnchorId = avatar.metadata?.a2eAnchorId;
      if (!a2eAnchorId) {
        return res.status(400).json({
          success: false,
          message: 'Avatar is not compatible with video generation. Please create a new avatar.'
        });
      }

      // Determine audio mode
      const audioMode = audioFile ? 'upload' : 'tts';
      
      if (audioMode === 'tts' && !voiceId) {
        return res.status(400).json({
          success: false,
          message: 'Voice ID is required for text-to-speech mode'
        });
      }

      // Create video generation job
      const video = await AvatarVideo.create({
        user: req.user._id,
        title: title || `Video from ${avatar.originalPrompt || 'Avatar'}`,
        script: script,
        avatar: avatarId,
        status: 'processing',
        metadata: {
          a2eAnchorId,
          audioMode,
          voiceId: voiceId || null,
          options: parsedOptions,
          audioFileName: audioFile?.originalname,
          audioSize: audioFile?.size
        }
      });

      console.log('Video job created:', video._id);
      console.log('Audio mode:', audioMode);

      // Start async processing
      setImmediate(() => processAvatarVideoGeneration(video._id, audioFile));

      res.status(202).json({
        success: true,
        message: 'Avatar video generation started',
        data: {
          jobId: video._id,
          status: 'processing'
        }
      });

    } catch (error) {
      console.error('Avatar video generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start avatar video generation',
        error: error.message
      });
    }
  },

  // Get video generation job status
  getVideoJob: async (req, res) => {
    try {
      const { jobId } = req.params;
      
      const video = await AvatarVideo.findOne({ _id: jobId, user: req.user._id });
      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video job not found'
        });
      }

      res.json({
        success: true,
        data: {
          jobId: video._id,
          status: video.status,
          progress: video.progress || 0,
          videoUrl: video.videoUrl,
          error: video.error,
          createdAt: video.createdAt,
          completedAt: video.completedAt
        }
      });

    } catch (error) {
      console.error('Get video job error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get video job status',
        error: error.message
      });
    }
  },

  // Get voice list for TTS options
  getVoiceList: async (req, res) => {
    try {
      const { country = 'en', region = 'US', voice_map_type = 'en-US' } = req.query;
      
      const fallbackUrls = getVideoFallbackUrls();
      let response = null;
      let lastError = null;

      for (const baseUrl of fallbackUrls) {
        try {
          response = await axios.get(`${baseUrl}/anchor/voice_list`, {
            params: { country, region, voice_map_type },
            headers: { 'Authorization': `Bearer ${A2E_API_KEY}` }
          });
          break;
        } catch (error) {
          console.log(`Voice list endpoint failed: ${baseUrl}`, error.message);
          lastError = error;
        }
      }

      if (!response) {
        throw lastError || new Error('All voice list endpoints failed');
      }

      res.json({
        success: true,
        data: response.data.data || []
      });

    } catch (error) {
      console.error('Get voice list error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch voice list',
        error: error.message
      });
    }
  },

  // Get user's completed videos
  getUserVideos: async (req, res) => {
    try {
      const { page = 1, limit = 10, status = 'all' } = req.query;
      
      const filter = { user: req.user.id };
      if (status !== 'all') {
        filter.status = status;
      }
      
      const videos = await AvatarVideo.find(filter)
        .populate('avatar', 'name imageUrl metadata')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const total = await AvatarVideo.countDocuments(filter);

      res.json({
        success: true,
        data: {
          videos,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('❌ Error fetching user videos:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch videos',
        error: error.message
      });
    }
  },

  // Delete a user's video
  deleteUserVideo: async (req, res) => {
    try {
      const { videoId } = req.params;
      
      const video = await AvatarVideo.findOne({
        _id: videoId,
        user: req.user.id
      });
      
      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }
      
      await AvatarVideo.findByIdAndDelete(videoId);
      
      res.json({
        success: true,
        message: 'Video deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting video:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete video',
        error: error.message
      });
    }
  }
};

// Main async processor for avatar video generation
const processAvatarVideoGeneration = async (videoId, audioFile = null) => {
  console.log('\n🚀 === AVATAR VIDEO GENERATION START ===');
  console.log('Video ID:', videoId);
  console.log('Audio file provided:', !!audioFile);

  let video;
  try {
    video = await AvatarVideo.findById(videoId);
    if (!video) {
      console.log('❌ Video job not found:', videoId);
      return;
    }

    const { script, metadata } = video;
    const { a2eAnchorId, audioMode, voiceId, options = {} } = metadata;

    console.log('📝 Script:', script);
    console.log('🎭 Anchor ID:', a2eAnchorId);
    console.log('🎵 Audio Mode:', audioMode);
    console.log('🎤 Voice ID:', voiceId);

    // Step 1: Get Audio Source
    console.log('\n--- STEP 1: GETTING AUDIO SOURCE ---');
    let audioUrl;
    
    if (audioMode === 'upload' && audioFile) {
      // Upload audio file to A2E or temporary storage
      console.log('📤 Uploading audio file:', audioFile.originalname);
      audioUrl = await uploadAudioToA2E(audioFile);
      console.log('✅ Audio uploaded:', audioUrl);
    } else {
      // Generate TTS Audio
      console.log('🎤 Generating TTS audio...');
      audioUrl = await generateTtsAudioAdvanced(script, voiceId);
      console.log('✅ TTS Audio generated:', audioUrl);
    }

    // Update progress
    video.progress = 30;
    await video.save();

    // Step 2: Generate Video
    console.log('\n--- STEP 2: GENERATING VIDEO ---');
    const videoResult = await generateVideoWithA2E({
      anchorId: a2eAnchorId,
      audioSrc: audioUrl,
      script: script,
      title: video.title,
      options: options
    });

    console.log('✅ Video generation started:', videoResult.taskId);

    // Update progress
    video.progress = 50;
    video.metadata.a2eVideoTaskId = videoResult.taskId;
    video.metadata.audioUrl = audioUrl;
    await video.save();

    // Step 3: Poll for completion
    console.log('\n--- STEP 3: POLLING FOR COMPLETION ---');
    const finalVideoUrl = await pollForVideoCompletion(videoResult.taskId, video);
    console.log('✅ Video generation completed:', finalVideoUrl);

    // Step 4: Update video record
    video.status = 'completed';
    video.videoUrl = finalVideoUrl;
    video.progress = 100;
    video.completedAt = new Date();
    await video.save();

    console.log('✅ Avatar video generation completed successfully!');

  } catch (error) {
    console.error('❌ Avatar video generation failed:', error);
    if (video) {
      video.status = 'failed';
      video.error = error.message;
      video.progress = 0;
      await video.save();
    }
  }
};

// Enhanced TTS generation with fallback URLs
const generateTtsAudioAdvanced = async (script, voiceId = null) => {
  const ttsPayload = {
    msg: script,
    country: 'en',
    region: 'US',
    speechRate: 1.0
  };

  // Add voice ID - use tts_id for public voices (from voice_list API)
  if (voiceId) {
    ttsPayload.tts_id = voiceId; // Public TTS voice from /anchor/voice_list
  } else {
    const defaultVoiceId = await getDefaultVoiceId();
    ttsPayload.tts_id = defaultVoiceId;
  }
  
  console.log('🎤 TTS Payload:', JSON.stringify(ttsPayload, null, 2));

  const fallbackUrls = getVideoFallbackUrls();
  let response = null;
  let lastError = null;

  for (const baseUrl of fallbackUrls) {
    try {
      console.log(`🔄 Trying TTS endpoint: ${baseUrl}/video/send_tts`);
      response = await axios.post(`${baseUrl}/video/send_tts`, ttsPayload, {
        headers: { 'Authorization': `Bearer ${A2E_API_KEY}`, 'Content-Type': 'application/json' }
      });
      console.log('✅ TTS response:', JSON.stringify(response.data, null, 2));
      break;
    } catch (error) {
      console.log(`❌ TTS endpoint failed: ${baseUrl}`, error.response?.data || error.message);
      lastError = error;
    }
  }

  if (!response) {
    throw lastError || new Error('All TTS endpoints failed');
  }

  if (response.data.code !== 0) {
    throw new Error(`TTS generation failed: ${response.data.message || 'Unknown error'}`);
  }

  // The data field directly contains the audio URL string
  const audioUrl = response.data.data;
  if (!audioUrl || typeof audioUrl !== 'string') {
    throw new Error('TTS succeeded but no audio URL returned');
  }

  return audioUrl;
};

// Upload audio file for video generation
const uploadAudioToA2E = async (audioFile) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    // For now, save to local uploads and return URL
    // In production, you might want to upload to A2E directly or use cloud storage
    const uploadsDir = path.join(__dirname, '../uploads/audio');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const fileName = `${Date.now()}_${audioFile.originalname}`;
    const filePath = path.join(uploadsDir, fileName);
    
    fs.writeFileSync(filePath, audioFile.buffer);
    
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const audioUrl = `${baseUrl}/uploads/audio/${fileName}`;
    
    console.log('📁 Audio file saved locally:', audioUrl);
    return audioUrl;
    
  } catch (error) {
    console.error('❌ Audio upload failed:', error);
    throw new Error('Failed to upload audio file');
  }
};

// Poll for video completion with fallback URLs and progress updates
const pollForVideoCompletion = async (taskId, video = null) => {
  const maxAttempts = 120; // 10 minutes with 5-second intervals
  const fallbackUrls = getVideoFallbackUrls();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔄 Polling attempt ${attempt}/${maxAttempts} for task ${taskId}`);
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Update progress
    if (video) {
      const progress = Math.min(50 + (attempt / maxAttempts) * 40, 90); // 50-90%
      video.progress = progress;
      await video.save();
    }

    for (const baseUrl of fallbackUrls) {
      try {
        // Try POST method first (more reliable based on existing code)
        const response = await axios.post(`${baseUrl}/video/awsResult`, 
          { _id: taskId }, 
          { 
            headers: { 
              'Authorization': `Bearer ${A2E_API_KEY}`, 
              'Content-Type': 'application/json' 
            } 
          }
        );

        if (response.data.code === 0) {
          const results = response.data.data;
          if (Array.isArray(results) && results.length > 0) {
            const result = results[0];
            const status = result.status || result.current_status;
            console.log(`📊 Video task status: ${status}`);
            console.log(`🔍 Full result object:`, JSON.stringify(result, null, 2));
            
            // Check for completion - A2E uses 'result' field for the video URL
            const videoUrl = result.result || result.video_url_master || result.video_url || result.videoUrl || result.url;
            if (videoUrl) {
              console.log('✅ Video completed:', videoUrl);
              return videoUrl;
            }
            
            // If status is success but no video URL found, log available fields
            if (status === 'success') {
              console.log('⚠️ Status is success but no video URL found. Available fields:', Object.keys(result));
            }
            
            // Log status progression: init → start → pending → process → copy → success
            if (status === 'fail') {
              throw new Error(`Video generation failed: ${result.error || 'Unknown error'}`);
            }
          }
        }
        break; // Success with this URL, don't try others
      } catch (error) {
        console.log(`Polling POST failed for ${baseUrl}:`, error.message);
        
        // Try GET method as fallback
        try {
          const fallbackResponse = await axios.get(`${baseUrl}/api/v1/video/awsResult?task_id=${taskId}`, {
            headers: { 'Authorization': `Bearer ${A2E_API_KEY}` }
          });
          
          if (fallbackResponse.data.code === 0) {
            const results = fallbackResponse.data.data;
            if (Array.isArray(results) && results.length > 0) {
              const result = results[0];
              const status = result.status || result.current_status;
              console.log(`📊 Video task status (GET fallback): ${status}`);
              console.log(`🔍 Full result object (GET fallback):`, JSON.stringify(result, null, 2));
              
              // Check for completion - A2E uses 'result' field for the video URL
              const videoUrl = result.result || result.video_url_master || result.video_url || result.videoUrl || result.url;
              if (videoUrl) {
                console.log('✅ Video completed (GET fallback):', videoUrl);
                return videoUrl;
              }
              
              // If status is success but no video URL found, log available fields
              if (status === 'success') {
                console.log('⚠️ Status is success but no video URL found. Available fields:', Object.keys(result));
              }
              
              if (status === 'fail') {
                throw new Error(`Video generation failed: ${result.error || 'Unknown error'}`);
              }
            }
          }
          break; // Success with GET fallback
        } catch (fallbackError) {
          console.log(`Polling GET fallback also failed for ${baseUrl}:`, fallbackError.message);
        }
      }
    }
  }

  throw new Error('Video generation timed out or failed');
};

// Generate video using A2E API
const generateVideoWithA2E = async ({ anchorId, audioSrc, script, title, options }) => {
  const videoPayload = {
    title: title || 'AI Generated Video',
    anchor_id: anchorId,
    anchor_type: 1, // Custom avatar
    audioSrc: audioSrc,
    msg: script, // Required for captions
    isSkipRs: options.skipSmartMotion !== false, // Default to true for faster generation
    isCaptionEnabled: options.enableCaptions || false,
    resolution: options.resolution || 1080,
    web_bg_width: options.backgroundWidth || 0,
    web_bg_height: options.backgroundHeight || 0,
    web_people_width: options.avatarWidth || 0,
    web_people_height: options.avatarHeight || 0,
    web_people_x: options.avatarX || 0,
    web_people_y: options.avatarY || 0
  };
  
  console.log('📹 Video generation payload:', JSON.stringify(videoPayload, null, 2));

  // Add captions if enabled
  if (options.enableCaptions) {
    videoPayload.captionAlign = {
      language: options.captionLanguage || 'en-US',
      PrimaryColour: options.captionColor || 'rgba(255, 255, 255, 1)',
      OutlineColour: options.captionOutlineColor || 'rgba(0, 0, 0, 1)',
      BorderStyle: options.captionBorderStyle || 4,
      FontName: options.captionFont || 'Arial',
      Fontsize: options.captionSize || 50,
      subtitle_position: options.captionPosition || 0.3
    };
  }

  const fallbackUrls = getVideoFallbackUrls();
  let response = null;
  let lastError = null;

  for (const baseUrl of fallbackUrls) {
    try {
      response = await axios.post(`${baseUrl}/video/generate`, videoPayload, {
        headers: { 'Authorization': `Bearer ${A2E_API_KEY}`, 'Content-Type': 'application/json' }
      });
      break;
    } catch (error) {
      console.log(`Video generation endpoint failed: ${baseUrl}`, error.message);
      lastError = error;
    }
  }

  if (!response) {
    throw lastError || new Error('All video generation endpoints failed');
  }

  if (response.data.code !== 0) {
    throw new Error(`Video generation failed: ${response.data.message || 'Unknown error'}`);
  }

  return {
    taskId: response.data.data._id,
    status: response.data.data.status
  };
};



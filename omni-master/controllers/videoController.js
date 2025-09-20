const axios = require('axios');
const Video = require('../models/Video');
const Avatar = require('../models/Avatar');
const Render = require('../models/Render');

const A2E_API_KEY = process.env.A2E_API_KEY;
const A2E_VIDEO_BASE_URL = process.env.A2E_VIDEO_BASE_URL || 'https://video.a2e.ai/api/v1';
const A2E_API_BASE_URL = process.env.A2E_API_BASE_URL || 'https://api.a2e.ai/api/v1';

// Helper function to get available voices
const getDefaultVoiceId = async () => {
  try {
    const response = await axios.get(`${A2E_VIDEO_BASE_URL}/anchor/voice_list?country=en&region=US&voice_map_type=en-US`, {
      headers: { 'Authorization': `Bearer ${A2E_API_KEY}` }
    });
    
    if (response.data.code === 0 && response.data.data && response.data.data.length > 0) {
      // Return the first available voice ID
      return response.data.data[0].voice_id || response.data.data[0].id;
    }
  } catch (error) {
    console.warn('Could not fetch voice list:', error.message);
  }
  
  // Fallback to a common voice ID format
  return 'en-US-AriaNeural';
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
  return ttsResponse.data.data.audioSrc || ttsResponse.data.data.audio_src;
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
  }
};

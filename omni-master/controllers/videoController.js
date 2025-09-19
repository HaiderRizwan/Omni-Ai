const GenerationJob = require('../models/GenerationJob');
const Character = require('../models/Character');
const axios = require('axios');

// Video generation API configurations
const VIDEO_APIS = {
  runwayml: {
    baseUrl: 'https://api.runwayml.com/v1',
    apiKey: process.env.RUNWAYML_API_KEY,
    model: 'gen-3-alpha-turbo',
    maxDuration: 10 // seconds
  },
  pika: {
    baseUrl: 'https://api.pika.art/v1',
    apiKey: process.env.PIKA_API_KEY,
    model: 'pika-1.0',
    maxDuration: 8 // seconds
  },
  stability: {
    baseUrl: 'https://api.stability.ai/v1',
    apiKey: process.env.STABILITY_API_KEY,
    model: 'stable-video-diffusion',
    maxDuration: 4 // seconds
  }
};

const DEFAULT_PROVIDER = process.env.VIDEO_PROVIDER || 'runwayml';

// @desc    Generate video with main character and audio
// @route   POST /api/videos/generate
// @access  Private (Premium)
const generateVideo = async (req, res) => {
  try {
    const {
      prompt,
      mainCharacterId,
      duration = 5,
      style = 'cinematic',
      aspectRatio = '16:9',
      provider = DEFAULT_PROVIDER,
      // Audio parameters
      includeAudio = true,
      voiceStyle = 'narrative',
      backgroundMusic = 'epic',
      soundEffects = true,
      dialogue = null // Optional dialogue text for TTS
    } = req.body;

    // Validate required fields
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required'
      });
    }

    if (!mainCharacterId) {
      return res.status(400).json({
        success: false,
        message: 'Main character ID is required for video generation'
      });
    }

    // Validate duration limits
    const maxDuration = VIDEO_APIS[provider]?.maxDuration || 10;
    if (duration > maxDuration) {
      return res.status(400).json({
        success: false,
        message: `Duration cannot exceed ${maxDuration} seconds for ${provider}`
      });
    }

    // Get main character
    const mainCharacter = await Character.findOne({
      _id: mainCharacterId,
      user: req.user._id
    });

    if (!mainCharacter) {
      return res.status(404).json({
        success: false,
        message: 'Main character not found'
      });
    }

    // Enhance prompt with main character details
    const enhancedPrompt = `${mainCharacter.imageGenPrompt}, ${prompt}`;

    // Create generation job
    const job = await GenerationJob.create({
      user: req.user._id,
      type: 'video',
      status: 'queued',
      parameters: {
        prompt: enhancedPrompt,
        duration,
        style,
        aspectRatio,
        model: VIDEO_APIS[provider].model,
        // Audio parameters
        includeAudio,
        voiceStyle,
        backgroundMusic,
        soundEffects,
        dialogue
      },
      characters: [{
        characterId: mainCharacterId,
        role: 'main'
      }],
      provider
    });

    // Start video generation
    processVideoGeneration(job._id, {
      prompt: enhancedPrompt,
      mainCharacter,
      duration,
      style,
      aspectRatio,
      provider
    });

    // Increment character usage
    await mainCharacter.incrementUsage();

    res.status(202).json({
      success: true,
      data: {
        jobId: job._id,
        status: job.status,
        message: includeAudio
          ? 'Video generation with audio started'
          : 'Video generation started',
        estimatedTime: `${Math.ceil(duration * 2)}-60 seconds`,
        mainCharacter: {
          id: mainCharacter._id,
          name: mainCharacter.name
        },
        audio: includeAudio ? {
          voiceStyle,
          backgroundMusic,
          soundEffects,
          dialogue: dialogue ? 'Included' : null
        } : null
      }
    });

  } catch (error) {
    console.error('Generate video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate video',
      error: error.message
    });
  }
};

// @desc    Get video generation job status
// @route   GET /api/videos/job/:id
// @access  Private
const getVideoJob = async (req, res) => {
  try {
    const job = await GenerationJob.findOne({
      _id: req.params.id,
      user: req.user._id,
      type: 'video'
    }).populate('characters.characterId', 'name imageUrl');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Video generation job not found'
      });
    }

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Get video job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get video job',
      error: error.message
    });
  }
};

// @desc    Get user's video generation history
// @route   GET /api/videos/history
// @access  Private
const getVideoHistory = async (req, res) => {
  try {
    const { limit = 20, status } = req.query;

    const query = {
      user: req.user._id,
      type: 'video'
    };

    if (status) {
      query.status = status;
    }

    const jobs = await GenerationJob.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('characters.characterId', 'name imageUrl');

    res.status(200).json({
      success: true,
      data: jobs,
      count: jobs.length
    });
  } catch (error) {
    console.error('Get video history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get video history',
      error: error.message
    });
  }
};

// @desc    Cancel video generation job
// @route   POST /api/videos/job/:id/cancel
// @access  Private
const cancelVideoJob = async (req, res) => {
  try {
    const job = await GenerationJob.findOne({
      _id: req.params.id,
      user: req.user._id,
      type: 'video'
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Video generation job not found'
      });
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return res.status(400).json({
        success: false,
        message: 'Job is already completed or failed'
      });
    }

    await job.cancel();

    res.status(200).json({
      success: true,
      message: 'Video generation job cancelled',
      data: job
    });
  } catch (error) {
    console.error('Cancel video job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel video job',
      error: error.message
    });
  }
};

// @desc    Get supported video providers and options
// @route   GET /api/videos/supported
// @access  Private
const getSupportedVideoOptions = async (req, res) => {
  try {
    const providers = Object.keys(VIDEO_APIS).map(provider => ({
      name: provider,
      maxDuration: VIDEO_APIS[provider].maxDuration,
      supportedFormats: ['mp4'],
      supportedRatios: ['16:9', '9:16', '1:1'],
      audioSupport: true
    }));

    res.status(200).json({
      success: true,
      data: {
        providers,
        defaultProvider: DEFAULT_PROVIDER,
        features: {
          mainCharacterRequired: true,
          maxDuration: 10,
          supportedStyles: ['cinematic', 'realistic', 'animated', 'documentary'],
          audioFeatures: {
            ttsVoices: ['narrative', 'dramatic', 'calm', 'inspirational'],
            musicStyles: ['epic', 'ambient', 'uplifting', 'dramatic', 'peaceful'],
            soundEffects: true,
            mixingCapabilities: true
          }
        }
      }
    });
  } catch (error) {
    console.error('Get supported video options error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get supported video options',
      error: error.message
    });
  }
};

// Helper function to process video generation
const processVideoGeneration = async (jobId, params) => {
  try {
    const job = await GenerationJob.findById(jobId);
    if (!job) return;

    await job.start();
    await job.updateProgress(10, 'Initializing video generation');

    let videoUrl = '';
    let audioUrl = '';
    const provider = params.provider || DEFAULT_PROVIDER;

    // Generate video based on provider
    switch (provider) {
      case 'runwayml':
        videoUrl = await generateWithRunwayML(params);
        break;
      case 'pika':
        videoUrl = await generateWithPika(params);
        break;
      case 'stability':
        videoUrl = await generateWithStabilityVideo(params);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    await job.updateProgress(60, 'Video generation complete, processing audio');

    // Generate audio if requested
    if (params.includeAudio) {
      try {
        if (params.dialogue) {
          // Generate TTS for dialogue
          audioUrl = await generateTTS(params.dialogue, params.voiceStyle);
          await job.updateProgress(80, 'TTS generated, adding background music');
        }

        // Generate background music and sound effects
        const musicUrl = await generateBackgroundMusic(params.backgroundMusic, params.duration);

        // Mix audio tracks (this would be done by the video provider or a separate service)
        const finalAudioUrl = await mixAudioTracks(audioUrl, musicUrl, params.soundEffects);

        await job.updateProgress(90, 'Audio mixing complete');
      } catch (audioError) {
        console.error('Audio generation failed:', audioError);
        // Continue without audio rather than failing the entire job
        await job.updateProgress(75, 'Audio generation failed, proceeding without audio');
      }
    }

    // Complete job with result
    const results = [{
      url: videoUrl,
      filename: `generated-video-${Date.now()}.mp4`,
      format: 'mp4',
      size: 10240000, // Estimated size
      metadata: {
        duration: params.duration,
        prompt: params.prompt,
        provider,
        style: params.style,
        aspectRatio: params.aspectRatio,
        mainCharacter: params.mainCharacter.name,
        hasAudio: !!audioUrl,
        audioTracks: audioUrl ? {
          voice: params.voiceStyle,
          backgroundMusic: params.backgroundMusic,
          soundEffects: params.soundEffects
        } : null
      }
    }];

    // Add audio file if generated
    if (audioUrl) {
      results.push({
        url: audioUrl,
        filename: `generated-audio-${Date.now()}.mp3`,
        format: 'mp3',
        size: 2048000, // Estimated size
        metadata: {
          type: 'audio',
          duration: params.duration,
          voiceStyle: params.voiceStyle
        }
      });
    }

    await job.complete(results);

  } catch (error) {
    console.error('Video generation process error:', error);
    const job = await GenerationJob.findById(jobId);
    if (job) {
      await job.fail(error.message);
    }
  }
};

// RunwayML integration
const generateWithRunwayML = async (params) => {
  const config = VIDEO_APIS.runwayml;

  try {
    const response = await axios.post(
      `${config.baseUrl}/image_to_video`,
      {
        model: config.model,
        prompt_image: params.mainCharacter.imageUrl || generateCharacterImage(params.mainCharacter),
        prompt_text: params.prompt,
        duration: params.duration,
        ratio: params.aspectRatio.replace(':', '_')
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 minutes timeout
      }
    );

    // RunwayML returns a job ID, we'd need to poll for completion
    // For now, return a placeholder
    return `https://runwayml.com/jobs/${response.data.id}`;

  } catch (error) {
    console.error('RunwayML API error:', error.response?.data);
    throw new Error('Failed to generate video with RunwayML');
  }
};

// Pika Labs integration
const generateWithPika = async (params) => {
  const config = VIDEO_APIS.pika;

  try {
    const response = await axios.post(
      `${config.baseUrl}/videos/generate`,
      {
        prompt: params.prompt,
        model: config.model,
        duration: params.duration,
        aspect_ratio: params.aspectRatio.replace(':', '_')
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    return response.data.video_url || `https://pika.art/videos/${response.data.id}`;

  } catch (error) {
    console.error('Pika API error:', error.response?.data);
    throw new Error('Failed to generate video with Pika');
  }
};

// Stability AI Video integration
const generateWithStabilityVideo = async (params) => {
  const config = VIDEO_APIS.stability;

  try {
    const response = await axios.post(
      `${config.baseUrl}/generation/${config.model}/text-to-video`,
      {
        seed: Math.floor(Math.random() * 1000000),
        cfg_scale: 2.5,
        motion_bucket_id: 127
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    return response.data.video;

  } catch (error) {
    console.error('Stability Video API error:', error.response?.data);
    throw new Error('Failed to generate video with Stability AI');
  }
};

// Helper function to generate TTS (Text-to-Speech)
const generateTTS = async (text, voiceStyle = 'narrative') => {
  try {
    // This would integrate with TTS services like:
    // - ElevenLabs
    // - OpenAI TTS
    // - Google Cloud TTS
    // - Azure Speech Services

    // For now, return a placeholder URL
    console.log(`Generating TTS for text: "${text.substring(0, 50)}..." with style: ${voiceStyle}`);
    return `https://storage.example.com/tts/${Date.now()}.mp3`;
  } catch (error) {
    console.error('TTS generation error:', error);
    throw new Error('Failed to generate text-to-speech audio');
  }
};

// Helper function to generate background music
const generateBackgroundMusic = async (musicStyle = 'epic', duration = 5) => {
  try {
    // This would integrate with music generation services like:
    // - AIVA
    // - OpenAI MusicGen
    // - Suno AI
    // - Udio

    console.log(`Generating ${musicStyle} background music for ${duration} seconds`);
    return `https://storage.example.com/music/${musicStyle}_${Date.now()}.mp3`;
  } catch (error) {
    console.error('Background music generation error:', error);
    throw new Error('Failed to generate background music');
  }
};

// Helper function to mix audio tracks
const mixAudioTracks = async (voiceUrl, musicUrl, includeSoundEffects = true) => {
  try {
    // This would use audio processing services like:
    // - FFmpeg (server-side)
    // - Audio APIs (Cloudinary, etc.)
    // - Specialized audio mixing services

    console.log('Mixing audio tracks with voice, music, and sound effects');
    return `https://storage.example.com/mixed/${Date.now()}.mp3`;
  } catch (error) {
    console.error('Audio mixing error:', error);
    throw new Error('Failed to mix audio tracks');
  }
};

// Helper function to generate character image if not available
const generateCharacterImage = (character) => {
  // This would call the image generation API
  // For now, return a placeholder
  return `data:image/png;base64,${Buffer.from('placeholder').toString('base64')}`;
};

module.exports = {
  generateVideo,
  getVideoJob,
  getVideoHistory,
  cancelVideoJob,
  getSupportedVideoOptions
};

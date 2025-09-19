const GenerationJob = require('../models/GenerationJob');
const Avatar = require('../models/Avatar');
const Image = require('../models/Image');
const axios = require('axios');
const { HfInference } = require('@huggingface/inference');

// Image generation API configurations (same as imageController)
const IMAGE_APIS = {
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    model: 'dall-e-3'
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'dall-e-3',
    maxSize: '1792x1024'
  },
  stability: {
    baseUrl: 'https://api.stability.ai/v1',
    apiKey: process.env.STABILITY_API_KEY,
    model: 'stable-diffusion-xl-1024-v1-0',
    maxSize: '1024x1024'
  },
  replicate: {
    baseUrl: 'https://api.replicate.com/v1',
    apiKey: process.env.REPLICATE_API_KEY,
    model: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    maxSize: '1024x1024'
  }
};

const DEFAULT_PROVIDER = process.env.IMAGE_PROVIDER || (process.env.OPENROUTER_API_KEY ? 'openrouter' : 'openai');

// @desc    Generate avatar
// @route   POST /api/avatars/generate
// @access  Private (Premium)
const generateAvatar = async (req, res) => {
  try {
    console.log('=== AVATAR CONTROLLER DEBUG BOX ===');
    console.log('Function: generateAvatar');
    console.log('Request body:', req.body);
    console.log('User ID:', req.user?._id);
    console.log('==================================');
    
    const {
      prompt,
      negativePrompt,
      style,
      aspectRatio = '1:1',
      characterSettings = {},
      customization = {}
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required for avatar generation'
      });
    }

    // Check if user has premium access
    if (!req.user.canAccessPremium()) {
      return res.status(403).json({
        success: false,
        message: 'Premium subscription required for avatar generation'
      });
    }

    // Determine the best available provider
    let provider;
    if (process.env.OPENAI_API_KEY) {
      provider = 'openai';
    } else if (process.env.HF_TOKEN) {
      provider = 'huggingface';
    } else if (process.env.OPENROUTER_API_KEY) {
      provider = 'openrouter';
    } else if (process.env.STABILITY_API_KEY) {
      provider = 'stability';
    } else if (process.env.REPLICATE_API_KEY) {
      provider = 'replicate';
    } else {
      console.error('No API keys found!');
      return res.status(400).json({
        success: false,
        message: 'No image generation API keys configured. Please set OPENAI_API_KEY, HF_TOKEN, or another image API key.',
        availableProviders: ['openai', 'huggingface', 'openrouter', 'stability', 'replicate']
      });
    }

    console.log('Selected provider:', provider);

    // Build character-specific prompt
    const characterPrompt = buildCharacterPrompt(prompt, characterSettings, customization);
    console.log('Generated character prompt:', characterPrompt);

    // Create generation job
    const job = await GenerationJob.create({
      user: req.user._id,
      type: 'image',
      status: 'pending',
      parameters: {
        prompt: characterPrompt,
        aspectRatio,
        style,
        negativePrompt: negativePrompt || 'multiple people, crowd, group, text, watermark, signature, logo, blurry, low quality, distorted, deformed',
        characterSettings,
        customization
      },
      provider: provider
    });

    // Start avatar generation process asynchronously
    processAvatarGeneration(job._id, {
      prompt: characterPrompt,
      aspectRatio,
      style,
      negativePrompt: negativePrompt || 'multiple people, crowd, group, text, watermark, signature, logo, blurry, low quality, distorted, deformed',
      characterSettings,
      customization,
      provider
    });

    res.status(202).json({
      success: true,
      message: 'Avatar generation started',
      data: {
        jobId: job._id,
        status: 'pending',
        estimatedTime: '30-60 seconds'
      }
    });

  } catch (error) {
    console.error('Avatar generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Avatar generation failed',
      error: error.message
    });
  }
};

// @desc    Get avatar generation job status
// @route   GET /api/avatars/job/:jobId
// @access  Private
const getAvatarJob = async (req, res) => {
  try {
    const job = await GenerationJob.findById(req.params.jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Avatar generation job not found'
      });
    }

    // Check if user owns this job
    if (job.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        jobId: job._id,
        status: job.status,
        progress: job.progress,
        message: job.message,
        results: job.results,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      }
    });

  } catch (error) {
    console.error('Get avatar job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get avatar job status',
      error: error.message
    });
  }
};

// @desc    Get user's avatars
// @route   GET /api/avatars
// @access  Private
const getUserAvatars = async (req, res) => {
  try {
    const { limit = 20, page = 1, style, gender, age } = req.query;
    const skip = (page - 1) * limit;

    let query = { user: req.user._id };
    
    // Add filters if provided
    if (style) query['characterSettings.style'] = style;
    if (gender) query['characterSettings.gender'] = gender;
    if (age) query['characterSettings.age'] = age;

    const avatars = await Avatar.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-imageData'); // Exclude image data for list view

    const total = await Avatar.countDocuments(query);

    // Add avatar URLs to each avatar
    const avatarsWithUrls = avatars.map(avatar => ({
      ...avatar.toObject(),
      avatarUrl: avatar.getAvatarUrl()
    }));

    res.json({
      success: true,
      data: {
        avatars: avatarsWithUrls,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get user avatars error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get avatars',
      error: error.message
    });
  }
};

// @desc    Get single avatar
// @route   GET /api/avatars/:id
// @access  Private
const getAvatar = async (req, res) => {
  try {
    const avatar = await Avatar.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!avatar) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found'
      });
    }

    res.json({
      success: true,
      data: avatar
    });

  } catch (error) {
    console.error('Get avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get avatar',
      error: error.message
    });
  }
};

// @desc    Delete avatar
// @route   DELETE /api/avatars/:id
// @access  Private
const deleteAvatar = async (req, res) => {
  try {
    const avatar = await Avatar.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!avatar) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found'
      });
    }

    res.json({
      success: true,
      message: 'Avatar deleted successfully'
    });

  } catch (error) {
    console.error('Delete avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete avatar',
      error: error.message
    });
  }
};

// @desc    Serve avatar image
// @route   GET /api/avatars/public/:id
// @access  Public
const serveAvatar = async (req, res) => {
  try {
    const avatar = await Avatar.findById(req.params.id);
    
    if (!avatar) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found'
      });
    }

    // Set CORS headers for avatar serving
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
    res.set('Content-Type', avatar.contentType);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.set('Content-Length', avatar.size);
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');

    res.send(avatar.imageData);

  } catch (error) {
    console.error('Serve avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve avatar',
      error: error.message
    });
  }
};

// Helper function to build character-specific prompt
const buildCharacterPrompt = (basePrompt, characterSettings, customization) => {
  let prompt = `character portrait, ${basePrompt}`;
  
  // Add character-specific details
  if (characterSettings.gender && characterSettings.gender !== 'any') {
    prompt += `, ${characterSettings.gender}`;
  }
  
  if (characterSettings.age && characterSettings.age !== 'any') {
    prompt += `, ${characterSettings.age}`;
  }
  
  if (characterSettings.ethnicity && characterSettings.ethnicity !== 'any') {
    prompt += `, ${characterSettings.ethnicity}`;
  }
  
  // Add physical characteristics
  if (customization.skinTone) {
    const skinTone = getSkinToneDescription(customization.skinTone);
    if (skinTone) prompt += `, ${skinTone} skin`;
  }
  
  if (customization.hairColor) {
    const hairColor = getHairColorDescription(customization.hairColor);
    if (hairColor) prompt += `, ${hairColor} hair`;
  }
  
  if (characterSettings.hairStyle && characterSettings.hairStyle !== 'any') {
    prompt += `, ${characterSettings.hairStyle} hair`;
  }
  
  if (customization.eyeColor) {
    const eyeColor = getEyeColorDescription(customization.eyeColor);
    if (eyeColor) prompt += `, ${eyeColor} eyes`;
  }
  
  if (characterSettings.build && characterSettings.build !== 'average') {
    prompt += `, ${characterSettings.build} build`;
  }
  
  // Add style and expression
  if (characterSettings.style && characterSettings.style !== 'realistic') {
    prompt += `, ${characterSettings.style} style`;
  }
  
  if (characterSettings.expression && characterSettings.expression !== 'neutral') {
    prompt += `, ${characterSettings.expression} expression`;
  }
  
  if (characterSettings.clothing && characterSettings.clothing !== 'casual') {
    prompt += `, wearing ${characterSettings.clothing}`;
  }
  
  // Add background
  if (characterSettings.background && characterSettings.background !== 'transparent') {
    prompt += `, ${characterSettings.background} background`;
  }
  
  // Add character-specific keywords for better generation
  prompt += ', detailed face, clear eyes, professional portrait, high quality, character design, single person, centered composition';
  
  return prompt;
};

// Helper functions to convert colors to descriptive text
const getSkinToneDescription = (color) => {
  const skinTones = {
    '#FDBCB4': 'fair',
    '#F1C27D': 'light',
    '#E0AC69': 'medium-light',
    '#C68642': 'medium',
    '#8D5524': 'medium-dark',
    '#654321': 'dark',
    '#3C2415': 'very dark'
  };
  return skinTones[color] || 'natural';
};

const getHairColorDescription = (color) => {
  const hairColors = {
    '#8B4513': 'brown',
    '#654321': 'dark brown',
    '#2F1B14': 'black',
    '#DAA520': 'blonde',
    '#FFD700': 'golden blonde',
    '#FFA500': 'auburn',
    '#DC143C': 'red',
    '#800080': 'purple',
    '#0000FF': 'blue',
    '#FF69B4': 'pink'
  };
  return hairColors[color] || 'brown';
};

const getEyeColorDescription = (color) => {
  const eyeColors = {
    '#4A90E2': 'blue',
    '#228B22': 'green',
    '#8B4513': 'brown',
    '#654321': 'dark brown',
    '#2F1B14': 'black',
    '#FFD700': 'amber',
    '#9370DB': 'violet',
    '#FF69B4': 'pink'
  };
  return eyeColors[color] || 'brown';
};

// Process avatar generation (similar to image generation)
const processAvatarGeneration = async (jobId, params) => {
  try {
    const job = await GenerationJob.findById(jobId);
    if (!job) return;

    await job.updateProgress(10, 'Starting avatar generation...');

    const { prompt, aspectRatio, style, negativePrompt, characterSettings, customization, provider } = params;
    
    let imageUrl;
    let imageBuffer;
    let width, height;

    // Parse aspect ratio
    const [w, h] = aspectRatio.split(':').map(Number);
    const ratio = w / h;
    
    if (ratio > 1.5) {
      width = 1024;
      height = Math.round(1024 / ratio);
    } else if (ratio < 0.7) {
      height = 1024;
      width = Math.round(1024 * ratio);
    } else {
      width = 1024;
      height = 1024;
    }

    await job.updateProgress(25, 'Generating avatar with AI...');

    if (provider === 'huggingface') {
      const hfToken = process.env.HF_TOKEN;
      if (!hfToken) throw new Error('Hugging Face token not configured');
      
      const hf = new HfInference(hfToken);
      const response = await hf.textToImage({
        model: 'stabilityai/stable-diffusion-xl-base-1.0',
        inputs: prompt,
        parameters: {
          negative_prompt: negativePrompt,
          width,
          height,
          num_inference_steps: 20,
          guidance_scale: 7.5
        }
      });

      imageBuffer = Buffer.from(await response.arrayBuffer());
      imageUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    } else {
      // Use the same logic as image generation for other providers
      const apiConfig = IMAGE_APIS[provider];
      if (!apiConfig || !apiConfig.apiKey) {
        throw new Error(`Provider ${provider} not configured`);
      }

      // Implementation for other providers would go here
      // For now, we'll use Hugging Face as fallback
      const hfToken = process.env.HF_TOKEN;
      if (!hfToken) throw new Error('Hugging Face token not configured');
      
      const hf = new HfInference(hfToken);
      const response = await hf.textToImage({
        model: 'stabilityai/stable-diffusion-xl-base-1.0',
        inputs: prompt,
        parameters: {
          negative_prompt: negativePrompt,
          width,
          height,
          num_inference_steps: 20,
          guidance_scale: 7.5
        }
      });

      imageBuffer = Buffer.from(await response.arrayBuffer());
      imageUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    }

    await job.updateProgress(75, 'Saving avatar...');

    // Save avatar to database
    const filename = `avatar_${Date.now()}.png`;
    const avatar = await Avatar.create({
      user: job.user,
      prompt, // This is the technical prompt used for generation
      originalPrompt: job.parameters.prompt, // Store the original user prompt
      negativePrompt,
      imageData: imageBuffer,
      contentType: 'image/png',
      filename,
      size: imageBuffer.length,
      width,
      height,
      characterSettings,
      customization,
      settings: {
        style,
        aspectRatio,
        model: 'stable-diffusion-xl-base-1.0'
      },
      metadata: {
        provider,
        generationTime: Date.now() - job.createdAt.getTime(),
        originalPrompt: job.parameters.prompt,
        characterType: 'avatar'
      }
    });

    // Note: Avatars are only saved to Avatar collection, not Image collection

    await job.updateProgress(90, 'Finalizing...');

    // Update job with results
    await job.updateProgress(100, 'Avatar generation completed');
    job.status = 'completed';
    job.results = [{
      url: avatar.getAvatarUrl(),
      id: avatar._id,
      imageId: avatar._id, // Use avatar ID as imageId for collection functionality
      filename: avatar.filename,
      size: avatar.size,
      width: avatar.width,
      height: avatar.height
    }];
    await job.save();

    console.log('Avatar generation completed:', avatar._id);

  } catch (error) {
    console.error('Avatar generation process error:', error);
    
    try {
      const job = await GenerationJob.findById(jobId);
      if (job) {
        job.status = 'failed';
        job.error = {
          message: error.message,
          code: error.code || 'GENERATION_FAILED'
        };
        await job.save();
      }
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
    }
  }
};

// @desc    Save image to avatars collection
// @route   POST /api/avatars/save-from-image
// @access  Private
const saveImageToAvatars = async (req, res) => {
  try {
    const { imageId } = req.body;

    if (!imageId) {
      return res.status(400).json({
        success: false,
        message: 'Image ID is required'
      });
    }

    // Find the image in the images collection
    const image = await Image.findById(imageId);
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Check if the image belongs to the user
    if (image.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only save your own images to avatars'
      });
    }

    // Check if this image is already saved as an avatar
    const existingAvatar = await Avatar.findOne({ 
      user: req.user._id,
      'metadata.originalImageId': imageId 
    });

    if (existingAvatar) {
      return res.status(400).json({
        success: false,
        message: 'This image is already saved in your avatars collection'
      });
    }

    // Create a new avatar from the image
    const avatar = await Avatar.create({
      user: req.user._id,
      prompt: image.prompt,
      negativePrompt: image.negativePrompt,
      imageData: image.imageData,
      contentType: image.contentType,
      filename: `avatar_${Date.now()}.png`,
      size: image.size,
      width: image.width,
      height: image.height,
      characterSettings: {
        // Default character settings since this is from a general image
        gender: 'any',
        age: 'adult',
        style: image.settings?.style || 'realistic',
        expression: 'neutral',
        clothing: 'casual',
        background: 'transparent',
        hairStyle: 'any',
        build: 'average',
        ethnicity: 'any'
      },
      customization: {
        hairColor: '#8B4513',
        eyeColor: '#4A90E2',
        skinTone: '#FDBCB4'
      },
      settings: {
        style: image.settings?.style || 'realistic',
        quality: image.settings?.quality || 'high',
        aspectRatio: image.settings?.aspectRatio || '1:1',
        seed: image.settings?.seed,
        model: image.settings?.model || 'stable-diffusion-xl-base-1.0',
        steps: image.settings?.steps,
        guidance: image.settings?.guidance
      },
      metadata: {
        provider: image.metadata?.provider || 'unknown',
        generationTime: image.metadata?.generationTime || 0,
        originalPrompt: image.prompt,
        characterType: 'avatar',
        originalImageId: imageId, // Track the original image ID
        savedFromImage: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Image saved to avatars collection successfully',
      data: {
        avatarId: avatar._id,
        avatarUrl: avatar.getAvatarUrl(),
        prompt: avatar.prompt
      }
    });

  } catch (error) {
    console.error('Error saving image to avatars:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save image to avatars collection',
      error: error.message
    });
  }
};

module.exports = {
  generateAvatar,
  getAvatarJob,
  getUserAvatars,
  getAvatar,
  deleteAvatar,
  serveAvatar,
  saveImageToAvatars
};



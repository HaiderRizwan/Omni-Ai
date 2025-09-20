const GenerationJob = require('../models/GenerationJob');
const Avatar = require('../models/Avatar');
const Image = require('../models/Image');
const axios = require('axios');
const https = require('https');
const http = require('http');
const { saveBufferToUploads } = require('../utils/localUploader');

// Import the working A2E image generation function from imageController
const { generateWithA2ETextToImage, generateWithA2ETextToImageForAvatar } = require('./imageController');
// Simplified: remove non-A2E providers

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
  },
  a2e: {
    baseUrl: 'https://video.a2e.ai/api/v1',
    apiKey: process.env.A2E_API_KEY
  }
};

const DEFAULT_PROVIDER = 'a2e';

// @desc    Generate avatar from text or image
// @route   POST /api/avatars/generate
// @access  Private (Premium)
const generateAvatar = async (req, res) => {
  const { mode = 'text', prompt } = req.body;

  if (mode === 'text') {
    return generateAvatarFromText(req, res);
  } else if (mode === 'image') {
    return generateAvatarFromImage(req, res);
  } else {
    return res.status(400).json({ success: false, message: 'Invalid generation mode' });
  }
};

// @desc    Generate avatar from text using A2E
// @access  Private (Premium)
const generateAvatarFromText = async (req, res) => {
  try {
    console.log('\n=== AVATAR CONTROLLER (TEXT) - START ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('User ID:', req.user._id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      prompt,
      negativePrompt,
      style,
      aspectRatio = '1:1',
      characterSettings = {},
      customization = {}
    } = req.body;

    console.log('Extracted parameters:');
    console.log('- Prompt:', prompt);
    console.log('- Aspect Ratio:', aspectRatio);
    console.log('- Style:', style);
    console.log('- Negative Prompt:', negativePrompt);

    if (!prompt) {
      console.log('❌ ERROR: Missing prompt');
      return res.status(400).json({
        success: false,
        message: 'Prompt is required for avatar generation'
      });
    }

    console.log('📝 Building character prompt...');
    // Create a detailed prompt
    const detailedPrompt = buildCharacterPrompt(prompt, characterSettings, customization);
    console.log('✅ Detailed prompt created:', detailedPrompt);

    console.log('💾 Creating generation job...');
    // Create a dedicated avatar job
    const job = await GenerationJob.create({
      user: req.user._id,
      type: 'avatar',
      status: 'pending',
      parameters: { prompt: detailedPrompt, originalPrompt: prompt, aspectRatio, style, negativePrompt },
      provider: 'a2e',
      metadata: { pipeline: 'text->image->avatar' }
    });
    console.log('✅ Job created with ID:', job._id);

    console.log('🚀 Starting async avatar generation process...');
    // Start async process - use setImmediate to ensure it runs after response
    setImmediate(async () => {
      try {
        console.log('🔄 Async process starting for job:', job._id);
        await processAvatarGenerationText(job._id, { prompt: detailedPrompt, originalPrompt: prompt, aspectRatio, negativePrompt });
        console.log('✅ Async process completed for job:', job._id);
      } catch (error) {
        console.log('❌ Async process failed for job:', job._id);
        console.log('Error:', error.message);
        console.log('Stack:', error.stack);
      }
    });

    console.log('📤 Sending response to client...');
    res.status(202).json({
      success: true,
      message: 'Avatar generation from text started',
      data: { jobId: job._id, status: 'pending' }
    });
    console.log('✅ Response sent successfully');
    console.log('=== AVATAR CONTROLLER (TEXT) - END ===\n');

  } catch (error) {
    console.log('❌ AVATAR GENERATION ERROR:');
    console.log('- Message:', error.message);
    console.log('- Stack:', error.stack);
    console.log('- Response Status:', error.response?.status);
    console.log('- Response Data:', error.response?.data);
    
    res.status(500).json({
      success: false,
      message: 'Avatar generation from text failed',
      error: error.message
    });
    console.log('=== AVATAR CONTROLLER (TEXT) - ERROR END ===\n');
  }
};

// @desc    Generate avatar from an uploaded image using A2E
// @access  Private (Premium)
const generateAvatarFromImage = async (req, res) => {
  try {
    console.log('=== AVATAR CONTROLLER (IMAGE) ===');
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }

    const { gender = 'female', name } = req.body;

    // Upload image to a temporary storage and get the URL
    const imageUrl = await uploadImageAndGetUrl(req.file);
    console.log('Image uploaded to:', imageUrl);

    // Create a dedicated avatar job
    const job = await GenerationJob.create({
      user: req.user._id,
      type: 'avatar',
      status: 'pending',
      parameters: { imageUrl, gender, name: name || 'Custom Avatar' },
      provider: 'a2e',
      metadata: { pipeline: 'image->avatar' }
    });

    // Start async process
    processAvatarGenerationImage(job._id, { imageUrl, gender, name: name || 'Custom Avatar' });

    res.status(202).json({
      success: true,
      message: 'Avatar generation from image started',
      data: { jobId: job._id, status: 'pending' }
    });

  } catch (error) {
    console.error('Avatar generation from image error:', { status: error.response?.status, data: error.response?.data, message: error.message });
    res.status(500).json({
      success: false,
      message: 'Avatar generation from image failed',
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
    const { limit = 20, page = 1, style, gender, age, a2eCompatible } = req.query;
    const skip = (page - 1) * limit;

    let query = { user: req.user._id };
    
    // Add filters if provided
    if (style) query['characterSettings.style'] = style;
    if (gender) query['characterSettings.gender'] = gender;
    if (age) query['characterSettings.age'] = age;
    
    // Filter for A2E-compatible avatars (those with a2eAnchorId)
    if (a2eCompatible === 'true') {
      query['metadata.a2eAnchorId'] = { $exists: true, $ne: null };
    }

    const avatars = await Avatar.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-imageData'); // Exclude image data for list view

    const total = await Avatar.countDocuments(query);

    // Add avatar URLs and A2E compatibility info to each avatar
    const avatarsWithUrls = avatars.map(avatar => {
      const hasA2EAnchorId = !!(avatar.metadata?.a2eAnchorId);
      const isExplicitlyNonCompatible = avatar.metadata?.a2eCompatible === false;
      const isA2ECompatible = hasA2EAnchorId && !isExplicitlyNonCompatible;
      
      return {
        ...avatar.toObject(),
        avatarUrl: avatar.getAvatarUrl(),
        isA2ECompatible: isA2ECompatible,
        a2eAnchorId: avatar.metadata?.a2eAnchorId || null,
        a2eUserVideoTwinId: avatar.metadata?.a2eUserVideoTwinId || null,
        source: avatar.metadata?.source || 'unknown'
      };
    });

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

// @desc    Get A2E-compatible avatars for video generation
// @route   GET /api/avatars/a2e-compatible
// @access  Private
const getA2ECompatibleAvatars = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    // Query only avatars with A2E anchor IDs
    const query = { 
      user: req.user._id,
      'metadata.a2eAnchorId': { $exists: true, $ne: null }
    };

    const avatars = await Avatar.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-imageData'); // Exclude image data for list view

    const total = await Avatar.countDocuments(query);

    // Add avatar URLs and A2E metadata
    const avatarsWithUrls = avatars.map(avatar => ({
      _id: avatar._id,
      prompt: avatar.prompt,
      originalPrompt: avatar.originalPrompt,
      avatarUrl: avatar.getAvatarUrl(),
      createdAt: avatar.createdAt,
      characterSettings: avatar.characterSettings,
      a2eAnchorId: avatar.metadata.a2eAnchorId,
      a2eUserVideoTwinId: avatar.metadata.a2eUserVideoTwinId,
      usedQuickAdd: avatar.metadata.usedQuickAdd || false
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
    console.error('Get A2E compatible avatars error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get A2E compatible avatars',
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

// Helper function for local image upload
const uploadImageAndGetUrl = async (file) => {
  console.log('Uploading image:', file.originalname);
  return await saveBufferToUploads(file.originalname, file.buffer);
};

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const A2E_API_KEY = process.env.A2E_API_KEY;
// Choose video base by env or fallback chain: env -> a2e.ai -> a2e.com.cn
const A2E_API_BASE_URL = process.env.A2E_API_BASE_URL || 'https://api.a2e.ai/api/v1';
let A2E_VIDEO_BASE_URL = process.env.A2E_VIDEO_BASE_URL || 'https://video.a2e.ai/api/v1';

// Multiple fallback URLs for avatar training endpoints
const getVideoFallbackUrls = () => [
  'https://video.a2e.ai/api/v1',
  'https://video.a2e.com.cn/api/v1',
  'https://api.a2e.ai/api/v1',
  'https://api.avatar2everyone.com/api/v1'
];

// Simple runtime fallback switch if DNS fails on first try
const pickAltVideoBase = (current) => {
  const fallbacks = getVideoFallbackUrls();
  const currentIndex = fallbacks.findIndex(url => current.includes(url.replace('/api/v1', '').replace('https://', '')));
  if (currentIndex >= 0 && currentIndex < fallbacks.length - 1) {
    return fallbacks[currentIndex + 1];
  }
  return current.includes('video.a2e.ai') ? 'https://video.a2e.com.cn/api/v1' : 'https://video.a2e.ai/api/v1';
};

// Resilient axios instance with keep-alive and retries for transient DNS/network errors
const keepAliveAgentHttps = new https.Agent({ keepAlive: true });
const keepAliveAgentHttp = new http.Agent({ keepAlive: true });
const axiosA2E = axios.create({
  httpAgent: keepAliveAgentHttp,
  httpsAgent: keepAliveAgentHttps,
  timeout: 120000
});

const withRetries = async (fn, { attempts = 3, delayMs = 1500 } = {}) => {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (err) {
      lastErr = err;
      const msg = (err && err.message) || '';
      // Retry DNS/timeouts
      if (/EAI_AGAIN|ENOTFOUND|ETIMEDOUT|ECONNRESET|EHOSTUNREACH/i.test(msg)) {
        await new Promise(r => setTimeout(r, delayMs * (i + 1)));
        continue;
      }
      break;
    }
  }
  throw lastErr;
};

// Helper to get dimensions from aspect ratio
const getDimensions = (aspectRatio) => {
  switch (aspectRatio) {
    case '1:1': return { width: 1024, height: 1024 };
    case '4:3': return { width: 1024, height: 768 };
    case '3:4': return { width: 768, height: 1024 };
    case '16:9': return { width: 1024, height: 576 };
    case '9:16': return { width: 576, height: 1024 };
    default: return { width: 1024, height: 1024 };
  }
};

// Helper to enhance prompt with an LLM
const enhancePromptWithLLM = async (basePrompt) => {
  if (!OPENROUTER_API_KEY) {
    console.warn('OpenRouter API key not set. Skipping prompt enhancement.');
    return basePrompt;
  }
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert in creating detailed, vivid prompts for an AI image generator. Enhance the following user prompt to be more descriptive and artistic. Focus on physical characteristics, style, lighting, and composition. The output should be only the prompt itself.' },
          { role: 'user', content: basePrompt }
        ]
      },
      {
        headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}` }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error enhancing prompt with LLM:', error.message);
    return basePrompt; // Fallback to original prompt on error
  }
};


// Main async processor for text-to-avatar generation
const processAvatarGenerationText = async (jobId, params) => {
    console.log('\n🚀 === ASYNC AVATAR GENERATION START ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Job ID:', jobId);
    console.log('Params:', JSON.stringify(params, null, 2));
    
    // Check environment variables
    console.log('🔧 Environment check:');
    console.log('- A2E_API_KEY present:', !!A2E_API_KEY);
    console.log('- A2E_VIDEO_BASE_URL:', A2E_VIDEO_BASE_URL);
    console.log('- OPENROUTER_API_KEY present:', !!OPENROUTER_API_KEY);
    
    if (!A2E_API_KEY) {
        console.log('❌ CRITICAL: A2E_API_KEY is missing!');
        throw new Error('A2E_API_KEY is not configured');
    }
    
    let job;
    try {
        console.log('📋 Finding job in database...');
        job = await GenerationJob.findById(jobId);
        
        if (!job) {
            console.log('❌ Job not found in database:', jobId);
            return;
        }
        console.log('✅ Job found:', job._id, 'Status:', job.status);

        console.log('🎬 Starting job...');
        await job.start();
        console.log('✅ Job started successfully');
        
        await job.updateProgress(5, 'Starting avatar pipeline...');
        console.log('📊 Progress updated to 5%');
        
        const { prompt: originalPrompt, aspectRatio, negativePrompt } = params;
        console.log('📝 Processing parameters:');
        console.log('- Original Prompt:', originalPrompt);
        console.log('- Aspect Ratio:', aspectRatio);
        console.log('- Negative Prompt:', negativePrompt);

        // Step 1: Enhance Prompt
        console.log('\n--- STEP 1: PROMPT ENHANCEMENT ---');
        await job.updateProgress(10, 'Enhancing prompt...');
        console.log('🧠 Enhancing prompt with LLM...');
        
        const enhancedPrompt = await enhancePromptWithLLM(originalPrompt);
        console.log('✅ Enhanced prompt:', enhancedPrompt);

        const { width, height } = getDimensions(aspectRatio);
        console.log('📐 Image dimensions:', { width, height });

        // Step 2: Generate Image using the exact same function as imageController
        console.log('\n--- STEP 2: IMAGE GENERATION ---');
        await job.updateProgress(20, 'Generating image with A2E (using imageController function)...');
        console.log('🎨 Using the exact same function as imageController...');
        
        let imageBase64 = null;
        let imageUrl = null;
        
       try {
         // Use the exact same function from imageController, but get the original A2E URL
         console.log('📡 Calling generateWithA2ETextToImage with prompt:', enhancedPrompt);
         const result = await generateWithA2ETextToImageForAvatar({ prompt: enhancedPrompt });
         imageBase64 = result.base64;
         imageUrl = result.originalUrl; // Use the original A2E URL directly
         
         console.log('✅ Image generation completed successfully!');
         console.log('📊 Image base64 length:', imageBase64.length);
         console.log('🔗 Using original A2E image URL:', imageUrl);
         
         // Store the text-to-image task ID for potential quickAddAvatar optimization
         if (result.taskId) {
           console.log('💡 Text-to-image task ID available for quickAddAvatar:', result.taskId);
           job.metadata = job.metadata || {};
           job.metadata.a2eTextToImageTaskId = result.taskId;
         }
         
       } catch (error) {
         console.log('❌ Image generation failed:', error.message);
         throw error;
       }

        // Step 3: Create Avatar from Generated Image
        console.log('\n--- STEP 3: CREATING AVATAR FROM GENERATED IMAGE ---');
        await job.updateProgress(50, 'Creating avatar from generated image...');
        
        // Skip quickAddAvatar for now since it's returning empty data
        // Use the reliable full training process that we know works
        let useQuickAdd = false;
        let a2eAnchorId = null;
        let userVideoTwinId = null;
        let trainingTaskId = null;
        
        console.log('💡 QuickAddAvatar disabled - using reliable full training process');
        
        // Always use full training process for now
        if (true) {
          // Fall back to full training process
          try {
          console.log('🎭 Starting avatar creation with generated image...');
          console.log('📸 Image URL:', imageUrl);
          
          // Validate that we have a proper image URL
          if (!imageUrl) {
            throw new Error('No image URL available for avatar creation');
          }
          
        // Register Image as A2E Avatar to get Anchor ID
        const gender = job.characterSettings?.gender === 'male' ? 'male' : 'female'; // Default to female if not specified or 'any'
        const trainingPayload = {
          name: `avatar_${job.user}_${Date.now()}`,
          gender: gender,
          image_url: imageUrl,
          video_backgroud_color: 'rgb(255,255,255)', // Corrected parameter name
          model_version: 'V2.1' // Use latest model version
        };
        
        console.log('👤 Using gender for A2E training:', gender);
          
          console.log('📤 Avatar training payload:', JSON.stringify(trainingPayload, null, 2));
          
          const trainingResponse = await withRetries(() => axiosA2E.post(`${A2E_VIDEO_BASE_URL}/userVideoTwin/startTraining`, trainingPayload, { 
            headers: { 'Authorization': `Bearer ${A2E_API_KEY}`, 'Content-Type': 'application/json', 'x-lang': 'en-US' } 
          }));
          
          console.log('📨 Training response:', JSON.stringify(trainingResponse.data, null, 2));

          if (trainingResponse.data.code !== 0) {
            throw new Error(`A2E avatar training start failed: ${trainingResponse.data.message || JSON.stringify(trainingResponse.data)}`);
          }
          
          const trainingTaskId = trainingResponse.data.data._id;
          console.log('🆔 Training task ID:', trainingTaskId);
          
          // Store training task id for traceability
          job.metadata = job.metadata || {};
          job.metadata.a2eTrainingTaskId = trainingTaskId;
          await job.save();

          // Poll for training completion
          console.log('\n--- STEP 4: POLLING AVATAR TRAINING ---');
          await job.updateProgress(60, 'Training avatar model...');
          let trainingStatus = 'initialized';
          let userVideoTwinId = null;
          
          for (let i = 0; i < 120; i++) { // Poll for up to 10 minutes
            console.log(`🔄 Training poll ${i + 1}/120...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            let statusResponse;
            try {
              statusResponse = await withRetries(() => axiosA2E.get(`${A2E_VIDEO_BASE_URL}/userVideoTwin/${trainingTaskId}`, { 
                headers: { 'Authorization': `Bearer ${A2E_API_KEY}` } 
              }));
            } catch (err) {
              const alt = pickAltVideoBase(A2E_VIDEO_BASE_URL);
              console.warn('Retrying A2E status using alternate base:', alt);
              statusResponse = await withRetries(() => axiosA2E.get(`${alt}/userVideoTwin/${trainingTaskId}`, { 
                headers: { 'Authorization': `Bearer ${A2E_API_KEY}` } 
              }));
              A2E_VIDEO_BASE_URL = alt;
            }
            
            const statusData = statusResponse.data?.data || {};
            trainingStatus = statusData.current_status;
            userVideoTwinId = statusData.user_video_twin_id || statusData.video_twin_id || userVideoTwinId;
            
            console.log(`📊 Training poll ${i + 1}: Status = ${trainingStatus}, Twin ID = ${userVideoTwinId}`);
            
            if (trainingStatus === 'completed') {
              console.log('✅ Avatar training completed!');
              break;
            } else if (trainingStatus === 'failed') {
              throw new Error(`A2E avatar training failed: ${statusData.failed_message || 'unknown error'}`);
            }
            
            // Update progress based on training status
            const progressMap = {
              'initialized': 60,
              'processing': 70,
              'training': 80,
              'generating': 85
            };
            const currentProgress = progressMap[trainingStatus] || 70;
            await job.updateProgress(currentProgress, `Training status: ${trainingStatus}`);
          }
          
          if (trainingStatus !== 'completed') {
            throw new Error('A2E avatar training timed out.');
          }

          // Step 5: Get the Anchor ID
          console.log('\n--- STEP 5: GETTING ANCHOR ID ---');
          await job.updateProgress(90, 'Getting anchor ID...');
          
          const isValidObjectId = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);
          const twinIdForList = isValidObjectId(userVideoTwinId) ? userVideoTwinId : (isValidObjectId(trainingTaskId) ? trainingTaskId : null);
          
          let a2eAnchorId = null;
          try {
            const url = twinIdForList
              ? `${A2E_VIDEO_BASE_URL}/anchor/character_list?user_video_twin_id=${twinIdForList}&type=custom`
              : `${A2E_VIDEO_BASE_URL}/anchor/character_list?type=custom`;
            
            console.log('🔍 Getting anchor list from:', url);
            
            let characterListResponse;
            try {
              characterListResponse = await withRetries(() => axiosA2E.get(url, { 
                headers: { 'Authorization': `Bearer ${A2E_API_KEY}` } 
              }));
            } catch (err) {
              const alt = pickAltVideoBase(A2E_VIDEO_BASE_URL);
              const altUrl = url.replace(A2E_VIDEO_BASE_URL, alt);
              console.warn('Retrying A2E anchor list using alternate base:', altUrl);
              characterListResponse = await withRetries(() => axiosA2E.get(altUrl, { 
                headers: { 'Authorization': `Bearer ${A2E_API_KEY}` } 
              }));
              A2E_VIDEO_BASE_URL = alt;
            }
            
          console.log('📨 Character list response:', JSON.stringify(characterListResponse.data, null, 2));
          
          if (characterListResponse.data.code === 0) {
            const list = characterListResponse.data.data || [];
            console.log('📋 Character list array:', list);
            console.log('🔍 Looking for twin ID:', twinIdForList);
            
            // The response structure is different - data is directly an array, not data.list
            if (Array.isArray(list) && list.length > 0) {
              const matched = list.find(item => 
                item.user_video_twin_id === twinIdForList || 
                item.video_twin_id === twinIdForList ||
                item.user_video_twin_id === userVideoTwinId
              );
              
              if (matched) {
                a2eAnchorId = matched._id;
                console.log('✅ Found matching anchor by twin ID:', a2eAnchorId);
              } else {
                // If no match found, use the most recent one (first in list)
                a2eAnchorId = list[0]._id;
                console.log('✅ Using most recent anchor ID:', a2eAnchorId);
              }
            }
            
            console.log('🎯 Final anchor ID:', a2eAnchorId);
          }
          } catch (e) {
            console.warn('A2E anchor lookup warning:', e.response?.data || e.message);
          }
          
          if (!a2eAnchorId) {
            throw new Error('Could not retrieve anchor ID from A2E.');
          }

          // Step 6: Save Avatar
          console.log('\n--- STEP 6: SAVING AVATAR ---');
          await job.updateProgress(95, 'Saving avatar...');
          
          // Convert base64 to buffer for storage
          const imageBuffer = Buffer.from(imageBase64.split(',')[1], 'base64');
          
          const avatar = await Avatar.create({
            user: job.user,
            prompt: enhancedPrompt,
            originalPrompt: originalPrompt,
            imageData: imageBuffer,
            contentType: 'image/png',
            filename: `avatar_${Date.now()}.png`,
            size: imageBuffer.length,
            width, 
            height,
            metadata: { 
              provider: 'a2e', 
              source: 'text-to-avatar', 
              a2eAnchorId, 
              a2eUserVideoTwinId: userVideoTwinId, 
              a2eTrainingTaskId: trainingTaskId 
            }
          });

          } catch (trainingError) {
            console.log('❌ Avatar training failed:', trainingError.message);
            throw trainingError;
          }
        }

        // Common avatar saving logic for both quickAdd and training paths
        console.log('\n--- STEP 6: SAVING AVATAR ---');
        await job.updateProgress(95, 'Saving avatar...');
        
        // Convert base64 to buffer for storage
        const imageBuffer = Buffer.from(imageBase64.split(',')[1], 'base64');
        
        const avatar = await Avatar.create({
          user: job.user,
          prompt: enhancedPrompt,
          originalPrompt: originalPrompt,
          imageData: imageBuffer,
          contentType: 'image/png',
          filename: `avatar_${Date.now()}.png`,
          size: imageBuffer.length,
          width, 
          height,
          metadata: { 
            provider: 'a2e',
            a2eAnchorId: a2eAnchorId,
            characterType: 'avatar',
            source: 'text-to-avatar', 
            a2eUserVideoTwinId: userVideoTwinId, 
            a2eTrainingTaskId: trainingTaskId,
            usedQuickAdd: useQuickAdd
          }
        });

        await job.complete([{ 
          url: avatar.getAvatarUrl(), 
          id: avatar._id, 
          imageId: avatar._id, 
          metadata: { a2eAnchorId, a2eUserVideoTwinId: userVideoTwinId, a2eTrainingTaskId: trainingTaskId, usedQuickAdd: useQuickAdd } 
        }]);
        
        console.log('✅ Avatar creation completed successfully!');
        console.log('🎉 Avatar ID:', avatar._id);
        console.log('🔗 Avatar URL:', avatar.getAvatarUrl());
        console.log('⚡ Used quickAddAvatar:', useQuickAdd);
        console.log('🎯 Required Metadata Fields Saved:');
        console.log('  - provider:', 'a2e');
        console.log('  - a2eAnchorId:', a2eAnchorId);
        console.log('  - characterType:', 'avatar');
        console.log('🔧 Additional A2E Metadata:');
        console.log('  - a2eUserVideoTwinId:', userVideoTwinId);
        console.log('  - a2eTrainingTaskId:', trainingTaskId);
        console.log('  - A2E Compatible:', !!(a2eAnchorId));
        
        if (!a2eAnchorId) {
          console.log('⚠️ WARNING: Avatar created WITHOUT A2E anchor ID!');
          console.log('⚠️ This avatar will NOT be compatible with video generation!');
        }

  } catch (error) {
        console.log('\n❌ === AVATAR GENERATION ERROR ===');
        console.log('Error message:', error.message);
        console.log('Error stack:', error.stack);
        console.log('Response status:', error.response?.status);
        console.log('Response data:', JSON.stringify(error.response?.data, null, 2));
        console.log('Job ID:', jobId);
        console.log('Job status before error:', job?.status);
        
        if (job) {
            console.log('🔄 Marking job as failed...');
            await job.fail(error.message);
            console.log('✅ Job marked as failed');
        }
        console.log('=== AVATAR GENERATION ERROR END ===\n');
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
          a2eAnchorId: null,
          characterType: 'avatar',
          generationTime: image.metadata?.generationTime || 0,
          originalPrompt: image.prompt,
          source: 'saved-from-image',
          originalImageId: imageId, // Track the original image ID
          savedFromImage: true,
          // Note: This avatar is NOT A2E-compatible since it wasn't trained with A2E
          // Users need to create new avatars through the avatar generation process
          // to get A2E-compatible avatars for video generation
          a2eCompatible: false
        }
    });

    console.log('⚠️ Avatar saved from existing image - NOT A2E compatible');
    console.log('🎯 Avatar ID:', avatar._id);
    console.log('💡 To create A2E-compatible avatars, use the avatar generation process instead');

    res.status(201).json({
      success: true,
      message: 'Image saved to avatars collection successfully (Note: Not A2E-compatible for video generation)',
      data: {
        avatarId: avatar._id,
        avatarUrl: avatar.getAvatarUrl(),
        prompt: avatar.prompt,
        isA2ECompatible: false // Explicitly indicate this is not A2E compatible
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

// @desc    Migrate existing avatars to be A2.E compatible
// @route   POST /api/avatars/migrate-to-a2e
// @access  Private
const migrateAvatarsToA2E = async (req, res) => {
    try {
        const avatarsToMigrate = await Avatar.find({
            user: req.user._id,
            'metadata.a2eAnchorId': { $exists: false }
        });

        if (avatarsToMigrate.length === 0) {
            return res.status(200).json({ success: true, message: 'All avatars are already A2.E compatible.' });
        }

        let migratedCount = 0;
        const a2eConfig = { apiKey: process.env.A2E_API_KEY };

        for (const avatar of avatarsToMigrate) {
            try {
                const avatarImageUrl = avatar.getAvatarUrl();

                const registrationResponse = await axios.post(
                    'https://api.a2e.ai/api/v1/userVideoTwin/startTraining',
                    {
                        name: `migrated_avatar_${avatar._id}`,
                        gender: 'female', // A2E requires a gender
                        image_url: avatarImageUrl,
                        image_backgroud_color: 'rgb(255,255,255)'
                    },
                    {
                        headers: { 'Authorization': `Bearer ${a2eConfig.apiKey}`, 'Content-Type': 'application/json' },
                        timeout: 60000
                    }
                );

                if (registrationResponse.data.code === 0) {
                    const a2eAnchorId = registrationResponse.data.data._id;
                    avatar.metadata.a2eAnchorId = a2eAnchorId;
                    await avatar.save();
                    migratedCount++;
                } else {
                    console.warn(`Failed to migrate avatar ${avatar._id}: ${registrationResponse.data.message || JSON.stringify(registrationResponse.data)}`);
                }
            } catch (err) {
                console.error(`Error migrating avatar ${avatar._id}:`, err.message);
            }
        }

        res.status(200).json({
            success: true,
            message: `Migration complete. Migrated ${migratedCount} out of ${avatarsToMigrate.length} avatars.`,
            data: {
                totalFound: avatarsToMigrate.length,
                migrated: migratedCount
            }
        });

    } catch (error) {
        console.error('Avatar migration error:', error);
        res.status(500).json({ success: false, message: 'Avatar migration failed', error: error.message });
    }
};

// Main async processor for image-to-avatar generation
const processAvatarGenerationImage = async (jobId, params) => {
  console.log('\n🚀 === ASYNC IMAGE-TO-AVATAR GENERATION START ===');
  console.log('Job ID:', jobId);
  console.log('Params:', JSON.stringify(params, null, 2));
  
  const job = await GenerationJob.findById(jobId);
  try {
    if (!job) {
      console.log('❌ Job not found:', jobId);
      return;
    }
    
    await job.start();
    await job.updateProgress(5, 'Starting avatar creation from image...');
    
    const { imageUrl, gender, name } = params;
    console.log('📸 Image URL:', imageUrl);
    console.log('👤 Gender:', gender);
    console.log('📝 Name:', name);

    // Validate image URL format
    if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
      throw new Error(`Invalid image URL format: ${imageUrl}. Must be a valid HTTP/HTTPS URL.`);
    }

    // Step 1: Register Image as A2E Avatar to get training task
    console.log('\n--- STEP 1: STARTING AVATAR TRAINING ---');
    await job.updateProgress(20, 'Starting avatar training...');
    
    // Use provided gender or default based on character settings
    const avatarGender = gender || (job.characterSettings?.gender === 'male' ? 'male' : 'female');
    const trainingPayload = {
      name: name || `avatar_from_img_${Date.now()}`,
      gender: avatarGender,
      image_url: imageUrl,
      video_backgroud_color: 'rgb(255,255,255)', // Corrected parameter name
      model_version: 'V2.1' // Use latest model version
    };
    
    console.log('👤 Using gender for A2E training:', avatarGender);
    
    console.log('📤 Training payload:', JSON.stringify(trainingPayload, null, 2));
    console.log('🔗 Training URL:', `${A2E_VIDEO_BASE_URL}/userVideoTwin/startTraining`);
    
    let trainingResponse;
    try {
      trainingResponse = await withRetries(() => axiosA2E.post(`${A2E_VIDEO_BASE_URL}/userVideoTwin/startTraining`, trainingPayload, { 
        headers: { 'Authorization': `Bearer ${A2E_API_KEY}`, 'Content-Type': 'application/json', 'x-lang': 'en-US' } 
      }));
      console.log('✅ Primary endpoint successful');
    } catch (err) {
      console.log('⚠️ Primary endpoint failed:', err.message);
      if (err.response) {
        console.log('Error status:', err.response.status);
        console.log('Error data:', JSON.stringify(err.response.data, null, 2));
      }
      
      const alt = pickAltVideoBase(A2E_VIDEO_BASE_URL);
      console.warn('🔄 Retrying A2E training using alternate base:', alt);
      
      trainingResponse = await withRetries(() => axiosA2E.post(`${alt}/userVideoTwin/startTraining`, trainingPayload, { 
        headers: { 'Authorization': `Bearer ${A2E_API_KEY}`, 'Content-Type': 'application/json', 'x-lang': 'en-US' } 
      }));
      A2E_VIDEO_BASE_URL = alt;
      console.log('✅ Alternate endpoint successful');
    }

    console.log('📨 Training response:', JSON.stringify(trainingResponse.data, null, 2));

    if (trainingResponse.data.code !== 0) {
      const errorMsg = `A2E avatar training start failed: ${trainingResponse.data.message || JSON.stringify(trainingResponse.data)}`;
      console.log('❌ Training failed:', errorMsg);
      throw new Error(errorMsg);
    }
    
    const trainingTaskId = trainingResponse.data.data._id;
    job.metadata = job.metadata || {};
    job.metadata.a2eTrainingTaskId = trainingTaskId;
    await job.save();

    // Step 2: Poll for training completion
    await job.updateProgress(40, 'Training avatar model...');
    let trainingStatus = 'initialized';
    let userVideoTwinId = null;
    
    for (let i = 0; i < 120; i++) { // Poll for up to 10 minutes
      await new Promise(resolve => setTimeout(resolve, 5000));
      let statusResponse;
      try {
        statusResponse = await withRetries(() => axiosA2E.get(`${A2E_VIDEO_BASE_URL}/userVideoTwin/${trainingTaskId}`, { 
          headers: { 'Authorization': `Bearer ${A2E_API_KEY}` } 
        }));
      } catch (err) {
        const alt = pickAltVideoBase(A2E_VIDEO_BASE_URL);
        console.warn('Retrying A2E status using alternate base:', alt);
        statusResponse = await withRetries(() => axiosA2E.get(`${alt}/userVideoTwin/${trainingTaskId}`, { 
          headers: { 'Authorization': `Bearer ${A2E_API_KEY}` } 
        }));
        A2E_VIDEO_BASE_URL = alt;
      }
      
      const statusData = statusResponse.data?.data || {};
      trainingStatus = statusData.current_status;
      userVideoTwinId = statusData.user_video_twin_id || statusData.video_twin_id || userVideoTwinId;
      
      if (trainingStatus === 'completed') break;
      if (trainingStatus === 'failed') {
        throw new Error(`A2E avatar training failed: ${statusData.failed_message || 'unknown error'}`);
      }
      
      // Update progress based on training status
      const progressMap = {
        'initialized': 40,
        'processing': 60,
        'training': 70,
        'generating': 80
      };
      const currentProgress = progressMap[trainingStatus] || 50;
      await job.updateProgress(currentProgress, `Training status: ${trainingStatus}`);
    }
    
    if (trainingStatus !== 'completed') {
      throw new Error('A2E avatar training timed out.');
    }

    // Step 3: Get the Anchor ID
    await job.updateProgress(90, 'Getting avatar anchor ID...');
    const isValidObjectId = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);
    const twinIdForList = isValidObjectId(userVideoTwinId) ? userVideoTwinId : (isValidObjectId(trainingTaskId) ? trainingTaskId : null);
    
    let a2eAnchorId = null;
    try {
      const url = twinIdForList
        ? `${A2E_VIDEO_BASE_URL}/anchor/character_list?user_video_twin_id=${twinIdForList}&type=custom`
        : `${A2E_VIDEO_BASE_URL}/anchor/character_list?type=custom`;
      
      let characterListResponse;
      try {
        characterListResponse = await withRetries(() => axiosA2E.get(url, { 
          headers: { 'Authorization': `Bearer ${A2E_API_KEY}` } 
        }));
      } catch (err) {
        const alt = pickAltVideoBase(A2E_VIDEO_BASE_URL);
        const altUrl = url.replace(A2E_VIDEO_BASE_URL, alt);
        console.warn('Retrying A2E anchor list using alternate base:', altUrl);
        characterListResponse = await withRetries(() => axiosA2E.get(altUrl, { 
          headers: { 'Authorization': `Bearer ${A2E_API_KEY}` } 
        }));
        A2E_VIDEO_BASE_URL = alt;
      }
      
      if (characterListResponse.data.code === 0) {
        const list = characterListResponse.data.data?.list || [];
        const matched = list.find(item => item.user_video_twin_id === twinIdForList || item.video_twin_id === twinIdForList);
        a2eAnchorId = (matched && matched._id) || (list[0] && list[0]._id) || null;
      }
    } catch (e) {
      console.warn('A2E anchor lookup warning:', e.response?.data || e.message);
    }
    
    if (!a2eAnchorId) {
      throw new Error('Could not retrieve anchor ID from A2E.');
    }

    // Step 4: Download the original image and create Avatar
    await job.updateProgress(95, 'Saving avatar...');
    const finalImageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(finalImageResponse.data, 'binary');

    const avatar = await Avatar.create({
      user: job.user,
      prompt: `Avatar created from uploaded image`,
      originalPrompt: 'Image upload',
      imageData: imageBuffer,
      contentType: 'image/png',
      filename: `avatar_${Date.now()}.png`,
      size: imageBuffer.length,
      width: 512,
      height: 512,
      metadata: {
        provider: 'a2e',
        a2eAnchorId: a2eAnchorId,
        characterType: 'avatar',
        source: 'image-to-avatar',
        a2eUserVideoTwinId: userVideoTwinId,
        a2eTrainingTaskId: trainingTaskId
      }
    });

    await job.complete([{ 
      url: avatar.getAvatarUrl(), 
      id: avatar._id, 
      imageId: avatar._id, 
      metadata: { a2eAnchorId, a2eUserVideoTwinId: userVideoTwinId, a2eTrainingTaskId: trainingTaskId } 
    }]);
    
    console.log('✅ Avatar from image job completed:', String(job._id));
    console.log('🎯 Required Metadata Fields Saved:');
    console.log('  - provider:', 'a2e');
    console.log('  - a2eAnchorId:', a2eAnchorId);
    console.log('  - characterType:', 'avatar');
    console.log('🔧 Additional A2E Metadata:');
    console.log('  - a2eUserVideoTwinId:', userVideoTwinId);
    console.log('  - a2eTrainingTaskId:', trainingTaskId);
    console.log('  - A2E Compatible:', !!(a2eAnchorId));

  } catch (error) {
    console.error('Avatar generation from image process error:', { 
      status: error.response?.status, 
      data: error.response?.data, 
      message: error.message 
    });
    if (job) await job.fail(error.message);
  }
};


// @desc    Test avatar generation endpoint
// @route   POST /api/avatars/test
// @access  Private
const testAvatarGeneration = async (req, res) => {
  try {
    console.log('\n=== AVATAR TEST ENDPOINT ===');
    console.log('User:', req.user._id);
    console.log('Body:', req.body);
    
    // Test database connection
    console.log('Testing database connection...');
    const testJob = await GenerationJob.create({
      user: req.user._id,
      type: 'test',
      status: 'pending',
      parameters: { test: true },
      provider: 'test'
    });
    console.log('✅ Database connection works, test job ID:', testJob._id);
    
    // Clean up test job
    await GenerationJob.findByIdAndDelete(testJob._id);
    console.log('✅ Test job cleaned up');
    
    // Test A2E API connection
    console.log('Testing A2E API connection...');
    const testResponse = await axios.get(`${A2E_VIDEO_BASE_URL}/anchor/character_list?type=custom`, {
      headers: { 'Authorization': `Bearer ${A2E_API_KEY}` },
      timeout: 10000
    });
    console.log('✅ A2E API connection works, response code:', testResponse.data.code);
    
    res.json({
      success: true,
      message: 'Avatar generation system test passed',
      data: {
        database: 'connected',
        a2eApi: 'connected',
        environment: {
          a2eApiKey: !!A2E_API_KEY,
          a2eBaseUrl: A2E_VIDEO_BASE_URL,
          openrouterKey: !!OPENROUTER_API_KEY
        }
      }
    });
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Avatar generation system test failed',
      error: error.message
    });
  }
};

module.exports = {
  generateAvatar,
  generateAvatarFromImage,
  getAvatarJob,
  getUserAvatars,
  getA2ECompatibleAvatars,
  getAvatar,
  deleteAvatar,
  serveAvatar,
  saveImageToAvatars,
  migrateAvatarsToA2E,
  testAvatarGeneration
};




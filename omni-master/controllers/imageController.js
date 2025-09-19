const GenerationJob = require('../models/GenerationJob');
const Character = require('../models/Character');
const Image = require('../models/Image');
const axios = require('axios');
const { HfInference } = require('@huggingface/inference');

// Image generation API configurations
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

// @desc    Generate image
// @route   POST /api/images/generate
// @access  Private (Premium)
const generateImage = async (req, res) => {
  try {
    console.log('=== IMAGE CONTROLLER DEBUG BOX ===');
    console.log('Function: generateImage');
    console.log('Request body:', req.body);
    console.log('User ID:', req.user?._id);
    console.log('==================================');
    
    const {
      prompt,
      negativePrompt,
      style,
      aspectRatio = '1:1',
      characterId
    } = req.body;

    // Validate required fields
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required'
      });
    }

    // Check available API keys
    console.log('=== API KEY CHECK ===');
    console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    console.log('HF_TOKEN exists:', !!process.env.HF_TOKEN);
    console.log('OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY);
    console.log('STABILITY_API_KEY exists:', !!process.env.STABILITY_API_KEY);
    console.log('REPLICATE_API_KEY exists:', !!process.env.REPLICATE_API_KEY);
    console.log('========================');

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

    let enhancedPrompt = prompt;

    // If character is specified, enhance prompt with character details
    if (characterId) {
      const character = await Character.findOne({
        _id: characterId,
        user: req.user._id
      });

      if (!character) {
        return res.status(404).json({
          success: false,
          message: 'Character not found'
        });
      }

      // Enhance prompt with character details
      enhancedPrompt = `${character.imageGenPrompt}, ${prompt}`;

      // Increment character usage
      await character.incrementUsage();
    }

    // Create generation job
    const job = await GenerationJob.create({
      user: req.user._id,
      type: 'image',
      status: 'pending',
      parameters: {
        prompt: enhancedPrompt,
        aspectRatio,
        style,
        negativePrompt
      },
      provider: provider
    });

    // Start image generation process asynchronously
    processImageGeneration(job._id, {
      prompt: enhancedPrompt,
      aspectRatio,
      style,
      negativePrompt,
      provider
    });

    res.status(202).json({
      success: true,
      data: {
        jobId: job._id,
        status: job.status,
        message: 'Image generation started',
        estimatedTime: '30-60 seconds',
        prompt: enhancedPrompt,
        aspectRatio,
        style
      }
    });

  } catch (error) {
    console.error('Generate image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate image',
      error: error.message
    });
  }
};

// @desc    Get image generation job status
// @route   GET /api/images/job/:id
// @access  Private
const getImageJob = async (req, res) => {
  try {
    const job = await GenerationJob.findOne({
      _id: req.params.id,
      user: req.user._id,
      type: 'image'
    }).populate('characters.characterId', 'name imageUrl');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Image generation job not found'
      });
    }

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Get image job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get image job',
      error: error.message
    });
  }
};

// @desc    Get user's image generation history
// @route   GET /api/images/history
// @access  Private
const getImageHistory = async (req, res) => {
  try {
    const { limit = 20, status } = req.query;

    const query = {
      user: req.user._id,
      type: 'image'
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
    console.error('Get image history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get image history',
      error: error.message
    });
  }
};

// @desc    Cancel image generation job
// @route   POST /api/images/job/:id/cancel
// @access  Private
const cancelImageJob = async (req, res) => {
  try {
    const job = await GenerationJob.findOne({
      _id: req.params.id,
      user: req.user._id,
      type: 'image'
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Image generation job not found'
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
      message: 'Image generation job cancelled',
      data: job
    });
  } catch (error) {
    console.error('Cancel image job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel image job',
      error: error.message
    });
  }
};

// Helper function to process image generation
const processImageGeneration = async (jobId, params) => {
  try {
    console.log('=== PROCESSING IMAGE GENERATION ===');
    console.log('Job ID:', jobId);
    console.log('Params:', params);
    console.log('Provider:', params.provider || DEFAULT_PROVIDER);
    console.log('==================================');

    const job = await GenerationJob.findById(jobId);
    if (!job) {
      console.error('Job not found:', jobId);
      return;
    }

    await job.start();
    console.log('Job started successfully');

    let imageUrl = '';
    const provider = params.provider || DEFAULT_PROVIDER;

    console.log('Generating image with provider:', provider);

    // Generate image based on provider
    switch (provider) {
      case 'openrouter':
        console.log('Using OpenRouter (fallback)');
        imageUrl = await generateWithOpenRouter(params);
        break;
      case 'openai':
        console.log('Using OpenAI DALL-E');
        imageUrl = await generateWithOpenAI(params);
        break;
      case 'huggingface':
        console.log('Using Hugging Face');
        imageUrl = await generateWithHuggingFace(params);
        break;
      case 'stability':
        console.log('Using Stability AI');
        imageUrl = await generateWithStability(params);
        break;
      case 'replicate':
        console.log('Using Replicate');
        imageUrl = await generateWithReplicate(params);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    console.log('Image generated successfully, URL length:', imageUrl?.length);

    // Save image to database
    let savedImage = null;
    if (imageUrl && imageUrl.startsWith('data:image/')) {
      try {
        // Extract base64 data from data URL
        const base64Data = imageUrl.split(',')[1];
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        console.log('Saving image to database:', {
          originalUrlLength: imageUrl.length,
          base64DataLength: base64Data.length,
          bufferLength: imageBuffer.length,
          bufferStart: imageBuffer.slice(0, 10).toString('hex')
        });
        
        // Determine image format and dimensions
        const getImageFormat = (buffer) => {
          if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
            return { format: 'png', extension: 'png', mimeType: 'image/png' };
          } else if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
            return { format: 'jpeg', extension: 'jpg', mimeType: 'image/jpeg' };
          } else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
            return { format: 'gif', extension: 'gif', mimeType: 'image/gif' };
          } else {
            return { format: 'png', extension: 'png', mimeType: 'image/png' }; // Default fallback
          }
        };
        
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
        
        const { width, height } = getDimensions(params.aspectRatio);
        const imageFormat = getImageFormat(imageBuffer);
        
        // Create image record in database
        savedImage = await Image.create({
          user: job.user,
          prompt: params.prompt,
          negativePrompt: params.negativePrompt || '',
          imageData: imageBuffer,
          contentType: imageFormat.mimeType,
          filename: `generated-image-${Date.now()}.${imageFormat.extension}`,
          size: imageBuffer.length,
          width,
          height,
          settings: {
            style: params.style || 'realistic',
            quality: 'high',
            aspectRatio: params.aspectRatio,
            seed: params.seed,
            model: 'stable-diffusion-xl',
            steps: 30,
            guidance: 7.5
          },
          metadata: {
            provider,
            generationTime: Date.now() - job.timing.startedAt.getTime(),
            originalPrompt: params.prompt
          }
        });
        
        console.log('Image saved to database with ID:', savedImage._id);
        
        // Update imageUrl to use the database URL
        imageUrl = savedImage.getImageUrl();
        
      } catch (error) {
        console.error('Error saving image to database:', error);
        // Continue with base64 URL if database save fails
      }
    }

    // Complete job with result
    await job.complete([{
      url: imageUrl,
      filename: `generated-image-${Date.now()}.png`,
      format: 'png',
      size: savedImage ? savedImage.size : 1024000,
      metadata: {
        prompt: params.prompt,
        provider,
        style: params.style,
        aspectRatio: params.aspectRatio,
        imageId: savedImage ? savedImage._id : null
      }
    }]);

    console.log('Job completed successfully');

  } catch (error) {
    console.error('Image generation process error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      provider: params.provider || DEFAULT_PROVIDER
    });
    
    const job = await GenerationJob.findById(jobId);
    if (job) {
      await job.fail(error.message);
    }
  }
};

// OpenRouter integration - fallback to OpenAI DALL-E
const generateWithOpenRouter = async (params) => {
  // OpenRouter doesn't directly support DALL-E, so we'll use OpenAI directly
  // if OPENAI_API_KEY is available, otherwise fall back to Hugging Face
  if (process.env.OPENAI_API_KEY) {
    return await generateWithOpenAI(params);
  } else if (process.env.HF_TOKEN) {
    return await generateWithHuggingFace(params);
  } else {
    throw new Error('No image generation API available. Please set OPENAI_API_KEY or HF_TOKEN');
  }
};

// OpenAI DALL-E integration
const generateWithOpenAI = async (params) => {
  const config = IMAGE_APIS.openai;

  const response = await axios.post(
    `${config.baseUrl}/images/generations`,
    {
      model: config.model,
      prompt: params.prompt,
      size: getOpenAISize(params.aspectRatio),
      quality: 'standard',
      n: 1
    },
    {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    }
  );

  return response.data.data[0].url;
};

// Hugging Face integration
const generateWithHuggingFace = async (params) => {
  console.log('=== HUGGING FACE IMAGE GENERATION ===');
  console.log('HF_TOKEN exists:', !!process.env.HF_TOKEN);
  console.log('HF_TOKEN length:', process.env.HF_TOKEN?.length || 0);
  console.log('Parameters:', params);
  
  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) {
    throw new Error('HF_TOKEN is not set in environment variables');
  }

  try {
    const hf = new HfInference(hfToken);
    console.log('Hugging Face client initialized');

    // Generate image using Hugging Face
    console.log('Starting image generation with model: stabilityai/stable-diffusion-xl-base-1.0');
    const blob = await hf.textToImage({
      model: 'stabilityai/stable-diffusion-xl-base-1.0',
      inputs: params.prompt,
      parameters: {
        negative_prompt: params.negativePrompt || '',
        width: 1024,
        height: 1024,
        num_inference_steps: 30,
        guidance_scale: 7.5,
        ...(params.seed !== undefined ? { seed: params.seed } : {})
      }
    });

    console.log('Image generation completed, blob size:', blob.size);
    console.log('Blob type:', blob.type);

    // Convert blob to base64
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;
    
    console.log('Base64 conversion completed, data URL length:', dataUrl.length);
    return dataUrl;
  } catch (error) {
    console.error('Hugging Face generation error:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      status: error.status,
      statusText: error.statusText
    });
    throw new Error(`Hugging Face generation failed: ${error.message}`);
  }
};

// Stability AI integration
const generateWithStability = async (params) => {
  const config = IMAGE_APIS.stability;

  const response = await axios.post(
    `${config.baseUrl}/generation/${config.model}/text-to-image`,
    {
      text_prompts: [{
        text: params.prompt,
        weight: 1
      }],
      cfg_scale: 7,
      height: 1024,
      width: 1024,
      samples: 1,
      steps: 20
    },
    {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 60000
    }
  );

  return response.data.artifacts[0].base64;
};

// Replicate integration
const generateWithReplicate = async (params) => {
  const config = IMAGE_APIS.replicate;

  const response = await axios.post(
    `${config.baseUrl}/predictions`,
    {
      version: config.model.split(':')[1],
      input: {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt || '',
        width: 1024,
        height: 1024,
        num_outputs: 1
      }
    },
    {
      headers: {
        'Authorization': `Token ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    }
  );

  // For Replicate, we'd need to poll for completion
  // This is a simplified version
  return `https://replicate.com/api/predictions/${response.data.id}/output`;
};

// Helper function to get OpenAI image size
const getOpenAISize = (aspectRatio) => {
  switch (aspectRatio) {
    case '1:1':
      return '1024x1024';
    case '4:3':
      return '1024x768';
    case '3:4':
      return '768x1024';
    case '16:9':
      return '1024x576';
    case '9:16':
      return '576x1024';
    default:
      return '1024x1024';
  }
};

// Hugging Face text-to-image (SDXL)
const hfTextToImage = async (req, res) => {
  try {
    console.log('=== HF TEXT TO IMAGE DEBUG BOX ===');
    console.log('Function: hfTextToImage');
    console.log('Request body:', req.body);
    console.log('User ID:', req.user?._id);
    console.log('==================================');
    
    const modelParam = req.body?.model || 'sdxl';
    const hfToken = modelParam === 'sdxl'
      ? (process.env.HF_TOKEN_SDXL || process.env.HF_TOKEN)
      : (process.env.HF_TOKEN || process.env.HF_TOKEN_SDXL);
    if (!hfToken) return res.status(400).json({ success: false, message: 'HF_TOKEN is not set' });

    const {
      prompt,
      negativePrompt = '',
      width = 1024,
      height = 1024,
      steps = 30,
      guidance = 7.5,
      seed,
      style,
      quality
    } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, message: 'prompt is required' });
    }

    // Initialize Hugging Face inference
    const hf = new HfInference(hfToken);

    // Generate image using Hugging Face
    const blob = await hf.textToImage({
      model: modelParam === 'sdxl' ? 'stabilityai/stable-diffusion-xl-base-1.0' : 'runwayml/stable-diffusion-v1-5',
      inputs: prompt,
      parameters: {
        negative_prompt: negativePrompt || '',
        width,
        height,
        num_inference_steps: steps,
        guidance_scale: guidance,
        ...(seed !== undefined ? { seed } : {})
      }
    });

    // Convert blob to base64
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    // Save image to database
    let savedImage = null;
    try {
      const imageBuffer = Buffer.from(base64, 'base64');
      
      // Determine image format
      const getImageFormat = (buffer) => {
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
          return { format: 'png', extension: 'png', mimeType: 'image/png' };
        } else if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
          return { format: 'jpeg', extension: 'jpg', mimeType: 'image/jpeg' };
        } else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
          return { format: 'gif', extension: 'gif', mimeType: 'image/gif' };
        } else {
          return { format: 'png', extension: 'png', mimeType: 'image/png' };
        }
      };
      
      const imageFormat = getImageFormat(imageBuffer);
      
      savedImage = await Image.create({
        user: req.user._id,
        prompt,
        negativePrompt: negativePrompt || '',
        imageData: imageBuffer,
        contentType: imageFormat.mimeType,
        filename: `hf-generated-${Date.now()}.${imageFormat.extension}`,
        size: imageBuffer.length,
        width,
        height,
        settings: {
          style: style || 'realistic',
          quality: quality || 'high',
          aspectRatio: `${width}:${height}`,
          seed,
          model: modelParam,
          steps,
          guidance
        },
        metadata: {
          provider: 'huggingface',
          generationTime: 0,
          originalPrompt: prompt
        }
      });
      
      console.log('HF Image saved to database with ID:', savedImage._id);
    } catch (error) {
      console.error('Error saving HF image to database:', error);
    }

    res.status(200).json({
      success: true,
      message: 'Image generated successfully',
      data: {
        image: savedImage ? savedImage.getImageUrl() : dataUrl,
        imageId: savedImage ? savedImage._id : null,
        prompt,
        negativePrompt,
        width,
        height,
        steps,
        guidance,
        seed,
        model: modelParam,
        style,
        quality,
        aspectRatio: `${width}:${height}`
      }
    });
  } catch (error) {
    console.error('HF textToImage error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Generation failed' });
  }
};

// Hugging Face ControlNet image-to-image
const hfControlNet = async (req, res) => {
  try {
    const hfToken = process.env.HF_TOKEN_CONTROLNET || process.env.HF_TOKEN;
    if (!hfToken) return res.status(400).json({ success: false, message: 'HF_TOKEN is not set' });
    if (!req.file) return res.status(400).json({ success: false, message: 'controlImage file is required' });

    const prompt = req.body.prompt || '';
    const steps = Number(req.body.steps ?? 30);
    const guidance = Number(req.body.guidance ?? 7.0);
    const cScale = Number(req.body.cScale ?? 1.0);
    const seed = req.body.seed !== undefined ? Number(req.body.seed) : undefined;

    // Initialize Hugging Face inference
    const hf = new HfInference(hfToken);

    // Convert uploaded file to base64
    const controlImageBase64 = req.file.buffer.toString('base64');
    const controlImageDataUrl = `data:${req.file.mimetype};base64,${controlImageBase64}`;

    // Generate image using Hugging Face ControlNet
    const blob = await hf.imageToImage({
      model: 'lllyasviel/sd-controlnet-canny',
      inputs: {
        image: controlImageDataUrl,
        prompt: prompt
      },
      parameters: {
        num_inference_steps: steps,
        guidance_scale: guidance,
        controlnet_conditioning_scale: cScale,
        ...(seed !== undefined ? { seed } : {})
      }
    });

    // Convert blob to base64
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    // Save image to database
    let savedImage = null;
    try {
      const imageBuffer = Buffer.from(base64, 'base64');
      
      // Determine image format
      const getImageFormat = (buffer) => {
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
          return { format: 'png', extension: 'png', mimeType: 'image/png' };
        } else if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
          return { format: 'jpeg', extension: 'jpg', mimeType: 'image/jpeg' };
        } else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
          return { format: 'gif', extension: 'gif', mimeType: 'image/gif' };
        } else {
          return { format: 'png', extension: 'png', mimeType: 'image/png' };
        }
      };
      
      const imageFormat = getImageFormat(imageBuffer);
      
      savedImage = await Image.create({
        user: req.user._id,
        prompt,
        negativePrompt: '',
        imageData: imageBuffer,
        contentType: imageFormat.mimeType,
        filename: `controlnet-generated-${Date.now()}.${imageFormat.extension}`,
        size: imageBuffer.length,
        width: 1024,
        height: 1024,
        settings: {
          style: 'realistic',
          quality: 'high',
          aspectRatio: '1:1',
          seed,
          model: 'controlnet',
          steps,
          guidance
        },
        metadata: {
          provider: 'huggingface',
          generationTime: 0,
          originalPrompt: prompt,
          controlScale: cScale,
          controlImageSize: req.file.size
        }
      });
      
      console.log('ControlNet Image saved to database with ID:', savedImage._id);
    } catch (error) {
      console.error('Error saving ControlNet image to database:', error);
    }

    res.status(200).json({
      success: true,
      message: 'Image generated successfully',
      data: {
        image: savedImage ? savedImage.getImageUrl() : dataUrl,
        imageId: savedImage ? savedImage._id : null,
        prompt,
        steps,
        guidance,
        controlScale: cScale,
        seed,
        model: 'controlnet',
        controlImageSize: req.file.size,
        width: 1024,
        height: 1024,
        aspectRatio: '1:1'
      }
    });
  } catch (error) {
    console.error('HF ControlNet error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'ControlNet failed' });
  }
};

// @desc    Get image by ID (public endpoint for display)
// @route   GET /api/images/public/:id
// @access  Public (but validates ownership via token)
const getPublicImage = async (req, res) => {
  try {
    console.log('=== PUBLIC IMAGE REQUEST ===');
    console.log('Image ID:', req.params.id);
    console.log('Request URL:', req.url);
    console.log('Request headers:', req.headers);
    console.log('Request method:', req.method);
    
    const image = await Image.findById(req.params.id);

    if (!image) {
      console.log('Image not found in database');
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    console.log('Image found:', {
      id: image._id,
      prompt: image.prompt,
      size: image.size,
      contentType: image.contentType,
      bufferLength: image.imageData.length,
      bufferStart: image.imageData.slice(0, 10).toString('hex')
    });

    // Optional: Add token-based validation for additional security
    // For now, we'll make it truly public since images are generated by authenticated users
    // and stored with user association for tracking purposes

    // Set CORS headers for image serving
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
    res.set('Content-Type', image.contentType);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.set('Content-Length', image.size);
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    
    console.log('Sending image data...');
    console.log('Response headers being set:', {
      'Content-Type': image.contentType,
      'Content-Length': image.size,
      'Cache-Control': 'public, max-age=31536000'
    });
    
    res.send(image.imageData);
    
    console.log('Image served successfully');
  } catch (error) {
    console.error('Get public image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get image',
      error: error.message
    });
  }
};

// @desc    Get image by ID
// @route   GET /api/images/:id
// @access  Private
const getImage = async (req, res) => {
  try {
    console.log('=== GET IMAGE BY ID API CALLED ===');
    console.log('Image ID:', req.params.id);
    console.log('User ID:', req.user._id);
    console.log('Request URL:', req.url);
    console.log('Request path:', req.path);
    
    const image = await Image.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    res.set('Content-Type', image.contentType);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.set('Content-Length', image.size);
    res.send(image.imageData);
  } catch (error) {
    console.error('Get image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get image',
      error: error.message
    });
  }
};

// @desc    Get user's images
// @route   GET /api/images
// @access  Private
const getUserImages = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const images = await Image.findByUser(req.user._id, parseInt(limit) + skip)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Image.countDocuments({ user: req.user._id });

    console.log(`Found ${images.length} images for user ${req.user._id}, total: ${total}`);

    res.status(200).json({
      success: true,
      data: images,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get user images error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get images',
      error: error.message
    });
  }
};

// @desc    Delete image
// @route   DELETE /api/images/:id
// @access  Private
const deleteImage = async (req, res) => {
  try {
    const image = await Image.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message
    });
  }
};

// @desc    Get all images for user
// @route   GET /api/images
// @access  Private
const getAllImages = async (req, res) => {
  try {
    console.log('=== GET ALL IMAGES API CALLED ===');
    console.log('User ID:', req.user._id);
    console.log('Query params:', req.query);
    console.log('Request headers:', req.headers);
    console.log('Authorization header:', req.headers.authorization);
    
    const { page = 1, limit = 50, sort = 'createdAt', order = 'desc' } = req.query;
    
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const images = await Image.find({ user: req.user._id })
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-imageData') // Exclude image data for list view
      .lean();
    
    console.log('Found images:', images.length);
    
    const totalImages = await Image.countDocuments({ user: req.user._id });
    
    // Add imageUrl to each image
    const imagesWithUrls = images.map(image => ({
      ...image,
      imageUrl: `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/images/public/${image._id}`
    }));
    
    console.log('Sample image with URL:', imagesWithUrls[0]);
    console.log('Total images found:', totalImages);
    console.log('Images being returned:', imagesWithUrls.length);
    
    const response = {
      success: true,
      data: imagesWithUrls,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalImages / parseInt(limit)),
        totalImages,
        hasNext: skip + images.length < totalImages,
        hasPrev: parseInt(page) > 1
      }
    };
    
    console.log('Sending response:', JSON.stringify(response, null, 2));
    res.status(200).json(response);
  } catch (error) {
    console.error('Get all images error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get images',
      error: error.message
    });
  }
};

module.exports = {
  generateImage,
  getImageJob,
  getImageHistory,
  cancelImageJob,
  hfTextToImage,
  hfControlNet,
  getImage,
  getPublicImage,
  getUserImages,
  deleteImage,
  getAllImages
};

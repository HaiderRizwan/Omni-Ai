const GenerationJob = require('../models/GenerationJob');
const Character = require('../models/Character');
const Image = require('../models/Image');
const axios = require('axios');
const { saveBufferToUploads } = require('../utils/localUploader');
const { HfInference } = require('@huggingface/inference');

// Image generation API configurations
const IMAGE_APIS = {
  a2eTextToImage: {
    baseUrl: 'https://video.a2e.ai/api/v1',
    apiKey: process.env.A2E_API_KEY
  },
  a2eImageToVideo: {
    baseUrl: 'https://api.a2e.ai/api/v1',
    apiKey: process.env.A2E_API_KEY
  }
};

const DEFAULT_PROVIDER = 'a2e';

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
    console.log('A2E_API_KEY exists:', !!process.env.A2E_API_KEY);
    console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    console.log('HF_TOKEN exists:', !!process.env.HF_TOKEN);
    console.log('OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY);
    console.log('STABILITY_API_KEY exists:', !!process.env.STABILITY_API_KEY);
    console.log('REPLICATE_API_KEY exists:', !!process.env.REPLICATE_API_KEY);
    console.log('========================');

    // Only a2e provider
    if (!process.env.A2E_API_KEY) {
      return res.status(400).json({ success: false, message: 'A2E_API_KEY is required' });
    }
    const provider = 'a2e';

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
      case 'a2e':
        console.log('Using A2E Text-to-Image');
        imageUrl = await generateWithA2ETextToImage(params);
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
      provider: params.provider || DEFAULT_PROVIDER,
      a2e: error.response?.data || null
    });
    
    const job = await GenerationJob.findById(jobId);
    if (job) {
      await job.fail(error.message);
    }
  }
};

// Remove non-A2E providers for simplicity

// Helper function to pick alternate base URL
const pickAltImageBase = (current) => {
  if (current.includes('video.a2e.ai')) return 'https://video.a2e.com.cn/api/v1';
  return 'https://video.a2e.ai/api/v1';
};

// Helper function with retry logic for DNS issues
const withImageRetries = async (fn, { attempts = 3, delayMs = 1500 } = {}) => {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try { 
      return await fn(); 
    } catch (err) {
      lastErr = err;
      const msg = (err && err.message) || '';
      // Retry DNS/network errors
      if (/EAI_AGAIN|ENOTFOUND|ETIMEDOUT|ECONNRESET|EHOSTUNREACH|getaddrinfo/i.test(msg)) {
        console.log(`🔄 DNS/Network error, retrying ${i + 1}/${attempts}: ${msg}`);
        await new Promise(r => setTimeout(r, delayMs * (i + 1)));
        continue;
      }
      break;
    }
  }
  throw lastErr;
};

// A2E Text-to-Image integration using Nano Banana with fallback
const generateWithA2ETextToImage = async (params) => {
  console.log('🎨 === A2E TEXT-TO-IMAGE START ===');
  console.log('📝 Prompt:', params.prompt);
  
  let config = IMAGE_APIS.a2eTextToImage;
  console.log('🔗 Primary base URL:', config.baseUrl);
  
  let response;
  
  try {
    // Try primary endpoint with retries
    console.log('📡 Attempting primary endpoint...');
    response = await withImageRetries(() => axios.post(
      `${config.baseUrl}/userNanoBanana/start`,
      {
        name: "Omni-AI Generated Image",
        prompt: params.prompt
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    ));
    console.log('✅ Primary endpoint successful');
  } catch (primaryError) {
    console.log('⚠️ Primary endpoint failed:', primaryError.message);
    
    // Try alternate base URL
    const altBaseUrl = pickAltImageBase(config.baseUrl);
    console.log('🔄 Trying alternate base URL:', altBaseUrl);
    
    try {
      response = await withImageRetries(() => axios.post(
        `${altBaseUrl}/userNanoBanana/start`,
        {
          name: "Omni-AI Generated Image",
          prompt: params.prompt
        },
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000
        }
      ));
      
      // Update config to use working base URL
      config = { ...config, baseUrl: altBaseUrl };
      console.log('✅ Alternate endpoint successful');
    } catch (altError) {
      console.log('❌ Both endpoints failed');
      console.log('Primary error:', primaryError.message);
      console.log('Alternate error:', altError.message);
      throw new Error(`A2E API endpoints unreachable. Primary: ${primaryError.message}, Alternate: ${altError.message}`);
    }
  }

  console.log('📨 Response code:', response.data.code);
  console.log('📨 Response data:', JSON.stringify(response.data, null, 2));

  if (response.data.code !== 0) {
    console.error('A2E Nano Banana API Error:', response.data);
    throw new Error(`A2E API Error: ${response.data.message || 'Unknown error'}`);
  }

  // Poll for completion
  const taskId = response.data.data._id;
  console.log('🆔 Task ID:', taskId);
  
  for (let i = 0; i < 60; i++) {
    console.log(`🔄 Polling attempt ${i + 1}/60...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    let statusResponse;
    let statusData;
    
    try {
      // First try the direct Nano Banana status endpoint
      statusResponse = await withImageRetries(() => axios.get(
        `${config.baseUrl}/userNanoBanana/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`
          }
        }
      ));
      statusData = statusResponse.data.data || statusResponse.data;
      console.log(`📊 Direct status response ${i + 1}:`, JSON.stringify(statusResponse.data, null, 2));
    } catch (directError) {
      console.log(`⚠️ Direct status check failed, trying awsResult:`, directError.message);
      
      try {
        // Fallback to awsResult endpoint
        statusResponse = await withImageRetries(() => axios.post(
          `${config.baseUrl}/video/awsResult`,
          { _id: taskId },
          {
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        ));
        
        console.log(`📊 AwsResult response ${i + 1}:`, JSON.stringify(statusResponse.data, null, 2));
        
        // Check if data is an array (empty) or actual data
        if (Array.isArray(statusResponse.data.data) && statusResponse.data.data.length === 0) {
          console.log(`⚠️ AwsResult returned empty array, task may still be processing`);
          statusData = { current_status: 'processing' }; // Assume still processing
        } else {
          statusData = statusResponse.data.data;
        }
      } catch (awsError) {
        console.log(`⚠️ Both status endpoints failed:`, awsError.message);
        continue; // Skip this iteration
      }
    }
    
    const currentStatus = statusData?.status || statusData?.current_status;
    console.log(`📊 Current status: ${currentStatus}`);
    
    if (currentStatus === 'completed') {
      const imageUrl = statusData.result || statusData.url || statusData.image_url;
      
      if (imageUrl) {
        console.log('✅ Image generation completed! URL:', imageUrl);
        // Fetch the image content from the URL provided by A2E
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(imageResponse.data, 'binary').toString('base64');
        console.log('✅ Image downloaded and converted to base64');
        return `data:image/png;base64,${base64}`;
      } else {
        throw new Error('Image generation completed but no URL returned');
      }
    } else if (currentStatus === 'failed') {
      throw new Error(`Image generation failed: ${statusData.error || statusData.failed_message || 'unknown error'}`);
    } else {
      console.log(`⏳ Still processing... Status: ${currentStatus}`);
    }
  }
  
  throw new Error('Image generation timed out');
};


// A2E image-to-video integration
const generateWithA2EImageToVideo = async (params) => {
  const config = IMAGE_APIS.a2eImageToVideo;

  const response = await axios.post(
    `${config.baseUrl}/userVideoTwin/startTraining`,
    {
      name: "Omni-AI Generated Video",
      gender: "female", // Assuming a default gender for video generation
      image_url: params.imageUrl, // Assuming the image URL is passed in params
      image_backgroud_color: 'rgb(255,255,255)'
    },
    {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 600000 // Increased timeout for A2E
    }
  );

  console.log('A2E API Response:', JSON.stringify(response.data, null, 2));

  if (response.data.code !== 0 || !response.data.data) {
    throw new Error(`A2E API Error: ${response.data.message || 'Unknown error'}`);
  }

  return response.data.data.video_url; // Assuming the API returns a video URL
};

// A2E image editing or text-to-image via Nano Banana
const a2eNanoBananaStartInternal = async (payload) => {
  const config = IMAGE_APIS.a2eTextToImage; // Same base: video.a2e.ai/api/v1
  try {
    const response = await axios.post(
      `${config.baseUrl}/userNanoBanana/start`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    if (response.data.code !== 0) {
      console.error('A2E NanoBanana API error payload:', response.data);
      throw new Error(`A2E NanoBanana error: ${response.data.message || JSON.stringify(response.data)}`);
    }
    return response.data.data; // Task info
  } catch (err) {
    console.error('A2E NanoBanana axios error:', { status: err.response?.status, data: err.response?.data, message: err.message });
    throw err;
  }
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

// A2E image-to-video
const a2eImageToVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }

    const { name, gender } = req.body;

    // Upload image to a temporary storage and get the URL
    const imageUrl = await uploadImageAndGetUrl(req.file);

    const videoUrl = await generateWithA2EImageToVideo({ imageUrl, name, gender });

    res.status(200).json({
      success: true,
      message: 'Video generation started successfully',
      data: {
        videoUrl
      }
    });
  } catch (error) {
    console.error('A2E imageToVideo error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Video generation failed' });
  }
};

// Local upload helper
const uploadImageAndGetUrl = async (file) => {
  console.log('Uploading image:', file.originalname);
  return await saveBufferToUploads(file.originalname, file.buffer);
};

// @desc    A2E image editing or text-to-image (Nano Banana)
// @route   POST /api/images/a2e/edit
// @access  Private (Premium)
const a2eImageEdit = async (req, res) => {
  try {
    const { prompt, name } = req.body || {};

    const payload = {
      name: name || 'A2E Edit',
      prompt: prompt || ''
    };

    // Support editing with an input image via multipart or URL
    const inputImages = [];
    if (req.file) {
      const url = await uploadImageAndGetUrl(req.file);
      inputImages.push(url);
    }
    if (req.body?.inputImageUrl) {
      inputImages.push(req.body.inputImageUrl);
    }
    if (inputImages.length > 0) {
      payload.input_images = inputImages;
    }

    const task = await a2eNanoBananaStartInternal(payload);
    return res.status(202).json({ success: true, data: task });
  } catch (error) {
    console.error('A2E image edit error:', { status: error.response?.status, data: error.response?.data, message: error.message });
    return res.status(500).json({ success: false, message: error?.message || 'A2E edit failed' });
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
  getAllImages,
  a2eImageToVideo,
  a2eImageEdit,
  generateWithA2ETextToImage  // Export for reuse in avatar controller
};

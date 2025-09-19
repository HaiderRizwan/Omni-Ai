const Character = require('../models/Character');
const GenerationJob = require('../models/GenerationJob');
const axios = require('axios');

// Image generation API configuration (we'll use a placeholder for now)
// You can integrate with services like:
// - OpenAI DALL-E
// - Midjourney API
// - Stable Diffusion API
// - Replicate
const IMAGE_API_CONFIG = {
  provider: process.env.IMAGE_PROVIDER || 'openai',
  apiKey: process.env.IMAGE_API_KEY,
  baseUrl: process.env.IMAGE_BASE_URL
};

// @desc    Create new character
// @route   POST /api/characters
// @access  Private
const createCharacter = async (req, res) => {
  try {
    const characterData = {
      user: req.user._id,
      ...req.body
    };

    // Validate required fields
    if (!characterData.name || !characterData.description) {
      return res.status(400).json({
        success: false,
        message: 'Name and description are required'
      });
    }

    const character = await Character.create(characterData);

    // Generate initial character image if parameters are provided
    if (characterData.parameters && Object.keys(characterData.parameters).length > 0) {
      try {
        const imagePrompt = character.imageGenPrompt;
        // This will be implemented when we add image generation
        console.log('Character image prompt generated:', imagePrompt);
      } catch (error) {
        console.log('Image generation failed, continuing without image:', error.message);
      }
    }

    await character.populate('user', 'name email');

    res.status(201).json({
      success: true,
      data: character,
      message: 'Character created successfully'
    });
  } catch (error) {
    console.error('Create character error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A character with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create character',
      error: error.message
    });
  }
};

// @desc    Get user's characters
// @route   GET /api/characters
// @access  Private
const getCharacters = async (req, res) => {
  try {
    const { limit = 20, includeInactive = false } = req.query;

    const characters = await Character.findByUser(req.user._id, includeInactive)
      .limit(parseInt(limit))
      .sort({ lastUsed: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: characters,
      count: characters.length
    });
  } catch (error) {
    console.error('Get characters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get characters',
      error: error.message
    });
  }
};

// @desc    Get specific character
// @route   GET /api/characters/:id
// @access  Private
const getCharacter = async (req, res) => {
  try {
    const character = await Character.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }

    // Increment usage count
    await character.incrementUsage();

    res.status(200).json({
      success: true,
      data: character
    });
  } catch (error) {
    console.error('Get character error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get character',
      error: error.message
    });
  }
};

// @desc    Update character
// @route   PUT /api/characters/:id
// @access  Private
const updateCharacter = async (req, res) => {
  try {
    const updates = req.body;

    // Don't allow updating user field
    delete updates.user;

    const character = await Character.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }

    res.status(200).json({
      success: true,
      data: character,
      message: 'Character updated successfully'
    });
  } catch (error) {
    console.error('Update character error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A character with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update character',
      error: error.message
    });
  }
};

// @desc    Delete character
// @route   DELETE /api/characters/:id
// @access  Private
const deleteCharacter = async (req, res) => {
  try {
    const character = await Character.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Character deleted successfully'
    });
  } catch (error) {
    console.error('Delete character error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete character',
      error: error.message
    });
  }
};

// @desc    Generate character image
// @route   POST /api/characters/:id/generate-image
// @access  Private
const generateCharacterImage = async (req, res) => {
  try {
    const character = await Character.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }

    // Create generation job for image
    const job = await GenerationJob.create({
      user: req.user._id,
      type: 'image',
      status: 'queued',
      parameters: {
        prompt: character.imageGenPrompt,
        style: character.stylePreferences.artStyle || 'realistic',
        aspectRatio: '1:1',
        quality: 'high'
      },
      characters: [{
        characterId: character._id,
        role: 'main'
      }],
      provider: IMAGE_API_CONFIG.provider
    });

    // Start actual image generation process
    setTimeout(async () => {
      try {
        await job.start();
        await job.updateProgress(25, 'preparing');

        // Call the image generation API
        const imageResponse = await axios.post(`${process.env.API_BASE_URL || 'http://localhost:3001'}/api/images/generate`, {
          prompt: character.imageGenPrompt,
          aspectRatio: '1:1',
          style: 'character portrait'
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}`,
            'Content-Type': 'application/json'
          }
        });

        if (!imageResponse.data.success) {
          throw new Error(imageResponse.data.message || 'Image generation failed');
        }

        await job.updateProgress(75, 'generating');

        // For async generation, poll for completion
        let jobId = imageResponse.data.data.jobId;
        let jobStatus = imageResponse.data.data.status;
        let imageUrl = null;

        while (jobStatus === 'pending' || jobStatus === 'processing') {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const jobCheckResponse = await axios.get(`${process.env.API_BASE_URL || 'http://localhost:3001'}/api/images/job/${jobId}`, {
            headers: {
              'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}`
            }
          });

          if (jobCheckResponse.data.success) {
            jobStatus = jobCheckResponse.data.data.status;
            
            if (jobStatus === 'completed' && jobCheckResponse.data.data.results && jobCheckResponse.data.data.results.length > 0) {
              imageUrl = jobCheckResponse.data.data.results[0].url;
              break;
            } else if (jobStatus === 'failed') {
              throw new Error(jobCheckResponse.data.data.error || 'Image generation failed');
            }
          }
        }

        if (!imageUrl) {
          throw new Error('Image generation timed out');
        }

        await job.updateProgress(90, 'finalizing');

        await job.complete([{
          url: imageUrl,
          filename: `character-${character._id}.png`,
          format: 'png',
          size: 1024000,
          metadata: {
            width: 512,
            height: 512,
            prompt: character.imageGenPrompt
          }
        }]);

        // Update character with new image
        await character.updateImage(imageUrl, character.imageGenPrompt);

      } catch (error) {
        console.error('Character image generation error:', error);
        await job.fail(error.message);
      }
    }, 1000); // Start after 1 second

    res.status(202).json({
      success: true,
      data: {
        jobId: job._id,
        status: job.status,
        message: 'Image generation started'
      }
    });
  } catch (error) {
    console.error('Generate character image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate character image',
      error: error.message
    });
  }
};

// @desc    Get character usage statistics
// @route   GET /api/characters/:id/stats
// @access  Private
const getCharacterStats = async (req, res) => {
  try {
    const character = await Character.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }

    // Get usage statistics from generation jobs
    const stats = await GenerationJob.aggregate([
      {
        $match: {
          user: req.user._id,
          'characters.characterId': character._id
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        character: {
          id: character._id,
          name: character.name,
          usageCount: character.usageCount,
          lastUsed: character.lastUsed
        },
        statistics: stats
      }
    });
  } catch (error) {
    console.error('Get character stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get character statistics',
      error: error.message
    });
  }
};

// @desc    Duplicate character
// @route   POST /api/characters/:id/duplicate
// @access  Private
const duplicateCharacter = async (req, res) => {
  try {
    const originalCharacter = await Character.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!originalCharacter) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }

    const { name, ...duplicateData } = req.body;

    const duplicatedCharacter = await Character.create({
      user: req.user._id,
      name: name || `${originalCharacter.name} (Copy)`,
      description: originalCharacter.description,
      parameters: { ...originalCharacter.parameters },
      stylePreferences: { ...originalCharacter.stylePreferences },
      tags: [...originalCharacter.tags],
      ...duplicateData
    });

    await duplicatedCharacter.populate('user', 'name email');

    res.status(201).json({
      success: true,
      data: duplicatedCharacter,
      message: 'Character duplicated successfully'
    });
  } catch (error) {
    console.error('Duplicate character error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A character with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to duplicate character',
      error: error.message
    });
  }
};

module.exports = {
  createCharacter,
  getCharacters,
  getCharacter,
  updateCharacter,
  deleteCharacter,
  generateCharacterImage,
  getCharacterStats,
  duplicateCharacter
};

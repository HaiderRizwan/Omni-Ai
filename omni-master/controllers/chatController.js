const axios = require('axios');
const Chat = require('../models/Chat');

// Helper function to process messages and ensure image URLs are properly constructed
const processMessagesForImageUrls = (messages) => {
  return messages.map(message => {
    if (message.image) {
      // If image is already a full URL, keep it
      if (message.image.startsWith('http')) {
        return message;
      }
      // If image is a relative path or just an ID, construct full URL
      const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
      return {
        ...message,
        image: `${baseUrl}${message.image.startsWith('/') ? '' : '/'}${message.image}`
      };
    }
    return message;
  });
};

// OpenRouter configuration
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Neutral, general-purpose assistant system prompt
const NEUTRAL_SYSTEM_PROMPT = `You are a helpful, knowledgeable, and safe general-purpose AI assistant.

Goals:
- Understand the user's intent and ask clarifying questions when needed
- Be concise by default, with the option to go deeper when asked
- Provide accurate, up-to-date information when possible and clearly note uncertainty
- Be helpful across tasks: brainstorming, explaining, coding, data analysis, writing, and more
- Follow user preferences and format responses cleanly

Safety:
- Avoid harmful, illegal, or unsafe guidance; refuse respectfully when necessary
- Respect privacy and sensitive information
`;

// Helper function to handle image generation
const handleImageGeneration = async (chat, imagePrompt, imageStyle, req) => {
  // Set chat type to image and update title
  chat.chatType = 'image';
  if (!chat.title || chat.title === 'New Chat' || chat.title === 'Image Generation') {
    const titleBase = imagePrompt.slice(0, 50);
    const newTitle = titleBase && imagePrompt.length > 50 ? `${titleBase}...` : titleBase || 'Image Generation';
    chat.title = newTitle;
  }
  await chat.save();
  
  // Call the actual image generation API
  const imageResponse = await axios.post(`${process.env.API_BASE_URL || 'http://localhost:3001'}/api/images/generate`, {
    prompt: imagePrompt,
    aspectRatio: '1:1',
    style: imageStyle || 'realistic'
  }, {
    headers: {
      'Authorization': `Bearer ${req.headers.authorization?.replace('Bearer ', '')}`,
      'Content-Type': 'application/json'
    }
  });

  if (!imageResponse.data.success) {
    throw new Error(imageResponse.data.message || 'Image generation failed');
  }

  // For async generation, poll for completion
  let jobId = imageResponse.data.data.jobId;
  let jobStatus = imageResponse.data.data.status;
  let imageUrl = null;

  while (jobStatus === 'pending' || jobStatus === 'processing') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const jobCheckResponse = await axios.get(`${process.env.API_BASE_URL || 'http://localhost:3001'}/api/images/job/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${req.headers.authorization?.replace('Bearer ', '')}`
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

  return imageUrl;
};

// Helper function to handle avatar generation
const handleAvatarGeneration = async (chat, avatarPrompt, req) => {
  // Set chat type to avatar and update title
  chat.chatType = 'avatar';
  if (!chat.title || chat.title === 'New Chat' || chat.title === 'Avatar Generation') {
    const titleBase = avatarPrompt.slice(0, 50);
    const newTitle = titleBase && avatarPrompt.length > 50 ? `${titleBase}...` : titleBase || 'Avatar Generation';
    chat.title = newTitle;
  }
  await chat.save();
  
  // Call the actual avatar generation API
  const avatarResponse = await axios.post(`${process.env.API_BASE_URL || 'http://localhost:3001'}/api/avatars/generate`, {
    prompt: avatarPrompt,
    aspectRatio: '1:1',
    style: req.body.characterSettings?.style || 'realistic',
    characterSettings: req.body.characterSettings || {},
    customization: req.body.customization || {}
  }, {
    headers: {
      'Authorization': `Bearer ${req.headers.authorization?.replace('Bearer ', '')}`,
      'Content-Type': 'application/json'
    }
  });

  if (!avatarResponse.data.success) {
    throw new Error(avatarResponse.data.message || 'Avatar generation failed');
  }

  // For async generation, poll for completion
  let jobId = avatarResponse.data.data.jobId;
  let jobStatus = avatarResponse.data.data.status;
  let avatarUrl = null;
  let imageId = null;

  while (jobStatus === 'pending' || jobStatus === 'processing') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const jobCheckResponse = await axios.get(`${process.env.API_BASE_URL || 'http://localhost:3001'}/api/avatars/job/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${req.headers.authorization?.replace('Bearer ', '')}`
      }
    });

    if (jobCheckResponse.data.success) {
      jobStatus = jobCheckResponse.data.data.status;
      
      if (jobStatus === 'completed' && jobCheckResponse.data.data.results && jobCheckResponse.data.data.results.length > 0) {
        avatarUrl = jobCheckResponse.data.data.results[0].url;
        imageId = jobCheckResponse.data.data.results[0].imageId;
        break;
      } else if (jobStatus === 'failed') {
        throw new Error(jobCheckResponse.data.data.error || 'Avatar generation failed');
      }
    }
  }

  if (!avatarUrl) {
    throw new Error('Avatar generation timed out');
  }

  return { avatarUrl, imageId };
};

// @desc    Create new chat session
// @route   POST /api/chat
// @access  Private
const createChat = async (req, res) => {
  try {
    const { title, settings, chatType = 'text' } = req.body;

    const chat = await Chat.create({
      user: req.user._id,
      title: title || 'New Chat',
      chatType: chatType,
      settings: {
        ...settings
      }
    });

    await chat.populate('user', 'name email');

    res.status(201).json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create chat',
      error: error.message
    });
  }
};

// @desc    Get user's chat sessions
// @route   GET /api/chat
// @access  Private
const getChats = async (req, res) => {
  try {
    const { limit = 20, archived = false, chatType } = req.query;

    let chats;
    if (chatType) {
      chats = await Chat.findByType(req.user._id, chatType);
    } else {
      chats = await Chat.findActiveByUser(req.user._id, parseInt(limit));
    }

    // Process each chat to ensure image URLs are properly constructed
    const processedChats = chats.map(chat => {
      return {
        ...chat.toObject(),
        messages: processMessagesForImageUrls(chat.messages)
      };
    });

    res.status(200).json({
      success: true,
      data: processedChats,
      count: processedChats.length
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chats',
      error: error.message
    });
  }
};

// @desc    Get specific chat session
// @route   GET /api/chat/:id
// @access  Private
const getChat = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Process messages to ensure image URLs are properly constructed
    const chatWithProcessedMessages = {
      ...chat.toObject(),
      messages: processMessagesForImageUrls(chat.messages)
    };

    res.status(200).json({
      success: true,
      data: chatWithProcessedMessages
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat',
      error: error.message
    });
  }
};

// @desc    Send message to chat
// @route   POST /api/chat/:id/message
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { message, stream = false } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const chat = await Chat.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // If /image or /avatar command, handle it specially by calling generation API
    const isImageCommand = message.trim().toLowerCase().startsWith('/image');
    const isAvatarCommand = message.trim().toLowerCase().startsWith('/avatar');
    
    // Parse image command to separate prompt and style
    let imagePrompt = '';
    let imageStyle = '';
    
    if (isImageCommand) {
      const fullCommand = message.trim().slice(6).trim(); // Remove '/image '
      
      // Parse style from command (e.g., "image of dog, style: realistic")
      const styleMatch = fullCommand.match(/(.+?),\s*style:\s*(.+)/i);
      if (styleMatch) {
        imagePrompt = styleMatch[1].trim();
        imageStyle = styleMatch[2].trim();
      } else {
        imagePrompt = fullCommand;
        imageStyle = '';
      }
    }
    
    // Parse avatar command to separate prompt
    let avatarPrompt = '';
    
    if (isAvatarCommand) {
      avatarPrompt = message.trim().slice(7).trim(); // Remove '/avatar '
    }
    
    // Add user message to chat
    
    if (isImageCommand) {
      // For image commands, store the parsed prompt (style will be handled separately)
      await chat.addMessage('user', imagePrompt);
    } else if (isAvatarCommand) {
      // For avatar commands, store the parsed prompt
      await chat.addMessage('user', avatarPrompt);
    } else {
      // For regular messages, store as is
      await chat.addMessage('user', message.trim());
    }


    if (isImageCommand) {
      try {
        const imageUrl = await handleImageGeneration(chat, imagePrompt, imageStyle, req);
        
        // Create response with actual image
        const imageResponseText = `I've generated an image based on your prompt: "${imagePrompt}"${imageStyle ? ` with ${imageStyle} style` : ''}`;
        
        // Add message with image URL using the addMessage method
        await chat.addMessage('assistant', imageResponseText, [], {}, imageUrl);
        
        res.status(200).json({
          success: true,
          data: {
            message: imageResponseText,
            image: imageUrl,
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            model: 'image-generation',
            chat: {
              id: chat._id,
              title: chat.title
            }
          }
        });
        return;

      } catch (error) {
        console.error('Image generation error in chat:', error);
        const errorResponse = `I encountered an error while generating your image: ${error.message}`;
        
        await chat.addMessage('assistant', errorResponse);
        
        res.status(200).json({
          success: true,
          data: {
            message: errorResponse,
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            model: 'image-generation-error',
            chat: {
              id: chat._id,
              title: chat.title
            }
          }
        });
        return;
      }
    }

    if (isAvatarCommand) {
      try {
        const { avatarUrl, imageId } = await handleAvatarGeneration(chat, avatarPrompt, req);
        
        // Create response with actual avatar
        const avatarResponseText = `I've generated an avatar based on your prompt: "${avatarPrompt}"`;
        
        // Add message with avatar URL using the addMessage method
        await chat.addMessage('assistant', avatarResponseText, [], {}, null, imageId, avatarUrl);
        
        res.status(200).json({
          success: true,
          data: {
            message: avatarResponseText,
            avatar: avatarUrl,
            imageId: imageId,
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            model: 'avatar-generation',
            chat: {
              id: chat._id,
              title: chat.title
            }
          }
        });
        return;

      } catch (error) {
        console.error('Avatar generation error in chat:', error);
        const errorResponse = `I encountered an error while generating your avatar: ${error.message}`;
        
        await chat.addMessage('assistant', errorResponse);
        
        res.status(200).json({
          success: true,
          data: {
            message: errorResponse,
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            model: 'avatar-generation-error',
            chat: {
              id: chat._id,
              title: chat.title
            }
          }
        });
        return;
      }
    }

    // Prepare messages for OpenRouter API
    const messages = [
      {
        role: 'system',
        content: NEUTRAL_SYSTEM_PROMPT
      },
      ...chat.getRecentMessages(10).map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // If the chat has a document context attached in settings, inject it as a system message
    // and keep it concise to remain within token limits.
    if (chat.settings && chat.settings.documentContext) {
      const raw = String(chat.settings.documentContext);
      // Hard cap the context to ~8000 characters to avoid overly long prompts
      const capped = raw.length > 8000 ? raw.slice(0, 8000) + '\n...[truncated]' : raw;
      messages.splice(1, 0, {
        role: 'system',
        content: `You are provided with the following document content. Use it as primary context to answer the user's questions. If information is not in the document, say so.
\n--- Document Context Start ---\n${capped}\n--- Document Context End ---`
      });
    }


    // Call OpenRouter API with fallback on 404 (model not found / inaccessible)
    const tryCallOpenRouter = async (modelName) => {
      return axios.post(
        `${OPENROUTER_BASE_URL}/chat/completions`,
        {
          model: modelName,
          messages,
          stream,
          temperature: chat.settings.temperature || 0.7,
          max_tokens: chat.settings.maxTokens || 2048
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            Referer: req.headers.origin || 'http://localhost:3000',
            'X-Title': 'Omni Ai'
          },
          timeout: 60000
        }
      );
    };

    const primaryModel = chat.settings.model || 'openai/gpt-4o-mini';
    let openRouterResponse;
    try {
      openRouterResponse = await tryCallOpenRouter(primaryModel);
    } catch (err) {
      if (err.response?.status === 404 && primaryModel !== 'openai/gpt-4o-mini') {
        // Retry with safe default
        openRouterResponse = await tryCallOpenRouter('openai/gpt-4o-mini');
      } else {
        throw err;
      }
    }

    let assistantMessage = '';

    // Helper: reformat raw markdown-ish text into a clean, user-friendly summary
    const formatRawToSummary = (input) => {
      if (!input || typeof input !== 'string') return input;

      let text = input;

      // Normalize line endings
      text = text.replace(/\r\n/g, '\n');

      // Convert ### / ## headings to clear section headings (uppercase)
      text = text.replace(/^\s*######\s*(.+)$/gm, (_, t) => `\n${t.toUpperCase()}\n`);
      text = text.replace(/^\s*#####\s*(.+)$/gm, (_, t) => `\n${t.toUpperCase()}\n`);
      text = text.replace(/^\s*####\s*(.+)$/gm, (_, t) => `\n${t.toUpperCase()}\n`);
      text = text.replace(/^\s*###\s*(.+)$/gm, (_, t) => `\n${t.toUpperCase()}\n`);
      text = text.replace(/^\s*##\s*(.+)$/gm, (_, t) => `\n${t.toUpperCase()}\n`);

      // Convert ***bold*** highlights into emphasized uppercase words
      text = text.replace(/\*\*\*(.+?)\*\*\*/g, (_, t) => t.toUpperCase());
      // Convert **bold** into emphasized uppercase
      text = text.replace(/\*\*(.+?)\*\*/g, (_, t) => t.toUpperCase());
      // Convert *italic* into plain emphasis (no markdown)
      text = text.replace(/\*(.+?)\*/g, (_, t) => t);

      // Convert markdown bullet lists to clean bullets (keep '-' or numbers)
      // Normalize bullets starting with '* ' to '- '
      text = text.replace(/^\s*\*\s+/gm, '- ');

      // Remove inline code/backticks
      text = text.replace(/`{1,3}([^`]+?)`{1,3}/g, (_, t) => t);

      // Remove stray markdown characters (#, >) at line starts while preserving content
      text = text.replace(/^\s*[#>]+\s*/gm, '');

      // Collapse excessive blank lines
      text = text.replace(/\n{3,}/g, '\n\n');

      // Trim
      text = text.trim();

      return text;
    };

    if (stream) {
      // Handle streaming response
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      openRouterResponse.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              // Add assistant message to chat
              chat.addMessage('assistant', assistantMessage).then(() => {
                res.end();
              }).catch((error) => {
                console.error('Error saving assistant message:', error);
                res.end();
              });
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                const content = parsed.choices[0].delta.content;
                assistantMessage += content;
                res.write(content);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      });

      openRouterResponse.data.on('end', () => {
        res.end();
      });

    } else {
      // Handle non-streaming response
      const completion = openRouterResponse.data;
      assistantMessage = completion.choices[0].message.content;

      // Optionally reformat the assistant message to a clean, user-friendly summary
      const formatted = formatRawToSummary(assistantMessage);

      // Add assistant message to chat
      await chat.addMessage('assistant', formatted, [], {
        prompt: completion.usage?.prompt_tokens || 0,
        completion: completion.usage?.completion_tokens || 0,
        total: completion.usage?.total_tokens || 0
      });

      // Update chat title if it's the first exchange
      if (chat.messages.length === 2) {
        await chat.updateTitleFromFirstMessage();
      }

      res.status(200).json({
        success: true,
        data: {
          message: formatted,
          usage: completion.usage,
          model: completion.model
        }
      });
    }

  } catch (error) {
    // Improve logging to help diagnose upstream errors (e.g., 404/401)
    console.error('Send message error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(408).json({
        success: false,
        message: 'Request timeout. The AI service is taking too long to respond. Please try again.'
      });
    }

    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key or authentication failed'
      });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Please try again later.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

// @desc    Update chat settings
// @route   PATCH /api/chat/:id/settings
// @access  Private
const updateChatSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { settings: { ...settings } },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.status(200).json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Update chat settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update chat settings',
      error: error.message
    });
  }
};

// @desc    Delete chat session
// @route   DELETE /api/chat/:id
// @access  Private
const deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete chat',
      error: error.message
    });
  }
};


// @desc    Migrate existing chats to add chatType field
// @route   POST /api/chat/migrate
// @access  Private
const migrateChatTypes = async (req, res) => {
  try {
    const result = await Chat.migrateChatTypes();
    
    res.status(200).json({
      success: true,
      message: `Successfully migrated ${result.migrated} chats`,
      data: result
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to migrate chat types',
      error: error.message
    });
  }
};

// @desc    Add image message to chat (no AI response)
// @route   POST /api/chat/:id/image-message
// @access  Private
const addImageMessage = async (req, res) => {
  try {
    const { message, image, role = 'assistant' } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const chat = await Chat.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Add message with image data
    await chat.addMessage(role, message.trim(), [], {}, image);
    
    await chat.save();
    
    res.status(200).json({
      success: true,
      data: {
        message: message.trim(),
        image: image || null,
        role: role,
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        model: 'image-generation',
        chat: {
          id: chat._id,
          title: chat.title
        }
      }
    });

  } catch (error) {
    console.error('Image message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add image message',
      error: error.message
    });
  }
};

// @desc    Add avatar message to chat (no AI response)
// @route   POST /api/chat/:id/avatar-message
// @access  Private
const addAvatarMessage = async (req, res) => {
  try {
    const { message, avatar, imageId, role = 'assistant' } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const chat = await Chat.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Add message with avatar data
    await chat.addMessage(role, message.trim(), [], {}, null, imageId, avatar);
    
    await chat.save();
    
    res.status(200).json({
      success: true,
      data: {
        message: message.trim(),
        avatar: avatar || null,
        imageId: imageId || null,
        role: role,
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        model: 'avatar-generation',
        chat: {
          id: chat._id,
          title: chat.title
        }
      }
    });

  } catch (error) {
    console.error('Avatar message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add avatar message',
      error: error.message
    });
  }
};

module.exports = {
  createChat,
  getChats,
  getChat,
  sendMessage,
  addImageMessage,
  addAvatarMessage,
  updateChatSettings,
  deleteChat,
  migrateChatTypes
};

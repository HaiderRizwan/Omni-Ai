const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  // Biblical citations in this message
  citations: [{
    book: {
      type: String,
      required: true,
      trim: true
    },
    chapter: {
      type: Number,
      required: true,
      min: 1
    },
    verse: {
      type: String, // Can be single verse or range (e.g., "1-5")
      required: true
    },
    translation: {
      type: String,
      default: 'KJV',
      enum: ['KJV', 'NIV', 'ESV', 'NKJV', 'NASB']
    },
    text: {
      type: String,
      trim: true
    },
    accuracy: {
      type: String,
      enum: ['exact', 'paraphrase', 'accurate', 'inaccurate'],
      default: 'accurate'
    }
  }],
  // Token usage for this message
  tokens: {
    prompt: {
      type: Number,
      default: 0
    },
    completion: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  // Image URL for image generation messages
  image: {
    type: String,
    default: null
  },
  // Avatar URL for avatar generation messages
  avatar: {
    type: String,
    default: null
  },
  // Image ID reference for database images
  imageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Image',
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

const chatSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Chat title cannot exceed 200 characters'],
    default: 'New Chat'
  },
  chatType: {
    type: String,
    enum: ['text', 'image', 'avatar', 'video', 'avatarVideo'],
    default: 'text',
    required: true
  },
  messages: [messageSchema],
  // Chat settings
  settings: {
    model: {
      type: String,
      default: 'meta-llama/llama-3.1-8b-instruct:free'
    },
    temperature: {
      type: Number,
      min: 0,
      max: 2,
      default: 0.7
    },
    maxTokens: {
      type: Number,
      min: 1,
      max: 4096,
      default: 2048
    },
    biblicalAccuracy: {
      type: Boolean,
      default: true
    },
    citationStyle: {
      type: String,
      enum: ['inline', 'footnote', 'endnote'],
      default: 'inline'
    }
  },
  // Chat statistics
  statistics: {
    totalMessages: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    totalCitations: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  // Tags for organization
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for message count
chatSchema.virtual('messageCount').get(function() {
  return this.messages.length;
});

// Virtual for total citations in chat
chatSchema.virtual('totalCitations').get(function() {
  return this.messages.reduce((total, message) => total + message.citations.length, 0);
});

// Index for better query performance
chatSchema.index({ user: 1 });
chatSchema.index({ 'statistics.lastActivity': -1 });
chatSchema.index({ isActive: 1 });
chatSchema.index({ isArchived: 1 });
chatSchema.index({ tags: 1 });
chatSchema.index({ chatType: 1 });

// Pre-save middleware to update statistics
chatSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.statistics.totalMessages = this.messages.length;
    this.statistics.totalTokens = this.messages.reduce((total, message) =>
      total + (message.tokens.total || 0), 0);
    this.statistics.totalCitations = this.messages.reduce((total, message) =>
      total + message.citations.length, 0);
    this.statistics.lastActivity = new Date();
  }
  next();
});

// Instance method to add message
chatSchema.methods.addMessage = function(role, content, citations = [], tokens = {}, image = null, imageId = null, avatar = null) {
  console.log(`Chat.addMessage called: role=${role}, content length=${content?.length || 0}, current messages=${this.messages.length}, image=${!!image}, avatar=${!!avatar}`);
  
  const message = {
    role,
    content,
    citations,
    tokens: {
      prompt: tokens.prompt || 0,
      completion: tokens.completion || 0,
      total: tokens.total || (tokens.prompt || 0) + (tokens.completion || 0)
    }
  };

  // Add image fields if provided
  if (image) {
    message.image = image;
  }
  if (imageId) {
    message.imageId = imageId;
  }
  if (avatar) {
    message.avatar = avatar;
  }

  this.messages.push(message);
  this.markModified('messages');
  
  console.log(`Message added to chat. New message count: ${this.messages.length}`);
  return this.save();
};

// Instance method to get recent messages (for context)
chatSchema.methods.getRecentMessages = function(limit = 10) {
  return this.messages.slice(-limit);
};

// Instance method to update title based on first user message
chatSchema.methods.updateTitleFromFirstMessage = function() {
  if (this.messages.length > 0 && this.title === 'New Chat') {
    const firstUserMessage = this.messages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      // Extract first 50 characters as title
      const title = firstUserMessage.content.substring(0, 50);
      this.title = title.length < firstUserMessage.content.length ? title + '...' : title;
    }
  }
  return this.save();
};

// Instance method to archive chat
chatSchema.methods.archive = function() {
  this.isArchived = true;
  this.isActive = false;
  return this.save();
};

// Instance method to restore chat
chatSchema.methods.restore = function() {
  this.isArchived = false;
  this.isActive = true;
  return this.save();
};

// Static method to find user's active chats
chatSchema.statics.findActiveByUser = function(userId, limit = 20) {
  return this.find({
    user: userId,
    isActive: true,
    isArchived: false
  })
  .sort({ 'createdAt': -1 })
  .limit(limit);
};

// Static method to find chats by tag
chatSchema.statics.findByTag = function(userId, tag) {
  return this.find({
    user: userId,
    tags: tag,
    isActive: true
  })
  .sort({ 'createdAt': -1 });
};

// Static method to find chats by type
chatSchema.statics.findByType = function(userId, chatType) {
  return this.find({
    user: userId,
    chatType: chatType,
    isActive: true,
    isArchived: false
  })
  .sort({ 'createdAt': -1 });
};

// Static method to migrate existing chats without chatType
chatSchema.statics.migrateChatTypes = async function() {
  try {
    // Find all chats without chatType field
    const chatsWithoutType = await this.find({
      $or: [
        { chatType: { $exists: false } },
        { chatType: null }
      ]
    });

    console.log(`Found ${chatsWithoutType.length} chats without chatType field`);

    for (const chat of chatsWithoutType) {
      // Determine chat type based on messages content
      let chatType = 'text'; // default
      
      // Check if any message contains /image command
      const hasImageCommand = chat.messages.some(msg => 
        msg.content && msg.content.toLowerCase().startsWith('/image')
      );
      
      if (hasImageCommand) {
        chatType = 'image';
      }
      
      // Update the chat
      await this.findByIdAndUpdate(chat._id, { chatType });
      console.log(`Migrated chat ${chat._id} to type: ${chatType}`);
    }

    console.log('Chat type migration completed');
    return { migrated: chatsWithoutType.length };
  } catch (error) {
    console.error('Error during chat type migration:', error);
    throw error;
  }
};

module.exports = mongoose.model('Chat', chatSchema);

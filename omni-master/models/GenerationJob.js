const mongoose = require('mongoose');

const generationJobSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  type: {
    type: String,
    enum: ['image', 'video', 'audio', 'text'],
    required: [true, 'Job type is required']
  },
  status: {
    type: String,
    enum: ['pending', 'queued', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  // Job parameters
  parameters: {
    prompt: {
      type: String,
      trim: true
    },
    negativePrompt: {
      type: String,
      trim: true
    },
    style: {
      type: String,
      trim: true
    },
    aspectRatio: {
      type: String,
      enum: ['1:1', '4:3', '3:4', '16:9', '9:16', '21:9'],
      default: '1:1'
    },
    duration: {
      type: Number, // For video/audio in seconds
      min: 1,
      max: 300
    },
    quality: {
      type: String,
      enum: ['low', 'medium', 'high', 'ultra'],
      default: 'medium'
    },
    model: {
      type: String,
      trim: true
    }
  },
  // Character references
  characters: [{
    characterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Character'
    },
    role: {
      type: String,
      enum: ['main', 'supporting', 'background'],
      default: 'main'
    },
    promptOverride: {
      type: String,
      trim: true
    }
  }],
  // Progress tracking
  progress: {
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    stage: {
      type: String,
      trim: true,
      default: 'queued'
    },
    eta: {
      type: Number, // Estimated time remaining in seconds
      default: null
    }
  },
  // Results
  results: [{
    url: {
      type: String,
      trim: true
    },
    thumbnailUrl: {
      type: String,
      trim: true
    },
    filename: {
      type: String,
      trim: true
    },
    format: {
      type: String,
      trim: true
    },
    size: {
      type: Number, // File size in bytes
      default: 0
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  // Error information
  error: {
    message: {
      type: String,
      trim: true
    },
    code: {
      type: String,
      trim: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  // Cost tracking
  cost: {
    currency: {
      type: String,
      default: 'USD'
    },
    amount: {
      type: Number,
      min: 0,
      default: 0
    },
    breakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  // Timing
  timing: {
    queuedAt: {
      type: Date,
      default: Date.now
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    duration: {
      type: Number, // Total duration in seconds
      default: null
    }
  },
  // External API tracking
  externalJobId: {
    type: String,
    trim: true,
    index: true
  },
  provider: {
    type: String,
    enum: ['openai', 'replicate', 'stability', 'runwayml', 'pika', 'elevenlabs', 'openrouter', 'huggingface'],
    required: true
  },
  // Retry tracking
  retryCount: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  maxRetries: {
    type: Number,
    min: 0,
    max: 5,
    default: 3
  },
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for completion status
generationJobSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

// Virtual for failure status
generationJobSchema.virtual('isFailed').get(function() {
  return this.status === 'failed';
});

// Virtual for processing status
generationJobSchema.virtual('isProcessing').get(function() {
  return this.status === 'processing' || this.status === 'queued' || this.status === 'pending';
});

// Index for better query performance
generationJobSchema.index({ user: 1 });
generationJobSchema.index({ status: 1 });
generationJobSchema.index({ type: 1 });
generationJobSchema.index({ createdAt: -1 });
generationJobSchema.index({ 'timing.completedAt': -1 });
generationJobSchema.index({ externalJobId: 1 });
generationJobSchema.index({ provider: 1 });

// Pre-save middleware to calculate duration
generationJobSchema.pre('save', function(next) {
  if (this.timing.startedAt && this.timing.completedAt) {
    this.timing.duration = Math.floor(
      (this.timing.completedAt - this.timing.startedAt) / 1000
    );
  }
  next();
});

// Instance method to start job
generationJobSchema.methods.start = function() {
  this.status = 'processing';
  this.timing.startedAt = new Date();
  this.progress.stage = 'processing';
  return this.save();
};

// Instance method to complete job
generationJobSchema.methods.complete = function(results = []) {
  this.status = 'completed';
  this.timing.completedAt = new Date();
  this.progress.percentage = 100;
  this.progress.stage = 'completed';
  this.results = results;
  return this.save();
};

// Instance method to fail job
generationJobSchema.methods.fail = function(errorMessage, errorCode = null) {
  this.status = 'failed';
  this.error.message = errorMessage;
  this.error.code = errorCode;
  this.timing.completedAt = new Date();
  return this.save();
};

// Instance method to update progress
generationJobSchema.methods.updateProgress = function(percentage, stage = null, eta = null) {
  this.progress.percentage = Math.min(100, Math.max(0, percentage));
  if (stage) {
    this.progress.stage = stage;
  }
  if (eta !== null) {
    this.progress.eta = eta;
  }
  return this.save();
};

// Instance method to retry job
generationJobSchema.methods.retry = function() {
  if (this.retryCount < this.maxRetries) {
    this.retryCount += 1;
    this.status = 'queued';
    this.error = {};
    this.progress = {
      percentage: 0,
      stage: 'queued',
      eta: null
    };
    return this.save();
  }
  throw new Error('Maximum retry attempts reached');
};

// Instance method to cancel job
generationJobSchema.methods.cancel = function() {
  this.status = 'cancelled';
  this.timing.completedAt = new Date();
  return this.save();
};

// Static method to find user's active jobs
generationJobSchema.statics.findActiveByUser = function(userId, type = null) {
  const query = {
    user: userId,
    status: { $in: ['pending', 'queued', 'processing'] }
  };

  if (type) {
    query.type = type;
  }

  return this.find(query).sort({ createdAt: -1 });
};

// Static method to find completed jobs
generationJobSchema.statics.findCompletedByUser = function(userId, type = null, limit = 20) {
  const query = {
    user: userId,
    status: 'completed'
  };

  if (type) {
    query.type = type;
  }

  return this.find(query)
    .sort({ 'timing.completedAt': -1 })
    .limit(limit);
};

// Static method to find jobs by external ID
generationJobSchema.statics.findByExternalId = function(externalJobId) {
  return this.findOne({ externalJobId });
};

// Static method to get job statistics
generationJobSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalCost: { $sum: '$cost.amount' }
      }
    }
  ]);
};

module.exports = mongoose.model('GenerationJob', generationJobSchema);

const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  prompt: {
    type: String,
    required: true,
    trim: true
  },
  negativePrompt: {
    type: String,
    default: ''
  },
  imageData: {
    type: Buffer,
    required: true
  },
  contentType: {
    type: String,
    default: 'image/png'
  },
  filename: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  width: {
    type: Number,
    required: true
  },
  height: {
    type: Number,
    required: true
  },
  settings: {
    style: String,
    quality: String,
    aspectRatio: String,
    seed: Number,
    model: String,
    steps: Number,
    guidance: Number
  },
  metadata: {
    provider: String,
    generationTime: Number,
    originalPrompt: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
imageSchema.index({ user: 1, createdAt: -1 });
imageSchema.index({ user: 1, prompt: 'text' });

// Instance method to get image URL
imageSchema.methods.getImageUrl = function() {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  return `${baseUrl}/api/images/public/${this._id}`;
};

// Instance method to get image data as base64
imageSchema.methods.getBase64 = function() {
  return `data:${this.contentType};base64,${this.imageData.toString('base64')}`;
};

// Static method to find user's images
imageSchema.statics.findByUser = function(userId, limit = 20) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-imageData'); // Exclude image data for list views
};

module.exports = mongoose.model('Image', imageSchema);

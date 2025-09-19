const mongoose = require('mongoose');

const avatarSchema = new mongoose.Schema({
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
  originalPrompt: {
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
  // Character-specific settings
  characterSettings: {
    gender: String,
    age: String,
    style: String,
    expression: String,
    clothing: String,
    background: String,
    hairStyle: String,
    build: String,
    ethnicity: String
  },
  // Character customization
  customization: {
    hairColor: String,
    eyeColor: String,
    skinTone: String
  },
  // Generation settings
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
    originalPrompt: String,
    characterType: {
      type: String,
      default: 'avatar',
      enum: ['avatar', 'character', 'portrait']
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
avatarSchema.index({ user: 1, createdAt: -1 });
avatarSchema.index({ user: 1, prompt: 'text' });
avatarSchema.index({ 'characterSettings.style': 1 });
avatarSchema.index({ 'metadata.characterType': 1 });

// Instance method to get avatar URL
avatarSchema.methods.getAvatarUrl = function() {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  return `${baseUrl}/api/avatars/public/${this._id}`;
};

// Instance method to get avatar data as base64
avatarSchema.methods.getBase64 = function() {
  return `data:${this.contentType};base64,${this.imageData.toString('base64')}`;
};

// Static method to find user's avatars
avatarSchema.statics.findByUser = function(userId, limit = 20) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-imageData'); // Exclude image data for list views
};

// Static method to find avatars by character settings
avatarSchema.statics.findByCharacterSettings = function(userId, settings) {
  const query = { user: userId };
  
  if (settings.style) query['characterSettings.style'] = settings.style;
  if (settings.gender) query['characterSettings.gender'] = settings.gender;
  if (settings.age) query['characterSettings.age'] = settings.age;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .select('-imageData');
};

// Virtual for character description
avatarSchema.virtual('characterDescription').get(function() {
  const settings = this.characterSettings;
  const custom = this.customization;
  
  let description = '';
  
  if (settings.gender && settings.gender !== 'any') description += `${settings.gender} `;
  if (settings.age && settings.age !== 'any') description += `${settings.age} `;
  if (settings.ethnicity && settings.ethnicity !== 'any') description += `${settings.ethnicity} `;
  if (custom.skinTone) description += `${custom.skinTone} skin `;
  if (custom.hairColor) description += `${custom.hairColor} hair `;
  if (settings.hairStyle && settings.hairStyle !== 'any') description += `${settings.hairStyle} `;
  if (custom.eyeColor) description += `${custom.eyeColor} eyes `;
  if (settings.build && settings.build !== 'average') description += `${settings.build} build `;
  if (settings.expression && settings.expression !== 'neutral') description += `${settings.expression} expression `;
  if (settings.clothing && settings.clothing !== 'casual') description += `wearing ${settings.clothing} `;
  if (settings.background && settings.background !== 'transparent') description += `${settings.background} background `;
  
  return description.trim();
});

module.exports = mongoose.model('Avatar', avatarSchema);






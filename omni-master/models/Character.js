const mongoose = require('mongoose');

const characterSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  name: {
    type: String,
    required: [true, 'Character name is required'],
    trim: true,
    maxlength: [100, 'Character name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Character description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  imageUrl: {
    type: String,
    default: null
  },
  imagePrompt: {
    type: String,
    default: null
  },
  // Character parameters for consistent generation
  parameters: {
    age: {
      type: Number,
      min: [0, 'Age cannot be negative'],
      max: [200, 'Age cannot exceed 200']
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'non-binary', 'other'],
      default: 'other'
    },
    ethnicity: {
      type: String,
      trim: true,
      maxlength: [50, 'Ethnicity cannot exceed 50 characters']
    },
    height: {
      type: String,
      trim: true,
      maxlength: [20, 'Height description cannot exceed 20 characters']
    },
    build: {
      type: String,
      enum: ['slim', 'athletic', 'average', 'heavy', 'muscular'],
      default: 'average'
    },
    hairColor: {
      type: String,
      trim: true,
      maxlength: [30, 'Hair color cannot exceed 30 characters']
    },
    hairStyle: {
      type: String,
      trim: true,
      maxlength: [50, 'Hair style cannot exceed 50 characters']
    },
    eyeColor: {
      type: String,
      trim: true,
      maxlength: [20, 'Eye color cannot exceed 20 characters']
    },
    clothing: {
      type: String,
      trim: true,
      maxlength: [200, 'Clothing description cannot exceed 200 characters']
    },
    personality: {
      type: String,
      trim: true,
      maxlength: [500, 'Personality description cannot exceed 500 characters']
    },
    role: {
      type: String,
      trim: true,
      maxlength: [100, 'Role cannot exceed 100 characters']
    },
    background: {
      type: String,
      trim: true,
      maxlength: [1000, 'Background cannot exceed 1000 characters']
    }
  },
  // Generation settings
  stylePreferences: {
    artStyle: {
      type: String,
      enum: ['realistic', 'anime', 'cartoon', 'fantasy', 'photorealistic', 'sketch'],
      default: 'realistic'
    },
    colorPalette: {
      type: String,
      trim: true,
      maxlength: [100, 'Color palette cannot exceed 100 characters']
    },
    mood: {
      type: String,
      trim: true,
      maxlength: [100, 'Mood cannot exceed 100 characters']
    }
  },
  // Usage tracking
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date,
    default: null
  },
  // Tags for organization
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full parameter description
characterSchema.virtual('fullDescription').get(function() {
  const params = this.parameters;
  const desc = this.description;

  let fullDesc = desc;

  if (params.age) fullDesc += ` Age: ${params.age}`;
  if (params.gender && params.gender !== 'other') fullDesc += ` Gender: ${params.gender}`;
  if (params.ethnicity) fullDesc += ` Ethnicity: ${params.ethnicity}`;
  if (params.height) fullDesc += ` Height: ${params.height}`;
  if (params.build && params.build !== 'average') fullDesc += ` Build: ${params.build}`;
  if (params.hairColor) fullDesc += ` Hair: ${params.hairColor}`;
  if (params.hairStyle) fullDesc += ` ${params.hairStyle}`;
  if (params.eyeColor) fullDesc += ` Eyes: ${params.eyeColor}`;
  if (params.clothing) fullDesc += ` Clothing: ${params.clothing}`;
  if (params.personality) fullDesc += ` Personality: ${params.personality}`;

  return fullDesc;
});

// Virtual for image generation prompt
characterSchema.virtual('imageGenPrompt').get(function() {
  const params = this.parameters;
  const style = this.stylePreferences;

  let prompt = `${this.name}, ${this.description}`;

  if (params.age) prompt += `, age ${params.age}`;
  if (params.gender && params.gender !== 'other') prompt += `, ${params.gender}`;
  if (params.ethnicity) prompt += `, ${params.ethnicity}`;
  if (params.height) prompt += `, ${params.height}`;
  if (params.build && params.build !== 'average') prompt += `, ${params.build} build`;
  if (params.hairColor) prompt += `, ${params.hairColor} hair`;
  if (params.hairStyle) prompt += ` ${params.hairStyle}`;
  if (params.eyeColor) prompt += `, ${params.eyeColor} eyes`;
  if (params.clothing) prompt += `, wearing ${params.clothing}`;

  // Add style preferences
  if (style.artStyle) prompt += `, ${style.artStyle} style`;
  if (style.mood) prompt += `, ${style.mood} mood`;
  if (style.colorPalette) prompt += `, ${style.colorPalette} color palette`;

  return prompt;
});

// Index for better query performance
characterSchema.index({ user: 1 });
characterSchema.index({ name: 1 });
characterSchema.index({ tags: 1 });
characterSchema.index({ isPublic: 1 });
characterSchema.index({ usageCount: -1 });

// Instance method to increment usage
characterSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

// Instance method to update image
characterSchema.methods.updateImage = function(imageUrl, prompt) {
  this.imageUrl = imageUrl;
  if (prompt) {
    this.imagePrompt = prompt;
  }
  return this.save();
};

// Static method to find user's characters
characterSchema.statics.findByUser = function(userId, includeInactive = false) {
  const query = { user: userId };
  if (!includeInactive) {
    query.isActive = true;
  }
  return this.find(query).sort({ lastUsed: -1, createdAt: -1 });
};

// Static method to find public characters
characterSchema.statics.findPublic = function() {
  return this.find({ isPublic: true, isActive: true });
};

module.exports = mongoose.model('Character', characterSchema);

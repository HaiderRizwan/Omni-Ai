const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  price: {
    monthly: {
      type: Number,
      required: [true, 'Monthly price is required'],
      min: [0, 'Price cannot be negative']
    },
    yearly: {
      type: Number,
      required: [true, 'Yearly price is required'],
      min: [0, 'Price cannot be negative']
    }
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },
  features: {
    // Feature limits and permissions
    apiCalls: {
      type: Number,
      default: 1000, // per month
      min: 0
    },
    storage: {
      type: Number,
      default: 100, // in MB
      min: 0
    },
    premiumFeatures: [{
      type: String
    }],
    // Boolean flags for specific features
    canCreateTeams: {
      type: Boolean,
      default: false
    },
    canExportData: {
      type: Boolean,
      default: false
    },
    hasPrioritySupport: {
      type: Boolean,
      default: false
    },
    hasAdvancedAnalytics: {
      type: Boolean,
      default: false
    },
    hasApiAccess: {
      type: Boolean,
      default: false
    }
  },
  stripePriceId: {
    monthly: {
      type: String,
      default: null
    },
    yearly: {
      type: String,
      default: null
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false // For highlighting popular plans on frontend
  },
  sortOrder: {
    type: Number,
    default: 0 // For ordering plans on frontend
  },
  trialDays: {
    type: Number,
    default: 14,
    min: 0,
    max: 365
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for yearly savings percentage
subscriptionPlanSchema.virtual('yearlySavings').get(function() {
  if (this.price.monthly <= 0) return 0;
  const monthlyYearly = this.price.monthly * 12;
  const savings = monthlyYearly - this.price.yearly;
  return Math.round((savings / monthlyYearly) * 100);
});

// Index for better query performance
subscriptionPlanSchema.index({ isActive: 1, sortOrder: 1 });
subscriptionPlanSchema.index({ name: 1 });

// Static method to get active plans
subscriptionPlanSchema.statics.getActivePlans = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1 });
};

// Static method to get plan by name
subscriptionPlanSchema.statics.getPlanByName = function(name) {
  return this.findOne({ name: name.toLowerCase(), isActive: true });
};

// Static method to get free plan
subscriptionPlanSchema.statics.getFreePlan = function() {
  return this.findOne({ name: 'free', isActive: true });
};

// Static method to check if feature is available for plan
subscriptionPlanSchema.methods.hasFeature = function(featureName) {
  // Check boolean flags
  switch (featureName) {
    case 'canCreateTeams':
      return this.features.canCreateTeams;
    case 'canExportData':
      return this.features.canExportData;
    case 'hasPrioritySupport':
      return this.features.hasPrioritySupport;
    case 'hasAdvancedAnalytics':
      return this.features.hasAdvancedAnalytics;
    case 'hasApiAccess':
      return this.features.hasApiAccess;
    default:
      // Check premium features array
      return this.features.premiumFeatures.includes(featureName);
  }
};

// Instance method to check usage limits
subscriptionPlanSchema.methods.checkLimit = function(feature, currentUsage) {
  switch (feature) {
    case 'apiCalls':
      return currentUsage < this.features.apiCalls;
    case 'storage':
      return currentUsage < this.features.storage;
    default:
      return true; // No limit for other features
  }
};

// Instance method to get limit for a feature
subscriptionPlanSchema.methods.getLimit = function(feature) {
  switch (feature) {
    case 'apiCalls':
      return this.features.apiCalls;
    case 'storage':
      return this.features.storage;
    default:
      return null; // Unlimited
  }
};

// Pre-save middleware to validate pricing
subscriptionPlanSchema.pre('save', function(next) {
  // Ensure yearly price is not higher than monthly * 12
  const monthlyYearly = this.price.monthly * 12;
  if (this.price.yearly > monthlyYearly) {
    this.price.yearly = monthlyYearly;
  }

  // Convert name to lowercase for consistency
  if (this.name) {
    this.name = this.name.toLowerCase();
  }

  next();
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

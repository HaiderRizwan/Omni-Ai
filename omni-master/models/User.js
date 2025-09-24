const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [50, 'Username cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  profileImage: {
    type: String,
    default: null
  },
  // Subscription fields
  subscriptionStatus: {
    type: String,
    enum: ['free', 'active', 'expired', 'cancelled', 'trial'],
    default: 'free'
  },
  subscriptionPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    default: null
  },
  subscriptionStartDate: {
    type: Date,
    default: null
  },
  subscriptionEndDate: {
    type: Date,
    default: null
  },
  trialEndsAt: {
    type: Date,
    default: null
  },
  isTrialActive: {
    type: Boolean,
    default: false
  },
  // Usage tracking for feature limits
  usageStats: {
    apiCalls: {
      type: Number,
      default: 0
    },
    storageUsed: {
      type: Number,
      default: 0 // in MB
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    }
  },
  // Phyllo integration fields
  phylloUserId: {
    type: String,
    default: null,
    index: true
  },
  phylloAccounts: {
    type: [
      new mongoose.Schema({
        accountId: { type: String, required: true },
        platform: { type: String },
        username: { type: String },
        profileUrl: { type: String },
        connectedAt: { type: Date }
      }, { _id: false })
    ],
    default: []
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// Instance method to check if user has active subscription
userSchema.methods.hasActiveSubscription = function() {
  const now = new Date();

  // Check if trial is active
  if (this.isTrialActive && this.trialEndsAt && this.trialEndsAt > now) {
    return true;
  }

  // Check if subscription is active
  if (this.subscriptionStatus === 'active' && this.subscriptionEndDate && this.subscriptionEndDate > now) {
    return true;
  }

  return false;
};

// Instance method to check if user can access premium features
userSchema.methods.canAccessPremium = function() {
  return this.hasActiveSubscription() || this.role === 'admin';
};

// Instance method to check if user is on trial
userSchema.methods.isOnTrial = function() {
  return this.isTrialActive && this.trialEndsAt && this.trialEndsAt > new Date();
};

// Instance method to get remaining trial days
userSchema.methods.getRemainingTrialDays = function() {
  if (!this.isOnTrial()) return 0;

  const now = new Date();
  const diffTime = this.trialEndsAt - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Instance method to get remaining subscription days
userSchema.methods.getRemainingSubscriptionDays = function() {
  if (this.subscriptionStatus !== 'active' || !this.subscriptionEndDate) return 0;

  const now = new Date();
  const diffTime = this.subscriptionEndDate - now;

  if (diffTime <= 0) return 0;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Instance method to start trial
userSchema.methods.startTrial = function(trialDays = 14) {
  const now = new Date();
  this.isTrialActive = true;
  this.trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
  this.subscriptionStatus = 'trial';
  return this.save();
};

// Instance method to upgrade subscription
userSchema.methods.upgradeSubscription = function(planId, billingCycle = 'monthly') {
  const now = new Date();
  this.subscriptionPlan = planId;
  this.subscriptionStartDate = now;
  this.subscriptionStatus = 'active';

  // Set end date based on billing cycle (this would be more sophisticated in production)
  const daysToAdd = billingCycle === 'yearly' ? 365 : 30;
  this.subscriptionEndDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

  // Reset trial if active
  this.isTrialActive = false;
  this.trialEndsAt = null;

  return this.save();
};

// Instance method to cancel subscription
userSchema.methods.cancelSubscription = function() {
  this.subscriptionStatus = 'cancelled';
  // Keep end date so user can still access until it expires
  return this.save();
};

// Instance method to check usage limits
userSchema.methods.checkUsageLimit = function(feature, limit) {
  // This is a simple example - you might want more sophisticated usage tracking
  switch (feature) {
    case 'api_calls':
      return this.usageStats.apiCalls < limit;
    case 'storage':
      return this.usageStats.storageUsed < limit;
    default:
      return true;
  }
};

// Instance method to increment usage
userSchema.methods.incrementUsage = function(feature, amount = 1) {
  switch (feature) {
    case 'api_calls':
      this.usageStats.apiCalls += amount;
      break;
    case 'storage':
      this.usageStats.storageUsed += amount;
      break;
  }
  return this.save();
};

// Static method to find user by email or username
userSchema.statics.findByEmailOrUsername = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier }
    ]
  });
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);

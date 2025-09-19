const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    unique: true // One subscription per user
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: [true, 'Subscription plan is required']
  },
  status: {
    type: String,
    enum: ['active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'paused'],
    default: 'trialing'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  currentPeriodStart: {
    type: Date,
    default: Date.now
  },
  currentPeriodEnd: {
    type: Date,
    required: true
  },
  trialStart: {
    type: Date,
    default: null
  },
  trialEnd: {
    type: Date,
    default: null
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  canceledAt: {
    type: Date,
    default: null
  },
  // Stripe integration fields
  stripeSubscriptionId: {
    type: String,
    default: null,
    unique: true,
    sparse: true
  },
  stripeCustomerId: {
    type: String,
    default: null
  },
  stripePriceId: {
    type: String,
    default: null
  },
  // Payment information
  lastPaymentDate: {
    type: Date,
    default: null
  },
  nextPaymentDate: {
    type: Date,
    default: null
  },
  amount: {
    type: Number,
    min: 0,
    default: 0
  },
  currency: {
    type: String,
    default: 'usd'
  },
  // Usage tracking
  usage: {
    apiCalls: {
      type: Number,
      default: 0
    },
    storage: {
      type: Number,
      default: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    }
  },
  // Billing history
  billingHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'usd'
    },
    status: {
      type: String,
      enum: ['paid', 'pending', 'failed', 'refunded'],
      default: 'paid'
    },
    invoiceId: {
      type: String,
      default: null
    },
    description: {
      type: String,
      default: ''
    }
  }],
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

// Virtual for days until renewal
subscriptionSchema.virtual('daysUntilRenewal').get(function() {
  if (!this.currentPeriodEnd) return 0;
  const now = new Date();
  const diffTime = this.currentPeriodEnd - now;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
});

// Virtual for subscription value
subscriptionSchema.virtual('subscriptionValue').get(function() {
  return {
    amount: this.amount,
    currency: this.currency.toUpperCase(),
    cycle: this.billingCycle
  };
});

// Index for better query performance
subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 });

// Pre-save middleware to set next payment date
subscriptionSchema.pre('save', function(next) {
  if (this.isModified('currentPeriodEnd') && this.billingCycle) {
    this.nextPaymentDate = this.currentPeriodEnd;
  }

  // Auto-cancel if past due and not paid
  if (this.status === 'past_due' && this.currentPeriodEnd < new Date()) {
    this.status = 'canceled';
    this.canceledAt = new Date();
  }

  next();
});

// Instance method to check if subscription is active
subscriptionSchema.methods.isActive = function() {
  const now = new Date();
  return (this.status === 'active' || this.status === 'trialing') &&
         this.currentPeriodEnd > now;
};

// Instance method to check if trial is active
subscriptionSchema.methods.isTrialActive = function() {
  const now = new Date();
  return this.status === 'trialing' &&
         this.trialEnd &&
         this.trialEnd > now;
};

// Instance method to cancel subscription
subscriptionSchema.methods.cancel = function(immediately = false) {
  if (immediately) {
    this.status = 'canceled';
    this.canceledAt = new Date();
    this.currentPeriodEnd = new Date(); // End immediately
  } else {
    this.cancelAtPeriodEnd = true;
  }
  return this.save();
};

// Instance method to reactivate subscription
subscriptionSchema.methods.reactivate = function() {
  if (this.status === 'canceled' && this.cancelAtPeriodEnd) {
    this.cancelAtPeriodEnd = false;
    this.status = 'active';
  }
  return this.save();
};

// Instance method to upgrade/downgrade plan
subscriptionSchema.methods.changePlan = function(newPlanId, newPriceId = null) {
  this.plan = newPlanId;
  if (newPriceId) {
    this.stripePriceId = newPriceId;
  }
  // Note: In production, you'd handle proration with Stripe
  return this.save();
};

// Instance method to add billing history entry
subscriptionSchema.methods.addBillingEntry = function(amount, status = 'paid', description = '') {
  this.billingHistory.push({
    amount,
    currency: this.currency,
    status,
    description,
    date: new Date()
  });

  if (status === 'paid') {
    this.lastPaymentDate = new Date();
  }

  return this.save();
};

// Instance method to reset usage counters (for monthly limits)
subscriptionSchema.methods.resetUsage = function() {
  this.usage.apiCalls = 0;
  this.usage.storage = 0;
  this.usage.lastResetDate = new Date();
  return this.save();
};

// Instance method to check usage limits
subscriptionSchema.methods.checkUsageLimit = function(feature, currentUsage) {
  // This would typically reference the plan's limits
  // For now, return true (implement when plan is populated)
  return true;
};

// Static method to find active subscriptions
subscriptionSchema.statics.findActiveSubscriptions = function() {
  return this.find({
    status: { $in: ['active', 'trialing'] },
    currentPeriodEnd: { $gt: new Date() }
  }).populate('user plan');
};

// Static method to find subscriptions ending soon
subscriptionSchema.statics.findSubscriptionsEndingSoon = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    status: 'active',
    currentPeriodEnd: { $lte: futureDate, $gt: new Date() }
  }).populate('user plan');
};

// Static method to get subscription by user ID
subscriptionSchema.statics.getSubscriptionByUserId = function(userId) {
  return this.findOne({ user: userId }).populate('user plan');
};

module.exports = mongoose.model('Subscription', subscriptionSchema);

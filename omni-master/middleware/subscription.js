const User = require('../models/User');
const Subscription = require('../models/Subscription');

// Middleware to check if user has premium access
const requirePremium = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Admins always have access
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user has active subscription
    const hasAccess = await req.user.canAccessPremium();

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Premium subscription required',
        data: {
          subscriptionRequired: true,
          userStatus: req.user.subscriptionStatus,
          isTrialActive: req.user.isOnTrial(),
          trialDaysRemaining: req.user.getRemainingTrialDays()
        }
      });
    }

    next();
  } catch (error) {
    console.error('Premium access check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking subscription'
    });
  }
};

// Middleware to check specific feature access
const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Admins always have access
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user has active subscription and feature access
      const hasAccess = req.user.canAccessPremium();

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: `Premium subscription required for ${featureName}`,
          data: {
            feature: featureName,
            subscriptionRequired: true,
            userStatus: req.user.subscriptionStatus
          }
        });
      }

      // For more granular feature checking, you could check the subscription plan
      // This would require populating the plan in the auth middleware

      next();
    } catch (error) {
      console.error('Feature access check error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error checking feature access'
      });
    }
  };
};

// Middleware to check usage limits
const checkUsageLimit = (feature, limitType = 'count') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Admins have unlimited access
      if (req.user.role === 'admin') {
        return next();
      }

      // For free users, check basic limits
      if (req.user.subscriptionStatus === 'free') {
        const basicLimits = {
          api_calls: 100, // per month
          storage: 50     // MB per month
        };

        if (!req.user.checkUsageLimit(feature, basicLimits[feature] || 0)) {
          return res.status(429).json({
            success: false,
            message: `${feature} limit exceeded for free plan`,
            data: {
              limitExceeded: true,
              feature,
              currentUsage: req.user.usageStats[feature] || 0,
              limit: basicLimits[feature] || 0
            }
          });
        }
      }

      // Track usage (you might want to do this after the request succeeds)
      await req.user.incrementUsage(feature);

      next();
    } catch (error) {
      console.error('Usage limit check error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error checking usage limits'
      });
    }
  };
};

// Middleware to get subscription details for user
const getSubscriptionDetails = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    const subscription = await Subscription.findOne({ user: req.user._id })
      .populate('plan');

    if (subscription) {
      req.subscription = subscription;
    }

    next();
  } catch (error) {
    console.error('Get subscription details error:', error);
    // Don't fail the request, just continue without subscription details
    next();
  }
};

// Middleware to check if user can start trial
const canStartTrial = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user already has or had a trial
    if (req.user.trialEndsAt && req.user.trialEndsAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Trial already used'
      });
    }

    // Check if user already has active subscription
    if (req.user.hasActiveSubscription()) {
      return res.status(400).json({
        success: false,
        message: 'Active subscription already exists'
      });
    }

    next();
  } catch (error) {
    console.error('Trial eligibility check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking trial eligibility'
    });
  }
};

// Middleware to validate subscription status
const validateSubscriptionStatus = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    // Update subscription status if expired
    if (req.user.subscriptionStatus === 'active' &&
        req.user.subscriptionEndDate &&
        req.user.subscriptionEndDate < new Date()) {
      req.user.subscriptionStatus = 'expired';
      await req.user.save();
    }

    // Update trial status if expired
    if (req.user.isTrialActive &&
        req.user.trialEndsAt &&
        req.user.trialEndsAt < new Date()) {
      req.user.isTrialActive = false;
      req.user.subscriptionStatus = 'expired';
      await req.user.save();
    }

    next();
  } catch (error) {
    console.error('Subscription validation error:', error);
    next();
  }
};

module.exports = {
  requirePremium,
  requireFeature,
  checkUsageLimit,
  getSubscriptionDetails,
  canStartTrial,
  validateSubscriptionStatus
};

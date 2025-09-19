const User = require('../models/User');
const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');

// Ensure there is at least one active plan; create a default if none
const ensureDefaultPlan = async () => {
  console.log('[Subscriptions] ensureDefaultPlan invoked');
  let plan = await SubscriptionPlan.findOne({ isActive: true }).sort({ sortOrder: 1 });
  if (plan) return plan;

  // Create a single Pro plan with full access for $35
  console.log('[Subscriptions] No active plans. Creating single Pro plan...');
  plan = await SubscriptionPlan.create({
    name: 'pro',
    displayName: 'Pro',
    description: 'Full access plan',
    price: { monthly: 35, yearly: 420 },
    currency: 'USD',
    features: {
      apiCalls: 1000000,
      storage: 100000,
      premiumFeatures: [
        'advanced_analytics',
        'unlimited_projects',
        'priority_support',
        'custom_integrations',
        'white_label',
        'api_access',
        'export_data',
        'team_collaboration'
      ],
      canCreateTeams: true,
      canExportData: true,
      hasPrioritySupport: true,
      hasAdvancedAnalytics: true,
      hasApiAccess: true
    },
    isActive: true,
    isPopular: true,
    sortOrder: 1,
    trialDays: 14
  });
  return plan;
};

// @desc    Get all available subscription plans
// @route   GET /api/subscriptions/plans
// @access  Public
const getSubscriptionPlans = async (req, res) => {
  try {
    console.log('[Subscriptions] getSubscriptionPlans called');
    let plans = await SubscriptionPlan.getActivePlans();
    console.log(`[Subscriptions] Active plans found: ${plans.length}`);

    // Auto-create a default plan if none exist (public-safe)
    if (!plans || plans.length === 0) {
      console.log('[Subscriptions] No plans on GET. Ensuring single Pro plan...');
      await ensureDefaultPlan();
      plans = await SubscriptionPlan.getActivePlans();
      console.log(`[Subscriptions] Plans after ensure: ${plans.length}`);
    }

    res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription plans',
      error: error.message
    });
  }
};

// @desc    Get current user's subscription status
// @route   GET /api/subscriptions/status
// @access  Private
const getSubscriptionStatus = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id })
      .populate('plan');

    const user = await User.findById(req.user._id);

    const status = {
      subscriptionStatus: user.subscriptionStatus,
      hasActiveSubscription: user.hasActiveSubscription(),
      isTrialActive: user.isOnTrial(),
      trialDaysRemaining: user.getRemainingTrialDays(),
      subscriptionDaysRemaining: user.getRemainingSubscriptionDays(),
      currentPlan: user.subscriptionPlan,
      subscriptionEndDate: user.subscriptionEndDate,
      usage: user.usageStats,
      subscription: subscription || null
    };

    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription status',
      error: error.message
    });
  }
};

// @desc    Start free trial for user
// @route   POST /api/subscriptions/start-trial
// @access  Private
const startTrial = async (req, res) => {
  try {
    let { planId } = req.body || {};
    console.log('[Subscriptions] startTrial called by user:', req.user?._id?.toString());
    console.log('[Subscriptions] startTrial incoming planId:', planId);

    // Check if user can start trial
    if (!req.user.canStartTrial) {
      return res.status(400).json({
        success: false,
        message: 'User is not eligible for trial'
      });
    }

    // Get or create a plan
    let plan;
    if (planId) {
      plan = await SubscriptionPlan.findById(planId);
    }
    if (!plan) {
      plan = await ensureDefaultPlan();
      planId = plan._id;
    }
    console.log('[Subscriptions] startTrial using plan:', plan?.name, planId?.toString());

    // Start trial for user
    await req.user.startTrial(plan.trialDays);

    // Create subscription record
    const subscription = await Subscription.create({
      user: req.user._id,
      plan: planId,
      status: 'trialing',
      trialStart: new Date(),
      trialEnd: req.user.trialEndsAt,
      currentPeriodEnd: req.user.trialEndsAt
    });
    console.log('[Subscriptions] Trial created. Subscription ID:', subscription._id.toString());

    res.status(200).json({
      success: true,
      message: 'Trial started successfully',
      data: {
        subscription,
        trialEndsAt: req.user.trialEndsAt,
        trialDays: plan.trialDays
      }
    });
  } catch (error) {
    console.error('Start trial error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start trial',
      error: error.message
    });
  }
};

// @desc    Upgrade or change subscription plan
// @route   POST /api/subscriptions/upgrade
// @access  Private
const upgradeSubscription = async (req, res) => {
  try {
    let { planId, billingCycle = 'monthly' } = req.body || {};
    console.log('[Subscriptions] upgradeSubscription called by user:', req.user?._id?.toString());
    console.log('[Subscriptions] upgrade incoming planId:', planId, 'billing:', billingCycle);

    // Get or create a plan
    let plan;
    if (planId) {
      plan = await SubscriptionPlan.findById(planId);
    }
    if (!plan) {
      plan = await ensureDefaultPlan();
      planId = plan._id;
    }
    console.log('[Subscriptions] upgrade using plan:', plan?.name, planId?.toString());

    // Update user's subscription
    await req.user.upgradeSubscription(planId, billingCycle);

    // Update or create subscription record
    let subscription = await Subscription.findOne({ user: req.user._id });
    console.log('[Subscriptions] existing subscription found:', !!subscription);

    if (subscription) {
      subscription.plan = planId;
      subscription.billingCycle = billingCycle;
      subscription.status = 'active';
      subscription.currentPeriodStart = new Date();
      subscription.currentPeriodEnd = req.user.subscriptionEndDate;
      await subscription.save();
    } else {
      subscription = await Subscription.create({
        user: req.user._id,
        plan: planId,
        status: 'active',
        billingCycle,
        currentPeriodStart: new Date(),
        currentPeriodEnd: req.user.subscriptionEndDate
      });
    }

    console.log('[Subscriptions] upgrade success for user:', req.user?._id?.toString());
    res.status(200).json({
      success: true,
      message: 'Subscription upgraded successfully',
      data: {
        subscription,
        plan
      }
    });
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade subscription',
      error: error.message
    });
  }
};

// @desc    Cancel subscription
// @route   POST /api/subscriptions/cancel
// @access  Private
const cancelSubscription = async (req, res) => {
  try {
    const { immediately = false } = req.body;

    const subscription = await Subscription.findOne({ user: req.user._id });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    await subscription.cancel(immediately);
    await req.user.cancelSubscription();

    const message = immediately
      ? 'Subscription cancelled immediately'
      : 'Subscription will be cancelled at the end of the current period';

    res.status(200).json({
      success: true,
      message,
      data: {
        subscription,
        cancelledImmediately: immediately
      }
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message
    });
  }
};

// @desc    Reactivate cancelled subscription
// @route   POST /api/subscriptions/reactivate
// @access  Private
const reactivateSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found'
      });
    }

    if (!subscription.cancelAtPeriodEnd) {
      return res.status(400).json({
        success: false,
        message: 'Subscription is not scheduled for cancellation'
      });
    }

    await subscription.reactivate();

    res.status(200).json({
      success: true,
      message: 'Subscription reactivated successfully',
      data: subscription
    });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate subscription',
      error: error.message
    });
  }
};

// @desc    Get user's billing history
// @route   GET /api/subscriptions/billing-history
// @access  Private
const getBillingHistory = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });

    if (!subscription) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    res.status(200).json({
      success: true,
      data: subscription.billingHistory
    });
  } catch (error) {
    console.error('Get billing history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get billing history',
      error: error.message
    });
  }
};

// @desc    Get usage statistics
// @route   GET /api/subscriptions/usage
// @access  Private
const getUsageStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const subscription = await Subscription.findOne({ user: req.user._id })
      .populate('plan');

    const usage = {
      current: user.usageStats,
      limits: subscription && subscription.plan ? {
        apiCalls: subscription.plan.features.apiCalls,
        storage: subscription.plan.features.storage
      } : {
        apiCalls: 100, // Free tier limits
        storage: 50
      },
      resetDate: user.usageStats.lastResetDate
    };

    res.status(200).json({
      success: true,
      data: usage
    });
  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get usage statistics',
      error: error.message
    });
  }
};

// @desc    Create or update subscription plan (Admin only)
// @route   POST /api/subscriptions/plans
// @access  Private/Admin
const createSubscriptionPlan = async (req, res) => {
  try {
    const planData = req.body;

    const plan = await SubscriptionPlan.create(planData);

    res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully',
      data: plan
    });
  } catch (error) {
    console.error('Create subscription plan error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Plan name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription plan',
      error: error.message
    });
  }
};

// @desc    Update subscription plan (Admin only)
// @route   PUT /api/subscriptions/plans/:id
// @access  Private/Admin
const updateSubscriptionPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subscription plan updated successfully',
      data: plan
    });
  } catch (error) {
    console.error('Update subscription plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription plan',
      error: error.message
    });
  }
};

// @desc    Delete subscription plan (Admin only)
// @route   DELETE /api/subscriptions/plans/:id
// @access  Private/Admin
const deleteSubscriptionPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    // Check if plan is being used by active subscriptions
    const activeSubscriptions = await Subscription.countDocuments({
      plan: req.params.id,
      status: { $in: ['active', 'trialing'] }
    });

    if (activeSubscriptions > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete plan with active subscriptions'
      });
    }

    await SubscriptionPlan.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Subscription plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete subscription plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete subscription plan',
      error: error.message
    });
  }
};

module.exports = {
  getSubscriptionPlans,
  getSubscriptionStatus,
  startTrial,
  upgradeSubscription,
  cancelSubscription,
  reactivateSubscription,
  getBillingHistory,
  getUsageStats,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan
};

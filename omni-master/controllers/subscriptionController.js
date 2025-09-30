const User = require('../models/User');
const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');

// Helper to prefer a specific plan by name without creating new ones
const findPreferredPlan = async (namesInOrder = []) => {
  for (const name of namesInOrder) {
    const plan = await SubscriptionPlan.getPlanByName(name);
    if (plan) return plan;
  }
  return null;
};

// @desc    Get all available subscription plans
// @route   GET /api/subscriptions/plans
// @access  Public
const getSubscriptionPlans = async (req, res) => {
  try {
    console.log('[Subscriptions] getSubscriptionPlans called');
    const plans = await SubscriptionPlan.getActivePlans();
    console.log(`[Subscriptions] Active plans found: ${plans.length}`);

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

    // Resolve a plan without creating new ones
    let plan;
    if (planId) {
      plan = await SubscriptionPlan.findById(planId);
    }
    if (!plan) {
      // Prefer plus then pro for trials; avoid free for trials if possible
      plan = await findPreferredPlan(['plus', 'pro']);
      if (!plan) {
        return res.status(400).json({
          success: false,
          message: 'No eligible trial plan available. Please contact support.'
        });
      }
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

    // Resolve a plan without creating new ones
    let plan;
    if (planId) {
      plan = await SubscriptionPlan.findById(planId);
    }
    if (!plan) {
      // Prefer pro then plus for upgrade fallback
      plan = await findPreferredPlan(['pro', 'plus']);
      if (!plan) {
        return res.status(400).json({
          success: false,
          message: 'No eligible paid plan available. Please contact support.'
        });
      }
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

// Stripe webhook to finalize subscription after Checkout
const stripeWebhook = async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      console.error('[Stripe] Missing STRIPE_WEBHOOK_SECRET');
      return res.status(500).send('Webhook secret not configured');
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('[Stripe] Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const payload = event.data.object;
        // When available, prefer Checkout Session metadata
        const isSession = payload.object === 'checkout.session';
        const metadata = isSession ? (payload.metadata || {}) : {};
        const userIdStr = (isSession && payload.client_reference_id) ? String(payload.client_reference_id) : null;
        const planId = metadata.planId || null;
        const billingCycle = metadata.billingCycle || 'monthly';

        // Resolve user
        let user = null;
        if (userIdStr) {
          user = await User.findById(userIdStr);
        }
        // Fallback by email if provided
        if (!user && metadata.userEmail) {
          user = await User.findOne({ email: String(metadata.userEmail).toLowerCase() });
        }
        if (!user) {
          console.warn('[Stripe] Webhook: user not found for session, skipping');
          break;
        }

        // Resolve plan
        let plan = null;
        if (planId) {
          plan = await SubscriptionPlan.findById(planId);
        }
        if (!plan && metadata.planName) {
          plan = await SubscriptionPlan.getPlanByName(metadata.planName);
        }
        if (!plan) {
          console.warn('[Stripe] Webhook: plan not found, skipping');
          break;
        }

        // Upgrade user
        await user.upgradeSubscription(plan._id, billingCycle);

        // Upsert Subscription record
        let subscription = await Subscription.findOne({ user: user._id });
        if (subscription) {
          subscription.plan = plan._id;
          subscription.status = 'active';
          subscription.billingCycle = billingCycle;
          subscription.currentPeriodStart = new Date();
          subscription.currentPeriodEnd = user.subscriptionEndDate;
          await subscription.save();
        } else {
          subscription = await Subscription.create({
            user: user._id,
            plan: plan._id,
            status: 'active',
            billingCycle,
            currentPeriodStart: new Date(),
            currentPeriodEnd: user.subscriptionEndDate
          });
        }

        break;
      }
      default:
        // Ignore other events
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(500).send('Server error');
  }
};

// Confirm session endpoint for success page fallback
const confirmSession = async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const { sessionId } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId is required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session || session.mode !== 'subscription') {
      return res.status(400).json({ success: false, message: 'Invalid session' });
    }
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Payment not completed' });
    }

    const metadata = session.metadata || {};
    const billingCycle = metadata.billingCycle || 'monthly';
    let plan = null;
    if (metadata.planId) {
      plan = await SubscriptionPlan.findById(metadata.planId);
    }
    if (!plan && metadata.planName) {
      plan = await SubscriptionPlan.getPlanByName(metadata.planName);
    }
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Plan not found for session' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    await user.upgradeSubscription(plan._id, billingCycle);

    let subscription = await Subscription.findOne({ user: user._id });
    if (subscription) {
      subscription.plan = plan._id;
      subscription.status = 'active';
      subscription.billingCycle = billingCycle;
      subscription.currentPeriodStart = new Date();
      subscription.currentPeriodEnd = user.subscriptionEndDate;
      await subscription.save();
    } else {
      subscription = await Subscription.create({
        user: user._id,
        plan: plan._id,
        status: 'active',
        billingCycle,
        currentPeriodStart: new Date(),
        currentPeriodEnd: user.subscriptionEndDate
      });
    }

    res.status(200).json({ success: true, message: 'Subscription confirmed', data: { subscription, user } });
  } catch (error) {
    console.error('Confirm session error:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm subscription', error: error.message });
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

// @desc    Create Stripe Checkout session for a subscription plan
// @route   POST /api/subscriptions/checkout-session
// @access  Public (or Private if you want to require login)
const createStripeCheckoutSession = async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const { planId, billingCycle = 'monthly', successUrl, cancelUrl, email } = req.body;
    if (!planId) {
      return res.status(400).json({ success: false, message: 'planId is required' });
    }
    // Resolve the plan: accept ObjectId or name (with aliases)
    const SubscriptionPlanModel = require('../models/SubscriptionPlan');
    let plan = null;
    const toLower = String(planId).toLowerCase();
    const isLikelyObjectId = typeof planId === 'string' && /^[a-f\d]{24}$/.test(planId);
    if (isLikelyObjectId) {
      plan = await SubscriptionPlanModel.findById(planId);
    }
    if (!plan) {
      // Allow names and common aliases from UI
      const aliasMap = { plus: 'starter', pro: 'professional' };
      const nameToFind = aliasMap[toLower] || toLower;
      plan = await SubscriptionPlanModel.findOne({ name: nameToFind, isActive: true });
    }
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    // Get the Stripe price ID
    const priceId = plan.stripePriceId && plan.stripePriceId[billingCycle];
    if (!priceId) {
      return res.status(400).json({ success: false, message: 'Stripe price ID not set for this plan/cycle' });
    }
    // Create the Stripe Checkout session
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: email, // Optional: prefill email
      success_url: successUrl || `${frontendBase}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${frontendBase}/cancel`,
      client_reference_id: (req.user && req.user._id) ? String(req.user._id) : undefined,
      metadata: {
        planId: String(plan._id),
        planName: plan.name,
        billingCycle,
        userEmail: email || '',
      }
    });
    return res.status(200).json({ success: true, url: session.url });
  } catch (error) {
    console.error('Stripe Checkout session error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create Stripe Checkout session', error: error.message });
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
  deleteSubscriptionPlan,
  createStripeCheckoutSession,
  stripeWebhook,
  confirmSession,
};

const express = require('express');
const router = express.Router();
const {
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
  createStripeCheckoutSession
} = require('../controllers/subscriptionController');
const { stripeWebhook, confirmSession } = require('../controllers/subscriptionController');

// Import middleware
const { protect, authorize } = require('../middleware/auth');
const { canStartTrial, validateSubscriptionStatus } = require('../middleware/subscription');
const { validateStartTrial, validateUpgradeSubscription, validateCancelSubscription, validateCreateSubscriptionPlan } = require('../middleware/validation');

// Public routes
router.get('/plans', getSubscriptionPlans);
router.post('/checkout-session', createStripeCheckoutSession);
// Stripe requires raw body for signature verification; route is mounted in server.js

// Protected routes (require authentication)
router.use(protect);

// User subscription routes
router.get('/status', getSubscriptionStatus);
router.get('/usage', getUsageStats);
router.get('/billing-history', getBillingHistory);

// Trial management
router.post('/start-trial', canStartTrial, validateStartTrial, startTrial);

// Subscription management
router.post('/upgrade', validateUpgradeSubscription, upgradeSubscription);
router.post('/cancel', validateCancelSubscription, cancelSubscription);
router.post('/reactivate', reactivateSubscription);
router.post('/confirm-session', confirmSession);

// Admin only routes
router.post('/plans', authorize('admin'), validateCreateSubscriptionPlan, createSubscriptionPlan);
router.put('/plans/:id', authorize('admin'), updateSubscriptionPlan);
router.delete('/plans/:id', authorize('admin'), deleteSubscriptionPlan);

module.exports = router;

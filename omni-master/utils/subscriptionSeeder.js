const mongoose = require('mongoose');
const SubscriptionPlan = require('../models/SubscriptionPlan');

const defaultPlans = [
  {
    name: 'free',
    displayName: 'Free',
    description: 'Perfect for getting started with basic features including currency conversion',
    price: {
      monthly: 0,
      yearly: 0
    },
    currency: 'USD',
    features: {
      apiCalls: 100,
      storage: 50,
      premiumFeatures: ['currency_converter', 'document_converter'],
      canCreateTeams: false,
      canExportData: false,
      hasPrioritySupport: false,
      hasAdvancedAnalytics: false,
      hasApiAccess: false
    },
    isActive: true,
    isPopular: false,
    sortOrder: 1,
    trialDays: 0
  },
  {
    name: 'starter',
    displayName: 'Starter',
    description: 'Great for small teams and growing businesses with enhanced currency tools',
    price: {
      monthly: 9.99,
      yearly: 99.99
    },
    currency: 'USD',
    features: {
      apiCalls: 1000,
      storage: 500,
      premiumFeatures: [
        'currency_converter',
        'document_converter',
        'biblical_chatbot',
        'character_creation',
        'image_generation',
        'basic_analytics',
        'historical_rates'
      ],
      canCreateTeams: false,
      canExportData: true,
      hasPrioritySupport: false,
      hasAdvancedAnalytics: false,
      hasApiAccess: true
    },
    isActive: true,
    isPopular: false,
    sortOrder: 2,
    trialDays: 14
  },
  {
    name: 'professional',
    displayName: 'Professional',
    description: 'Advanced features for professional teams with comprehensive currency tools',
    price: {
      monthly: 29.99,
      yearly: 299.99
    },
    currency: 'USD',
    features: {
      apiCalls: 10000,
      storage: 2000,
      premiumFeatures: [
        'currency_converter',
        'document_converter',
        'biblical_chatbot',
        'character_creation',
        'image_generation',
        'video_generation_with_audio',
        'audio_generation',
        'biblical_accuracy',
        'basic_analytics',
        'historical_rates',
        'advanced_analytics',
        'custom_integrations',
        'bulk_conversion'
      ],
      canCreateTeams: true,
      canExportData: true,
      hasPrioritySupport: true,
      hasAdvancedAnalytics: true,
      hasApiAccess: true
    },
    isActive: true,
    isPopular: true,
    sortOrder: 3,
    trialDays: 14
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    description: 'Unlimited access with premium support and all features',
    price: {
      monthly: 99.99,
      yearly: 999.99
    },
    currency: 'USD',
    features: {
      apiCalls: 1000000, // Practically unlimited within validations
      storage: 100000,   // Practically unlimited within validations
      premiumFeatures: [
        'currency_converter',
        'document_converter',
        'biblical_chatbot',
        'character_creation',
        'image_generation',
        'video_generation_with_audio',
        'audio_generation',
        'tts_voice_generation',
        'background_music_generation',
        'sound_effects_generation',
        'biblical_accuracy',
        'book_writing',
        'legal_documents',
        'basic_analytics',
        'historical_rates',
        'advanced_analytics',
        'custom_integrations',
        'bulk_conversion',
        'white_label',
        'api_access',
        'export_data',
        'team_collaboration',
        'real_time_rates'
      ],
      canCreateTeams: true,
      canExportData: true,
      hasPrioritySupport: true,
      hasAdvancedAnalytics: true,
      hasApiAccess: true
    },
    isActive: true,
    isPopular: false,
    sortOrder: 4,
    trialDays: 30
  }
];

const seedSubscriptionPlans = async () => {
  try {
    console.log('Seeding subscription plans...');

    // Clear existing plans
    await SubscriptionPlan.deleteMany({});
    console.log('Cleared existing subscription plans');

    // Insert default plans
    const plans = await SubscriptionPlan.insertMany(defaultPlans);
    console.log(`Successfully seeded ${plans.length} subscription plans`);

    // Log the created plans
    plans.forEach(plan => {
      console.log(`- ${plan.displayName} (${plan.name}): $${plan.price.monthly}/month`);
      console.log(`  Features: ${plan.features.premiumFeatures.join(', ')}`);
    });

    return plans;
  } catch (error) {
    console.error('Error seeding subscription plans:', error);
    throw error;
  }
};

// If this file is run directly
if (require.main === module) {
  require('dotenv').config();

  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/express_app', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log('Connected to MongoDB');
    await seedSubscriptionPlans();
    console.log('Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
}

module.exports = {
  seedSubscriptionPlans,
  defaultPlans
};

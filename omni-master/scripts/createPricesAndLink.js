#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const SubscriptionPlan = require('../models/SubscriptionPlan');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--plan') args.plan = argv[++i];
    else if (a === '--product') args.product = argv[++i];
    else if (a === '--only') args.only = argv[++i]; // 'monthly' | 'yearly'
  }
  return args;
}

(async () => {
  try {
    const { plan: planName, product: productId, only } = parseArgs(process.argv);

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Missing STRIPE_SECRET_KEY in environment.');
      process.exit(1);
    }
    if (!planName) {
      console.error('Usage: node scripts/createPricesAndLink.js --plan <starter|professional|...> --product <prod_...> [--only monthly|yearly]');
      process.exit(1);
    }
    if (!productId) {
      console.error('Missing required --product <prod_...>');
      process.exit(1);
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    await connectDB();

    const plan = await SubscriptionPlan.findOne({ name: planName.toLowerCase(), isActive: true });
    if (!plan) {
      console.error(`Plan not found or inactive: ${planName}`);
      process.exit(1);
    }

    const currency = (plan.currency || 'USD').toLowerCase();

    const toCents = (num) => Math.round(Number(num) * 100);

    const shouldCreateMonthly = !only || only === 'monthly';
    const shouldCreateYearly = !only || only === 'yearly';

    const updates = { stripePriceId: { ...(plan.stripePriceId || {}) } };

    if (shouldCreateMonthly) {
      if (!plan.price || typeof plan.price.monthly !== 'number') {
        console.error('Plan is missing monthly price.');
        process.exit(1);
      }
      console.log(`[Stripe] Creating monthly price for ${planName} (${currency}) ${plan.price.monthly}`);
      const monthly = await stripe.prices.create({
        unit_amount: toCents(plan.price.monthly),
        currency,
        recurring: { interval: 'month' },
        product: productId,
      });
      updates.stripePriceId.monthly = monthly.id;
      console.log(`[Stripe] Monthly price created: ${monthly.id}`);
    }

    if (shouldCreateYearly) {
      if (!plan.price || typeof plan.price.yearly !== 'number') {
        console.error('Plan is missing yearly price.');
        process.exit(1);
      }
      console.log(`[Stripe] Creating yearly price for ${planName} (${currency}) ${plan.price.yearly}`);
      const yearly = await stripe.prices.create({
        unit_amount: toCents(plan.price.yearly),
        currency,
        recurring: { interval: 'year' },
        product: productId,
      });
      updates.stripePriceId.yearly = yearly.id;
      console.log(`[Stripe] Yearly price created: ${yearly.id}`);
    }

    await SubscriptionPlan.updateOne({ _id: plan._id }, { $set: updates });
    const updated = await SubscriptionPlan.findById(plan._id);
    console.log('[DB] Plan updated with stripePriceId:', updated.name, updated.stripePriceId);

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error creating prices and linking plan:', err);
    try { await mongoose.connection.close(); } catch (_) {}
    process.exit(1);
  }
})();



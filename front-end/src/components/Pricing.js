import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

const Pricing = () => {
    const plans = [
        {
            name: 'Creator',
            price: 'Free',
            desc: 'For hobbyists getting started.',
            features: [
                '5 AI generations per day',
                'Standard resolution',
                'Public gallery access',
                'Community support'
            ],
            notIncluded: [
                'Commercial usage',
                'Priority generation',
                'High-res downloads'
            ],
            color: 'from-gray-500 to-gray-700'
        },
        {
            name: 'Pro',
            price: '$29',
            period: '/month',
            desc: 'For serious creators and professionals.',
            features: [
                'Unlimited generations',
                '4K Resolution',
                'Commercial license',
                'Priority queue',
                'Private gallery'
            ],
            notIncluded: [],
            popular: true,
            color: 'from-[var(--primary)] to-emerald-500'
        },
        {
            name: 'Studio',
            price: '$99',
            period: '/month',
            desc: 'For teams and high-volume needs.',
            features: [
                'Everything in Pro',
                'API Access',
                '3 Seat License',
                'Dedicated Support',
                'Custom Models'
            ],
            notIncluded: [],
            color: 'from-purple-500 to-pink-500'
        }
    ];

    return (
        <div className="min-h-screen pt-24 pb-20 px-6 bg-noir-900">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16 space-y-4">
                    <h1 className="text-4xl md:text-6xl font-bold text-white font-heading tracking-tight">
                        Simple, Transparent Priciing
                    </h1>
                    <p className="text-xl text-white/60 max-w-2xl mx-auto">
                        Choose the plan that best fits your creative needs. Cancel anytime.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`
                                relative p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm
                                ${plan.popular ? 'ring-2 ring-[var(--primary)] shadow-[0_0_40px_rgba(var(--primary-rgb),0.1)]' : ''}
                            `}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[var(--primary)] text-black font-bold text-sm rounded-full">
                                    MOST POPULAR
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                                    {plan.period && <span className="text-white/50">{plan.period}</span>}
                                </div>
                                <p className="text-white/60 mt-4 h-12">{plan.desc}</p>
                            </div>

                            <div className="space-y-4 mb-8">
                                {plan.features.map((feature) => (
                                    <div key={feature} className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-[var(--primary)]/20 flex items-center justify-center shrink-0">
                                            <Check size={12} className="text-[var(--primary)]" />
                                        </div>
                                        <span className="text-white/80 text-sm">{feature}</span>
                                    </div>
                                ))}
                                {plan.notIncluded.map((feature) => (
                                    <div key={feature} className="flex items-center gap-3 opacity-50">
                                        <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                            <X size={12} className="text-white" />
                                        </div>
                                        <span className="text-white/50 text-sm">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button className={`
                                w-full py-4 rounded-xl font-bold transition-all
                                ${plan.popular
                                    ? 'bg-[var(--primary)] text-black hover:scale-[1.02] shadow-lg shadow-[var(--primary)]/20'
                                    : 'bg-white/10 text-white hover:bg-white/20'}
                            `}>
                                Choose {plan.name}
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Pricing;

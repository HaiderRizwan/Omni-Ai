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
        <div className="min-h-screen pt-20 md:pt-24 pb-16 md:pb-20 px-4 md:px-6 bg-noir-900">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-10 md:mb-16 space-y-3 md:space-y-4">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white font-heading tracking-tight">
                        Simple, Transparent Pricing
                    </h1>
                    <p className="text-base md:text-xl text-white/60 max-w-2xl mx-auto px-4">
                        Choose the plan that best fits your creative needs. Cancel anytime.
                    </p>
                </div>

                {/* Mobile: Stack vertically, Desktop: 3-column grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`
                                relative p-6 md:p-8 rounded-2xl md:rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm
                                ${plan.popular ? 'ring-2 ring-[var(--primary)] shadow-[0_0_40px_rgba(var(--primary-rgb),0.1)] order-first md:order-none' : ''}
                            `}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 px-3 md:px-4 py-1 bg-[var(--primary)] text-black font-bold text-xs md:text-sm rounded-full whitespace-nowrap">
                                    MOST POPULAR
                                </div>
                            )}

                            <div className="mb-6 md:mb-8">
                                <h3 className="text-lg md:text-xl font-bold text-white mb-2">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl md:text-4xl font-bold text-white">{plan.price}</span>
                                    {plan.period && <span className="text-white/50 text-sm md:text-base">{plan.period}</span>}
                                </div>
                                <p className="text-white/60 mt-3 md:mt-4 text-sm md:text-base min-h-[2.5rem] md:h-12">{plan.desc}</p>
                            </div>

                            <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                                {plan.features.map((feature) => (
                                    <div key={feature} className="flex items-center gap-2 md:gap-3">
                                        <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-[var(--primary)]/20 flex items-center justify-center shrink-0">
                                            <Check size={10} className="text-[var(--primary)]" />
                                        </div>
                                        <span className="text-white/80 text-xs md:text-sm">{feature}</span>
                                    </div>
                                ))}
                                {plan.notIncluded.map((feature) => (
                                    <div key={feature} className="flex items-center gap-2 md:gap-3 opacity-50">
                                        <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                            <X size={10} className="text-white" />
                                        </div>
                                        <span className="text-white/50 text-xs md:text-sm">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button className={`
                                w-full py-3 md:py-4 rounded-xl font-bold transition-all text-sm md:text-base touch-target
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

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, Globe, Cpu, Palette, Film } from 'lucide-react';
import HeroGraphic from './dashboard/HeroGraphic';

const Features = () => {
    const features = [
        {
            title: 'Multimodal Generation',
            desc: 'Generate text, code, images, and video from a single unified interface.',
            icon: Cpu,
            color: 'text-purple-400'
        },
        {
            title: 'Real-time Collaboration',
            desc: 'Work together with your team in real-time on shared projects and canvases.',
            icon: Globe,
            color: 'text-blue-400'
        },
        {
            title: 'Enterprise Security',
            desc: 'Bank-grade encryption and SSO support for large organizations.',
            icon: Shield,
            color: 'text-green-400'
        },
        {
            title: 'Custom Models',
            desc: 'Fine-tune AI models on your own data for brand-consistent outputs.',
            icon: Palette,
            color: 'text-pink-400'
        },
        {
            title: 'Video Studio',
            desc: 'Create professional AI-generated videos with consistent characters.',
            icon: Film,
            color: 'text-orange-400'
        },
        {
            title: 'Lightning Fast',
            desc: 'Powered by our proprietary edge network for sub-second latency.',
            icon: Zap,
            color: 'text-yellow-400'
        }
    ];

    return (
        <div className="min-h-screen pt-24 pb-20 px-6 bg-black">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between mb-24 gap-12">
                    <div className="flex-1 space-y-6">
                        <h1 className="text-5xl md:text-7xl font-bold text-white font-heading tracking-tight leading-none">
                            Unlimitied <br />
                            <span className="text-[var(--primary)]">Power.</span>
                        </h1>
                        <p className="text-xl text-white/60 max-w-lg">
                            The comprehensive AI suite designed for the next generation of creators.
                            Everything you need, nothing you don't.
                        </p>
                    </div>
                    <div className="flex-1 h-[400px] w-full relative">
                        <HeroGraphic className="w-full h-full opacity-80" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-neutral-900/50 border border-white/5 p-8 rounded-3xl hover:bg-neutral-900 transition-colors group"
                        >
                            <div className="bg-white/5 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <feature.icon size={28} className={feature.color} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                            <p className="text-white/50 leading-relaxed">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Features;

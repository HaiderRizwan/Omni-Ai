import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

const Support = () => {
    const [openIndex, setOpenIndex] = useState(null);

    const faqs = [
        {
            q: "How does the innovative pricing model work?",
            a: "We offer a freemium model. You can start for free with daily limits. For power users, our Pro plan unlocks unlimited generations and commercial rights."
        },
        {
            q: "Can I use the images for commercial projects?",
            a: "Yes! All images generated on the Pro and Studio plans come with a full commercial license. Free plan images are for personal use only."
        },
        {
            q: "Do you offer API access?",
            a: "Yes, API access is available on our Studio plan. Documentation is available in the developer portal once you upgrade."
        },
        {
            q: "What AI models do you use?",
            a: "We use a proprietary blend of open-source models (SDXL, Llama 3) fine-tuned on our curated aesthetic datasets."
        }
    ];

    return (
        <div className="min-h-screen pt-24 pb-20 px-6 bg-noir-800">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-white font-heading mb-6">
                        How can we help?
                    </h1>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl text-left hover:border-[var(--primary)] transition-colors cursor-pointer group">
                            <Mail className="w-8 h-8 text-[var(--primary)] mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Email Support</h3>
                            <p className="text-white/60 text-sm">Get a response within 24 hours.</p>
                            <span className="text-[var(--primary)] text-sm mt-4 block group-hover:underline">Contact Us &rarr;</span>
                        </div>
                        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl text-left hover:border-[var(--primary)] transition-colors cursor-pointer group">
                            <MessageSquare className="w-8 h-8 text-blue-400 mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Live Chat</h3>
                            <p className="text-white/60 text-sm">Available 9am - 5pm EST.</p>
                            <span className="text-blue-400 text-sm mt-4 block group-hover:underline">Start Chat &rarr;</span>
                        </div>
                    </div>
                </div>

                <div className="bg-black/50 border border-white/5 rounded-3xl p-8 md:p-12">
                    <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                        <HelpCircle className="text-white/50" /> Frequently Asked Questions
                    </h2>

                    <div className="space-y-4">
                        {faqs.map((item, i) => (
                            <div key={i} className="border-b border-white/5 pb-4 last:border-0">
                                <button
                                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                    className="w-full flex items-center justify-between text-left py-4 hover:text-[var(--primary)] transition-colors"
                                >
                                    <span className="text-lg font-medium text-white">{item.q}</span>
                                    {openIndex === i ? <ChevronUp /> : <ChevronDown />}
                                </button>
                                <motion.div
                                    initial={false}
                                    animate={{ height: openIndex === i ? 'auto' : 0, opacity: openIndex === i ? 1 : 0 }}
                                    className="overflow-hidden"
                                >
                                    <p className="text-white/60 pb-4 leading-relaxed">
                                        {item.a}
                                    </p>
                                </motion.div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Support;

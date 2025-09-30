import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';

const plans = [
  {
    id: 'free',
    name: 'Omni AI Free',
    price: '$0/month',
    features: [
      'Try out image generation',
      'Up to 3 images per day',
      'Basic AI chat and tools',
      'Learn more about everything you get with Omni AI Free',
    ],
    button: 'Get Free',
    highlight: false,
  },
  {
    id: 'plus',
    name: 'Omni AI Plus',
    price: '$20/month',
    features: [
      'Image and video generation',
      'Up to 720p resolution and 10s duration videos',
      'Access to advanced AI tools',
      'Learn more about everything you get with Omni AI Plus',
    ],
    button: 'Get Plus',
    highlight: true,
  },
  {
    id: 'pro',
    name: 'Omni AI Pro',
    price: '$200/month',
    features: [
      'Faster generations',
      'Up to 1080p resolution and 20s duration videos',
      'Up to 5 concurrent generations',
      'Download videos without watermark',
      'Priority support',
      'Learn more about everything you get with Omni AI Pro',
    ],
    button: 'Get Pro',
    highlight: false,
  },
];

const PlanModal = ({ isOpen, onClose, currentPlan, onSelectPlan }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-2 md:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative w-full max-w-4xl md:max-w-[900px] bg-white/10 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 flex flex-col items-center"
          style={{ background: 'rgba(255,255,255,0.10)' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between w-full p-6 border-b border-white/20 bg-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors mr-2"
                aria-label="Back"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl font-bold text-white">Manage Plan</h2>
            </div>
            <motion.button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Close"
            >
              <X size={20} />
            </motion.button>
          </div>
          <div className="flex flex-row flex-wrap gap-6 p-6 md:p-12 justify-center items-stretch w-full">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={`flex-1 min-w-[180px] max-w-[220px] bg-black/30 rounded-xl border border-white/10 p-6 flex flex-col items-center shadow-lg ${plan.highlight ? 'ring-2 ring-red-500/40' : ''}`}
                style={{ flexBasis: '200px' }}
              >
                <h3 className="text-lg font-semibold text-white mb-2 text-center">{plan.name}</h3>
                <div className="text-2xl font-bold text-red-400 mb-4">{plan.price}</div>
                <ul className="text-gray-300 text-sm mb-4 space-y-2 list-disc list-inside">
                  {plan.features.map((feature, i) => (
                    <li key={i}>{feature}</li>
                  ))}
                </ul>
                {currentPlan === plan.id ? (
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium cursor-default opacity-60 text-base" disabled>
                    Current plan
                  </button>
                ) : (
                  <button
                    className={`px-4 py-2 rounded-lg font-medium transition-colors text-base ${plan.highlight ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-700 hover:bg-gray-800 text-white'}`}
                    onClick={() => onSelectPlan && onSelectPlan(plan.id)}
                  >
                    {plan.button}
                  </button>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default PlanModal;

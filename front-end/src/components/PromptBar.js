import { useState } from 'react';
import { motion } from 'framer-motion';

function PromptBar() {
  const [prompt, setPrompt] = useState('A cinematic portrait of a fox in neon lights');

  return (
    <section className="relative z-20 -mt-10 mb-20 px-6" id="generate">
      <div className="max-w-4xl mx-auto">
        <div className="glass-panel rounded-2xl p-2 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-noir-800/90 ring-1 ring-white/10">
          <div className="flex flex-col md:flex-row gap-2">
            <motion.input
              className="flex-1 bg-white/5 border border-white/5 rounded-xl px-6 py-4 text-white placeholder-white/30 focus:outline-none focus:bg-white/10 focus:ring-1 focus:ring-[var(--primary)] transition-all font-sans text-lg"
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your image..."
              whileFocus={{ scale: 1.01 }}
            />
            <div className="flex gap-2">
              <motion.button
                className="px-6 py-3 rounded-xl bg-white/5 text-white/70 font-medium hover:bg-white/10 hover:text-white transition-colors border border-white/5"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Random
              </motion.button>
              <motion.button
                className="px-8 py-3 rounded-xl bg-[var(--primary)] text-black font-bold hover:bg-[var(--primary-700)] transition-colors shadow-lg shadow-[var(--primary)]/20"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Generate
              </motion.button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 px-1">
            <select className="ui-input-sm w-auto py-1 px-3 bg-transparent border-0 text-sm text-white/50 hover:text-white/80 focus:ring-0 cursor-pointer">
              <option>Model: Vision v1</option>
              <option>Model: Vision v2</option>
            </select>
            <select className="ui-input-sm w-auto py-1 px-3 bg-transparent border-0 text-sm text-white/50 hover:text-white/80 focus:ring-0 cursor-pointer">
              <option>Aspect: 1:1</option>
              <option>Aspect: 3:2</option>
              <option>Aspect: 16:9</option>
            </select>
            <select className="ui-input-sm w-auto py-1 px-3 bg-transparent border-0 text-sm text-white/50 hover:text-white/80 focus:ring-0 cursor-pointer">
              <option>Guidance: 7</option>
              <option>Guidance: 10</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PromptBar;



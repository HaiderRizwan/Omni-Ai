import { motion } from 'framer-motion';

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-3xl opacity-20" style={{ background: 'radial-gradient(circle, #6C7CFF 0%, transparent 60%)' }} />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full blur-3xl opacity-20" style={{ background: 'radial-gradient(circle, #FF5CDB 0%, transparent 60%)' }} />
      </div>
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-10 text-center">
        <motion.h1 className="text-3xl md:text-5xl font-extrabold tracking-tight" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          Unleash AI Creativity
        </motion.h1>
        <motion.p className="mt-4 text-base md:text-lg text-[#b8b9c9]" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
          Generate stunning images and videos with avatars powered by AI.
        </motion.p>
        <motion.div className="mt-8 flex items-center justify-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <motion.a
            href="#generate"
            className="inline-flex rounded-full bg-gradient-to-b from-red-500 to-rose-500 px-6 py-3 text-white shadow-[0_0_24px_rgba(239,68,68,0.35)] ring-1 ring-white/10"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            animate={{ boxShadow: [
              '0 0 18px rgba(239,68,68,0.35)',
              '0 0 34px rgba(239,68,68,0.55)',
              '0 0 18px rgba(239,68,68,0.35)'
            ] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            Create Your Avatar
          </motion.a>
          <motion.a href="#generate" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className="inline-flex rounded-full border border-white/15 px-5 py-3 text-[#e6e6f0] hover:border-white/25 transition-colors">
            Generate with AI
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}

export default Hero;



import { motion } from 'framer-motion';

function Hero() {
  return (
    <section className="relative overflow-hidden min-h-[90vh] flex items-center justify-center bg-noir-900 bg-noise">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full blur-[120px] opacity-20" style={{ background: 'radial-gradient(circle, #CCFF00 0%, transparent 60%)' }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] opacity-10" style={{ background: 'radial-gradient(circle, #FFFFFF 0%, transparent 60%)' }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-5xl md:text-8xl font-heading font-black tracking-tighter text-white mb-6 leading-[0.9]">
            UNLEASH <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-white">AI CREATIVITY</span>
          </h1>
        </motion.div>

        <motion.p
          className="mt-6 text-lg md:text-xl text-[#888] max-w-2xl mx-auto font-light leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          Forge stunning digital avatars and cinematic videos with next-gen AI.
          <span className="text-white"> Precision engineered. Artistically driven.</span>
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col md:flex-row items-center justify-center gap-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <motion.a
            href="#generate"
            className="group relative inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-8 py-4 text-lg font-bold text-black transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(204,255,0,0.3)]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="relative z-10">Create Interface</span>
            <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.a>

          <motion.a
            href="#generate"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-4 text-lg font-medium text-white hover:bg-white/5 transition-all"
          >
            Explore Gallery
            <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
          </motion.a>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
        >
          <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-white/30 to-transparent mx-auto mb-2" />
          <span className="text-xs uppercase tracking-widest">Scroll</span>
        </motion.div>
      </div>
    </section>
  );
}

export default Hero;



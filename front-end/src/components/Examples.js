import { motion } from 'framer-motion';

const images = [
  'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1520975922284-4b3b1a79a479?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1520975693416-44f0c1fcd3f1?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1520976004701-b2d9b6ae9c1b?q=80&w=1200&auto=format&fit=crop'
];

function Examples() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <div className="flex items-center justify-between mb-10">
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-white tracking-tight">
          See what's <span className="text-[var(--primary)]">possible</span>
        </h2>
        <a className="text-sm font-medium text-white/60 hover:text-white transition-colors border-b border-transparent hover:border-[var(--primary)]" href="#">View all gallery</a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {images.map((src, idx) => (
          <motion.div
            key={idx}
            className="overflow-hidden rounded-2xl border border-white/5 bg-noir-800 relative group"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            whileHover={{ y: -5 }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
            <img src={src} alt="AI example" className="w-full h-48 md:h-72 object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute bottom-4 left-4 z-20 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
              <span className="text-xs font-bold bg-[var(--primary)] text-black px-2 py-1 rounded">Remix</span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export default Examples;



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
    <section className="max-w-6xl mx-auto px-6 py-10">
      <div className="section-header">
        <h2>See what's possible</h2>
        <a className="link" href="#">View all</a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((src, idx) => (
          <motion.div
            key={idx}
            className="overflow-hidden rounded-xl border border-white/10 bg-[#0f1020]"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.35, delay: idx * 0.04 }}
            whileHover={{ scale: 1.01 }}
          >
            <img src={src} alt="AI example" className="w-full h-40 md:h-56 object-cover" />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export default Examples;



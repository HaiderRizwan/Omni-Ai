import { motion } from 'framer-motion';
import { useState } from 'react';
import { Heart, Share2, TrendingUp, Zap } from 'lucide-react';

function Gallery() {
  const [loadingImages, setLoadingImages] = useState(new Set());
  const [loadedImages, setLoadedImages] = useState(new Set());

  const images = [
    {
      id: 1,
      url: 'https://source.unsplash.com/featured/1200x900?cyberpunk,neon&sig=11',
      title: 'Cyberpunk Neon City',
      category: 'Digital Art',
      likes: 1247
    },
    {
      id: 2,
      url: 'https://source.unsplash.com/featured/1200x900?ai,avatar,neon&sig=12',
      title: 'AI Avatar Portrait',
      category: 'Portrait',
      likes: 892
    },
    {
      id: 3,
      url: 'https://source.unsplash.com/featured/1200x900?abstract,digital,glow&sig=13',
      title: 'Abstract Digital Glow',
      category: 'Abstract',
      likes: 1563
    },
    {
      id: 4,
      url: 'https://source.unsplash.com/featured/1200x900?futuristic,holographic&sig=14',
      title: 'Futuristic Hologram',
      category: 'Sci-Fi',
      likes: 2108
    },
    {
      id: 5,
      url: 'https://source.unsplash.com/featured/1200x900?cinematic,neon&sig=15',
      title: 'Cinematic Neon Scene',
      category: 'Cinematic',
      likes: 1876
    },
    {
      id: 6,
      url: 'https://source.unsplash.com/featured/1200x900?surreal,ai,glow&sig=16',
      title: 'Surreal AI Dream',
      category: 'Surreal',
      likes: 1345
    },
    {
      id: 7,
      url: 'https://source.unsplash.com/featured/1200x900?portrait,neon,ai&sig=17',
      title: 'Neon Portrait',
      category: 'Portrait',
      likes: 987
    },
    {
      id: 8,
      url: 'https://source.unsplash.com/featured/1200x900?city,night,neon&sig=18',
      title: 'Neon City Night',
      category: 'Urban',
      likes: 2234
    },
  ];

  const fallbacks = Array.from({ length: images.length }).map((_, i) => `https://picsum.photos/seed/neon-${i}/1200/900`);

  const handleImageLoad = (imageId) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageId);
      return newSet;
    });
    setLoadedImages(prev => new Set([...prev, imageId]));
  };

  const handleImageError = (imageId, event) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageId);
      return newSet;
    });
    if (!event.currentTarget.dataset.fallback) {
      event.currentTarget.src = fallbacks[imageId - 1];
      event.currentTarget.dataset.fallback = 'true';
    }
  };

  const handleImageStart = (imageId) => {
    setLoadingImages(prev => new Set([...prev, imageId]));
  };

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  return (
    <section className="min-h-screen bg-noir-900 py-16 md:py-24 relative overflow-hidden px-4 md:px-6" id="community">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] md:h-[500px] bg-gradient-to-b from-noir-800 to-transparent opacity-50 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          className="text-center mb-10 md:mb-16 px-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-[var(--primary)] mb-4 md:mb-6">
            <TrendingUp size={14} />
            <span>Community Showcase</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-black tracking-tighter text-white mb-4 md:mb-6">
            TRENDING <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-emerald-400">CREATIONS</span>
          </h2>
          <p className="text-base md:text-xl text-white/50 max-w-2xl mx-auto font-light">
            Discover precision-engineered artwork from our elite creative network.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
          {images.map((image, idx) => (
            <motion.div
              key={image.id}
              className="group relative bg-noir-800 rounded-2xl overflow-hidden border border-white/5 hover:border-[var(--primary)]/50 transition-colors"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: idx * 0.05, duration: 0.5 }}
              whileHover={{ y: -8 }}
            >
              {/* Loading Skeleton */}
              <div
                className="absolute inset-0 bg-white/5 animate-pulse z-20"
                style={{ display: loadingImages.has(image.id) ? 'block' : 'none' }}
              />

              {/* Overlay Actions */}
              <div className="absolute top-3 right-3 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-[var(--primary)] hover:text-black transition-colors">
                  <Heart size={16} />
                </button>
                <button className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-white hover:text-black transition-colors">
                  <Share2 size={16} />
                </button>
              </div>

              <div className="aspect-[4/3] overflow-hidden bg-noir-900">
                <img
                  src={image.url}
                  alt={image.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  onLoadStart={() => handleImageStart(image.id)}
                  onLoad={() => handleImageLoad(image.id)}
                  onError={(e) => handleImageError(image.id, e)}
                  style={{
                    opacity: loadedImages.has(image.id) ? 1 : 0,
                    transition: 'opacity 0.5s ease'
                  }}
                />
              </div>

              <div className="p-3 md:p-5">
                <h3 className="font-heading font-bold text-sm md:text-lg text-white mb-2 md:mb-3 group-hover:text-[var(--primary)] transition-colors truncate">{image.title}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] md:text-xs font-semibold px-2 py-1 rounded bg-white/5 text-white/70 border border-white/5 group-hover:border-[var(--primary)]/30 transition-colors">
                    {image.category}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] md:text-xs font-medium text-white/50">
                    <Heart size={10} className={image.likes > 1500 ? "text-[var(--primary)] fill-[var(--primary)]" : ""} />
                    {formatNumber(image.likes)}
                  </span>
                </div>
              </div>

              {/* Glow Effect */}
              <div className="absolute inset-0 border-2 border-[var(--primary)] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-[0_0_30px_rgba(204,255,0,0.15)]" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Gallery;



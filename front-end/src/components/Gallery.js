import { motion } from 'framer-motion';
import { useState } from 'react';

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
    <section className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-20" id="community">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent mb-4">
            Trending Creations
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Discover amazing AI-generated artwork from our creative community
          </p>
        </motion.div>
      
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {images.map((image, idx) => (
          <motion.div
            key={image.id}
            className="card"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              delay: idx * 0.1, 
              duration: 0.6,
              type: "spring",
              stiffness: 100
            }}
            whileHover={{ 
              scale: 1.02,
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="image-skeleton" style={{ 
              display: loadingImages.has(image.id) ? 'block' : 'none' 
            }}>
              <div className="shimmer"></div>
            </div>
            
            <div className="card-actions">
              <button className="card-action-btn" title="Like">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
              <button className="card-action-btn" title="Share">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16,6 12,2 8,6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              </button>
            </div>

            <img
              src={image.url}
              alt={image.title}
              loading="lazy"
              onLoadStart={() => handleImageStart(image.id)}
              onLoad={() => handleImageLoad(image.id)}
              onError={(e) => handleImageError(image.id, e)}
              style={{ 
                display: loadingImages.has(image.id) ? 'none' : 'block',
                opacity: loadedImages.has(image.id) ? 1 : 0,
                transition: 'opacity 0.3s ease'
              }}
            />

            <div className="card-content">
              <h3 className="card-title">{image.title}</h3>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginTop: '8px'
              }}>
                <span style={{ 
                  fontSize: '12px', 
                  color: '#8b93ff', 
                  background: 'rgba(139, 147, 255, 0.1)',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(139, 147, 255, 0.2)'
                }}>
                  {image.category}
                </span>
                <span style={{ 
                  fontSize: '12px', 
                  color: '#b8b9c9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  {formatNumber(image.likes)}
                </span>
              </div>
            </div>
          </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Gallery;



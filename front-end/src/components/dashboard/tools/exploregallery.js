import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Share2, 
  Download,
  Search, 
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';
import safeLocalStorage from '../../../utils/localStorage';

const Gallery = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';


  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = safeLocalStorage.getItem('token');
      if (!token) {
        setError('Please log in to view images');
        return;
      }

      const response = await fetch(`${apiBase}/api/images`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setImages(data.data);
      } else {
        setError('Failed to load images');
      }
    } catch (err) {
      console.error('Error fetching images:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imageId) => {
    return `${apiBase}/api/images/public/${imageId}`;
  };

  // Note: Explore is read-only (no delete). Deletion is available in My Images gallery.

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filter and search images
  const filteredImages = images.filter(image => {
    const matchesSearch = image.prompt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         image.title?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Sort images by newest first
  const sortedImages = [...filteredImages].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const paginatedImages = sortedImages;

  const handleImageClick = (image) => {
    setSelectedImage(image);
  };

  const handleDownload = async (image) => {
    try {
      const response = await fetch(getImageUrl(image._id));
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image-${image._id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleShare = async (image) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: image.prompt,
          text: `Check out this AI-generated image: ${image.prompt}`,
          url: getImageUrl(image._id)
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(getImageUrl(image._id));
    }
  };

  const prevImage = () => {
    const currentIndex = sortedImages.findIndex(img => img._id === selectedImage._id);
    if (currentIndex > 0) {
      setSelectedImage(sortedImages[currentIndex - 1]);
    }
  };

  const nextImage = () => {
    const currentIndex = sortedImages.findIndex(img => img._id === selectedImage._id);
    if (currentIndex < sortedImages.length - 1) {
      setSelectedImage(sortedImages[currentIndex + 1]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-black/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Loading Images</h3>
          <p className="text-gray-400">Please wait while we fetch your images...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-black/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-black" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Error Loading Images</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchImages}
            className="px-4 py-2 bg-black hover:bg-black text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0b0b0f]">
      {/* Header */}
      <div className="bg-gradient-to-r from-black/20 via-gray-900/30 to-blue-900/20 backdrop-blur-xl border-b border-black/20 p-6">
        <div className="flex items-center justify-between">
          {/* Left Section - Title and Count */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Explore
                </h1>
                <p className="text-gray-400 text-sm font-medium">
                  {sortedImages.length} images
                </p>
              </div>
            </div>
          </div>
          
          {/* Right Section - Controls */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-red-400 transition-colors" />
              <input
                type="text"
                placeholder="Search images..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 w-12 h-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 focus:bg-white/10 transition-all duration-200 backdrop-blur-sm"
              />
            </div>


          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {sortedImages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Images Found</h3>
              <p className="text-gray-400">Start creating images to see them here!</p>
            </div>
          </div>
        ) : (
          <>
            {/* Images Grid */}
            <motion.div
              layout
              className="grid grid-cols-3 gap-px w-full auto-rows-max m-0 p-0"
              style={{
                gap: '1px',
                margin: '0px',
                padding: '0px',
                gridTemplateColumns: 'repeat(3, 1fr)'
              }}
            >
              <AnimatePresence>
                {paginatedImages.map((image, index) => (
                  <motion.div
                    key={image._id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="group relative overflow-hidden cursor-pointer transition-all duration-300 w-full"
                    style={{
                      margin: '0px',
                      padding: '0px',
                      border: 'none'
                    }}
                    onClick={() => handleImageClick(image)}
                  >
                    <div 
                      className="aspect-square relative w-full m-0 p-0"
                      style={{
                        margin: '0px',
                        padding: '0px'
                      }}
                    >
                      <img
                        src={getImageUrl(image._id)}
                        alt={image.prompt}
                        className="w-full h-full object-cover block"
                        style={{
                          margin: '0px',
                          padding: '0px',
                          border: 'none',
                          display: 'block'
                        }}
                        loading="lazy"
                      />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(image);
                            }}
                            className="w-8 h-8 bg-black/50 hover:bg-red-600/80 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShare(image);
                            }}
                            className="w-8 h-8 bg-black/50 hover:bg-red-600/80 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                            title="Share"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          {/* No delete in Explore */}
                        </div>
                        
                        <div className="text-white">
                          <p className="text-sm font-medium truncate mb-1" title={image.prompt}>
                            {image.prompt}
                          </p>
                          <p className="text-xs text-gray-300">
                            {formatDate(image.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

          </>
        )}
      </div>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] bg-gray-900 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-white font-medium truncate flex-1 mr-4" title={selectedImage.prompt}>
                  {selectedImage.prompt}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(selectedImage)}
                    className="p-2 bg-white/10 hover:bg-red-500/20 rounded-lg text-white transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleShare(selectedImage)}
                    className="p-2 bg-white/10 hover:bg-red-500/20 rounded-lg text-white transition-colors"
                    title="Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  {/* No delete in Explore modal */}
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="p-2 bg-white/10 hover:bg-red-500/20 rounded-lg text-white transition-colors"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Image */}
              <div className="relative">
                <img
                  src={getImageUrl(selectedImage._id)}
                  alt={selectedImage.prompt}
                  className="max-w-full max-h-[60vh] object-contain mx-auto"
                />
                
                {/* Navigation Arrows */}
                {sortedImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                  <div>
                    <span className="text-gray-300">Size:</span>
                    <span className="ml-2">{selectedImage.width}×{selectedImage.height}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">File Size:</span>
                    <span className="ml-2">{formatFileSize(selectedImage.size)}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Format:</span>
                    <span className="ml-2">
                      {selectedImage.contentType?.split('/')[1]?.toUpperCase() || 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-300">Created:</span>
                    <span className="ml-2">{formatDate(selectedImage.createdAt)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;

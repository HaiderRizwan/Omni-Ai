import React, { useState, useEffect } from 'react';
import safeLocalStorage from '../../../utils/localStorage';
import { Trash2 } from 'lucide-react';

const ImageGallery = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  useEffect(() => {
    console.log('🚀 ImageGallery component mounted, fetching images...');
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      console.log('🔄 Starting to fetch images...');
      setLoading(true);
      setError(null);

      const token = safeLocalStorage.getItem('token');
      console.log('🔑 Token exists:', !!token);
      
      if (!token) {
        console.log('❌ No token found, user not logged in');
        setError('Please log in to view images');
        return;
      }

      const apiUrl = `${apiBase}/api/images`;
      console.log('🌐 Fetching from URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Error response body:', errorText);
        throw new Error(`Failed to fetch images: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Response data structure:', {
        success: data.success,
        hasData: !!data.data,
        dataLength: data.data?.length || 0,
        pagination: data.pagination
      });
      
      if (data.success && data.data) {
        console.log('✅ Images loaded successfully:', data.data.length);
        console.log('🖼️ Sample image:', data.data[0]);
        setImages(data.data);
      } else {
        console.log('⚠️ No images found or invalid response structure');
        setImages([]);
      }
    } catch (err) {
      console.error('❌ Error fetching images:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (id) => {
    const url = `${apiBase}/api/images/public/${id}`;
    console.log('🔗 Generated image URL:', url);
    return url;
  };

  const deleteImage = async (id) => {
    try {
      const token = safeLocalStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${apiBase}/api/images/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        try { (window.__toast?.push || (()=>{}))({ message: `Delete failed: ${res.status}${txt ? ` - ${txt}` : ''}`, type: 'error' }); } catch(_) {}
        return;
      }
      setImages(prev => prev.filter(img => img._id !== id));
      if (selectedImage?._id === id) setSelectedImage(null);
      try { (window.__toast?.push || (()=>{}))({ message: 'Image deleted', type: 'success' }); } catch(_) {}
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-400 text-sm">Loading images...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-400">
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchImages}
            className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-2">🖼️</div>
          <p className="text-sm">No images generated yet</p>
          <p className="text-xs mt-1">Create your first image using the tools above</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Image Gallery</h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">{images.length} images</span>
          <button
            onClick={fetchImages}
            className="p-1 hover:bg-gray-700 rounded"
            title="Refresh"
          >
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Images Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {images.map((image, index) => (
            <div
              key={image._id}
              className="group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden cursor-pointer hover:from-gray-700 hover:to-gray-800 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 border border-gray-700/50 hover:border-purple-500/30"
              onClick={() => setSelectedImage(image)}
              style={{
                animationDelay: `${index * 0.1}s`,
                animation: 'fadeInUp 0.6s ease-out forwards'
              }}
            >
              <div className="aspect-square relative">
                <img
                  src={getImageUrl(image._id)}
                  alt={image.prompt}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  onLoad={() => {
                    console.log('✅ Image loaded successfully:', image._id);
                  }}
                  onError={(e) => {
                    console.error('❌ Image failed to load:', {
                      imageId: image._id,
                      imageUrl: getImageUrl(image._id),
                      prompt: image.prompt,
                      error: e
                    });
                    
                    // Test the URL directly and try to load as blob
                    fetch(getImageUrl(image._id))
                      .then(response => {
                        console.log('🔍 Direct fetch test for image:', {
                          status: response.status,
                          statusText: response.statusText,
                          headers: Object.fromEntries(response.headers.entries()),
                          url: response.url
                        });
                        return response.blob();
                      })
                      .then(blob => {
                        console.log('🔍 Image blob received:', {
                          size: blob.size,
                          type: blob.type
                        });
                        
                        // Try to create object URL and set as src
                        const objectUrl = URL.createObjectURL(blob);
                        console.log('🔗 Created object URL:', objectUrl);
                        e.target.src = objectUrl;
                      })
                      .catch(fetchError => {
                        console.error('🔍 Direct fetch failed:', fetchError);
                        e.target.src = '/fallback.png';
                      });
                  }}
                />
                {/* Enhanced overlay with actions and info */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-4">
                  {/* Action buttons */}
                  <div className="flex justify-end gap-2">
                    <button 
                      className="w-8 h-8 bg-black/50 hover:bg-purple-600/80 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                      title="Download"
                      onClick={(e) => {
                        e.stopPropagation();
                        const link = document.createElement('a');
                        link.href = getImageUrl(image._id);
                        link.download = `image-${image._id}.png`;
                        link.click();
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7,10 12,15 17,10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                    <button 
                      className="w-8 h-8 bg-black/50 hover:bg-purple-600/80 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                      title="Copy URL"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(getImageUrl(image._id));
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                    <button 
                      className="w-8 h-8 bg-black/50 hover:bg-red-600/80 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                      title="Delete"
                      onClick={(e) => { e.stopPropagation(); deleteImage(image._id); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Image info */}
                  <div className="text-white">
                    <p className="text-sm font-medium truncate mb-1" title={image.prompt}>
                      {image.prompt}
                    </p>
                    <p className="text-xs text-gray-300">
                      {new Date(image.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Image Info - Compact version */}
              <div className="p-3 bg-gray-800/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {image.width}×{image.height}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(image.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl max-h-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Image Details</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-gray-400 hover:text-white"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <img
                    src={getImageUrl(selectedImage._id)}
                    alt={selectedImage.prompt}
                    className="w-full h-auto max-h-96 object-contain rounded"
                  />
                </div>

                <div className="lg:w-80 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Prompt</h4>
                    <p className="text-sm text-gray-400">{selectedImage.prompt}</p>
                  </div>

                  {selectedImage.negativePrompt && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">
                        Negative Prompt
                      </h4>
                      <p className="text-sm text-gray-400">
                        {selectedImage.negativePrompt}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-300">Size:</span>
                      <span className="text-gray-400 ml-2">
                        {selectedImage.width}×{selectedImage.height}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-300">File Size:</span>
                      <span className="text-gray-400 ml-2">
                        {formatFileSize(selectedImage.size)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-300">Format:</span>
                      <span className="text-gray-400 ml-2">
                        {selectedImage.contentType
                          ?.split('/')[1]
                          ?.toUpperCase() || 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-300">Created:</span>
                      <span className="text-gray-400 ml-2">
                        {formatDate(selectedImage.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-700">
                    <button
                      onClick={() => {
                        const url = getImageUrl(selectedImage._id);
                        navigator.clipboard.writeText(url);
                      }}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                      Copy Image URL
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;

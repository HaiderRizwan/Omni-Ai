import React, { useState, useEffect } from 'react';
import { X, Video, Image as ImageIcon, RefreshCw } from 'lucide-react';
import safeLocalStorage from '../../../utils/localStorage';

const GallerySelectionModal = ({ onClose, onFileSelect }) => {
  const [activeTab, setActiveTab] = useState('images');
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const token = safeLocalStorage.getItem('token');

  useEffect(() => {
    if (activeTab === 'images') {
      fetchImages();
    } else {
      fetchVideos();
    }
  }, [activeTab]);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/images`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setImages(data.data);
      } else {
        setError('Failed to load images');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/videos/list?status=completed`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setVideos(data.data.videos);
      } else {
        setError('Failed to load videos');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imageId) => `${apiBase}/api/images/public/${imageId}`;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#0b0b0f] border border-white/10 rounded-xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Select from Gallery</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="border-b border-white/10">
          <div className="flex">
            <button
              onClick={() => setActiveTab('images')}
              className={`flex-1 p-4 text-sm font-medium transition-colors ${activeTab === 'images' ? 'text-white bg-white/10' : 'text-gray-400 hover:bg-white/5'}`}
            >
              <ImageIcon className="w-5 h-5 mx-auto mb-1" />
              Images
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`flex-1 p-4 text-sm font-medium transition-colors ${activeTab === 'videos' ? 'text-white bg-white/10' : 'text-gray-400 hover:bg-white/5'}`}
            >
              <Video className="w-5 h-5 mx-auto mb-1" />
              Videos
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && <div className="text-center text-gray-400">Loading...</div>}
          {error && <div className="text-center text-[var(--primary)]">{error}</div>}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {activeTab === 'images' && images.map(image => (
              <div key={image._id} className="aspect-square relative group cursor-pointer" onClick={() => onFileSelect(getImageUrl(image._id), image.prompt)}>
                <img src={getImageUrl(image._id)} alt={image.prompt} className="w-full h-full object-cover rounded-lg" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p className="text-white text-center p-2">{image.prompt}</p>
                </div>
              </div>
            ))}
            {activeTab === 'videos' && videos.map(video => (
              <div key={video._id} className="aspect-square relative group cursor-pointer" onClick={() => onFileSelect(video.videoUrl, video.title)}>
                <video src={video.videoUrl} poster={video.avatar?.imageUrl} className="w-full h-full object-cover rounded-lg" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p className="text-white text-center p-2">{video.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GallerySelectionModal;

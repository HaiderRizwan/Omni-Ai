import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Share2,
  Download,
  Trash2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';
import { useToast } from '../../ToastProvider';
import safeLocalStorage from '../../../utils/localStorage';

const Gallery = () => {
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyA2ECompatible, setShowOnlyA2ECompatible] = useState(false);

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
        setError('Please log in to view avatars');
        return;
      }

      const response = await fetch(`${apiBase}/api/avatars`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch avatars: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data && data.data.avatars) {
        setAvatars(data.data.avatars);
      } else {
        setError('Failed to load avatars');
      }
    } catch (err) {
      console.error('Error fetching avatars:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imageId) => {
    return `${apiBase}/api/avatars/public/${imageId}`;
  };

  const { push } = useToast();

  const handleDelete = async (avatarId) => {
    try {
      const token = safeLocalStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${apiBase}/api/avatars/${avatarId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        push({ message: `Delete failed: ${res.status}${txt ? ` - ${txt}` : ''}`, type: 'error' });
        return;
      }
      setAvatars(prev => prev.filter(a => a._id !== avatarId));
      if (selectedAvatar?._id === avatarId) setSelectedAvatar(null);
      push({ message: 'Avatar deleted successfully', type: 'success' });
    } catch (e) {
      console.error('Delete error:', e);
      push({ message: 'Delete failed due to an error', type: 'error' });
    }
  };

  const handleDownload = async (avatar) => {
    try {
      const response = await fetch(getImageUrl(avatar._id));
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `avatar-${avatar._id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      push({ message: 'Avatar download started', type: 'success' });
    } catch (error) {
      console.error('Download failed:', error);
      push({ message: 'Download failed', type: 'error' });
    }
  };

  const handleShare = async (avatar) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: avatar.prompt,
          text: `Check out this AI-generated avatar: ${avatar.prompt}`,
          url: getImageUrl(avatar._id)
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(getImageUrl(avatar._id));
      push({ message: 'Link copied to clipboard', type: 'success' });
    }
  };

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

  // Filter and search avatars
  const filteredAvatars = avatars.filter(avatar => {
    const matchesSearch = avatar.prompt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      avatar.originalPrompt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      avatar.characterDescription?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesA2EFilter = !showOnlyA2ECompatible || avatar.isA2ECompatible || avatar.a2eAnchorId;

    return matchesSearch && matchesA2EFilter;
  });

  // Sort avatars by newest first
  const sortedAvatars = [...filteredAvatars].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const paginatedAvatars = sortedAvatars;

  const handleImageClick = (avatar) => {
    setSelectedAvatar(avatar);
  };

  const prevImage = () => {
    const currentIndex = sortedAvatars.findIndex(avatar => avatar._id === selectedAvatar._id);
    if (currentIndex > 0) {
      setSelectedAvatar(sortedAvatars[currentIndex - 1]);
    }
  };

  const nextImage = () => {
    const currentIndex = sortedAvatars.findIndex(avatar => avatar._id === selectedAvatar._id);
    if (currentIndex < sortedAvatars.length - 1) {
      setSelectedAvatar(sortedAvatars[currentIndex + 1]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-black/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Loading Avatars</h3>
          <p className="text-gray-400">Please wait while we fetch your avatars...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-noir-900 border-l border-white/5">
      {/* Header */}
      <div className="bg-white/[0.02] backdrop-blur-xl border-b border-white/5 p-6">
        <div className="flex items-center justify-between">
          {/* Left Section - Title and Count */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Avatar Gallery
                </h1>
                <p className="text-gray-400 text-sm font-medium mt-1">
                  {sortedAvatars.length} avatars generated
                </p>
              </div>
            </div>
          </div>

          {/* Right Section - Controls */}
          <div className="flex items-center gap-4">
            {/* A2E Compatible Filter */}
            <button
              onClick={() => setShowOnlyA2ECompatible(!showOnlyA2ECompatible)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${showOnlyA2ECompatible
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-black/20 text-gray-400 border border-white/10 hover:bg-white/5 hover:text-white'
                }`}
            >
              <Filter className="w-4 h-4" />
              <span>Video Ready</span>
              {showOnlyA2ECompatible && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-md text-[10px] font-bold">
                  ON
                </span>
              )}
            </button>

            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-white transition-colors" />
              <input
                type="text"
                placeholder="Search avatars..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 pr-4 py-2.5 w-64 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 focus:bg-black/40 transition-all duration-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-xl flex items-center gap-3 text-[var(--primary)]">
            <X className="w-5 h-5" />
            <span>{error}</span>
            <button onClick={fetchImages} className="ml-auto text-sm hover:underline">Retry</button>
          </div>
        )}

        {sortedAvatars.length === 0 && !error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Avatars Found</h3>
              <p className="text-gray-400">Start creating avatars to see them here!</p>
            </div>
          </div>
        ) : (
          <>
            {/* Avatars Grid */}
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
                {paginatedAvatars.map((avatar, index) => (
                  <motion.div
                    key={avatar._id}
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
                    onClick={() => handleImageClick(avatar)}
                  >
                    <div
                      className="aspect-square relative w-full m-0 p-0"
                      style={{
                        margin: '0px',
                        padding: '0px'
                      }}
                    >
                      <img
                        src={getImageUrl(avatar._id)}
                        alt={avatar.prompt}
                        className="w-full h-full object-cover block bg-gray-800"
                        style={{
                          margin: '0px',
                          padding: '0px',
                          border: 'none',
                          display: 'block'
                        }}
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzMzMzMzIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iNDAiIGZpbGw9IiM2NjY2NjYiLz4KPHBhdGggZD0iTTgwIDEyMEwxMjAgMTIwTTEwMCA4MEwxMDAgMTYwIiBzdHJva2U9IiM5OTk5OTkiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPg==';
                          e.target.alt = 'Avatar failed to load';
                        }}
                      />

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(avatar);
                            }}
                            className="w-8 h-8 bg-black/50 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                            title="Download"
                          >
                            <Download className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShare(avatar);
                            }}
                            className="w-8 h-8 bg-black/50 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                            title="Share"
                          >
                            <Share2 className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(avatar._id); }}
                            className="w-8 h-8 bg-black/50 hover:bg-[var(--primary)]/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-white hover:text-[var(--primary)]" />
                          </button>
                        </div>

                        <div className="text-white">
                          <p className="text-sm font-medium truncate mb-1" title={avatar.prompt}>
                            {avatar.prompt}
                          </p>
                          <p className="text-xs text-gray-300">
                            {formatDate(avatar.createdAt)}
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

      {/* Avatar Modal */}
      <AnimatePresence>
        {selectedAvatar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedAvatar(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full bg-[#0b0b0f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/[0.02]">
                <h3 className="text-white font-medium truncate flex-1 mr-4 text-lg" title={selectedAvatar.prompt}>
                  {selectedAvatar.prompt}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(selectedAvatar)}
                    className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleShare(selectedAvatar)}
                    className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white transition-colors"
                    title="Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(selectedAvatar._id)}
                    className="p-2.5 bg-white/5 hover:bg-[var(--primary)]/20 border border-white/5 hover:border-[var(--primary)]/30 rounded-xl text-white hover:text-[var(--primary)] transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedAvatar(null)}
                    className="p-2.5 bg-white/5 hover:bg-[var(--primary)]/20 border border-white/5 hover:border-[var(--primary)]/30 rounded-xl text-white hover:text-[var(--primary)] transition-colors ml-2"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Avatar */}
              <div className="relative flex items-center justify-center bg-black/50 p-4 min-h-[500px]">
                <img
                  src={getImageUrl(selectedAvatar._id)}
                  alt={selectedAvatar.prompt}
                  className="max-w-full max-h-[70vh] object-contain shadow-2xl rounded-lg"
                />

                {/* Navigation Arrows */}
                {sortedAvatars.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); prevImage(); }}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 border border-white/10 rounded-full text-white transition-all hover:scale-110 backdrop-blur-sm"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); nextImage(); }}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 border border-white/10 rounded-full text-white transition-all hover:scale-110 backdrop-blur-sm"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-white/10 bg-white/[0.02]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                  <div>
                    <span className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Dimensions</span>
                    <span className="text-gray-200 font-medium">{selectedAvatar.width} × {selectedAvatar.height}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500 text-xs uppercase tracking-wider mb-1">File Size</span>
                    <span className="text-gray-200 font-medium">{formatFileSize(selectedAvatar.size)}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Format</span>
                    <span className="text-gray-200 font-medium tracking-wide">
                      {selectedAvatar.contentType?.split('/')[1]?.toUpperCase() || 'PNG'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Created</span>
                    <span className="text-gray-200 font-medium">{formatDate(selectedAvatar.createdAt)}</span>
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


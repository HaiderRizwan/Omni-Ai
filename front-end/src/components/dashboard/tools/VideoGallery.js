import React, { useState, useEffect } from 'react';
import { Play, Download, Trash2, Calendar, Clock, User, RefreshCw, AlertCircle, Video } from 'lucide-react';
import toast from 'react-hot-toast';

const VideoGallery = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState('all'); // all, completed, processing, failed
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const token = localStorage.getItem('token');
  const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

  const fetchVideos = async (page = 1, status = 'all') => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${apiBase}/api/videos/list?page=${page}&limit=12&status=${status}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch videos: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setVideos(result.data.videos);
        setPagination(result.data.pagination);
      } else {
        throw new Error(result.message || 'Failed to fetch videos');
      }
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err.message);
      toast.error(`Failed to load videos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteVideo = async (videoId) => {
    if (!window.confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${apiBase}/api/videos/${videoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete video: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success('Video deleted successfully');
        // Refresh the current page
        fetchVideos(currentPage, filter);
      } else {
        throw new Error(result.message || 'Failed to delete video');
      }
    } catch (err) {
      console.error('Error deleting video:', err);
      toast.error(`Failed to delete video: ${err.message}`);
    }
  };

  const downloadVideo = async (videoUrl, title) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Video download started');
    } catch (err) {
      console.error('Error downloading video:', err);
      toast.error('Failed to download video');
    }
  };

  const openVideoModal = (video) => {
    setSelectedVideo(video);
    setShowVideoModal(true);
  };

  const closeVideoModal = () => {
    setSelectedVideo(null);
    setShowVideoModal(false);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
    fetchVideos(1, newFilter);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchVideos(newPage, filter);
  };

  useEffect(() => {
    fetchVideos(currentPage, filter);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-400/10';
      case 'processing': return 'text-yellow-400 bg-yellow-400/10';
      case 'failed': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
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

  const formatDuration = (createdAt, completedAt) => {
    if (!completedAt) return 'In progress...';
    const duration = Math.round((new Date(completedAt) - new Date(createdAt)) / 1000);
    return `${duration}s`;
  };

  if (loading && videos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading your videos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Video className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-bold text-white">My Videos</h2>
        </div>
        
        <button
          onClick={() => fetchVideos(currentPage, filter)}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-800/30 p-1 rounded-lg">
        {[
          { key: 'all', label: 'All Videos', count: pagination.total },
          { key: 'completed', label: 'Completed' },
          { key: 'processing', label: 'Processing' },
          { key: 'failed', label: 'Failed' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleFilterChange(tab.key)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              filter === tab.key
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-2 text-xs opacity-75">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 p-4 mb-6 bg-red-900/20 border border-red-500/20 rounded-lg text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Videos Grid */}
      {videos.length === 0 ? (
        <div className="text-center py-12">
          <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No videos found</h3>
          <p className="text-gray-500">
            {filter === 'all' 
              ? "You haven't created any videos yet. Start by generating your first AI video!"
              : `No ${filter} videos found. Try a different filter.`
            }
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video) => (
              <div key={video._id} className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50 hover:border-gray-600/50 transition-all group">
                {/* Video Thumbnail/Preview */}
                <div className="aspect-video bg-gray-900/50 relative overflow-hidden">
                  {video.status === 'completed' && video.videoUrl ? (
                    <video
                      className="w-full h-full object-cover"
                      poster={video.avatar?.imageUrl}
                      preload="metadata"
                    >
                      <source src={video.videoUrl} type="video/mp4" />
                    </video>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {video.avatar?.imageUrl ? (
                        <img
                          src={video.avatar.imageUrl}
                          alt={video.avatar.name}
                          className="w-full h-full object-cover opacity-50"
                        />
                      ) : (
                        <Video className="w-12 h-12 text-gray-600" />
                      )}
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(video.status)}`}>
                    {video.status}
                  </div>

                  {/* Play Button Overlay */}
                  {video.status === 'completed' && video.videoUrl && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => openVideoModal(video)}
                    >
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-white ml-1" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-2 truncate" title={video.title}>
                    {video.title}
                  </h3>
                  
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2" title={video.script}>
                    {video.script}
                  </p>

                  {/* Metadata */}
                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex items-center space-x-2">
                      <User className="w-3 h-3" />
                      <span>{video.avatar?.name || 'Unknown Avatar'}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(video.createdAt)}</span>
                    </div>
                    
                    {video.status === 'completed' && (
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(video.createdAt, video.completedAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {video.status === 'completed' && video.videoUrl && (
                    <div className="flex space-x-2 mt-4">
                      <button
                        onClick={() => openVideoModal(video)}
                        className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                      >
                        <Play className="w-4 h-4" />
                        <span>Play</span>
                      </button>
                      
                      <button
                        onClick={() => downloadVideo(video.videoUrl, video.title)}
                        className="flex items-center justify-center px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => deleteVideo(video._id)}
                        className="flex items-center justify-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-8">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              <div className="flex space-x-1">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.pages}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Video Modal */}
      {showVideoModal && selectedVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">{selectedVideo.title}</h3>
              <button
                onClick={closeVideoModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Video Player */}
            <div className="flex-1 flex items-center justify-center p-4">
              <video
                controls
                autoPlay
                className="w-full h-auto max-h-[60vh] rounded-lg"
                src={selectedVideo.videoUrl}
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                <p>Created: {formatDate(selectedVideo.createdAt)}</p>
                <p>Avatar: {selectedVideo.avatar?.name || 'Unknown'}</p>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => downloadVideo(selectedVideo.videoUrl, selectedVideo.title)}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                
                <button
                  onClick={() => deleteVideo(selectedVideo._id)}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoGallery;

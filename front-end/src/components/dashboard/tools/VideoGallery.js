import React, { useState, useEffect } from "react";
import {
  Play,
  Download,
  Trash2,
  Calendar,
  Clock,
  User,
  RefreshCw,
  AlertCircle,
  Video,
  X,
} from "lucide-react";
import { useToast } from "../../ToastProvider";

const VideoGallery = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const { push } = useToast();
  const token = localStorage.getItem("token");
  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:3001";

  const fetchVideos = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${apiBase}/api/videos/list?page=${page}&limit=12&status=completed`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch videos: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setVideos(result.data.videos);
        setPagination(result.data.pagination);
      } else {
        throw new Error(result.message || "Failed to fetch videos");
      }
    } catch (err) {
      console.error("Error fetching videos:", err);
      setError(err.message);
      try {
        push({
          message: `Failed to load videos: ${err.message}`,
          type: "error",
        });
      } catch (_) { }
    } finally {
      setLoading(false);
    }
  };

  const deleteVideo = async (videoId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this video? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${apiBase}/api/videos/${videoId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete video: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        try {
          push({ message: "Video deleted successfully", type: "success" });
        } catch (_) { }
        // Refresh the current page
        fetchVideos(currentPage);
      } else {
        throw new Error(result.message || "Failed to delete video");
      }
    } catch (err) {
      console.error("Error deleting video:", err);
      try {
        push({
          message: `Failed to delete video: ${err.message}`,
          type: "error",
        });
      } catch (_) { }
    }
  };

  const downloadVideo = async (videoUrl, title) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      try {
        push({ message: "Video download started", type: "success" });
      } catch (_) { }
    } catch (err) {
      console.error("Error downloading video:", err);
      try {
        push({ message: "Failed to download video", type: "error" });
      } catch (_) { }
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

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchVideos(newPage);
  };

  useEffect(() => {
    fetchVideos(currentPage);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-400 bg-green-400/10";
      case "processing":
        return "text-yellow-400 bg-yellow-400/10";
      case "failed":
        return "text-[var(--primary)] bg-[var(--primary)]/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
    <div className="h-full flex flex-col bg-noir-900 border-l border-white/5">
      <div className="bg-white/[0.02] backdrop-blur-xl border-b border-white/5 p-6 mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Video Gallery</h1>
        <p className="text-gray-400 text-sm font-medium mt-1">Manage and view your generated videos</p>
      </div>

      <div className="px-6 pb-6 flex-1 overflow-y-auto">
        {/* Error Message */}
        {error && (
          <div className="flex items-center space-x-2 p-4 mb-6 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-xl text-[var(--primary)]">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>

        )}

        {/* Videos Grid */}
        {videos.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Video className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No videos found
            </h3>
            <p className="text-gray-400 max-w-sm mx-auto">
              You haven't created any videos yet. Start by generating your first AI video!
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => (
                <div
                  key={video._id}
                  className="group relative bg-black/40 rounded-xl overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-purple-500/10 border border-white/5 hover:border-white/20 transition-all duration-300"
                >
                  <div className="aspect-video relative">
                    <video
                      className="w-full h-full object-cover"
                      poster={video.avatar?.imageUrl}
                      preload="metadata"
                    >
                      <source src={video.videoUrl} type="video/mp4" />
                    </video>

                    {/* Status Badge */}
                    <div
                      className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-medium backdrop-blur-md ${getStatusColor(video.status)}`}
                    >
                      {video.status}
                    </div>

                    {/* Overlay */}
                    <div
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4"
                      onClick={() => openVideoModal(video)}
                    >
                      {/* Top right action buttons */}
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadVideo(video.videoUrl, video.title);
                          }}
                          className="w-8 h-8 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center transition-all duration-200"
                          title="Download"
                        >
                          <Download className="w-4 h-4 text-white" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteVideo(video._id);
                          }}
                          className="w-8 h-8 bg-white/10 hover:bg-[var(--primary)]/20 backdrop-blur-md rounded-lg flex items-center justify-center transition-all duration-200 text-white hover:text-[var(--primary)]"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-white hover:text-[var(--primary)]" />
                        </button>
                      </div>

                      {/* Center Play Button */}
                      <div className="flex-1 flex items-center justify-center">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </div>
                      </div>

                      {/* Bottom video info */}
                      <div className="text-white">
                        <p
                          className="text-sm font-medium truncate mb-1"
                          title={video.title}
                        >
                          {video.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(video.createdAt)}
                        </p>
                      </div>
                    </div>
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
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 rounded-lg transition-colors ${currentPage === page
                          ? "bg-purple-600 text-white"
                          : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                          }`}
                      >
                        {page}
                      </button>
                    ),
                  )}
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
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={closeVideoModal}
          >
            <div
              className="bg-[#0b0b0f] border border-white/10 rounded-xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {selectedVideo.title}
                </h3>
                <button
                  onClick={closeVideoModal}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
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
              <div className="p-4 border-t border-white/10 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  <p>Created: {formatDate(selectedVideo.createdAt)}</p>
                  <p>Avatar: {selectedVideo.avatar?.name || "Unknown"}</p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      downloadVideo(selectedVideo.videoUrl, selectedVideo.title)
                    }
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>

                  <button
                    onClick={() => deleteVideo(selectedVideo._id)}
                    className="flex items-center space-x-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-black rounded-lg transition-colors"
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
    </div>
  );
};

export default VideoGallery;

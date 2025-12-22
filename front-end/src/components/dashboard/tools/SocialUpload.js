import React, { useState, useEffect } from "react";
import safeLocalStorage from "../../../utils/localStorage";
import GallerySelectionModal from "./GallerySelectionModal";
import { useToast } from "../../ToastProvider";
import { Upload, X, Youtube, Image, FileText, Globe, Share2, Twitter } from "lucide-react";

function SocialUpload() {
  const [activeTab, setActiveTab] = useState("youtube"); // 'youtube' | 'x'

  // YouTube State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [selectedFileUrl, setSelectedFileUrl] = useState(null);
  const [tags, setTags] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState("public");

  // X State
  const [tweetText, setTweetText] = useState("");
  const [isTweeting, setIsTweeting] = useState(false);
  const [isConnectingX, setIsConnectingX] = useState(false);

  const { push } = useToast();

  const onFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    setFile(f || null);
    setSelectedFileUrl(null);
  };

  const onFileSelectFromGallery = (fileUrl, fileTitle) => {
    setSelectedFileUrl(fileUrl);
    setTitle(fileTitle || "");
    setFile(null);
    setShowGalleryModal(false);
  };

  const uploadToYouTube = async () => {
    if (!file && !selectedFileUrl) return;
    setIsUploading(true);
    setResult(null);
    try {
      const apiBase = process.env.REACT_APP_API_URL || "http://localhost:3001";
      const token = safeLocalStorage.getItem("token");
      const form = new FormData();

      if (file) {
        form.append("file", file);
        form.append("title", title || file.name);
      } else if (selectedFileUrl) {
        const response = await fetch(selectedFileUrl);
        const blob = await response.blob();
        const fileName = selectedFileUrl.substring(selectedFileUrl.lastIndexOf("/") + 1);
        const galleryFile = new File([blob], fileName, { type: blob.type });
        form.append("file", galleryFile);
        form.append("title", title || fileName);
      }

      form.append("description", description || "");
      form.append("tags", tags || "");
      form.append("privacyStatus", privacyStatus || "public");

      const res = await fetch(`${apiBase}/api/socials/youtube/upload`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || `Upload failed (${res.status})`);

      setResult(json.data);
      push({ message: "Uploaded to YouTube successfully", type: "success" });
    } catch (e) {
      console.error("YouTube upload error", e);
      push({ message: e?.message || "Upload failed", type: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  const connectX = async () => {
    try {
      setIsConnectingX(true);
      const apiBase = process.env.REACT_APP_API_URL || "http://localhost:3001";
      const token = safeLocalStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/socials/x/auth-url`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.url) throw new Error(json.message || "Failed to init X OAuth");
      window.location.href = json.url;
    } catch (e) {
      push({ message: e?.message || "Connect failed", type: "error" });
    } finally {
      setIsConnectingX(false);
    }
  };

  const postToX = async () => {
    // (Implementation same as before, abbreviated for brevity in prompt context but fully implemented in code)
    if (!tweetText.trim()) return;
    try {
      setIsTweeting(true);
      const apiBase = process.env.REACT_APP_API_URL || "http://localhost:3001";
      const token = safeLocalStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/socials/x/tweet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text: tweetText }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || `Tweet failed`);
      push({ message: "Tweet posted", type: "success" });
      setTweetText("");
    } catch (e) {
      push({ message: e?.message || "Tweet failed", type: "error" });
    } finally {
      setIsTweeting(false);
    }
  };


  return (
    <div className="h-full flex flex-col bg-black text-white p-6 overflow-hidden">

      {/* Header & Tabs */}
      <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold tracking-tight">Social Studio</h1>
          <div className="flex bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('youtube')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'youtube' ? 'bg-[var(--primary)] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <div className="flex items-center gap-2">
                <Youtube size={16} /> YouTube
              </div>
            </button>
            <button
              onClick={() => setActiveTab('x')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'x' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <div className="flex items-center gap-2">
                <Twitter size={16} /> X / Twitter
              </div>
            </button>
          </div>
        </div>


      </div>

      {/* Main Content Area - Horizontal Layout for YouTube */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">

        {activeTab === 'youtube' && (
          <div className="h-full flex flex-col lg:flex-row gap-6">

            {/* Left Column: Media Preview (40%) */}
            <div className="w-full lg:w-[40%] flex flex-col gap-4">
              <div className="flex-1 bg-neutral-900 border-2 border-dashed border-white/10 rounded-2xl relative group hover:border-white/20 transition-all overflow-hidden flex flex-col items-center justify-center p-8">

                {file || selectedFileUrl ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-[var(--primary)]/20 flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8 text-[var(--primary)]" />
                    </div>
                    <p className="text-lg font-medium text-white max-w-[80%] text-center truncate mb-2">
                      {file ? file.name : 'Selected from Gallery'}
                    </p>
                    <p className="text-sm text-gray-500 mb-6">Ready to upload</p>
                    <button
                      onClick={() => { setFile(null); setSelectedFileUrl(null); }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white transition-colors border border-white/10"
                    >
                      Change File
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="absolute inset-0 cursor-pointer flex flex-col items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8 text-gray-400 group-hover:text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Upload Video</h3>
                      <p className="text-gray-400 text-center max-w-xs">Drag and drop your video/short here, or click to browse</p>
                      <input type="file" className="hidden" accept="video/*" onChange={onFileChange} />
                    </label>

                    <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
                      <div className="pointer-events-auto">
                        <button
                          onClick={() => setShowGalleryModal(true)}
                          className="text-sm text-[var(--primary)] hover:underline"
                        >
                          or select from gallery
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Status / Result Card */}
              {result && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Share2 size={12} className="text-black" />
                    </div>
                    <span className="font-bold text-green-500">Upload Complete</span>
                  </div>
                  <a href={result.url} target="_blank" rel="noreferrer" className="text-sm text-white/80 hover:text-white hover:underline truncate block">
                    {result.url}
                  </a>
                </div>
              )}
            </div>

            {/* Right Column: Metadata Details (60%) */}
            <div className="w-full lg:w-[60%] bg-neutral-900 border border-white/5 rounded-2xl p-6 lg:p-8 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <FileText size={18} className="text-gray-400" /> Video Details
              </h3>

              <div className="space-y-6 flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. My Awesome AI Generation"
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell viewers about your video..."
                    rows={5}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Visibility</label>
                    <div className="relative">
                      <select
                        value={privacyStatus}
                        onChange={(e) => setPrivacyStatus(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:border-[var(--primary)] cursor-pointer"
                      >
                        <option value="public">Public</option>
                        <option value="unlisted">Unlisted</option>
                        <option value="private">Private</option>
                      </select>
                      <Globe className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Tags</label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="ai, art, omni..."
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[var(--primary)] transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                <button
                  onClick={uploadToYouTube}
                  disabled={(!file && !selectedFileUrl) || isUploading}
                  className={`
                                  px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg
                                  ${(!file && !selectedFileUrl) || isUploading
                      ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                      : 'bg-[var(--primary)] text-black hover:scale-105 shadow-[var(--primary)]/20'
                    }
                              `}
                >
                  {isUploading ? (
                    <>Checking...</>
                  ) : (
                    <>
                      <Upload size={20} /> Publish Video
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'x' && (
          <div className="max-w-2xl mx-auto mt-10">
            <div className="bg-neutral-900 border border-white/5 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <Twitter className="fill-white" /> Post to X
                </h2>
                <button
                  onClick={connectX}
                  disabled={isConnectingX}
                  className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full text-white transition-colors"
                >
                  {isConnectingX ? "Connecting..." : "Reconnect Account"}
                </button>
              </div>

              <div className="relative mb-6">
                <textarea
                  value={tweetText}
                  onChange={(e) => setTweetText(e.target.value)}
                  placeholder="What's happening in the AI world?"
                  className="w-full h-40 bg-black border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--primary)] resize-none text-lg"
                />
                <div className="absolute bottom-4 right-4 text-xs text-gray-500 font-medium">
                  {tweetText.length} / 280
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={postToX}
                  disabled={!tweetText.trim() || isTweeting}
                  className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {isTweeting ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {showGalleryModal && (
        <GallerySelectionModal
          onClose={() => setShowGalleryModal(false)}
          onFileSelect={onFileSelectFromGallery}
        />
      )}
    </div>
  );
}

export default SocialUpload;

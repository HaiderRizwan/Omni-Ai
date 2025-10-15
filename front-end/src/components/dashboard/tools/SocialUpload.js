import React, { useState, useEffect } from "react";
import safeLocalStorage from "../../../utils/localStorage";
import GallerySelectionModal from "./GallerySelectionModal";

function SocialUpload() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [tweetText, setTweetText] = useState("");
  const [isTweeting, setIsTweeting] = useState(false);
  const [isConnectingX, setIsConnectingX] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [selectedFileUrl, setSelectedFileUrl] = useState(null);

  const onFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    setFile(f || null);
    setSelectedFileUrl(null); // Clear gallery selection
  };

  const onFileSelectFromGallery = (fileUrl, fileTitle) => {
    setSelectedFileUrl(fileUrl);
    setTitle(fileTitle || "");
    setFile(null); // Clear local file selection
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
        const fileName = selectedFileUrl.substring(
          selectedFileUrl.lastIndexOf("/") + 1,
        );
        const galleryFile = new File([blob], fileName, { type: blob.type });
        form.append("file", galleryFile);
        form.append("title", title || fileName);
      }

      form.append("description", description || "");

      const res = await fetch(`${apiBase}/api/socials/youtube/upload`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success)
        throw new Error(json.message || `Upload failed (${res.status})`);
      setResult(json.data);
      try {
        (window.__toast?.push || (() => {}))({
          message: "Uploaded to YouTube successfully",
          type: "success",
        });
      } catch (_) {}
    } catch (e) {
      console.error("YouTube upload error", e);
      try {
        (window.__toast?.push || (() => {}))({
          message: e?.message || "Upload failed",
          type: "error",
        });
      } catch (_) {}
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
      if (!res.ok || !json.success || !json.url)
        throw new Error(json.message || "Failed to init X OAuth");
      window.location.href = json.url;
    } catch (e) {
      console.error("Connect X error", e);
      try {
        (window.__toast?.push || (() => {}))({
          message: e?.message || "Connect failed",
          type: "error",
        });
      } catch (_) {}
    } finally {
      setIsConnectingX(false);
    }
  };

  const postToX = async () => {
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
      if (!res.ok || !json.success)
        throw new Error(json.message || `Tweet failed (${res.status})`);
      try {
        (window.__toast?.push || (() => {}))({
          message: "Tweet posted",
          type: "success",
        });
      } catch (_) {}
      setTweetText("");
    } catch (e) {
      console.error("Tweet error", e);
      try {
        (window.__toast?.push || (() => {}))({
          message: e?.message || "Tweet failed",
          type: "error",
        });
      } catch (_) {}
    } finally {
      setIsTweeting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-neon-blue">
        Social Media Uploader
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* YouTube Uploader */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-red-500">
            Upload to YouTube
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Select File
              </label>
              <div className="flex gap-4">
                <input
                  type="file"
                  accept="video/*,image/*"
                  onChange={onFileChange}
                  className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neon-pink file:text-white hover:file:bg-opacity-80"
                />
                <button
                  onClick={() => setShowGalleryModal(true)}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
                >
                  From Gallery
                </button>
              </div>
              {(file || selectedFileUrl) && (
                <div className="mt-2 text-sm text-gray-400">
                  Selected: {file ? file.name : selectedFileUrl}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={uploadToYouTube}
                disabled={(!file && !selectedFileUrl) || isUploading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                {isUploading ? "Uploading..." : "Upload to YouTube"}
              </button>
            </div>
            {result && (
              <div className="mt-4 p-3 bg-gray-700 rounded-md text-sm text-gray-300">
                <p className="font-semibold">Upload Successful!</p>
                <p>
                  Video ID: <span className="font-mono">{result.videoId}</span>
                </p>
                {result.url && (
                  <p>
                    URL:{" "}
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neon-blue hover:underline"
                    >
                      {result.url}
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* X (Twitter) Integration */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-blue-400">
            Post to X
          </h2>
          <div className="space-y-4">
            <button
              onClick={connectX}
              disabled={isConnectingX}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
            >
              {isConnectingX ? "Connecting..." : "Connect to X"}
            </button>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Tweet Content
              </label>
              <textarea
                value={tweetText}
                onChange={(e) => setTweetText(e.target.value)}
                className="w-full rounded-md bg-gray-700 border border-gray-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neon-blue"
                rows={3}
                placeholder="What's happening on X?"
              />
            </div>
            <div className="text-right">
              <button
                onClick={postToX}
                disabled={!tweetText.trim() || isTweeting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
              >
                {isTweeting ? "Posting..." : "Post to X"}
              </button>
            </div>
          </div>
        </div>
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

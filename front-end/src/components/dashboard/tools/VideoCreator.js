import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import safeLocalStorage from '../../../utils/localStorage';
import { Film, User, Send, RefreshCw } from 'lucide-react';

const VideoCreator = ({ avatars = [] }) => {
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [script, setScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [renderId, setRenderId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);
  const [isSkipRs, setIsSkipRs] = useState(true);
  const [compatibleAvatars, setCompatibleAvatars] = useState([]);

  useEffect(() => {
    const filtered = avatars.filter(avatar => avatar.metadata && avatar.metadata.a2eAnchorId);
    setCompatibleAvatars(filtered);
  }, [avatars]);

  useEffect(() => {
    if (renderId && (jobStatus !== 'succeeded' && jobStatus !== 'failed')) {
      const interval = setInterval(async () => {
        const token = safeLocalStorage.getItem('token');
        const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiBase}/api/renders/${renderId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success) {
          setJobStatus(result.data.status);
          if (result.data.status === 'succeeded') {
            setFinalVideoUrl(result.data.video_url_master);
            clearInterval(interval);
          }
          if (result.data.status === 'failed') {
            alert(`Video generation failed: ${result.data.error.message}`);
            clearInterval(interval);
          }
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [renderId, jobStatus]);

  const handleGenerate = async () => {
    if (!selectedAvatar || !script.trim()) {
      alert('Please select an avatar and enter a script.');
      return;
    }
    setIsGenerating(true);
    setFinalVideoUrl(null);
    const token = safeLocalStorage.getItem('token');
    const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    try {
      const response = await fetch(`${apiBase}/api/renders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ avatarId: selectedAvatar, script, isSkipRs })
      });
      const result = await response.json();
      if (result.success) {
        setRenderId(result.data.renderId);
        setJobStatus(result.data.status);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
            <Film className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Video Creator</h1>
            <p className="text-gray-400">Bring your avatars to life</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Select an Avatar</h3>
        {compatibleAvatars.length > 0 ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 mb-4">
            {compatibleAvatars.map(avatar => (
              <img
                key={avatar._id}
                src={avatar.avatarUrl}
                alt={avatar.prompt}
                className={`w-24 h-24 rounded-lg object-cover cursor-pointer border-4 ${selectedAvatar === avatar._id ? 'border-blue-500' : 'border-transparent'}`}
                onClick={() => setSelectedAvatar(avatar._id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-800/50 rounded-lg">
            <p className="text-gray-400">You have no A2.E-compatible avatars for video generation.</p>
            <p className="text-gray-500 text-sm mt-2">Create a new avatar in the Avatar Creator to get started.</p>
          </div>
        )}
      </div>

      <textarea value={script} onChange={(e) => setScript(e.target.value)} placeholder="Enter your script here..." className="w-full p-4 my-4 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20" rows="4"></textarea>

      <div className="flex items-center justify-between my-4">
        <label htmlFor="smart-motion" className="flex items-center text-gray-400">
          <input
            type="checkbox"
            id="smart-motion"
            checked={!isSkipRs}
            onChange={(e) => setIsSkipRs(!e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600"
          />
          <span className="ml-2">Enable Smart Motion (Slower)</span>
        </label>
      </div>

      <button onClick={handleGenerate} disabled={isGenerating} className="w-full p-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 flex items-center justify-center gap-2">
        {isGenerating ? <RefreshCw className="animate-spin" /> : <Send />}
        Generate Video
      </button>

      {jobStatus && <div className="mt-4 text-center text-gray-400">Job Status: {jobStatus} (Render ID: {renderId})</div>}
      {finalVideoUrl && (
            <div className="mt-4">
                <h3 className="text-lg font-semibold text-white mb-2">Your Video is Ready!</h3>
                <video src={finalVideoUrl} controls className="w-full rounded-lg"></video>
            </div>
        )}
    </div>
  );
};

export default VideoCreator;

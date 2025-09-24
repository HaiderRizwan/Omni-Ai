import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import safeLocalStorage from '../../../utils/localStorage';
import { Film, User, Send, RefreshCw, Play, Pause, Settings, Mic, Upload, Volume2, FileAudio, Captions, Palette } from 'lucide-react';

const VideoCreator = ({ avatars = [] }) => {
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [script, setScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);
  const [compatibleAvatars, setCompatibleAvatars] = useState([]);
  
  // Audio options
  const [audioMode, setAudioMode] = useState('tts'); // 'tts' or 'upload'
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [uploadedAudio, setUploadedAudio] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  
  // Video options
  const [videoOptions, setVideoOptions] = useState({
    skipSmartMotion: true, // Faster generation
    enableCaptions: false,
    resolution: 1080,
    captionOptions: {
      language: 'en-US',
      color: '#FFFFFF',
      outlineColor: '#000000',
      fontSize: 50,
      position: 0.3,
      font: 'Arial'
    }
  });
  
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  useEffect(() => {
    // Filter for A2E-compatible avatars using the new isA2ECompatible flag
    const filtered = avatars.filter(avatar => avatar.isA2ECompatible || avatar.a2eAnchorId);
    setCompatibleAvatars(filtered);
    console.log('VideoCreator: Filtered A2E-compatible avatars:', filtered.length, 'out of', avatars.length);
  }, [avatars]);

  // Load available voices when component mounts
  useEffect(() => {
    loadAvailableVoices();
  }, []);

  const loadAvailableVoices = async () => {
    setIsLoadingVoices(true);
    try {
      const token = safeLocalStorage.getItem('token');
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiBase}/api/videos/voices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setAvailableVoices(result.data);
        // Set default voice (first female voice)
        const defaultVoice = result.data.find(group => group.value === 'female')?.children?.[0];
        if (defaultVoice) {
          setSelectedVoice(defaultVoice.value);
        }
      }
    } catch (error) {
      console.error('Failed to load voices:', error);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  useEffect(() => {
    if (jobId && (jobStatus !== 'completed' && jobStatus !== 'failed')) {
      const interval = setInterval(async () => {
        const token = safeLocalStorage.getItem('token');
        const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiBase}/api/videos/job/${jobId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success) {
          setJobStatus(result.data.status);
          if (result.data.status === 'completed') {
            setFinalVideoUrl(result.data.videoUrl);
            clearInterval(interval);
          }
          if (result.data.status === 'failed') {
            try { (window.__toast?.push || (()=>{}))({ message: `Video generation failed: ${result.data.error || 'Unknown error'}`, type: 'error' }); } catch(_) {}
            clearInterval(interval);
          }
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [jobId, jobStatus]);

  const handleGenerate = async () => {
    if (!selectedAvatar || !script.trim()) {
      try { (window.__toast?.push || (()=>{}))({ message: 'Please select an avatar and enter a script.', type: 'warning' }); } catch(_) {}
      return;
    }
    
    if (audioMode === 'tts' && !selectedVoice) {
      try { (window.__toast?.push || (()=>{}))({ message: 'Please select a voice for text-to-speech.', type: 'warning' }); } catch(_) {}
      return;
    }
    
    if (audioMode === 'upload' && !uploadedAudio) {
      try { (window.__toast?.push || (()=>{}))({ message: 'Please upload an audio file.', type: 'warning' }); } catch(_) {}
      return;
    }
    
    setIsGenerating(true);
    setFinalVideoUrl(null);
    setJobStatus('starting');
    
    const token = safeLocalStorage.getItem('token');
    const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    try {
      let requestBody;
      
      if (audioMode === 'upload') {
        // Use FormData for audio upload
        const formData = new FormData();
        formData.append('avatarId', selectedAvatar);
        formData.append('script', script);
        formData.append('audioFile', uploadedAudio);
        formData.append('options', JSON.stringify(videoOptions));
        
        const response = await fetch(`${apiBase}/api/videos/generate-with-audio`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        
        const result = await response.json();
        if (result.success) {
          setJobId(result.data.jobId);
          setJobStatus(result.data.status);
        } else {
          throw new Error(result.message);
        }
      } else {
        // TTS mode - use JSON
        requestBody = {
          avatarId: selectedAvatar,
          script: script,
          voiceId: selectedVoice,
          title: `AI Video - ${new Date().toLocaleDateString()}`,
          options: videoOptions
        };
        
        const response = await fetch(`${apiBase}/api/videos/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        if (result.success) {
          setJobId(result.data.jobId);
          setJobStatus(result.data.status);
        } else {
          throw new Error(result.message);
        }
      }
    } catch (error) {
      console.error('Video generation error:', error);
      try { (window.__toast?.push || (()=>{}))({ message: `Error: ${error.message}`, type: 'error' }); } catch(_) {}
      setJobStatus(null);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="h-full flex flex-col p-4">

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Avatar Selection */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <User className="w-5 h-5" />
            Select an Avatar
          </h3>
          {compatibleAvatars.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {compatibleAvatars.map(avatar => (
                <button
                  key={avatar._id}
                  onClick={() => setSelectedAvatar(avatar._id)}
                  className={`group text-left bg-white/5 border ${selectedAvatar === avatar._id ? 'border-red-500 ring-2 ring-red-500/20' : 'border-white/10 hover:border-white/20'} rounded-xl overflow-hidden transition-all`}
                  title={avatar.prompt}
                >
                  <div className="relative">
                    <img
                      src={avatar.avatarUrl}
                      alt={avatar.prompt}
                      className="w-full h-28 object-cover"
                    />
                    {selectedAvatar === avatar._id && (
                      <div className="absolute inset-0 bg-red-500/10" />
                    )}
                  </div>
                  <div className="p-2 border-t border-white/10">
                    <p className="text-xs text-gray-200 truncate" title={avatar.prompt}>
                      {avatar.prompt || 'Untitled avatar'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-800/50 rounded-lg">
              <Film className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">No A2E-compatible avatars found</p>
              <p className="text-gray-500 text-sm mt-1">Create a new avatar in the Avatar Creator to get started.</p>
            </div>
          )}
        </div>

        {/* Script Input */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Script</h3>
          <textarea
            value={script}
            onChange={(e) => {
              setScript(e.target.value);
              const el = e.target;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 200) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            placeholder="Enter what you want your avatar to say..."
            className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 resize-none max-h-40"
            rows="3"
          />
        </div>

        {/* Audio Options */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Audio Options
          </h3>
          
          {/* Audio Mode Selection */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setAudioMode('tts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                audioMode === 'tts'
                  ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              <Mic className="w-4 h-4" />
              Text-to-Speech
            </button>
            <button
              onClick={() => setAudioMode('upload')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                audioMode === 'upload'
                  ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              <FileAudio className="w-4 h-4" />
              Upload Audio
            </button>
          </div>

          {/* TTS Voice Selection */}
          {audioMode === 'tts' && (
            <div className="space-y-3">
              {isLoadingVoices ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading voices...
                </div>
              ) : (
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Select Voice</label>
                  <select
                    value={selectedVoice || ''}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-red-500/50"
                  >
                    <option value="">Choose a voice...</option>
                    {availableVoices.map(group => (
                      <optgroup key={group.value} label={group.label}>
                        {group.children?.map(voice => (
                          <option key={voice.value} value={voice.value}>
                            {voice.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Audio Upload */}
          {audioMode === 'upload' && (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Upload Audio File</label>
              <div className="relative">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setUploadedAudio(e.target.files[0])}
                  className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-500 file:text-white hover:file:bg-red-600"
                />
              </div>
              {uploadedAudio && (
                <p className="text-sm text-green-400 mt-2">
                  ✓ {uploadedAudio.name} ({(uploadedAudio.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Video Options */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Video Options
            </h3>
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              {showAdvancedOptions ? 'Hide Advanced' : 'Show Advanced'}
            </button>
          </div>
          
          {/* Basic Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-gray-300">
              <input
                type="checkbox"
                checked={!videoOptions.skipSmartMotion}
                onChange={(e) => setVideoOptions(prev => ({ ...prev, skipSmartMotion: !e.target.checked }))}
                className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-2"
              />
              <span>Enable Smart Motion (slower but higher quality)</span>
            </label>
            
            <label className="flex items-center gap-3 text-gray-300">
              <input
                type="checkbox"
                checked={videoOptions.enableCaptions}
                onChange={(e) => setVideoOptions(prev => ({ ...prev, enableCaptions: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-2"
              />
              <Captions className="w-4 h-4" />
              <span>Enable Captions</span>
            </label>
          </div>

          {/* Advanced Options */}
          {showAdvancedOptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 space-y-4 p-4 rounded-lg bg-white/5 border border-white/10"
            >
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Resolution</label>
                <select
                  value={videoOptions.resolution}
                  onChange={(e) => setVideoOptions(prev => ({ ...prev, resolution: parseInt(e.target.value) }))}
                  className="w-full p-2 rounded-lg bg-black/30 border border-white/10 text-white"
                >
                  <option value={720}>720p (HD)</option>
                  <option value={1080}>1080p (Full HD)</option>
                </select>
              </div>

              {videoOptions.enableCaptions && (
                <div className="space-y-3">
                  <h4 className="text-white font-medium flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Caption Settings
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Font Size</label>
                      <input
                        type="number"
                        min="20"
                        max="100"
                        value={videoOptions.captionOptions.fontSize}
                        onChange={(e) => setVideoOptions(prev => ({
                          ...prev,
                          captionOptions: { ...prev.captionOptions, fontSize: parseInt(e.target.value) }
                        }))}
                        className="w-full p-2 rounded-lg bg-black/30 border border-white/10 text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Position</label>
                      <select
                        value={videoOptions.captionOptions.position}
                        onChange={(e) => setVideoOptions(prev => ({
                          ...prev,
                          captionOptions: { ...prev.captionOptions, position: parseFloat(e.target.value) }
                        }))}
                        className="w-full p-2 rounded-lg bg-black/30 border border-white/10 text-white"
                      >
                        <option value={0.1}>Top</option>
                        <option value={0.3}>Upper Middle</option>
                        <option value={0.5}>Center</option>
                        <option value={0.7}>Lower Middle</option>
                        <option value={0.9}>Bottom</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !selectedAvatar || !script.trim()}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 text-lg font-medium"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Generating Video...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Generate Video
            </>
          )}
        </button>

        {/* Status and Result */}
        {jobStatus && (
          <div className="text-center space-y-3">
            <div className="text-gray-400">
              Status: <span className="text-white font-medium capitalize">{jobStatus}</span>
            </div>
            {jobId && (
              <div className="text-xs text-gray-500">Job ID: {jobId}</div>
            )}
          </div>
        )}

        {finalVideoUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Play className="w-6 h-6 text-green-500" />
              Your Video is Ready!
            </h3>
            <video
              src={finalVideoUrl}
              controls
              className="w-full rounded-xl shadow-lg"
              poster="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzM3NDE1MSIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5WaWRlbyBSZWFkeTwvdGV4dD48L3N2Zz4="
            />
            <div className="flex gap-3">
              <a
                href={finalVideoUrl}
                download
                className="flex-1 p-3 rounded-lg bg-green-500 hover:bg-green-600 text-white text-center font-medium transition-colors"
              >
                Download Video
              </a>
              <button
                onClick={() => {
                  setFinalVideoUrl(null);
                  setJobStatus(null);
                  setJobId(null);
                }}
                className="px-6 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium transition-colors"
              >
                Create Another
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default VideoCreator;

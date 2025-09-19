import React, { useState, useRef } from 'react';
import FormattedMessage from '../ui/FormattedMessage';
import { motion } from 'framer-motion';
import safeLocalStorage from '../../../utils/localStorage';
import { 
  Send, 
  Download, 
  RefreshCw, 
  Video as VideoIcon,
  Play,
  Pause,
  Volume2,
  Settings,
  Clock
} from 'lucide-react';

const VideoCreator = ({ currentChat, onChatUpdate, onNewChat }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [settings, setSettings] = useState({
    duration: '10',
    style: 'cinematic',
    quality: 'high',
    aspectRatio: '16:9',
    fps: '24',
    characterId: ''
  });
  const [showSettings, setShowSettings] = useState(false);
  const videoRef = useRef(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!settings.characterId.trim()) {
      alert('Please provide a main character ID in settings.');
      return;
    }

    setIsGenerating(true);

    try {
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const token = safeLocalStorage.getItem('token');
      if (!token) throw new Error('Please log in to generate videos.');

      // 1) Start generation job
      const startRes = await fetch(`${apiBase}/api/videos/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt,
          mainCharacterId: settings.characterId.trim(),
          duration: parseInt(settings.duration, 10) || 10,
          style: settings.style,
          aspectRatio: settings.aspectRatio,
          provider: process.env.REACT_APP_VIDEO_PROVIDER || undefined,
          includeAudio: true
        })
      });

      if (!startRes.ok) {
        const errText = await startRes.text().catch(() => '');
        throw new Error(`Start failed: ${startRes.status}${errText ? ` - ${errText}` : ''}`);
      }

      const startJson = await startRes.json();
      const jobId = startJson?.data?.jobId;
      if (!jobId) throw new Error('No jobId returned by server');

      // 2) Poll job status
      const poll = async () => {
        const res = await fetch(`${apiBase}/api/videos/job/${jobId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(`Status failed: ${res.status}${t ? ` - ${t}` : ''}`);
        }
        const json = await res.json();
        return json?.data;
      };

      const startTime = Date.now();
      let job;
      while (true) {
        job = await poll();
        if (job?.status === 'completed') break;
        if (job?.status === 'failed') {
          const errObj = job?.error;
          const errMsg = (errObj && (errObj.message || errObj.code)) ? `${errObj.message || ''}${errObj.code ? ` (${errObj.code})` : ''}` : null;
          const errDetails = errObj ? JSON.stringify(errObj) : '';
          throw new Error(errMsg || errDetails || 'Video generation failed');
        }
        if (Date.now() - startTime > 180000) throw new Error('Video generation timed out');
        await new Promise(r => setTimeout(r, 3000));
      }

      const videoUrl = job?.results?.[0]?.url;
      if (!videoUrl) throw new Error('No video URL in job result');

      setGeneratedVideo(videoUrl);

      // Create backend chat if needed, then save to server chat
      let serverChatId = currentChat?.serverId || currentChat?._id;
      
      // Only create new chat if no chat exists at all
      if (!serverChatId) {
        try {
          console.log('Creating new backend chat for video generation');
          
          const createResponse = await fetch(`${apiBase}/api/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              title: prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''),
              chatType: 'video'
            })
          });

          if (createResponse.ok) {
            const chatData = await createResponse.json();
            serverChatId = chatData.data._id;
            console.log('Created new backend chat:', serverChatId);
            
            // Update the current chat with the server ID
            if (onChatUpdate) {
              onChatUpdate({ 
                id: currentChat?.id || Date.now().toString(),
                serverId: serverChatId, 
                title: chatData.data.title || prompt.slice(0, 50) + (prompt.length > 50 ? '...' : '')
              });
            }
          } else {
            console.error('Failed to create backend chat:', createResponse.status);
          }
        } catch (error) {
          console.error('Error creating backend chat:', error);
        }
      } else {
        console.log('Using existing chat ID:', serverChatId);
      }
      
      // Save to server chat if we have a server chat ID
      if (serverChatId) {
        try {
          console.log('Saving video generation to server chat:', serverChatId);
          
          // Send the prompt and video URL to the server chat
          const chatPayload = {
            message: `Video generation: ${prompt}`,
            stream: false
          };
          
          const chatRes = await fetch(`${apiBase}/api/chat/${serverChatId}/message`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(chatPayload)
          });
          
          if (chatRes.ok) {
            console.log('Successfully saved to server chat');
          } else {
            console.error('Failed to save to server chat:', chatRes.status);
          }
        } catch (error) {
          console.error('Error saving to server chat:', error);
        }
      }

      if (onChatUpdate) {
        onChatUpdate({
          messages: [
            ...(currentChat?.messages || []),
            { type: 'user', content: prompt, timestamp: Date.now() },
            { type: 'assistant', content: 'Generated video', video: videoUrl, timestamp: Date.now() }
          ]
        });
      }

    } catch (error) {
      console.error('Error generating video:', error);
      
      // Better error message handling
      let errorMessage = 'Unknown error occurred';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (typeof error === 'object') {
        try {
          errorMessage = JSON.stringify(error, null, 2);
        } catch (e) {
          errorMessage = String(error);
        }
      }
      
      alert(`Error generating video: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (generatedVideo) {
      const link = document.createElement('a');
      link.href = generatedVideo;
      link.download = `ai-video-${Date.now()}.mp4`;
      link.click();
    }
  };

  const handleNewChat = () => {
    setPrompt('');
    setGeneratedVideo(null);
    setIsPlaying(false);
    if (onNewChat) {
      onNewChat();
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
              <VideoIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Video Creator</h1>
              <p className="text-gray-400">Generate dynamic videos from text descriptions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={handleNewChat}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600 transition-all"
            >
              New Chat
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-b border-gray-800/50 bg-gray-900/30"
        >
          <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Duration (sec)</label>
              <select
                value={settings.duration}
                onChange={(e) => setSettings(prev => ({ ...prev, duration: e.target.value }))}
                className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white"
              >
                <option value="5">5 seconds</option>
                <option value="10">10 seconds</option>
                <option value="15">15 seconds</option>
                <option value="30">30 seconds</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Style</label>
              <select
                value={settings.style}
                onChange={(e) => setSettings(prev => ({ ...prev, style: e.target.value }))}
                className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white"
              >
                <option value="cinematic">Cinematic</option>
                <option value="animated">Animated</option>
                <option value="realistic">Realistic</option>
                <option value="artistic">Artistic</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Quality</label>
              <select
                value={settings.quality}
                onChange={(e) => setSettings(prev => ({ ...prev, quality: e.target.value }))}
                className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white"
              >
                <option value="standard">Standard</option>
                <option value="high">High</option>
                <option value="ultra">Ultra</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Aspect Ratio</label>
              <select
                value={settings.aspectRatio}
                onChange={(e) => setSettings(prev => ({ ...prev, aspectRatio: e.target.value }))}
                className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white"
              >
                <option value="16:9">Landscape (16:9)</option>
                <option value="9:16">Portrait (9:16)</option>
                <option value="1:1">Square (1:1)</option>
                <option value="4:3">Standard (4:3)</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Frame Rate</label>
              <select
                value={settings.fps}
                onChange={(e) => setSettings(prev => ({ ...prev, fps: e.target.value }))}
                className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white"
              >
                <option value="24">24 FPS</option>
                <option value="30">30 FPS</option>
                <option value="60">60 FPS</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Main Character ID</label>
              <input
                type="text"
                value={settings.characterId}
                onChange={(e) => setSettings(prev => ({ ...prev, characterId: e.target.value }))}
                placeholder="Paste a character ID"
                className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 p-6 overflow-y-auto">
            {currentChat?.messages?.length > 0 ? (
              <div className="space-y-4">
                {currentChat.messages.map((message, index) => (
                  <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-2xl p-4 rounded-2xl ${
                      message.type === 'user' 
                        ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white' 
                        : 'bg-gray-800/50 text-gray-200'
                    }`}>
                      {message.type === 'user' ? (
                        <p>{message.content}</p>
                      ) : (
                        <FormattedMessage text={message.content} />
                      )}
                      {message.video && (
                        <div className="mt-3">
                          <video 
                            src={message.video} 
                            controls
                            className="rounded-lg max-w-full h-auto"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="p-4 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <VideoIcon className="w-10 h-10 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Start Creating Videos</h3>
                  <p className="text-gray-400 max-w-md">
                    Describe the video you want to create. Include details about scenes, movements, style, and mood.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-gray-800/50">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the video you want to create..."
                  className="w-full p-4 pr-12 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
                  onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
                />
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        {generatedVideo && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 400, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-gray-800/50 bg-gray-900/30 p-6"
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white mb-2">Generated Video</h3>
              <div className="relative">
                <video 
                  ref={videoRef}
                  src={generatedVideo} 
                  className="w-full rounded-lg shadow-lg"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 hover:opacity-100">
                  <button
                    onClick={togglePlayPause}
                    className="p-3 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 text-white" />
                    ) : (
                      <Play className="w-6 h-6 text-white" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={handleDownload}
                className="w-full p-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Video
              </button>
              <button
                onClick={() => setGeneratedVideo(null)}
                className="w-full p-3 rounded-lg bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 transition-all"
              >
                Clear Preview
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default VideoCreator;

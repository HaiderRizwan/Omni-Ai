import React, { useState, useRef, useEffect } from 'react';
import FormattedMessage from '../ui/FormattedMessage';
import { motion } from 'framer-motion';
import safeLocalStorage from '../../../utils/localStorage';
import { 
  Send, 
  Download, 
  RefreshCw, 
  User,
  Palette,
  Settings,
  Shirt,
  Eye,
  Smile,
  Sparkles,
  Plus
} from 'lucide-react';

const AvatarCreator = ({ currentChat, onChatUpdate, onNewChat, avatarCollection = [], onAddToCollection }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAvatar, setGeneratedAvatar] = useState(null);
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState({
    gender: 'female', // Default to female to match backend behavior
    age: 'adult',
    style: 'realistic',
    expression: 'neutral',
    clothing: 'casual',
    background: 'transparent',
    hairStyle: 'any',
    build: 'average',
    ethnicity: 'any'
  });
  const [showSettings, setShowSettings] = useState(false);
  const [customization, setCustomization] = useState({
    hairColor: '#8B4513',
    eyeColor: '#4A90E2',
    skinTone: '#FDBCB4'
  });
  const [generationMode, setGenerationMode] = useState('text'); // 'text' or 'image'
  const [uploadedImage, setUploadedImage] = useState(null);
  const lastChatIdRef = useRef(null);

  // Debug: Monitor generatedAvatar state changes
  useEffect(() => {
    console.log('🔄 generatedAvatar state changed:', generatedAvatar);
  }, [generatedAvatar]);

  // Sync local messages with incoming chat (same as ImageCreator)
  useEffect(() => {
    const chatId = currentChat?.id || currentChat?._id || currentChat?.serverId;
    if (chatId !== lastChatIdRef.current) {
      // Chat switched, reset messages
      lastChatIdRef.current = chatId;
      if (currentChat && Array.isArray(currentChat.messages)) {
        const transformed = currentChat.messages.map((m, index) => {
          const messageType = m.type || (m.role === 'user' ? 'user' : 'assistant');
          return { ...m, type: messageType, avatar: m.avatar };
        });
        setMessages(transformed);
      } else {
        setMessages([]);
      }
    } else if (currentChat && Array.isArray(currentChat.messages) && currentChat.messages.length > 0) {
      // Chat id is the same, but messages updated (e.g. after avatar generation)
      const transformed = currentChat.messages.map((m, index) => {
        const messageType = m.type || (m.role === 'user' ? 'user' : 'assistant');
        return { ...m, type: messageType, avatar: m.avatar };
      });
      setMessages(transformed);
    }
  }, [currentChat?.messages, currentChat?.id, currentChat?.serverId]);

  // Character presets for quick setup
  const characterPresets = [
    {
      name: 'Professional',
      settings: { gender: 'any', age: 'adult', style: 'realistic', expression: 'confident', clothing: 'formal', background: 'studio', hairStyle: 'any', build: 'average', ethnicity: 'any' },
      customization: { hairColor: '#8B4513', eyeColor: '#4A90E2', skinTone: '#FDBCB4' }
    },
    {
      name: 'Fantasy Hero',
      settings: { gender: 'any', age: 'adult', style: 'realistic', expression: 'confident', clothing: 'creative', background: 'gradient', hairStyle: 'any', build: 'athletic', ethnicity: 'any' },
      customization: { hairColor: '#DAA520', eyeColor: '#4A90E2', skinTone: '#E0AC69' }
    },
    {
      name: 'Anime Character',
      settings: { gender: 'any', age: 'teen', style: 'anime', expression: 'happy', clothing: 'casual', background: 'transparent', hairStyle: 'any', build: 'slim', ethnicity: 'any' },
      customization: { hairColor: '#FF69B4', eyeColor: '#9370DB', skinTone: '#FDBCB4' }
    },
    {
      name: 'Elderly Sage',
      settings: { gender: 'any', age: 'elderly', style: 'realistic', expression: 'serious', clothing: 'formal', background: 'studio', hairStyle: 'any', build: 'average', ethnicity: 'any' },
      customization: { hairColor: '#2F1B14', eyeColor: '#4A90E2', skinTone: '#C68642' }
    }
  ];

  const applyPreset = (preset) => {
    setSettings(preset.settings);
    setCustomization(preset.customization);
  };

  // Build character-specific prompt for better avatar generation
  const buildCharacterPrompt = (basePrompt, settings, customization) => {
    let prompt = `character portrait, ${basePrompt}`;
    
    // Add character-specific details
    if (settings.gender !== 'any') {
      prompt += `, ${settings.gender}`;
    }
    
    if (settings.age !== 'any') {
      prompt += `, ${settings.age}`;
    }
    
    if (settings.ethnicity !== 'any') {
      prompt += `, ${settings.ethnicity}`;
    }
    
    // Add physical characteristics
    if (customization.skinTone) {
      const skinTone = getSkinToneDescription(customization.skinTone);
      if (skinTone) prompt += `, ${skinTone} skin`;
    }
    
    if (customization.hairColor) {
      const hairColor = getHairColorDescription(customization.hairColor);
      if (hairColor) prompt += `, ${hairColor} hair`;
    }
    
    if (settings.hairStyle !== 'any') {
      prompt += `, ${settings.hairStyle} hair`;
    }
    
    if (customization.eyeColor) {
      const eyeColor = getEyeColorDescription(customization.eyeColor);
      if (eyeColor) prompt += `, ${eyeColor} eyes`;
    }
    
    if (settings.build !== 'average') {
      prompt += `, ${settings.build} build`;
    }
    
    // Add style and expression
    if (settings.style !== 'realistic') {
      prompt += `, ${settings.style} style`;
    }
    
    if (settings.expression !== 'neutral') {
      prompt += `, ${settings.expression} expression`;
    }
    
    if (settings.clothing !== 'casual') {
      prompt += `, wearing ${settings.clothing}`;
    }
    
    // Add background
    if (settings.background !== 'transparent') {
      prompt += `, ${settings.background} background`;
    }
    
    // Add character-specific keywords for better generation
    prompt += ', detailed face, clear eyes, professional portrait, high quality, character design, single person, centered composition';
    
    return prompt;
  };

  // Helper functions to convert colors to descriptive text
  const getSkinToneDescription = (color) => {
    const skinTones = {
      '#FDBCB4': 'fair',
      '#F1C27D': 'light',
      '#E0AC69': 'medium-light',
      '#C68642': 'medium',
      '#8D5524': 'medium-dark',
      '#654321': 'dark',
      '#3C2415': 'very dark'
    };
    return skinTones[color] || 'natural';
  };

  const getHairColorDescription = (color) => {
    const hairColors = {
      '#8B4513': 'brown',
      '#654321': 'dark brown',
      '#2F1B14': 'black',
      '#DAA520': 'blonde',
      '#FFD700': 'golden blonde',
      '#FFA500': 'auburn',
      '#DC143C': 'red',
      '#800080': 'purple',
      '#0000FF': '  ',
      '#FF69B4': 'pink'
    };
    return hairColors[color] || 'brown';
  };

  const getEyeColorDescription = (color) => {
    const eyeColors = {
      '#4A90E2': 'blue',
      '#228B22': 'green',
      '#8B4513': 'brown',
      '#654321': 'dark brown',
      '#2F1B14': 'black',
      '#FFD700': 'amber',
      '#9370DB': 'violet',
      '#FF69B4': 'pink'
    };
    return eyeColors[color] || 'brown';
  };

  const handleGenerate = async () => {
    if (generationMode === 'text' && !prompt.trim()) return;
    if (generationMode === 'image' && !uploadedImage) return;
    setPrompt('');
    setIsGenerating(true);
    
    try {
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const token = safeLocalStorage.getItem('token');
      if (!token) throw new Error('Please log in to generate avatars.');

      if (generationMode === 'text') {
        // Simplified direct avatar pipeline: start job and poll backend
        const startRes = await fetch(`${apiBase}/api/avatars/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            mode: 'text',
            prompt,
            aspectRatio: '1:1',
            style: settings.style,
            characterSettings: settings,
            customization
          })
        });

        if (!startRes.ok) {
          const t = await startRes.text().catch(() => '');
          throw new Error(`Start failed: ${startRes.status}${t ? ` - ${t}` : ''}`);
        }

        const startJson = await startRes.json();
        const jobId = startJson?.data?.jobId;
        if (!jobId) throw new Error('No jobId returned by server');

        const poll = async () => {
          const res = await fetch(`${apiBase}/api/avatars/job/${jobId}`, {
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
            throw new Error(errMsg || errDetails || 'Avatar generation failed');
          }
          if (Date.now() - startTime > 180000) throw new Error('Avatar generation timed out');
          await new Promise(r => setTimeout(r, 3000));
        }

        const result = Array.isArray(job?.results) ? job.results[0] : null;
        const avatarUrl = result?.url;
        const imageId = result?.imageId;
        if (!avatarUrl) throw new Error('No avatar URL in job result');

        setGeneratedAvatar(avatarUrl);

        // Optionally append to chat if exists
        let serverChatId = currentChat?.serverId || currentChat?._id;
        if (serverChatId) {
          try {
            const chatPayload = {
              message: `Avatar generated: ${prompt}`,
              avatar: avatarUrl,
              imageId
            };
            await fetch(`${apiBase}/api/chat/${serverChatId}/avatar-message`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(chatPayload)
            });
          } catch (e) {
            console.warn('Failed to append avatar to chat:', e);
          }
        }

        // Update local chat UI
        if (onChatUpdate) {
          const trimmed = (prompt || '').trim();
          const titleBase = trimmed.slice(0, 50);
          const title = titleBase && trimmed.length > 50 ? `${titleBase}...` : titleBase || (currentChat?.title || 'Avatar Generation');
          const newMessages = [
            ...(currentChat?.messages || []),
            { type: 'user', content: prompt, timestamp: Date.now() },
            { type: 'assistant', content: `I've generated an avatar based on your prompt: "${prompt}"`, avatar: avatarUrl, imageId, originalPrompt: prompt, technicalPrompt: prompt, timestamp: Date.now() }
          ];
          onChatUpdate({ messages: newMessages, ...(title ? { title } : {}) });
        }
      } else if (generationMode === 'image') {
        // Image-to-Avatar Logic - Much simpler than text-to-avatar!
        const formData = new FormData();
        formData.append('avatarImage', uploadedImage);
        formData.append('name', 'user_uploaded_avatar');
        formData.append('gender', settings.gender || 'female');

        const startRes = await fetch(`${apiBase}/api/avatars/generate-from-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!startRes.ok) {
          const t = await startRes.text().catch(() => '');
          throw new Error(`Start failed: ${startRes.status}${t ? ` - ${t}` : ''}`);
        }

        const startJson = await startRes.json();
        const jobId = startJson?.data?.jobId;
        if (!jobId) throw new Error('No jobId returned by server');

        // Use the same polling logic as text-to-avatar
        const poll = async () => {
          const res = await fetch(`${apiBase}/api/avatars/job/${jobId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!res.ok) {
            const t = await res.text().catch(() => '');
            throw new Error(`Poll failed: ${res.status}${t ? ` - ${t}` : ''}`);
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
            throw new Error(errMsg || errDetails || 'Avatar generation failed');
          }
          if (Date.now() - startTime > 180000) throw new Error('Avatar generation timed out');
          await new Promise(r => setTimeout(r, 3000));
        }

        const result = Array.isArray(job?.results) ? job.results[0] : null;
        const avatarUrl = result?.url;
        const imageId = result?.imageId;
        if (!avatarUrl) throw new Error('No avatar URL in job result');

        setGeneratedAvatar(avatarUrl);

        // Update local chat UI
        if (onChatUpdate) {
          const title = 'Avatar from Image';
          const newMessages = [
            ...(currentChat?.messages || []),
            { type: 'user', content: 'Generated avatar from uploaded image', timestamp: Date.now() },
            { type: 'assistant', content: `I've generated an avatar from your uploaded image.`, avatar: avatarUrl, imageId, originalPrompt: 'Image Upload', technicalPrompt: 'Image Upload', timestamp: Date.now() }
          ];
          onChatUpdate({ messages: newMessages, title });
        }
      }

    } catch (error) {
      console.error('Error generating avatar:', error);
      try { (window.__toast?.push || (()=>{}))({ message: `Error generating avatar: ${error.message}`, type: 'error' }); } catch(_) {}
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (generatedAvatar) {
      const link = document.createElement('a');
      link.href = generatedAvatar;
      link.download = `ai-avatar-${Date.now()}.png`;
      link.click();
    }
  };

  const handleNewChat = () => {
    setPrompt('');
    setGeneratedAvatar(null);
    if (onNewChat) {
      onNewChat();
    }
  };

  const handleCustomizationChange = (key, value) => {
    setCustomization(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Generation Mode Switch (header removed) */}
      <div className="p-3 bg-white/5 border-b border-white/10 flex justify-center">
        <div className="flex items-center gap-2 p-1 rounded-lg bg-gray-800">
          <button
            onClick={() => setGenerationMode('text')}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              generationMode === 'text' ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white' : 'text-gray-300 hover:bg-white/10'
            }`}
          >
            Text to Avatar
          </button>
          <button
            onClick={() => setGenerationMode('image')}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              generationMode === 'image' ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white' : 'text-gray-300 hover:bg-white/10'
            }`}
          >
            Image to Avatar
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-b border-white/10 bg-white/5"
        >
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Gender</label>
                <select
                  value={settings.gender}
                  onChange={(e) => setSettings(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white"
                >
                  <option value="any">Any</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Age</label>
                <select
                  value={settings.age}
                  onChange={(e) => setSettings(prev => ({ ...prev, age: e.target.value }))}
                  className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white"
                >
                  <option value="child">Child</option>
                  <option value="teen">Teen</option>
                  <option value="adult">Adult</option>
                  <option value="elderly">Elderly</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Style</label>
                <select
                  value={settings.style}
                  onChange={(e) => setSettings(prev => ({ ...prev, style: e.target.value }))}
                  className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white"
                >
                  <option value="realistic">Realistic</option>
                  <option value="cartoon">Cartoon</option>
                  <option value="anime">Anime</option>
                  <option value="pixel">Pixel Art</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Expression</label>
                <select
                  value={settings.expression}
                  onChange={(e) => setSettings(prev => ({ ...prev, expression: e.target.value }))}
                  className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white"
                >
                  <option value="neutral">Neutral</option>
                  <option value="happy">Happy</option>
                  <option value="serious">Serious</option>
                  <option value="confident">Confident</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Clothing</label>
                <select
                  value={settings.clothing}
                  onChange={(e) => setSettings(prev => ({ ...prev, clothing: e.target.value }))}
                  className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white"
                >
                  <option value="casual">Casual</option>
                  <option value="formal">Formal</option>
                  <option value="sporty">Sporty</option>
                  <option value="creative">Creative</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Background</label>
                <select
                  value={settings.background}
                  onChange={(e) => setSettings(prev => ({ ...prev, background: e.target.value }))}
                  className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white"
                >
                  <option value="transparent">Transparent</option>
                  <option value="solid">Solid Color</option>
                  <option value="gradient">Gradient</option>
                  <option value="studio">Studio</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Hair Style</label>
                <select
                  value={settings.hairStyle}
                  onChange={(e) => setSettings(prev => ({ ...prev, hairStyle: e.target.value }))}
                  className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white"
                >
                  <option value="any">Any</option>
                  <option value="short">Short</option>
                  <option value="long">Long</option>
                  <option value="curly">Curly</option>
                  <option value="straight">Straight</option>
                  <option value="wavy">Wavy</option>
                  <option value="bald">Bald</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Build</label>
                <select
                  value={settings.build}
                  onChange={(e) => setSettings(prev => ({ ...prev, build: e.target.value }))}
                  className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white"
                >
                  <option value="slim">Slim</option>
                  <option value="athletic">Athletic</option>
                  <option value="average">Average</option>
                  <option value="muscular">Muscular</option>
                  <option value="heavy">Heavy</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Ethnicity</label>
                <select
                  value={settings.ethnicity}
                  onChange={(e) => setSettings(prev => ({ ...prev, ethnicity: e.target.value }))}
                  className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white"
                >
                  <option value="any">Any</option>
                  <option value="caucasian">Caucasian</option>
                  <option value="african">African</option>
                  <option value="asian">Asian</option>
                  <option value="hispanic">Hispanic</option>
                  <option value="middle eastern">Middle Eastern</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
            </div>

            {/* Character Presets */}
            <div className="border-t border-gray-700/50 pt-4 mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Character Presets
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {characterPresets.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => applyPreset(preset)}
                    className="p-2 text-xs bg-gray-800/50 hover:bg-red-600/20 border border-gray-700/50 hover:border-red-600/50 rounded-lg text-gray-300 hover:text-white transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Preview */}
            <div className="border-t border-gray-700/50 pt-4 mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Generated Prompt Preview
              </h4>
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <p className="text-sm text-gray-300 font-mono break-words">
                  {prompt ? buildCharacterPrompt(prompt, settings, customization) : 'Enter a prompt to see the generated character prompt...'}
                </p>
              </div>
            </div>

            {/* Customization Colors */}
            <div className="border-t border-gray-700/50 pt-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Customization
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Hair Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customization.hairColor}
                      onChange={(e) => handleCustomizationChange('hairColor', e.target.value)}
                      className="w-8 h-8 rounded border border-gray-600"
                    />
                    <span className="text-xs text-gray-400">{customization.hairColor}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Eye Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customization.eyeColor}
                      onChange={(e) => handleCustomizationChange('eyeColor', e.target.value)}
                      className="w-8 h-8 rounded border border-gray-600"
                    />
                    <span className="text-xs text-gray-400">{customization.eyeColor}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Skin Tone</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customization.skinTone}
                      onChange={(e) => handleCustomizationChange('skinTone', e.target.value)}
                      className="w-8 h-8 rounded border border-gray-600"
                    />
                    <span className="text-xs text-gray-400">{customization.skinTone}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Inline compact settings bar (GPT-like) */}
      <div className="px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Gender quick chips */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Gender</span>
            {['female', 'male', 'any'].map((gender) => (
              <button
                key={gender}
                onClick={() => setSettings(prev => ({ ...prev, gender }))}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  settings.gender === gender
                    ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {gender.charAt(0).toUpperCase() + gender.slice(1)}
              </button>
            ))}
          </div>

          {/* Style */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Style</span>
            <select
              value={settings.style}
              onChange={(e) => setSettings(prev => ({ ...prev, style: e.target.value }))}
              className="px-2 py-1 rounded text-xs bg-black/30 border border-white/10 text-white"
            >
              <option value="realistic">Realistic</option>
              <option value="cartoon">Cartoon</option>
              <option value="anime">Anime</option>
              <option value="pixel">Pixel</option>
            </select>
          </div>

          {/* Age */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Age</span>
            <select
              value={settings.age}
              onChange={(e) => setSettings(prev => ({ ...prev, age: e.target.value }))}
              className="px-2 py-1 rounded text-xs bg-black/30 border border-white/10 text-white"
            >
              <option value="child">Child</option>
              <option value="teen">Teen</option>
              <option value="adult">Adult</option>
              <option value="elderly">Elderly</option>
            </select>
          </div>

          {/* Expression */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Expression</span>
            <select
              value={settings.expression}
              onChange={(e) => setSettings(prev => ({ ...prev, expression: e.target.value }))}
              className="px-2 py-1 rounded text-xs bg-black/30 border border-white/10 text-white"
            >
              <option value="neutral">Neutral</option>
              <option value="happy">Happy</option>
              <option value="serious">Serious</option>
              <option value="confident">Confident</option>
            </select>
          </div>

          {/* More settings toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="ml-auto px-3 py-1 rounded text-xs bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10"
            title={showSettings ? 'Hide settings' : 'More settings'}
          >
            {showSettings ? 'Hide' : 'More'}
          </button>
        </div>
      </div>

      {/* Avatar Collection */}
      {avatarCollection.length > 0 && (
        <div className="border-b border-white/10 bg-white/5 p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <User className="w-5 h-5" />
            Your Avatar Collection ({avatarCollection.length})
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {avatarCollection.map((avatar, index) => (
              <div key={avatar._id} className="flex-shrink-0 relative group">
                <img
                  src={avatar.avatarUrl || `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/avatars/public/${avatar._id}`}
                  alt={avatar.prompt}
                  className="w-20 h-20 rounded-lg object-cover border border-white/10 hover:border-red-500/50 transition-colors"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <button
                    onClick={() => setPrompt(avatar.prompt)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                    title="Use this prompt"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 p-6 overflow-y-auto">
            {messages?.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message, index) => (
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
                      {message.avatar && (
                        <div className="mt-3">
                          <div className="relative group">
                          <img 
                            src={message.avatar} 
                            alt="Generated Avatar" 
                            className="rounded-lg max-w-full h-auto"
                              onLoad={() => console.log('✅ Avatar loaded successfully:', message.avatar)}
                              onError={(e) => {
                                console.error('❌ Avatar failed to load:', message.avatar);
                                
                                // Ensure we have a full URL
                                const fullImageUrl = message.avatar.startsWith('http') 
                                  ? message.avatar 
                                  : `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}${message.avatar}`;
                                
                                console.log('🔧 Constructed full URL:', fullImageUrl);
                                
                                // Try to load as blob URL to bypass CORS
                                fetch(fullImageUrl)
                                  .then(response => {
                                    console.log('🔍 Direct fetch test for avatar:', {
                                      status: response.status,
                                      statusText: response.statusText,
                                      url: response.url
                                    });
                                    return response.blob();
                                  })
                                  .then(blob => {
                                    console.log('🔍 Avatar blob received:', {
                                      size: blob.size,
                                      type: blob.type
                                    });
                                    
                                    // Create object URL and set as src
                                    const objectUrl = URL.createObjectURL(blob);
                                    console.log('🔗 Created object URL:', objectUrl);
                                    e.target.src = objectUrl;
                                  })
                                  .catch(fetchError => {
                                    console.error('🔍 Direct fetch failed:', fetchError);
                                  });
                              }}
                            />
                            {message.imageId && (
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={async () => {
                                    try {
                                      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
                                      const token = safeLocalStorage.getItem('token');
                                      
                                      if (!token) {
                                        try { (window.__toast?.push || (()=>{}))({ message: 'Please log in to save avatars.', type: 'warning' }); } catch(_) {}
                                        return;
                                      }

                                      const response = await fetch(`${apiBase}/api/avatars/save-from-image`, {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          'Authorization': `Bearer ${token}`
                                        },
                                        body: JSON.stringify({
                                          imageId: message.imageId
                                        })
                                      });

                                      const result = await response.json();

                                      if (result.success) {
                                        // Add to collection logic here
                                        const imageData = {
                                          _id: result.data.avatarId,
                                          avatarUrl: result.data.avatarUrl,
                                          prompt: result.data.prompt
                                        };
                                        if (onAddToCollection) {
                                          onAddToCollection(imageData, true);
                                        }
                                        try { (window.__toast?.push || (()=>{}))({ message: 'Avatar saved to your collection!', type: 'success' }); } catch(_) {}
                                      } else {
                                        try { (window.__toast?.push || (()=>{}))({ message: result.message || 'Failed to save avatar', type: 'error' }); } catch(_) {}
                                      }
                                    } catch (error) {
                                      console.error('Error saving avatar:', error);
                                      try { (window.__toast?.push || (()=>{}))({ message: 'Failed to save avatar. Please try again.', type: 'error' }); } catch(_) {}
                                    }
                                  }}
                                  className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-white transition-colors"
                                  title="Save to My Avatars"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {/* Save to Avatars Button - Prominent button below image */}
                          {message.imageId && (
                            <div className="mt-3 flex justify-center">
                              <button
                                onClick={async () => {
                                  try {
                                    console.log('🔍 Saving avatar with imageId:', message.imageId);
                                    
                                    const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
                                    const token = safeLocalStorage.getItem('token');
                                    
                                    if (!token) {
                                      try { (window.__toast?.push || (()=>{}))({ message: 'Please log in to save avatars.', type: 'warning' }); } catch(_) {}
                                      return;
                                    }

                                    const response = await fetch(`${apiBase}/api/avatars/save-from-image`, {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                      },
                                      body: JSON.stringify({
                                        imageId: message.imageId
                                      })
                                    });

                                    const result = await response.json();

                                    if (result.success) {
                                      // Add to collection logic here
                                      const imageData = {
                                        _id: result.data.avatarId,
                                        avatarUrl: result.data.avatarUrl,
                                        prompt: result.data.prompt
                                      };
                                      if (onAddToCollection) {
                                        onAddToCollection(imageData, true);
                                      }
                                      try { (window.__toast?.push || (()=>{}))({ message: 'Avatar saved to your collection!', type: 'success' }); } catch(_) {}
                                    } else {
                                      try { (window.__toast?.push || (()=>{}))({ message: result.message || 'Failed to save avatar', type: 'error' }); } catch(_) {}
                                    }
                                  } catch (error) {
                                    console.error('Error saving avatar:', error);
                                    try { (window.__toast?.push || (()=>{}))({ message: 'Failed to save avatar. Please try again.', type: 'error' }); } catch(_) {}
                                  }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                              >
                                <Plus className="w-4 h-4" />
                                Save to My Avatars
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="p-4 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Create Your Avatar</h3>
                  <p className="text-gray-400 max-w-md">
                    Describe the avatar you want to create. Include details about appearance, style, and personality.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-gray-800/50">
            
            {generationMode === 'text' ? (
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
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
                    placeholder="Describe the avatar you want to create..."
                    className="w-full p-4 pr-12 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 resize-none max-h-40"
                    rows="3"
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
            ) : (
              <div className="flex flex-col items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadedImage(e.target.files[0])}
                  className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-500 file:text-white hover:file:bg-red-600"
                />
                <button
                  onClick={handleGenerate}
                  disabled={!uploadedImage || isGenerating}
                  className="w-full max-w-xs p-3 rounded-lg bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  Generate from Image
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        {generatedAvatar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 400, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-gray-800/50 bg-gray-900/30 p-6"
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white mb-2">Generated Avatar</h3>
              <div className="relative">
                <img 
                  src={generatedAvatar} 
                  alt="Generated Avatar" 
                  className="w-full rounded-lg shadow-lg"
                  onLoad={() => console.log('✅ Preview avatar loaded successfully:', generatedAvatar)}
                  onError={(e) => {
                    console.error('❌ Preview avatar failed to load:', generatedAvatar);
                    console.error('Error details:', e);
                  }}
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 hover:opacity-100">
                  <button
                    onClick={handleDownload}
                    className="p-3 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all"
                  >
                    <Download className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={async () => {
                  try {
                    console.log('🔍 Looking for message with avatar:', generatedAvatar);
                    console.log('🔍 Current chat messages:', currentChat?.messages);
                    
                    // Find the current message with the imageId
                    const currentMessage = currentChat?.messages?.find(msg => msg.avatar === generatedAvatar);
                    console.log('🔍 Found message:', currentMessage);
                    console.log('🔍 Message imageId:', currentMessage?.imageId);
                    
                    if (!currentMessage?.imageId) {
                      console.error('❌ No imageId found in message:', currentMessage);
                      try { (window.__toast?.push || (()=>{}))({ message: 'No image ID found. Please generate a new avatar.', type: 'warning' }); } catch(_) {}
                      return;
                    }

                    const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
                    const token = safeLocalStorage.getItem('token');
                    
                    if (!token) {
                      try { (window.__toast?.push || (()=>{}))({ message: 'Please log in to save avatars.', type: 'warning' }); } catch(_) {}
                      return;
                    }

                    const response = await fetch(`${apiBase}/api/avatars/save-from-image`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        imageId: currentMessage.imageId
                      })
                    });

                    const result = await response.json();

                    if (result.success) {
                      // Add to collection logic here
                      const imageData = {
                        _id: result.data.avatarId,
                        avatarUrl: result.data.avatarUrl,
                        prompt: result.data.prompt
                      };
                      if (onAddToCollection) {
                        onAddToCollection(imageData, true);
                      }
                      try { (window.__toast?.push || (()=>{}))({ message: 'Avatar saved to your collection!', type: 'success' }); } catch(_) {}
                    } else {
                      try { (window.__toast?.push || (()=>{}))({ message: result.message || 'Failed to save avatar', type: 'error' }); } catch(_) {}
                    }
                  } catch (error) {
                    console.error('Error saving avatar:', error);
                    try { (window.__toast?.push || (()=>{}))({ message: 'Failed to save avatar. Please try again.', type: 'error' }); } catch(_) {}
                  }
                }}
                className="w-full p-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Save to My Avatars
              </button>
              <button
                onClick={handleDownload}
                className="w-full p-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Avatar
              </button>
              <button
                onClick={() => setGeneratedAvatar(null)}
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

export default AvatarCreator;

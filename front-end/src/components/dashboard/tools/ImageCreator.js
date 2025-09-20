import React, { useState, useRef, useEffect } from 'react';
import FormattedMessage from '../ui/FormattedMessage';
import { motion } from 'framer-motion';
import safeLocalStorage from '../../../utils/localStorage';
import { 
  Send, 
  Download, 
  RefreshCw, 
  Image as ImageIcon,
  Palette,
  Settings,
  Sparkles,
  Plus
} from 'lucide-react';

const ImageCreator = ({ currentChat, onChatUpdate, onNewChat }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState({
    style: 'realistic',
    quality: 'high',
    aspectRatio: '1:1',
    seed: '',
    model: 'sdxl',
    negativePrompt: ''
  });
  const [showSettings, setShowSettings] = useState(false);

  // Debug: Monitor generatedImage state changes
  useEffect(() => {
    console.log('🔄 generatedImage state changed:', generatedImage);
  }, [generatedImage]);

  // Sync local messages with incoming chat (same as AvatarCreator)
  useEffect(() => {
    if (currentChat && Array.isArray(currentChat.messages)) {
      console.log('Loading image chat messages:', currentChat.messages.length, 'messages');
      console.log('Current chat serverId:', currentChat.serverId || currentChat._id);
      
      // Transform server-loaded messages: check for image property
      const transformed = currentChat.messages.map((m, index) => {
        console.log(`Image message ${index}:`, { 
          type: m.type, 
          role: m.role,
          content: m.content, 
          hasImage: !!m.image,
          image: m.image
        });
        
        // Handle both local format (type) and server format (role)
        const messageType = m.type || (m.role === 'user' ? 'user' : 'assistant');
        
        // Check if message has image property from backend
        console.log(`Checking message ${index} for image:`, {
          hasM: !!m,
          hasImage: !!m.image,
          imageValue: m.image,
          imageType: typeof m.image,
          allKeys: Object.keys(m || {})
        });
        
        if (m && m.image) {
          console.log(`Message ${index} has image from backend:`, m.image);
          
          // Test if the stored image URL is still accessible
          if (m.image.startsWith('http')) {
            fetch(m.image, { method: 'HEAD' })
              .then(testRes => {
                console.log(`Image URL test for message ${index}:`, testRes.status, testRes.ok ? 'SUCCESS' : 'FAILED');
              })
              .catch(err => {
                console.error(`Image URL test failed for message ${index}:`, err);
              });
          }
          
          return { 
            ...m, 
            type: messageType,
            image: m.image // Explicitly preserve image field
          };
        }
        
        // Debug: Log all message properties to see what's available
        console.log(`Message ${index} full object:`, m);
        
            return { 
              ...m, 
              type: messageType,
          image: m.image // Explicitly preserve image field
            };
      });
      
      console.log('Transformed image messages:', transformed);
      console.log('Final messages with images:', transformed.filter(m => m.image));
      setMessages(transformed);
    } else {
      console.log('No chat or empty messages, clearing');
      setMessages([]);
    }
  }, [currentChat?.messages, currentChat?.id, currentChat?.serverId]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    
    try {
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const token = safeLocalStorage.getItem('token');
      if (!token) throw new Error('Please log in to generate images.');

      // Use chat command system instead of direct API call (like AvatarCreator)
      console.log('Base prompt:', prompt);
      console.log('Settings:', settings);

      // The image generation will be handled by the chat controller when we send the /image command

      // Use existing chat or create new one only if no chat exists
      let serverChatId = currentChat?.serverId || currentChat?._id;
      
      // Only create new chat if no chat exists at all
      if (!serverChatId) {
        try {
          console.log('Creating new backend chat for image generation');
          
          const createResponse = await fetch(`${apiBase}/api/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              title: prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''),
              chatType: 'image'
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
          console.log('Saving image generation to server chat:', serverChatId);
          
          // Send the image command to the server chat with character settings
          const chatPayload = {
            message: `/image ${prompt}`,
            stream: false,
            imageSettings: settings
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
            const chatData = await chatRes.json();
            console.log('Chat response received:', chatData);
            
            // Check if the response contains image data
            if (chatData.data && chatData.data.image) {
              const imageUrl = chatData.data.image;
              const imageId = chatData.data.imageId;
              
              console.log('🎨 Image received from chat response:', imageUrl);
              console.log('🖼️ Image ID received from chat response:', imageId);
              
              // Set the generated image for immediate display
              setGeneratedImage(imageUrl);
              
              // Update chat history with both user and assistant messages
      if (onChatUpdate) {
                const trimmed = (prompt || '').trim();
        const titleBase = trimmed.slice(0, 50);
        const title = titleBase && trimmed.length > 50 ? `${titleBase}...` : titleBase || (currentChat?.title || 'Image Generation');
        
                const newMessages = [
                  ...(currentChat?.messages || []),
                  { type: 'user', content: prompt, timestamp: Date.now() },
                  { 
                    type: 'assistant', 
                    content: `I've generated an image based on your prompt: "${prompt}"`, 
                    image: imageUrl, 
                    imageId: imageId,
                    originalPrompt: prompt,
                    technicalPrompt: prompt,
                    timestamp: Date.now() 
                  }
                ];
                
                console.log('Updating chat history with image:', newMessages.map(m => ({
          type: m.type,
          content: m.content,
          hasImage: !!m.image,
          imageUrl: m.image
        })));
        
        onChatUpdate({
          messages: newMessages,
          ...(title ? { title } : {})
        });
      }
            } else {
              console.log('No image data in chat response, waiting for completion...');
            }
          } else {
            console.error('Failed to save to server chat:', chatRes.status);
          }
    } catch (error) {
          console.error('Error saving to server chat:', error);
        }
      }

      console.log('🎨 Image generation command sent to chat system');

    } catch (error) {
      console.error('Error generating image:', error);
      
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
      
      alert(`Error generating image: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `ai-image-${Date.now()}.png`;
      link.click();
    }
  };

  const handleNewChat = async () => {
    setPrompt('');
    setGeneratedImage(null);
    setMessages([]); // Clear local messages
    if (onNewChat) {
      onNewChat(); // This will reset the currentChat in the parent
    }

    // Immediately create a new chat session on the backend
    try {
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const token = safeLocalStorage.getItem('token');
      if (!token) throw new Error('Please log in to create a new chat.');

      const createResponse = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'New Image Chat',
          chatType: 'image'
        })
      });

      if (createResponse.ok) {
        const chatData = await createResponse.json();
        if (onChatUpdate) {
          // Update the parent component with the new chat details
          onChatUpdate({
            id: Date.now().toString(), // Temporary local ID
            serverId: chatData.data._id,
            title: chatData.data.title,
            messages: []
          });
        }
      } else {
        console.error('Failed to create new backend chat:', createResponse.status);
      }
    } catch (error) {
      console.error('Error creating new backend chat:', error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-500">
              <ImageIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Image Creator</h1>
              <p className="text-gray-400">Generate stunning images with AI</p>
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
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Style</label>
              <select
                value={settings.style}
                onChange={(e) => setSettings(prev => ({ ...prev, style: e.target.value }))}
                className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white"
              >
                <option value="realistic">Realistic</option>
                <option value="artistic">Artistic</option>
                <option value="cartoon">Cartoon</option>
                <option value="anime">Anime</option>
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
                <option value="1:1">Square (1:1)</option>
                  <option value="2:3">Portrait (2:3)</option>
                  <option value="3:2">Landscape (3:2)</option>
                  <option value="16:9">Widescreen (16:9)</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Seed (Optional)</label>
              <input
                  type="number"
                value={settings.seed}
                onChange={(e) => setSettings(prev => ({ ...prev, seed: e.target.value }))}
                  placeholder="Random"
                  className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Model</label>
                <select
                  value={settings.model}
                  onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white"
                >
                  <option value="sdxl">SDXL</option>
                  <option value="controlnet">ControlNet</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Negative Prompt</label>
                <input
                  type="text"
                  value={settings.negativePrompt}
                  onChange={(e) => setSettings(prev => ({ ...prev, negativePrompt: e.target.value }))}
                  placeholder="What to avoid..."
                  className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white"
                />
              </div>
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
                      {message.image && (
                        <div className="mt-3">
                          <div className="relative group">
                          <img 
                            src={message.image} 
                            alt="Generated Image" 
                            className="rounded-lg max-w-full h-auto"
                            onLoad={() => console.log('✅ Image loaded successfully:', message.image)}
                            onError={(e) => {
                                console.error('❌ Image failed to load:', message.image);
                              
                              // Ensure we have a full URL
                              const fullImageUrl = message.image.startsWith('http') 
                                ? message.image 
                                : `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}${message.image}`;
                              
                              console.log('🔧 Constructed full URL:', fullImageUrl);
                              
                              // Try to load as blob URL to bypass CORS
                              fetch(fullImageUrl)
                                .then(response => {
                                  console.log('🔍 Direct fetch test for image:', {
                                    status: response.status,
                                    statusText: response.statusText,
                                    url: response.url
                                  });
                                  return response.blob();
                                })
                                .then(blob => {
                                  console.log('🔍 Image blob received:', {
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
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="p-4 rounded-full bg-gradient-to-r from-red-500/20 to-rose-500/20 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-red-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Create Your Image</h3>
                  <p className="text-gray-400 max-w-md">
                    Describe the image you want to create. Be specific about style, composition, and details.
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
                  placeholder="Describe the image you want to create..."
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
        {generatedImage && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 400, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-gray-800/50 bg-gray-900/30 p-6"
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white mb-2">Generated Image</h3>
              <div className="relative">
                <img 
                  src={generatedImage} 
                  alt="Generated Image" 
                  className="w-full rounded-lg shadow-lg"
                  onLoad={() => console.log('✅ Preview image loaded successfully:', generatedImage)}
                  onError={(e) => {
                    console.error('❌ Preview image failed to load:', generatedImage);
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
                onClick={handleDownload}
                className="w-full p-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Image
              </button>
                    <button
                onClick={() => setGeneratedImage(null)}
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

export default ImageCreator;
import React, { useState, useRef, useEffect } from 'react';
import FormattedMessage from '../ui/FormattedMessage';
import { motion } from 'framer-motion';
import safeLocalStorage from '../../../utils/localStorage';
import { 
  Send, 
  Download, 
  RefreshCw, 
  Sparkles
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
  const [showSettings, setShowSettings] = useState(false); // no header panel; inline controls used
  const pollingRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

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

      // Ensure there is a local chat to append to immediately
      let ensuredChat = currentChat;
      if (!ensuredChat && onNewChat) {
        try {
          const created = await onNewChat('image');
          ensuredChat = created || ensuredChat;
        } catch (_) {}
      }

      // Use chat command system instead of direct API call (like AvatarCreator)
      console.log('Base prompt:', prompt);
      console.log('Settings:', settings);

      // The image generation will be handled by the chat controller when we send the /image command

      // Use existing chat or create new one only if no chat exists
      let serverChatId = ensuredChat?.serverId || ensuredChat?._id || currentChat?.serverId || currentChat?._id;
      
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
                id: ensuredChat?.id || currentChat?.id || Date.now().toString(),
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
      
      // Append placeholder BEFORE sending to server so UI updates instantly
      setMessages(prev => ([
        ...prev,
        { type: 'user', content: prompt, timestamp: Date.now() },
        { type: 'assistant', content: 'Generating image…', timestamp: Date.now() }
      ]));

      if (onChatUpdate) {
        const newMessages = [
          ...((ensuredChat?.messages || currentChat?.messages) || []),
          { type: 'user', content: prompt, timestamp: Date.now() },
          { type: 'assistant', content: 'Generating image…', timestamp: Date.now() }
        ];
        onChatUpdate({ id: ensuredChat?.id || currentChat?.id || Date.now().toString(), messages: newMessages });
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
              
              // Replace the placeholder with the real assistant image message (local)
              setMessages(prev => {
                const withoutPlaceholder = [...prev];
                // remove the latest assistant placeholder if present
                for (let i = withoutPlaceholder.length - 1; i >= 0; i--) {
                  if (withoutPlaceholder[i].type === 'assistant' && String(withoutPlaceholder[i].content || '').toLowerCase().includes('generating image')) {
                    withoutPlaceholder.splice(i, 1);
                    break;
                  }
                }
                return [
                  ...withoutPlaceholder,
                  { type: 'assistant', content: `I've generated an image based on your prompt: "${prompt}"`, image: imageUrl, imageId, timestamp: Date.now() }
                ];
              });

              // Update chat history with both user and assistant messages (parent)
      if (onChatUpdate) {
                const trimmed = (prompt || '').trim();
        const titleBase = trimmed.slice(0, 50);
        const title = titleBase && trimmed.length > 50 ? `${titleBase}...` : titleBase || (currentChat?.title || 'Image Generation');
        
                const newMessages = [
                  ...((ensuredChat?.messages || currentChat?.messages) || []),
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
      // Poll the server chat until an assistant message with image appears
      if (serverChatId) {
        let attempts = 0;
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
          if (!isMountedRef.current || attempts++ > 15) {
            clearInterval(pollingRef.current);
            return;
          }
          try {
            const token2 = safeLocalStorage.getItem('token');
            const res = await fetch(`${apiBase}/api/chat/${serverChatId}`, {
              headers: { 'Authorization': `Bearer ${token2}` }
            });
            if (!res.ok) return;
            const json = await res.json();
            const serverChat = json?.data;
            if (!serverChat) return;
            const mappedMessages = (serverChat.messages || []).map(m => ({
              type: m.role === 'user' ? 'user' : 'assistant',
              content: m.content,
              image: m.image,
              timestamp: new Date(m.timestamp || serverChat.createdAt || Date.now())
            }));
            const lastAssistant = [...mappedMessages].reverse().find(m => m.type === 'assistant' && (m.image || (typeof m.content === 'string' && m.content.match(/https?:\/\//))));
            if (lastAssistant && onChatUpdate) {
              onChatUpdate({ messages: mappedMessages });
              setMessages(mappedMessages);
              clearInterval(pollingRef.current);
            }
          } catch (e) {
            console.error('Polling error:', e);
          }
        }, 2000);
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
      
      try { (window.__toast?.push || (()=>{}))({ message: `Error generating image: ${errorMessage}`, type: 'error' }); } catch(_) {}
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

  const handleDownloadUrl = (url, nameHint = 'image') => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nameHint}-${Date.now()}.png`;
    link.click();
  };

  const handleNewChat = async () => {
    setPrompt('');
    setGeneratedImage(null);
    setMessages([]); // Clear local messages
    if (onNewChat) {
      onNewChat('image'); // Ensure the tool is image
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
                    <div className={`relative max-w-2xl p-4 rounded-2xl ${
                      message.type === 'user' 
                        ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white' 
                        : 'bg-white/5 border border-white/10 text-gray-200'
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
                          <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/20 transition flex items-start justify-end p-2 opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => handleDownloadUrl(message.image, 'ai-image')}
                              className="ui-btn"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="ui-card px-4 py-3 text-gray-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-white/70 animate-pulse"></span>
                      <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '100ms' }}></span>
                      <span className="w-2 h-2 rounded-full bg-white/30 animate-pulse" style={{ animationDelay: '200ms' }}></span>
                      <span className="text-sm ml-1">Generating…</span>
                    </div>
                  </div>
                )}
                <div />
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
            {/* Inline settings + quick presets */}
            <div className="ui-card p-3 mb-3 flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Style</span>
                <select value={settings.style} onChange={(e) => setSettings(prev => ({ ...prev, style: e.target.value }))} className="ui-input-sm px-2 py-1">
                  <option value="realistic">Realistic</option>
                  <option value="artistic">Artistic</option>
                  <option value="cartoon">Cartoon</option>
                  <option value="anime">Anime</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Quality</span>
                <select value={settings.quality} onChange={(e) => setSettings(prev => ({ ...prev, quality: e.target.value }))} className="ui-input-sm px-2 py-1">
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                  <option value="ultra">Ultra</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Ratio</span>
                <select value={settings.aspectRatio} onChange={(e) => setSettings(prev => ({ ...prev, aspectRatio: e.target.value }))} className="ui-input-sm px-2 py-1">
                  <option value="1:1">1:1</option>
                  <option value="2:3">2:3</option>
                  <option value="3:2">3:2</option>
                  <option value="16:9">16:9</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Model</span>
                <select value={settings.model} onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))} className="ui-input-sm px-2 py-1">
                  <option value="sdxl">SDXL</option>
                  <option value="controlnet">ControlNet</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {['Product photo on white background', 'Cinematic portrait, shallow depth of field', 'Logo concept, minimal, vector', 'Landscape, golden hour, ultra-detailed'].map((p, i) => (
                <button key={i} className="ui-btn text-xs" onClick={() => setPrompt(p)} title="Insert prompt">
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  rows={1}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the image you want to create... (Enter to generate, Shift+Enter for newline)"
                  className="ui-input p-4 pr-12 resize-none max-h-40"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    const max = 160; // ~10 lines
                    const newH = Math.min(el.scrollHeight, max);
                    el.style.height = newH + 'px';
                    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
                  }}
                />
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="absolute right-2 top-1/2 -translate-y-1/2 ui-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* No side preview; images appear directly in chat with download action */}
      </div>
    </div>
  );
};

export default ImageCreator;
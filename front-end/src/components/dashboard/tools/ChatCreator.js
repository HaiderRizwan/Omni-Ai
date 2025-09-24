import React, { useState, useRef, useEffect } from 'react';
import FormattedMessage from '../ui/FormattedMessage';
import { motion } from 'framer-motion';
import { Send, Bot, User, Loader2, Paperclip, X, RefreshCcw, Copy } from 'lucide-react';
import safeLocalStorage from '../../../utils/localStorage';

const ChatCreator = ({ currentChat, onChatUpdate }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [attachmentData, setAttachmentData] = useState(null);
  const currentServerChatId = useRef(null); // Store serverId locally
  const quickPrompts = [
    'Summarize this conversation in 3 bullet points',
    'Brainstorm 5 ideas based on my last message',
    'Explain this like I am 10 years old',
    'Create an action plan with next steps'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Sync messages from selected chat into the chat view
  useEffect(() => {
    // Update local serverId reference when currentChat changes
    currentServerChatId.current = currentChat?.serverId || currentChat?._id || null;
    
    const transform = (arr) => (arr || []).map((m, idx) => {
      const base = {
        id: m.id || m._id || idx + 1,
        role: m.role || (m.type === 'user' ? 'user' : 'assistant'),
        content: m.content,
        image: m.image, // Preserve image field from server
        timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp || Date.now())
      };
      // Only extract URL from content if no image field exists
      if (base.role === 'assistant' && !base.image && typeof base.content === 'string') {
        const urlMatch = base.content.match(/https?:\/\/[^\s\)]+/);
        if (urlMatch) return { ...base, image: urlMatch[0], content: '' };
      }
      return base;
    });

    if (currentChat && Array.isArray(currentChat.messages) && currentChat.messages.length > 0) {
      const transformedMessages = transform(currentChat.messages);
      setMessages(transformedMessages);
    } else {
      // Default greeting when no chat loaded
      setMessages([
        {
          id: 1,
          role: 'assistant',
          content: 'Hello! I\'m your AI assistant. How can I help you today?',
          timestamp: new Date()
        }
      ]);
    }
  }, [currentChat?.messages, currentChat?.id, currentChat?.serverId]);

  const sendMessage = async () => {
    if ((!inputMessage.trim() && !pendingAttachment) || isLoading) return;


    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputMessage.trim() || (pendingAttachment ? `Attached: ${pendingAttachment.name}` : ''),
      timestamp: new Date()
    };

    // Generate a human-friendly title from the first line of the first user message
    const generateTitleFromText = (text) => {
      try {
        const firstLine = (text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean)[0] || '';
        // Strip simple markdown chars and extra spaces
        const cleaned = firstLine
          .replace(/^#+\s*/, '')
          .replace(/^[-*]\s+/, '')
          .replace(/[`*_~>#]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        const maxLen = 60;
        if (cleaned.length <= maxLen) return cleaned || 'New Chat';
        return cleaned.slice(0, maxLen - 1) + '…';
      } catch (_) {
        return 'New Chat';
      }
    };

    setInputMessage('');
    setIsLoading(true);

    try {
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const token = safeLocalStorage.getItem('token');

      if (!token) {
        throw new Error('Please log in to use chat');
      }

      // Reuse existing server chat id - check local reference first, then currentChat
      let serverChatId = currentServerChatId.current || currentChat?.serverId || currentChat?._id || null;
      const shouldDeriveTitle = !currentChat?.title || /^New\b/i.test(currentChat.title);
      const derivedTitle = generateTitleFromText(userMessage.content);
      
      
      if (!serverChatId) {
        const createResponse = await fetch(`${apiBase}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            title: derivedTitle || 'New Chat',
            chatType: 'text' // Default to text chat
          })
        });

        if (!createResponse.ok) {
          const errText = await createResponse.text().catch(() => '');
          throw new Error(`Failed to create chat session: ${createResponse.status}${errText ? ` - ${errText}` : ''}`);
        }

        const chatData = await createResponse.json();
        serverChatId = chatData.data._id;
        
        // Store serverId in local reference for immediate use
        currentServerChatId.current = serverChatId;
        
        // Update the current chat with the server ID so future messages use the same chat
        onChatUpdate?.({ 
          id: currentChat?.id || Date.now().toString(), // Keep local ID
          serverId: serverChatId, 
          title: chatData.data.title || derivedTitle || 'New Chat', 
          messages: currentChat?.messages || []
        });
      } else if (shouldDeriveTitle) {
        // Update title for existing chat if it's still the default
        const newTitle = derivedTitle;
        if (newTitle && currentChat?.id) {
          onChatUpdate?.({ id: currentChat.id, serverId: serverChatId, title: newTitle });
          // Best-effort server update; don't block UI on failure
          try {
            await fetch(`${apiBase}/api/chat/${serverChatId}/settings`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ title: newTitle })
            });
          } catch (_) {}
        }
      }

      // Use already uploaded attachment data
      let attachmentUrl = null;
      let attachmentText = null;
      if (attachmentData) {
        attachmentUrl = attachmentData.url;
        attachmentText = attachmentData.convertedText;
      }

      // Send message to the chat (include attachment URL and converted text if present)
      let messageContent = userMessage.content;
      if (attachmentUrl) {
        messageContent += `\n\n[Attachment](${attachmentUrl})`;
        if (attachmentText) {
          messageContent += `\n\nDocument content:\n${attachmentText}`;
        }
      }
      
      const payload = {
        message: messageContent,
        stream: false
      };
      const messageResponse = await fetch(`${apiBase}/api/chat/${serverChatId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!messageResponse.ok) {
        const errText = await messageResponse.text().catch(() => '');
        throw new Error(`Failed to send message: ${messageResponse.status}${errText ? ` - ${errText}` : ''}`);
      }

      const messageData = await messageResponse.json();
      
      let assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: messageData.data?.message || 'Sorry, I couldn\'t process your request.',
        timestamp: new Date()
      };
      
      // Check if response has an image property
      if (messageData.data?.image) {
        assistantMessage.image = messageData.data.image;
        console.log('Image found in response:', messageData.data.image);
        // When there's an image, don't show the text content
        assistantMessage.content = `I've generated an image based on your prompt: "${userMessage.content}"`;
      }
      // If assistant text includes a URL, render it as an image and hide raw text
      else if (typeof assistantMessage.content === 'string') {
        const urlMatch = assistantMessage.content.match(/https?:\/\/[^\s\)]+/);
        if (urlMatch) {
          assistantMessage = { ...assistantMessage, image: urlMatch[0], content: '' };
        }
      }
      
      console.log('Final assistant message:', assistantMessage);

      // Handle updated chat information from server (like title updates)
      const updatedChatData = {
        id: currentChat?.id || serverChatId,
        serverId: serverChatId,
        messages: [...(currentChat?.messages || []), userMessage, assistantMessage]
      };
      
      // Include updated title if provided by server
      if (messageData.data?.chat?.title) {
        updatedChatData.title = messageData.data.chat.title;
      }
      
      // Update parent state first, then let useEffect sync the local messages
      onChatUpdate?.(updatedChatData);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date()
      };
      
      // Update parent state with error message
      const updatedChatData = {
        id: currentChat?.id || currentServerChatId.current,
        serverId: currentServerChatId.current,
        messages: [...(currentChat?.messages || []), userMessage, errorMessage]
      };
      
      onChatUpdate?.(updatedChatData);
    } finally {
      setIsLoading(false);
      setPendingAttachment(null);
      setAttachmentData(null);
      setDebugInfo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-resize textarea like GPT up to a max height, then scroll
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const max = 160; // ~10 lines
    const newH = Math.min(el.scrollHeight, max);
    el.style.height = newH + 'px';
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
  }, [inputMessage]);

  const copyMessageToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text || '');
      try { (window.__toast?.push || (()=>{}))({ message: 'Copied to clipboard', type: 'success' }); } catch(_) {}
    } catch (_) {}
  };

  const regenerateFromLastUser = () => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUser || isLoading) return;
    setInputMessage(lastUser.content || '');
    setTimeout(() => sendMessage(), 0);
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header removed per request */}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto themed-scrollbar p-6 space-y-4 min-h-0 pb-40">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`group flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="p-2 rounded-lg bg-gradient-to-r from-red-600 to-red-800">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}
            
            <div className={`relative max-w-[70%] p-4 rounded-2xl ${
              message.role === 'user' 
                ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white' 
                : 'bg-white/5 border border-white/10 text-gray-100'
            }`}>
              {message.role === 'assistant' ? (
                message.image ? (
                  <div>
                    <div className="text-sm leading-relaxed mb-3">
                      <FormattedMessage text={message.content} />
                    </div>
                    <img 
                      src={message.image} 
                      alt="Generated" 
                      className="rounded-lg max-w-full h-auto"
                      onLoad={() => console.log('✅ Image loaded successfully:', message.image)}
                      onError={(e) => {
                        console.error('❌ Image failed to load:', message.image);
                        console.error('Error event:', e);
                        console.error('Target src:', e.target.src);
                        
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
                ) : (
                  <div className="text-sm leading-relaxed">
                    <FormattedMessage text={message.content} />
                  </div>
                )
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              )}
              <p className={`text-xs mt-2 ${
                message.role === 'user' ? 'text-red-100' : 'text-gray-400'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </p>

              {message.role === 'assistant' && !message.image && (
                <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition">
                  <div className="ui-card px-2 py-1 flex gap-1">
                    <button
                      className="ui-icon-btn"
                      title="Copy"
                      onClick={() => copyMessageToClipboard(message.content)}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      className="ui-icon-btn"
                      title="Regenerate"
                      onClick={regenerateFromLastUser}
                    >
                      <RefreshCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <div className="p-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-500">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </motion.div>
        ))}
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 justify-start"
          >
            <div className="p-2 rounded-lg bg-gradient-to-r from-red-600 to-red-800">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="ui-card px-4 py-3">
              <div className="flex items-center gap-2 text-gray-300">
                <span className="relative inline-flex gap-1 items-center">
                  <span className="w-2 h-2 rounded-full bg-white/70 animate-pulse"></span>
                  <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '100ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-white/30 animate-pulse" style={{ animationDelay: '200ms' }}></span>
                </span>
                <span className="text-sm">Thinking…</span>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Debug Box */}
      {debugInfo && (
        <div className="fixed bottom-32 right-0 z-30 p-4" style={{ left: 'var(--sidebar-w, 16rem)' }}>
          <div className={`p-4 rounded-lg border text-sm max-w-md ${
            debugInfo.status === 'converted' 
              ? 'bg-green-900/20 border-green-500/50 text-green-300'
              : debugInfo.status === 'conversion_failed'
              ? 'bg-red-900/20 border-red-500/50 text-red-300'
              : debugInfo.status === 'uploading'
              ? 'bg-blue-900/20 border-blue-500/50 text-blue-300'
              : 'bg-yellow-900/20 border-yellow-500/50 text-yellow-300'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                debugInfo.status === 'converted' ? 'bg-green-500'
                : debugInfo.status === 'conversion_failed' ? 'bg-red-500'
                : debugInfo.status === 'uploading' ? 'bg-blue-500 animate-pulse'
                : 'bg-yellow-500'
              }`}></div>
              <div className="flex-1">
                <div className="font-medium mb-1">Debug Information:</div>
                <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
                  {debugInfo.message}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="p-6 border-t border-gray-800/50 shrink-0 fixed bottom-0 right-0 z-40 bg-[#0b0b0f]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0b0b0f]/70" style={{ left: 'var(--sidebar-w, 16rem)' }}>
        {/* Quick prompts */}
        <div className="flex flex-wrap gap-2 mb-3">
          {quickPrompts.map((p, i) => (
            <button key={i} className="ui-btn text-sm" onClick={() => setInputMessage(p)} title="Insert prompt">
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-3 items-center">
          {/* Attach */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                  setPendingAttachment(file);
                  setDebugInfo({ status: 'uploading', message: 'Uploading file...' });
                  
                  // Upload and convert immediately
                  try {
                    const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
                    const token = safeLocalStorage.getItem('token');
                    
                    if (!token) {
                      setDebugInfo({ status: 'conversion_failed', message: '❌ Please log in to upload files' });
                      return;
                    }

                    // Use current chat's serverId if available, otherwise skip upload
                    let serverChatId = currentChat?.serverId || currentChat?._id || null;
                    if (!serverChatId) {
                      setDebugInfo({ 
                        status: 'conversion_failed', 
                        message: '❌ Please send a message first to create a chat session before uploading files' 
                      });
                      setPendingAttachment(null);
                      return;
                    }

                    if (serverChatId) {
                      const formData = new FormData();
                      formData.append('file', file);
                      const uploadRes = await fetch(`${apiBase}/api/chat/${serverChatId}/attachments`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`
                        },
                        body: formData
                      });
                      
                      if (uploadRes.ok) {
                        const uploadJson = await uploadRes.json();
                        setAttachmentData(uploadJson.data);
                        
                        // Detailed debug information
                        let debugMessage = '';
                        let debugStatus = uploadJson?.data?.conversionStatus || 'unknown';
                        
                        if (debugStatus === 'converted') {
                          debugMessage = `✅ Document converted successfully\n` +
                            `📄 File: ${uploadJson.data.filename}\n` +
                            `📊 Size: ${(uploadJson.data.size / 1024).toFixed(1)} KB\n` +
                            `📝 Text Length: ${uploadJson.data.convertedText?.length || 0} characters\n` +
                            `🔧 Method: ${uploadJson.data.filename.toLowerCase().endsWith('.pdf') ? 'PDF-to-Text' : 'Direct Read'}`;
                        } else if (debugStatus === 'conversion_failed') {
                          debugMessage = `❌ Conversion Failed\n` +
                            `📄 File: ${uploadJson.data.filename}\n` +
                            `📊 Size: ${(uploadJson.data.size / 1024).toFixed(1)} KB\n` +
                            `🔧 Type: ${uploadJson.data.mimeType}\n` +
                            `⚠️ Issue: PDF parsing error or file corruption`;
                        } else {
                          debugMessage = `⚠️ Not Converted\n` +
                            `📄 File: ${uploadJson.data.filename}\n` +
                            `📊 Size: ${(uploadJson.data.size / 1024).toFixed(1)} KB\n` +
                            `🔧 Type: ${uploadJson.data.mimeType}\n` +
                            `📋 Extension: ${uploadJson.data.filename.split('.').pop()?.toLowerCase()}\n` +
                            `⚠️ Issue: Unsupported format or MIME type mismatch`;
                        }
                        
                        setDebugInfo({ 
                          status: debugStatus,
                          message: debugMessage
                        });
                      } else {
                        const errorText = await uploadRes.text().catch(() => 'Unknown error');
                        setDebugInfo({ 
                          status: 'conversion_failed', 
                          message: `❌ Upload Failed\n📄 File: ${file.name}\n📊 Size: ${(file.size / 1024).toFixed(1)} KB\n⚠️ Error: ${uploadRes.status} - ${errorText}` 
                        });
                      }
                    }
                  } catch (error) {
                    setDebugInfo({ status: 'conversion_failed', message: `❌ Error: ${error.message}` });
                  }
                }
              }}
              accept=".pdf,.txt,.csv,.json,.html,.png,.jpg,.jpeg,.webp"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="ui-btn"
              disabled={isLoading}
              title="Attach a document"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Message Omni…  (Enter to send, Shift+Enter for newline)"
              className="ui-input p-4 pr-12 resize-none max-h-40"
              disabled={isLoading}
            />
          <button
            onClick={sendMessage}
              disabled={(!inputMessage.trim() && !pendingAttachment) || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 ui-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
          </div>

          {pendingAttachment && (
            <div className="flex items-center gap-2 px-3 py-2 ui-card text-sm text-white/80">
              <span className="max-w-[220px] truncate">{pendingAttachment.name}</span>
              <button
                onClick={() => { 
                  setPendingAttachment(null); 
                  setAttachmentData(null);
                  setDebugInfo(null);
                  if (fileInputRef.current) fileInputRef.current.value = ''; 
                }}
                className="ui-icon-btn"
                title="Remove attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatCreator;

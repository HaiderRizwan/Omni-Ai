import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import safeLocalStorage from '../../utils/localStorage';
import { 
  Image, 
  Video, 
  User, 
  Film, 
  MessageSquare, 
  Plus,
  ChevronRight,
  Clock,
  TestTube,
  Crown,
  Bot,
  Trash,
  Images
} from 'lucide-react';

const Sidebar = ({ 
  activeTool, 
  onToolSelect, 
  chatHistories, 
  serverChats,
  onChatSelect, 
  onCreateNewChat,
  onDeleteChat,
  user,
  onUserUpdate
}) => {
  const { theme, isDark, isRed } = useTheme();
  const [subscriptionStatus, setSubscriptionStatus] = useState('free'); // 'free', 'trial', 'active'
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);

  // Function to check subscription status from backend
  const checkSubscriptionStatus = async () => {
    try {
      setIsCheckingSubscription(true);
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const token = safeLocalStorage.getItem('token');
      
      if (!token) {
        setSubscriptionStatus('free');
        return;
      }
      const response = await fetch(`${apiBase}/api/subscriptions/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        setSubscriptionStatus('free');
        return;
      }

      const data = await response.json();

      if (data.success && data.data) {
        const { hasActiveSubscription, isTrialActive, subscriptionStatus: backendStatus } = data.data;
        
        if (hasActiveSubscription) {
          if (isTrialActive) {
            setSubscriptionStatus('trial');
            // Update user object if callback is provided
            if (onUserUpdate && user) {
              onUserUpdate({ ...user, subscriptionStatus: 'trial' });
            }
          } else {
            setSubscriptionStatus('active');
            // Update user object if callback is provided
            if (onUserUpdate && user) {
              onUserUpdate({ ...user, subscriptionStatus: 'active' });
            }
          }
        } else {
          setSubscriptionStatus('free');
          // Update user object if callback is provided
          if (onUserUpdate && user) {
            onUserUpdate({ ...user, subscriptionStatus: 'free' });
          }
        }
      } else {
        setSubscriptionStatus('free');
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setSubscriptionStatus('free');
    } finally {
      setIsCheckingSubscription(false);
    }
  };

  // Check subscription status on component mount
  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const handleSubscribe = async () => {
    try {
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const token = safeLocalStorage.getItem('token');
      if (!token) {
        alert('Please log in first.');
        return;
      }

      // Verify token by fetching profile
      const profRes = await fetch(`${apiBase}/api/users/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const profJson = await profRes.json().catch(() => ({}));
      if (!profRes.ok) {
        alert('Authentication invalid. Please log in again.');
        return;
      }

      // Optimistic UI: show loading text on button
      const btn = document.getElementById('subscribe-btn');
      if (btn) {
        btn.disabled = true;
        btn.innerText = 'Subscribing...';
      }

      // 1) Fetch available plans (public)
      const plansRes = await fetch(`${apiBase}/api/subscriptions/plans`);
      let plansJson = await plansRes.json().catch(() => ({ success: false, data: [] }));
      if (!plansRes.ok || !plansJson.success || !Array.isArray(plansJson.data) || plansJson.data.length === 0) {
        await fetch(`${apiBase}/health`).catch(() => {});
        const retryRes = await fetch(`${apiBase}/api/subscriptions/plans`);
        const retryJson = await retryRes.json().catch(() => ({ success: false, data: [] }));
        if (retryRes.ok && retryJson.success && Array.isArray(retryJson.data) && retryJson.data.length > 0) {
          plansJson.data = retryJson.data;
        } else {
          plansJson.data = [];
        }
      }
      const planId = Array.isArray(plansJson.data) && plansJson.data[0] ? plansJson.data[0]._id : undefined;

      // 2) Try to start a trial
      const trialRes = await fetch(`${apiBase}/api/subscriptions/start-trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(planId ? { planId } : {})
      });
      let trialBody = await trialRes.json().catch(() => ({}));

      if (trialRes.ok) {
        setSubscriptionStatus('trial');
        // Update user object if callback is provided
        if (onUserUpdate && user) {
          onUserUpdate({ ...user, subscriptionStatus: 'trial' });
        }
        alert('Trial started successfully!');
        return;
      }

      // 3) If trial not eligible, upgrade directly
      const upgradeRes = await fetch(`${apiBase}/api/subscriptions/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(planId ? { planId, billingCycle: 'monthly' } : { billingCycle: 'monthly' })
      });

      if (!upgradeRes.ok) {
        const err = await upgradeRes.json().catch(() => ({}));
        alert(`Subscription failed: ${upgradeRes.status}${err?.message ? ` - ${err.message}` : ''}`);
        if (btn) { btn.disabled = false; btn.innerText = 'Subscribe / Start Trial'; }
        return;
      }

      // Success UI: turn button green and persist status
      if (btn) {
        btn.disabled = true;
        btn.innerText = 'Subscribed';
        btn.className = 'w-full mb-4 flex items-center justify-center gap-2 rounded-xl bg-green-600 text-white font-medium py-3';
      }
      safeLocalStorage.setItem('subscriptionStatus', 'active');
      setSubscriptionStatus('active');
      alert('Subscription upgraded successfully!');
    } catch (error) {
      console.error('Subscribe error:', error);
      alert('Subscription failed. Please try again.');
    }
  };

  const tools = [
    {
      id: 'chat',
      name: 'Chat Creation',
      icon: Bot,
      color: 'from-red-600 to-red-800',
      bgColor: 'bg-red-600/10',
      borderColor: 'border-red-600/20'
    },
    {
      id: 'image',
      name: 'Image Creation',
      icon: Image,
      color: 'from-red-700 to-red-900',
      bgColor: 'bg-red-700/10',
      borderColor: 'border-red-700/20'
    },
    {
      id: 'video',
      name: 'Video Creation',
      icon: Video,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    {
      id: 'avatar',
      name: 'Avatar Creation',
      icon: User,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20'
    },
    {
      id: 'avatarVideo',
      name: 'Video Creation with Avatars',
      icon: Film,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20'
    },
    {
      id: 'apiTest',
      name: 'API Test',
      icon: TestTube,
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20'
    },
  ];

  const getToolDisplayName = (toolId) => {
    const tool = tools.find(t => t.id === toolId);
    return tool ? tool.name : toolId;
  };

  // Get chats in backend order, combining server chats with local chats
  const getChatsInBackendOrder = (toolId) => {
    if (!serverChats || serverChats.length === 0) {
      return chatHistories[toolId] || [];
    }

    // Map server chatType to toolId
    const chatTypeMap = {
      'text': 'chat',
      'image': 'image',
      'avatar': 'avatar',
      'video': 'video',
      'avatarVideo': 'avatarVideo'
    };

    // Get server chats for this tool
    const serverChatType = Object.keys(chatTypeMap).find(type => chatTypeMap[type] === toolId);
    if (!serverChatType) {
      return chatHistories[toolId] || [];
    }

    const serverChatsForTool = serverChats
      .filter(chat => chat.chatType === serverChatType)
      .sort((a, b) => new Date(b.createdAt || b.updatedAt) - new Date(a.createdAt || a.updatedAt)); // Most recent first

    // Get local chats that don't have serverId (new chats not yet saved)
    const localChats = (chatHistories[toolId] || []).filter(chat => !chat.serverId);

    // Get local chats that have serverId but might not be in serverChats yet (transition state)
    const localChatsWithServerId = (chatHistories[toolId] || []).filter(chat => 
      chat.serverId && !serverChatsForTool.find(serverChat => serverChat._id === chat.serverId)
    );

    // Create a set of server IDs to avoid duplicates
    const serverIds = new Set(serverChatsForTool.map(chat => chat._id));
    
    // Filter out local chats that already have their serverId represented in serverChats
    const filteredLocalChatsWithServerId = localChatsWithServerId.filter(chat => 
      !serverIds.has(chat.serverId)
    );

    // Combine: server chats first (in backend order), then local chats with serverId, then local chats
    const combinedChats = [
      ...serverChatsForTool.map(serverChat => ({
        id: `server-${serverChat._id}`, // Use server ID as local ID
        serverId: serverChat._id,
        title: serverChat.title,
        timestamp: new Date(serverChat.createdAt || serverChat.updatedAt).getTime(),
        createdAt: serverChat.createdAt, // Preserve createdAt for sorting
        messages: [] // Will be loaded when selected
      })),
      ...filteredLocalChatsWithServerId, // Include local chats that have serverId but aren't in serverChats yet
      ...localChats
    ];

    // Sort the combined chats by createdAt/timestamp (newest first) to maintain consistent order
    const sortedChats = combinedChats.sort((a, b) => {
      // Use createdAt if available, otherwise fall back to timestamp
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : a.timestamp;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : b.timestamp;
      return bTime - aTime; // Newest first
    });

    // Debug: Log the combined chats to identify duplicates
    if (toolId === 'chat' && sortedChats.length > 0) {
      console.log(`[Sidebar Debug] Combined chats for ${toolId}:`, {
        serverChatsCount: serverChatsForTool.length,
        localChatsWithServerIdCount: filteredLocalChatsWithServerId.length,
        localChatsCount: localChats.length,
        totalCombined: sortedChats.length,
        combinedChats: sortedChats.map(chat => ({
          id: chat.id,
          title: chat.title,
          serverId: chat.serverId,
          timestamp: chat.timestamp,
          createdAt: chat.createdAt
        }))
      });
    }

    return sortedChats;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = (now - date) / (1000 * 60);
    const diffInHours = diffInMinutes / 60;
    const diffInDays = diffInHours / 24;
    
    // Show actual time for recent chats (less than 1 hour)
    if (diffInMinutes < 60) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Show time and date for today
    if (diffInDays < 1) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Show date and time for this week
    if (diffInDays < 7) {
      return date.toLocaleDateString([], { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Show full date and time for older chats
    return date.toLocaleDateString([], { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`w-80 border-r border-gray-800/50 flex flex-col sticky top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto themed-scrollbar ${
      isDark ? 'bg-black' : 'bg-red-900/20'
    }`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDark ? 'border-gray-800/50' : 'border-red-800/50'}`}>
        <h2 className={`text-xl font-bold bg-clip-text text-transparent ${
          isDark 
            ? 'bg-gradient-to-r from-red-500 to-rose-500' 
            : 'bg-gradient-to-r from-red-300 to-red-100'
        }`}>
          AI Studio
        </h2>
        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-red-200'}`}>Choose your creative tool</p>
      </div>

      {/* Chat History Section */}
      <div className="flex-1">
        <div className="p-4">
          {/* Subscribe button */}
          <button
            onClick={handleSubscribe}
            id="subscribe-btn"
            disabled={isCheckingSubscription || subscriptionStatus === 'active'}
            className={`w-full mb-4 flex items-center justify-center gap-2 rounded-xl font-medium py-3 transition-colors ${
              subscriptionStatus === 'active' 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white cursor-not-allowed' 
                : subscriptionStatus === 'trial'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600'
                : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-600 hover:to-yellow-600'
            } ${isCheckingSubscription ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Crown className="w-5 h-5" />
            {isCheckingSubscription 
              ? 'Checking...' 
              : subscriptionStatus === 'active' 
              ? 'Subscribed' 
              : subscriptionStatus === 'trial'
              ? 'Trial Active'
              : 'Subscribe / Start Trial'
            }
          </button>

          {/* Explore button */}
          <button
            onClick={() => onToolSelect('explore')}
            className={`w-3/4 mb-3 flex items-center gap-2 p-2 rounded-lg transition-all duration-200 ${
              activeTool === 'explore'
                ? 'text-purple-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm font-medium">Explore</span>
          </button>

          {/* Gallery button */}
          <button
            onClick={() => onToolSelect('gallery')}
            className={`w-3/4 mb-3 flex items-center gap-2 p-2 rounded-lg transition-all duration-200 ${
              activeTool === 'gallery'
                ? 'text-cyan-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Images className="w-4 h-4" />
            <span className="text-sm font-medium">Image Gallery</span>
          </button>

          {/* Avatars Gallery button */}
          <button
            onClick={() => onToolSelect('avatarsGallery')}
            className={`w-3/4 mb-3 flex items-center gap-2 p-2 rounded-lg transition-all duration-200 ${
              activeTool === 'avatarsGallery'
                ? 'text-green-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span className="text-sm font-medium">Avatars Gallery</span>
          </button>


          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat History
            </h3>
            <button
              onClick={onCreateNewChat}
              className="p-1.5 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
            >
              <Plus className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Chat Histories by Tool */}
          {tools.map((tool) => {
            const history = getChatsInBackendOrder(tool.id);
            if (history.length === 0) return null;

            return (
              <div key={tool.id} className="mb-6">
                <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <tool.icon className="w-3 h-3" />
                  {tool.name}
                </h4>
                <div className="space-y-1">
                  {history.map((chat, index) => (
                    <motion.div
                      key={chat.id}
                      className="w-full p-3 rounded-lg bg-gray-800/30 hover:bg-gray-700/40 transition-all duration-200 group flex items-start gap-2"
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <button
                        onClick={() => onChatSelect(tool.id, chat.id)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-200 truncate">
                              {chat.title || `Chat ${index + 1}`}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(chat.timestamp)}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
                        </div>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteChat?.(tool.id, chat.id, chat.serverId); }}
                        className="p-2 rounded-md bg-gray-800/60 hover:bg-gray-700/70 text-gray-400 hover:text-red-400"
                        title="Delete chat"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}

          {Object.values(chatHistories).every(history => history.length === 0) && (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No chat history yet</p>
              <p className="text-gray-600 text-xs mt-1">Start a conversation below</p>
            </div>
          )}

        </div>
      </div>

      {/* AI Tools - Collapsible */}
      <div className="p-4 border-t border-gray-800/50">
        <div 
          className="group relative"
          onMouseEnter={(e) => {
            const panel = e.currentTarget.querySelector('.tools-panel');
            if (panel) {
              panel.style.opacity = '1';
              panel.style.height = 'auto';
              panel.style.pointerEvents = 'auto';
            }
          }}
          onMouseLeave={(e) => {
            const panel = e.currentTarget.querySelector('.tools-panel');
            if (panel) {
              panel.style.opacity = '0';
              panel.style.height = '0';
              panel.style.pointerEvents = 'none';
            }
          }}
        >
          {/* Static Tab */}
          <motion.div
            className="w-full p-4 rounded-xl bg-gradient-to-r from-red-600/20 to-red-800/20 border border-red-600/30 hover:from-red-600/30 hover:to-red-800/30 transition-all duration-300 cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={(e) => {
              e.stopPropagation();
              const panel = e.currentTarget.parentElement.querySelector('.tools-panel');
              if (panel) {
                const isVisible = panel.style.opacity === '1';
                if (isVisible) {
                  panel.style.opacity = '0';
                  panel.style.height = '0';
                  panel.style.pointerEvents = 'none';
                } else {
                  panel.style.opacity = '1';
                  panel.style.height = 'auto';
                  panel.style.pointerEvents = 'auto';
                }
              }
            }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-red-600 to-red-800">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-white">AI Tools</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-300">
                    {activeTool ? `${tools.find(t => t.id === activeTool)?.name || 'AI Tool'} selected` : '6 tools available'}
                  </p>
                  <motion.div
                    className="flex -space-x-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {tools.slice(0, 3).map((tool, index) => {
                      const Icon = tool.icon;
                      const isActive = activeTool === tool.id;
                      return (
                        <motion.div
                          key={tool.id}
                          className={`w-6 h-6 rounded-full flex items-center justify-center border relative ${
                            isActive 
                              ? `bg-gradient-to-r ${tool.color} border-white/50 shadow-lg` 
                              : 'bg-gray-700/50 border-gray-600'
                          }`}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ 
                            scale: isActive ? 1.1 : 1, 
                            rotate: 0,
                            boxShadow: isActive ? `0 0 20px ${tool.color.split('-')[1] === 'indigo' ? '#6366f1' : tool.color.split('-')[1] === 'purple' ? '#a855f7' : '#ef4444'}` : 'none'
                          }}
                          transition={{ delay: 0.8 + index * 0.1, duration: 0.3 }}
                        >
                          <Icon className={`w-3 h-3 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                          {isActive && (
                            <motion.div
                              className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-rose-500 border-2 border-gray-900"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.2 }}
                            />
                          )}
                        </motion.div>
                      );
                    })}
                    <motion.div
                      className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                        activeTool && !tools.slice(0, 3).find(t => t.id === activeTool)
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 border-white/50'
                          : 'bg-gray-600/50 border-gray-500'
                      }`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.2, duration: 0.3 }}
                    >
                      <span className={`text-xs ${activeTool && !tools.slice(0, 3).find(t => t.id === activeTool) ? 'text-white' : 'text-gray-300'}`}>
                        {activeTool && !tools.slice(0, 3).find(t => t.id === activeTool) ? '!' : '+3'}
                      </span>
                    </motion.div>
                  </motion.div>
                </div>
              </div>
              <motion.div
                className="flex flex-col items-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
              >
                <motion.div
                  className="w-2 h-2 rounded-full bg-gradient-to-r from-red-500 to-rose-500"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="w-1 h-1 rounded-full bg-gray-500"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                />
                <motion.div
                  className="w-1 h-1 rounded-full bg-gray-600"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: 1 }}
                />
              </motion.div>
            </div>
          </motion.div>

          {/* Expandable Tools Panel */}
          <div
            className="tools-panel absolute bottom-full left-0 right-0 mb-2 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-50 transition-all duration-300"
            style={{ 
              opacity: 0,
              height: 0,
              pointerEvents: 'none'
            }}
          >
            <div className="p-2 space-y-1">
              {tools.map((tool, index) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            
            return (
              <motion.button
                key={tool.id}
                    onClick={() => {
                      onToolSelect(tool.id);
                      // Close the panel after selection
                      const panel = document.querySelector('.tools-panel');
                      if (panel) {
                        panel.style.opacity = '0';
                        panel.style.height = '0';
                        panel.style.pointerEvents = 'none';
                      }
                    }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ 
                      opacity: 1, 
                      x: 0,
                      transition: { delay: index * 0.05, duration: 0.2 }
                    }}
                    whileHover={{ 
                      scale: 1.02,
                      transition: { duration: 0.2 }
                    }}
                    className={`w-full p-3 rounded-lg transition-all duration-200 flex items-center gap-3 group ${
                  isActive 
                        ? `${tool.bgColor} ${tool.borderColor} border shadow-lg` 
                        : 'bg-gray-800/50 hover:bg-gray-700/60 border border-transparent'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                    <div className={`p-1.5 rounded-md ${
                  isActive 
                    ? `bg-gradient-to-r ${tool.color} text-white` 
                    : 'bg-gray-700/50 text-gray-400 group-hover:text-gray-200'
                    } transition-all duration-200`}>
                      <Icon className="w-4 h-4" />
                </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className={`text-sm font-medium truncate ${
                    isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'
                  } transition-colors`}>
                    {tool.name}
                  </p>
                      <p className={`text-xs truncate ${
                    isActive ? 'text-gray-200' : 'text-gray-500 group-hover:text-gray-300'
                  } transition-colors`}>
                    {tool.id === 'chat' && 'Chat with AI LLM model'}
                    {tool.id === 'image' && 'Generate AI images from text'}
                    {tool.id === 'video' && 'Create AI-powered videos'}
                    {tool.id === 'avatar' && 'Design custom avatars'}
                    {tool.id === 'avatarVideo' && 'Combine avatars with video'}
                    {tool.id === 'apiTest' && 'Test LLM API connection'}
                  </p>
                </div>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                        className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-red-500 to-rose-500"
                  />
                )}
              </motion.button>
            );
          })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;



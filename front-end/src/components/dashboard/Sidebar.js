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
  Images,
  PlayCircle,
  Search,
  BookOpen,
  DollarSign,
  Compass,
  PanelLeftClose,
  Share2
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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const v = safeLocalStorage.getItem('sidebarCollapsed');
      return v === 'true';
    } catch (_) { return false; }
  });
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

  // Sync CSS variable for sidebar width
  useEffect(() => {
    const width = isCollapsed ? '4rem' : '16rem';
    try { document.documentElement.style.setProperty('--sidebar-w', width); } catch (_) {}
  }, [isCollapsed]);

  // Keyboard shortcut: Ctrl/Cmd + B to toggle collapse
  useEffect(() => {
    const onKeyDown = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (isCtrlOrCmd && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        const next = !isCollapsed;
        setIsCollapsed(next);
        try { safeLocalStorage.setItem('sidebarCollapsed', String(next)); } catch (_) {}
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCollapsed]);

  // Check subscription status on component mount
  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const loadPhylloScript = () => new Promise((resolve, reject) => {
    if (window.PhylloConnect) return resolve();
    const existing = document.getElementById('phyllo-connect-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }
    const script = document.createElement('script');
    script.id = 'phyllo-connect-script';
    script.src = (process.env.REACT_APP_PHYLLO_CONNECT_URL || 'https://cdn.getphyllo.com/connect/v2/phyllo-connect.js');
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.body.appendChild(script);
  });

  const ensurePhylloUser = async () => {
    const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    const token = safeLocalStorage.getItem('token');
    if (!token) throw new Error('Please log in first');
    let phylloUserId = safeLocalStorage.getItem('phylloUserId');
    if (phylloUserId) return phylloUserId;

    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || (user?.username || 'User');
    const externalId = user?._id || user?.email || user?.username;
    const res = await fetch(`${apiBase}/api/phyllo/users`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // Auth header optional; endpoint is public now
      },
      body: JSON.stringify({ name, externalId })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Not authenticated. Please log in again.');
      }
      const apiMsg = body?.message || body?.error || `${res.status}`;
      throw new Error(typeof apiMsg === 'string' ? apiMsg : JSON.stringify(apiMsg));
    }
    phylloUserId = body?.user?.id || body?.user?._id || body?.id;
    if (!phylloUserId) throw new Error('Invalid Phyllo user response');
    try { safeLocalStorage.setItem('phylloUserId', phylloUserId); } catch(_) {}
    return phylloUserId;
  };

  const startPhylloConnect = async () => {
    try {
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      console.log('apiBase ->', apiBase, 'env ->', process.env.REACT_APP_PHYLLO_ENV);
      const phylloUserId = await ensurePhylloUser();
      const tokenRes = await fetch(`${apiBase}/api/phyllo/sdk-token`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Auth header optional; endpoint is public now
        },
        body: JSON.stringify({ userId: phylloUserId })
      });
      if (!tokenRes.ok) throw new Error('Failed to get Phyllo SDK token');
      const tokenBody = await tokenRes.json();
      if (!tokenRes.ok) {
        if (tokenRes.status === 401) {
          throw new Error('Not authenticated. Please log in again.');
        }
      }
      const connectToken = tokenBody?.token?.sdk_token || tokenBody?.token?.token || tokenBody?.sdk_token;
      if (!connectToken) throw new Error('Invalid SDK token response');

      await loadPhylloScript();
      if (!window.PhylloConnect) throw new Error('Phyllo Connect SDK not available');

      const pc = window.PhylloConnect.initialize({
        token: connectToken,
        environment: (process.env.REACT_APP_PHYLLO_ENV || 'production'),
        onAccountConnected: (account) => {
          try { (window.__toast?.push||(()=>{}))({ message: 'Account connected', type: 'success' }); } catch(_) {}
          console.log('Phyllo account connected:', account);
        },
        onExit: (info) => {
          console.log('Phyllo Connect exited:', info);
        },
        onEvent: (event) => {
          console.log('Phyllo event:', event);
        }
      });
      pc.open();
    } catch (e) {
      console.error('Phyllo Connect error:', e);
      try { (window.__toast?.push||(()=>{}))({ message: e?.message || 'Failed to start Connect', type: 'error' }); } catch(_) {}
    }
  };

  const handleSubscribe = async () => {
    try {
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const token = safeLocalStorage.getItem('token');
      if (!token) {
        try { (window.__toast?.push || (()=>{}))({ message: 'Please log in first.', type: 'warning' }); } catch(_) {}
        return;
      }

      // Verify token by fetching profile
      const profRes = await fetch(`${apiBase}/api/users/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const profJson = await profRes.json().catch(() => ({}));
      if (!profRes.ok) {
        try { (window.__toast?.push || (()=>{}))({ message: 'Authentication invalid. Please log in again.', type: 'error' }); } catch(_) {}
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
        try { (window.__toast?.push || (()=>{}))({ message: 'Trial started successfully!', type: 'success' }); } catch(_) {}
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
        try { (window.__toast?.push || (()=>{}))({ message: `Subscription failed: ${upgradeRes.status}${err?.message ? ` - ${err.message}` : ''}`, type: 'error' }); } catch(_) {}
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
      try { (window.__toast?.push || (()=>{}))({ message: 'Subscription upgraded successfully!', type: 'success' }); } catch(_) {}
    } catch (error) {
      console.error('Subscribe error:', error);
      try { (window.__toast?.push || (()=>{}))({ message: 'Subscription failed. Please try again.', type: 'error' }); } catch(_) {}
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
    <motion.div
      animate={{ width: isCollapsed ? 64 : 256 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      style={{ width: 'var(--sidebar-w, 16rem)' }}
      className={`${
      isDark ? 'bg-black' : 'bg-red-900/20'
      } border-r border-gray-800/50 flex flex-col sticky top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto themed-scrollbar`}
    >
      {/* Header removed per request */}

      {/* Collapsed top expand button */}
      {isCollapsed && (
        <div className="p-3 sticky top-0 z-20 bg-black border-b border-red-600/40">
          <button
            onClick={() => {
              const next = !isCollapsed;
              setIsCollapsed(next);
              try { safeLocalStorage.setItem('sidebarCollapsed', String(next)); } catch (_) {}
            }}
            className="ui-icon-btn"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftClose className="w-4 h-4 rotate-180" />
          </button>
        </div>
      )}

      {/* Essentials (sticky) */}
      {!isCollapsed && (
        <div className="px-3 md:px-4 py-1 sticky top-0 z-20 bg-black border-b border-red-600/40">
          <div className="flex items-center justify-end mb-2">
            <button onClick={() => setIsCollapsed(true)} className="ui-icon-btn" title="Collapse sidebar"><PanelLeftClose className="w-4 h-4"/></button>
          </div>
          <div className="space-y-1">
            <button onClick={() => onCreateNewChat('chat')} className="ui-row" title="New chat"><Plus className="w-4 h-4"/> New chat</button>
            <button onClick={() => onToolSelect('image')} className="ui-row"><Image className="w-4 h-4"/> Image Creation</button>
            <button onClick={() => onToolSelect('video')} className="ui-row"><Video className="w-4 h-4"/> Video Creation</button>
            <button onClick={() => onToolSelect('avatar')} className="ui-row"><User className="w-4 h-4"/> Avatar Creation</button>
            <button onClick={() => onToolSelect('explore')} className="ui-row"><Compass className="w-4 h-4"/> Explore</button>
          </div>
        </div>
      )}

      {/* Secondary shortcuts under sticky (non-sticky) */}
      {!isCollapsed && (
        <div className="px-3 md:px-4 pb-2 pt-1">
          <div className="space-y-1">
            <button onClick={() => onToolSelect('gallery')} className="ui-row"><Images className="w-4 h-4"/> Image Gallery</button>
            <button onClick={() => onToolSelect('avatarsGallery')} className="ui-row"><User className="w-4 h-4"/> Avatars Gallery</button>
            <button onClick={() => onToolSelect('videoGallery')} className="ui-row"><PlayCircle className="w-4 h-4"/> My Videos</button>
            <button onClick={() => onToolSelect('currency')} className="ui-row"><DollarSign className="w-4 h-4"/> Currency</button>
            <button onClick={() => { try { (window.__toast?.push||(()=>{}))({ message: 'Press Ctrl/Cmd+K to search chats', type: 'info' }); } catch(_) {} }} className="ui-row"><Search className="w-4 h-4"/> Search chats</button>
            <button onClick={() => onToolSelect('explore')} className="ui-row"><BookOpen className="w-4 h-4"/> Library</button>
            <button onClick={startPhylloConnect} className="ui-row"><Share2 className="w-4 h-4"/> Connect Socials</button>
          </div>
        </div>
      )}

      {/* Chat History Section (GPT-like) */}
      <div className={`flex-1 ${isCollapsed ? 'overflow-hidden' : ''}`}>
        <div className={`p-2 md:p-4 pt-2 transition-opacity ${isCollapsed ? 'opacity-0 pointer-events-none select-none' : 'opacity-100'}`}>
          <div className="text-xs text-gray-400 mb-2">Chats</div>

          {/* Chat Histories by Tool */}
          {tools.filter(t=>['chat','image','video','avatar','avatarVideo'].includes(t.id)).map((tool) => {
            const history = getChatsInBackendOrder(tool.id);
            if (history.length === 0) return null;

            return (
              <div key={tool.id} className="mb-6">
                <h4 className="text-[10px] uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-2">
                  <tool.icon className="w-3 h-3" />
                  {tool.name}
                </h4>
                <div className="space-y-1">
                  {history.map((chat, index) => (
                    <motion.div
                      key={chat.id}
                      className="w-full p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-150 group flex items-start gap-2"
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <button
                        onClick={() => onChatSelect(tool.id, chat.id)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-200 truncate" title={chat.title || `Chat ${index + 1}`}>
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

      {/* Footer profile (minimal) */}
      <div className="px-3 md:px-4 py-3 border-t border-gray-800/50 mt-auto">
        <div className="w-full flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm text-white truncate">{user?.firstName || user?.email?.split('@')[0] || 'User'}</p>
            <p className="text-xs text-gray-400 truncate">{subscriptionStatus === 'active' ? 'Pro Plan' : subscriptionStatus === 'trial' ? 'Trial' : 'Free'}</p>
          </div>
          <button onClick={handleSubscribe} id="subscribe-btn" className="ui-icon-btn" title="Manage plan"><Crown className="w-4 h-4"/></button>
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;



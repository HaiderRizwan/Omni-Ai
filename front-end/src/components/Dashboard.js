import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Bell, Settings } from 'lucide-react';
import Sidebar from './dashboard/Sidebar';
import MainPanel from './dashboard/MainPanel';
import AvatarGallery from './dashboard/tools/Avatarsgallery';
import TopNavbar from './dashboard/TopNavbar';
import SettingsPage from './dashboard/SettingsPage';
import { useAllChatHistories, chatHistoryManager } from './dashboard/ChatHistory';
import safeLocalStorage from '../utils/localStorage';

function Dashboard({ user, onLogout }) {
  const [currentUser, setCurrentUser] = useState(user);
  const [activeTool, setActiveTool] = useState('chat');
  const [currentChat, setCurrentChat] = useState(null);
  const { allHistories, refreshHistories } = useAllChatHistories();
  const [serverChats, setServerChats] = useState([]);
  const [isUpdatingChat, setIsUpdatingChat] = useState(false);
  const [showAvatarGallery, setShowAvatarGallery] = useState(false);
  const [avatarCollection, setAvatarCollection] = useState([]);
  const [showSettings, setShowSettings] = useState(false);

  // Handler for adding avatars to collection
  const handleAddToCollection = (avatar, isAdded) => {
    if (isAdded) {
      setAvatarCollection(prev => [...prev, avatar]);
    } else {
      setAvatarCollection(prev => prev.filter(a => a._id !== avatar._id));
    }
  };

  // Handler for settings
  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  // Handler for going back from settings
  const handleBackFromSettings = () => {
    setShowSettings(false);
  };

  // Handler for updating user data
  const handleUserUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
    // Also update localStorage
    safeLocalStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // Function to load user's avatars
  const loadUserAvatars = async () => {
    try {
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const token = safeLocalStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${apiBase}/api/avatars`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json?.success && Array.isArray(json.data.avatars)) {
        setAvatarCollection(json.data.avatars);
      }
    } catch (error) {
      console.error('[Dashboard] Error loading user avatars:', error);
    }
  };

  // Function to load server chats
  const loadServerChats = async () => {
    try {
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const token = safeLocalStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${apiBase}/api/chat`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        // Sort chats by createdAt (newest first) to match backend order
        const sortedChats = json.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        console.log('[Dashboard] Refreshing server chats:', sortedChats.length, 'chats');
        setServerChats(sortedChats);
      }
    } catch (error) {
      console.error('[Dashboard] Error loading server chats:', error);
    }
  };

  // Load server chats on mount
  useEffect(() => {
    loadServerChats();
    loadUserAvatars();
  }, []);

  // Reconcile server chats into local cache so sidebar shows them
  // Filter chats by type and add them to the correct tool history
  useEffect(() => {
    if (!serverChats || serverChats.length === 0 || isUpdatingChat) return;
    try {
      let mutated = false;
      
      // Process each chat type separately
      const chatTypes = {
        'text': 'chat',
        'image': 'image',
        'avatar': 'avatar',
        'video': 'video',
        'avatarVideo': 'avatarVideo'
      };
      
      Object.entries(chatTypes).forEach(([serverType, toolId]) => {
        const chatsOfType = serverChats.filter(c => c.chatType === serverType);
        if (chatsOfType.length === 0) return;
        
        // Get current histories directly from chatHistoryManager to avoid stale state
        const existing = chatHistoryManager.getHistory(toolId);
        const byServerId = new Map(existing.filter(c => c.serverId).map(c => [c.serverId, c]));
        
        chatsOfType.forEach(c => {
          const sid = c._id;
          if (!byServerId.has(sid)) {
            // Check if there's a local chat without serverId that might be the same chat
            const localChatWithoutServerId = existing.find(localChat => 
              !localChat.serverId && 
              localChat.title === c.title &&
              Math.abs(new Date(localChat.timestamp).getTime() - new Date(c.createdAt || Date.now()).getTime()) < 60000 // Within 1 minute
            );
            
            if (localChatWithoutServerId) {
              // Update the existing local chat with serverId instead of creating a new one
              console.log(`[Reconciliation] Updating existing local chat with serverId: ${sid} (${serverType})`, {
                localChatId: localChatWithoutServerId.id,
                localChatTitle: localChatWithoutServerId.title,
                serverChatTitle: c.title
              });
              chatHistoryManager.updateChat(toolId, localChatWithoutServerId.id, {
                serverId: sid,
                title: c.title || localChatWithoutServerId.title
              });
              mutated = true;
            } else {
              // Create a new chat entry
              console.log(`[Reconciliation] Adding new server chat to local history: ${sid} (${serverType})`, {
                title: c.title,
                timestamp: new Date(c.createdAt || Date.now()).getTime()
              });
              chatHistoryManager.addChat(toolId, {
                title: c.title || 'New Chat',
                messages: [],
                serverId: sid,
                timestamp: new Date(c.createdAt || Date.now()).getTime()
              });
              mutated = true;
            }
          } else {
            console.log(`Server chat already exists in local history: ${sid} (${serverType})`);
          }
        });
      });
      
      if (mutated) {
        console.log('Reconciliation mutated, refreshing histories');
        refreshHistories();
      }
    } catch (error) {
      console.error('Reconciliation error:', error);
    }
  }, [serverChats, refreshHistories, isUpdatingChat]);

  // Initialize with first tool selected, but do not override an existing selection
  useEffect(() => {
    if (!currentChat) {
      // Don't automatically load the first chat - let user choose
      setCurrentChat(null);
    }
  }, [activeTool, allHistories, currentChat]);

  const handleToolSelect = (toolId) => {
    setActiveTool(toolId);
    // Don't automatically load a chat - let user choose
    setCurrentChat(null);
  };

  const handleChatSelect = async (toolId, chatId) => {
    console.log(`Chat selected: ${toolId}/${chatId}`);
    
    // Handle server chat IDs (format: server-${serverId})
    let serverId = null;
    let local = null;
    
    if (chatId.startsWith('server-')) {
      serverId = chatId.replace('server-', '');
      console.log(`Server chat selected: ${serverId}`);
    } else {
      local = chatHistoryManager.getChat(toolId, chatId);
      console.log('Local chat found:', local);
      serverId = local?.serverId || local?._id;
    }
    
    setActiveTool(toolId);

    // If this chat maps to a server id, fetch full messages
    if (serverId) {
      console.log(`Fetching server chat: ${serverId}`);
      setIsUpdatingChat(true); // Prevent reconciliation during update
      try {
        const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const token = safeLocalStorage.getItem('token');
        const res = await fetch(`${apiBase}/api/chat/${serverId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          const serverChat = json?.data;
          if (serverChat) {
            console.log('Server chat loaded:', serverChat);
            const mapped = {
              id: chatId, // Keep the original chatId
              serverId: serverChat._id,
              title: serverChat.title,
              messages: (serverChat.messages || []).map(m => ({
                type: m.role === 'user' ? 'user' : 'assistant',
                content: m.content,
                image: m.image, // Preserve image field
                avatar: m.avatar, // Preserve avatar field
                imageId: m.imageId, // Preserve imageId field
                timestamp: new Date(m.timestamp || serverChat.createdAt || Date.now())
              }))
            };
            setCurrentChat(mapped);
            
            // Only update local storage if this was a local chat
            if (local) {
            chatHistoryManager.updateChat(toolId, local.id, mapped);
            }
            
            console.log('Updated chat with server data');
            return;
          }
        }
      } catch (error) {
        console.error('Error fetching server chat:', error);
      } finally {
        setIsUpdatingChat(false); // Re-enable reconciliation
      }
    }
    
    // Fallback to local chat
    if (local) {
    setCurrentChat(local);
    } else {
      setCurrentChat(null);
    }
  };

  const handleDeleteChat = async (toolId, chatId, serverId) => {
    try {
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const token = safeLocalStorage.getItem('token');
      
      // Handle server chat IDs
      let actualServerId = serverId;
      if (chatId.startsWith('server-')) {
        actualServerId = chatId.replace('server-', '');
      }
      
      if (actualServerId) {
        const res = await fetch(`${apiBase}/api/chat/${actualServerId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          alert(`Failed to delete on server: ${res.status}${txt ? ` - ${txt}` : ''}`);
        } else {
          // Ensure the deleted server chat is removed from serverChats state to prevent reconciliation from re-adding it locally
          setServerChats(prev => (Array.isArray(prev) ? prev.filter(c => c && c._id !== actualServerId) : prev));
        }
      }
    } catch (e) {
      console.error('Delete chat error:', e);
    } finally {
      // Only delete from local storage if it's not a server chat
      if (!chatId.startsWith('server-')) {
      chatHistoryManager.deleteChat(toolId, chatId);
      }
      refreshHistories();
      if (currentChat?.id === chatId) {
        setCurrentChat(null);
      }
    }
  };

  const handleNewChat = async () => {
    // Check if current chat is empty (no messages and no serverId)
    const isCurrentChatEmpty = currentChat && 
      (!currentChat.messages || currentChat.messages.length === 0) && 
      !currentChat.serverId;
    
    // If current chat is empty, don't create a new one
    if (isCurrentChatEmpty) {
      return currentChat;
    }
    
    // Create a local-only chat without backend API call
    // Backend chat will be created when user sends first message
      const newChat = chatHistoryManager.addChat(activeTool, {
        title: `New ${activeTool} Chat`,
      messages: [],
      serverId: null // No server ID until first message is sent
      });
    
      setCurrentChat(newChat);
      refreshHistories();
      return newChat;
  };

  const handleChatUpdate = (updates) => {
    console.log('=== CHAT UPDATE DEBUG ===');
    console.log('Current chat:', currentChat);
    console.log('Updates:', updates);
    console.log('========================');
    
    if (currentChat) {
      // Update existing chat
      const updatedChat = { ...currentChat, ...updates };
      chatHistoryManager.updateChat(activeTool, currentChat.id, updates);
      setCurrentChat(updatedChat);
      refreshHistories();
      
      console.log('Updated chat:', updatedChat);
      
      // If the chat got a serverId, refresh server chats to ensure latest data
      if (updates.serverId && !currentChat.serverId) {
        console.log('Chat got serverId, refreshing server chats');
        console.log('Previous serverId:', currentChat.serverId);
        console.log('New serverId:', updates.serverId);
        // Refresh server chats from backend to get the latest data
        loadServerChats();
      }
    } else if (updates.serverId) {
      // Create new chat when there's no currentChat but we have a serverId
      const newChat = {
        id: updates.id || Date.now().toString(),
        serverId: updates.serverId,
        title: updates.title || 'New Chat',
        messages: updates.messages || [],
        timestamp: Date.now()
      };
      
      console.log('Creating new chat with serverId:', newChat);
      
      // Add to local history
      chatHistoryManager.addChat(activeTool, newChat);
      setCurrentChat(newChat);
      refreshHistories();
      
      // Refresh server chats to ensure latest data
      loadServerChats();
    }
  };


  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white flex">
      {/* Top Navigation Bar */}
      <TopNavbar user={currentUser} onLogout={onLogout} onSettingsClick={handleSettingsClick} />

      {/* Main Layout */}
      <div className="flex-1 flex pt-16 min-h-0">
        {/* Sidebar */}
        <Sidebar
          activeTool={activeTool}
          onToolSelect={handleToolSelect}
          chatHistories={allHistories}
          serverChats={serverChats}
          onChatSelect={handleChatSelect}
          onCreateNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          user={currentUser}
          onUserUpdate={handleUserUpdate}
        />

        {/* Main Panel */}
        <MainPanel
          activeTool={activeTool}
          currentChat={currentChat}
          onChatUpdate={handleChatUpdate}
          onNewChat={handleNewChat}
          avatarCollection={avatarCollection}
          setAvatarCollection={setAvatarCollection}
        />

      </div>

      {/* Gallery is now handled by MainPanel as a tool */}

      {/* Avatar Gallery */}
      {showAvatarGallery && (
        <AvatarGallery 
          onClose={() => setShowAvatarGallery(false)} 
          onAddToCollection={handleAddToCollection}
        />
      )}

      {/* Settings Modal */}
      <SettingsPage 
        isOpen={showSettings} 
        onClose={handleBackFromSettings}
        user={currentUser}
      />
    </div>
  );
}

export default Dashboard;

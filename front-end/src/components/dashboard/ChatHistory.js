import React, { useState, useEffect, useCallback } from 'react';
import safeLocalStorage from '../../utils/localStorage';

class ChatHistoryManager {
  constructor() {
    this.storageKeys = {
      chat: 'chatChats',
      image: 'imageChats',
      video: 'videoChats',
      avatar: 'avatarChats',
      avatarVideo: 'avatarVideoChats'
    };
  }

  // Get all chat histories
  getAllHistories() {
    const histories = {};
    Object.keys(this.storageKeys).forEach(toolId => {
      histories[toolId] = this.getHistory(toolId);
    });
    return histories;
  }

  // Get chat history for specific tool
  getHistory(toolId) {
    try {
      const stored = safeLocalStorage.getItem(this.storageKeys[toolId]);
      const chats = stored ? JSON.parse(stored) : [];
      // Sort by timestamp (newest first) to maintain consistent order
      return chats.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : a.timestamp;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : b.timestamp;
        return bTime - aTime; // Newest first
      });
    } catch (error) {
      console.error(`Error loading ${toolId} chat history:`, error);
      return [];
    }
  }

  // Save chat history for specific tool
  saveHistory(toolId, chats) {
    try {
      safeLocalStorage.setItem(this.storageKeys[toolId], JSON.stringify(chats));
    } catch (error) {
      console.error(`Error saving ${toolId} chat history:`, error);
    }
  }

  // Add new chat to history
  addChat(toolId, chatData) {
    const history = this.getHistory(toolId);
    const newChat = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      title: chatData.title || `New ${toolId} Chat`,
      messages: chatData.messages || [],
      createdAt: chatData.createdAt || new Date().toISOString(), // Preserve createdAt if provided
      ...chatData
    };
    
    const updatedHistory = [newChat, ...history].slice(0, 50); // Keep last 50 chats
    this.saveHistory(toolId, updatedHistory);
    return newChat;
  }

  // Update existing chat
  updateChat(toolId, chatId, updates) {
    const history = this.getHistory(toolId);
    const updatedHistory = history.map(chat => 
      chat.id === chatId ? { ...chat, ...updates } : chat
    );
    this.saveHistory(toolId, updatedHistory);
  }

  // Delete chat
  deleteChat(toolId, chatId) {
    const history = this.getHistory(toolId);
    const updatedHistory = history.filter(chat => chat.id !== chatId);
    this.saveHistory(toolId, updatedHistory);
  }

  // Get specific chat
  getChat(toolId, chatId) {
    const history = this.getHistory(toolId);
    return history.find(chat => chat.id === chatId);
  }

  // Clear all history for tool
  clearHistory(toolId) {
    this.saveHistory(toolId, []);
  }

  // Clear all histories
  clearAllHistories() {
    Object.keys(this.storageKeys).forEach(toolId => {
      this.clearHistory(toolId);
    });
  }
}

// Create singleton instance
const chatHistoryManager = new ChatHistoryManager();

// Export the manager instance
export { chatHistoryManager };

// React hook for chat history management
export const useChatHistory = (toolId) => {
  const [history, setHistory] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);

  useEffect(() => {
    if (toolId) {
      const toolHistory = chatHistoryManager.getHistory(toolId);
      setHistory(toolHistory);
    }
  }, [toolId]);

  const addChat = (chatData) => {
    const newChat = chatHistoryManager.addChat(toolId, chatData);
    setHistory(prev => [newChat, ...prev]);
    return newChat;
  };

  const updateChat = (chatId, updates) => {
    chatHistoryManager.updateChat(toolId, chatId, updates);
    setHistory(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, ...updates } : chat
    ));
    
    if (currentChat && currentChat.id === chatId) {
      setCurrentChat(prev => ({ ...prev, ...updates }));
    }
  };

  const deleteChat = (chatId) => {
    chatHistoryManager.deleteChat(toolId, chatId);
    setHistory(prev => prev.filter(chat => chat.id !== chatId));
    
    if (currentChat && currentChat.id === chatId) {
      setCurrentChat(null);
    }
  };

  const loadChat = (chatId) => {
    const chat = chatHistoryManager.getChat(toolId, chatId);
    setCurrentChat(chat);
    return chat;
  };

  const clearHistory = () => {
    chatHistoryManager.clearHistory(toolId);
    setHistory([]);
    setCurrentChat(null);
  };

  return {
    history,
    currentChat,
    addChat,
    updateChat,
    deleteChat,
    loadChat,
    clearHistory
  };
};

// Hook for managing all chat histories
export const useAllChatHistories = () => {
  const [allHistories, setAllHistories] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const histories = chatHistoryManager.getAllHistories();
    setAllHistories(histories);
  }, [refreshTrigger]);

  const refreshHistories = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return {
    allHistories,
    refreshHistories
  };
};

export default chatHistoryManager;

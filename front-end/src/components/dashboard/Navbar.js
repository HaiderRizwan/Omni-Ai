import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Settings, 
  LogOut, 
  Search, 
  HelpCircle, 
  User, 
  ChevronDown,
  Sun,
  Moon,
  Download,
  Upload,
  Share2,
  BookOpen,
  Keyboard,
  Zap,
  AlertCircle,
  CheckCircle,
  X,
  Menu,
  X as CloseIcon
} from 'lucide-react';

const Navbar = ({ user, onLogout, activeTool, allHistories, onToolSelect }) => {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Mock notifications
  useEffect(() => {
    setNotifications([
      { id: 1, type: 'success', message: 'Chat saved successfully', time: '2m ago' },
      { id: 2, type: 'warning', message: 'API usage at 80% of limit', time: '1h ago' },
      { id: 3, type: 'info', message: 'New feature: Image generation available', time: '3h ago' },
    ]);
  }, []);

  // Search functionality
  const searchResults = searchQuery ? Object.values(allHistories)
    .flat()
    .filter(chat => 
      chat.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.messages?.some(msg => 
        msg.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
    .slice(0, 5) : [];

  // Keyboard shortcuts
  const shortcuts = [
    { key: 'Ctrl + N', action: 'New Chat' },
    { key: 'Ctrl + K', action: 'Search' },
    { key: 'Ctrl + /', action: 'Help' },
    { key: 'Ctrl + 1-6', action: 'Switch Tools' },
    { key: 'Esc', action: 'Close Modals' },
  ];

  const handleExport = () => {
    const data = {
      user: user?.email,
      activeTool,
      histories: allHistories,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omni-studio-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            console.log('Imported data:', data);
            try { (window.__toast?.push || (()=>{}))({ message: 'Data imported successfully!', type: 'success' }); } catch(_) {}
          } catch (error) {
            try { (window.__toast?.push || (()=>{}))({ message: 'Invalid file format', type: 'error' }); } catch(_) {}
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Omni Ai',
        text: 'Check out this amazing AI tool!',
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      try { (window.__toast?.push || (()=>{}))({ message: 'Link copied to clipboard!', type: 'success' }); } catch(_) {}
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur">
      <div className="mx-auto max-w-full px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section - Logo & Breadcrumb */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img src="/omnilogo.png" alt="Omni Ai" className="h-8 w-8 rounded-sm object-contain" />
              <span className="text-xl font-bold bg-gradient-to-r from-red-500 via-rose-300 to-white bg-clip-text text-transparent">
                Omni Ai
              </span>
            </div>
            
            {/* Breadcrumb */}
            <div className="hidden md:flex items-center gap-2 text-sm text-white/60">
              <span>Dashboard</span>
              <ChevronDown size={14} className="rotate-[-90deg]" />
              <span className="text-white">{activeTool?.charAt(0).toUpperCase() + activeTool?.slice(1)}</span>
            </div>
          </div>

          {/* Center Section - Search */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" size={16} />
              <input
                type="text"
                placeholder="Search chats, tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearch(true)}
                className="ui-input-sm w-full pl-10 pr-4 py-2"
              />
              
              {/* Search Results Dropdown */}
              <AnimatePresence>
                {showSearch && searchQuery && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-2xl overflow-hidden z-50"
                  >
                    {searchResults.length > 0 ? (
                      searchResults.map((chat) => (
                        <div key={chat.id} className="p-3 hover:bg-gray-800/50 cursor-pointer border-b border-gray-700/50 last:border-b-0">
                          <p className="text-sm text-white truncate" title={chat.title}>{chat.title}</p>
                          <p className="text-xs text-gray-400 mt-1">Chat • {new Date(chat.timestamp).toLocaleDateString()}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-gray-400">No results found</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-2">
            {/* Mobile Search Button */}
            <button
              onClick={() => setShowSearch(true)}
              className="lg:hidden ui-icon-btn"
            >
              <Search size={20} />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative ui-icon-btn"
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-xs text-white rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-gray-700/50">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">Notifications</h3>
                        <button
                          onClick={() => setNotifications([])}
                          className="text-xs text-gray-400 hover:text-white"
                        >
                          Clear all
                        </button>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div key={notification.id} className="p-3 hover:bg-gray-800/50 border-b border-gray-700/50 last:border-b-0">
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              notification.type === 'success' ? 'bg-green-500' :
                              notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                            }`} />
                            <div className="flex-1">
                              <p className="text-sm text-white">{notification.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                            </div>
                            <button
                              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                              className="text-gray-400 hover:text-white"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Help */}
            <button
              onClick={() => setShowHelp(true)}
              className="ui-icon-btn"
            >
              <HelpCircle size={20} />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="ui-icon-btn"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2 ui-icon-btn"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-rose-500 flex items-center justify-center">
                  <User size={16} />
                </div>
                <span className="hidden md:block text-sm">
                  {user?.firstName || user?.email?.split('@')[0] || 'User'}
                </span>
                <ChevronDown size={14} />
              </button>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {showProfileDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-64 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-gray-700/50">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-500 to-rose-500 flex items-center justify-center">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{user?.firstName || 'User'}</p>
                          <p className="text-sm text-gray-400">{user?.email}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-xs text-gray-400">Pro Plan</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="py-2">
                      <button className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800/50 flex items-center gap-3">
                        <User size={16} />
                        Profile Settings
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800/50 flex items-center gap-3">
                        <Settings size={16} />
                        Preferences
                      </button>
                      <button 
                        onClick={handleExport}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800/50 flex items-center gap-3"
                      >
                        <Download size={16} />
                        Export Data
                      </button>
                      <button 
                        onClick={handleImport}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800/50 flex items-center gap-3"
                      >
                        <Upload size={16} />
                        Import Data
                      </button>
                      <button 
                        onClick={handleShare}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800/50 flex items-center gap-3"
                      >
                        <Share2 size={16} />
                        Share
                      </button>
                      <button 
                        onClick={() => setShowKeyboardShortcuts(true)}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800/50 flex items-center gap-3"
                      >
                        <Keyboard size={16} />
                        Shortcuts
                      </button>
                    </div>
                    
                    <div className="border-t border-gray-700/50 py-2">
                      <button
                        onClick={onLogout}
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-800/50 flex items-center gap-3"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Menu */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden ui-icon-btn"
            >
              {showMobileMenu ? <CloseIcon size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-xl border border-gray-700/50 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <HelpCircle size={24} />
                  Help & Support
                </h2>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Getting Started</h3>
                  <div className="space-y-2 text-gray-300">
                    <p>• Select a tool from the sidebar to start creating</p>
                    <p>• Use the search bar to find specific chats</p>
                    <p>• Click the AI Tools tab to switch between different tools</p>
                    <p>• Export your data anytime from the profile menu</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Keyboard Shortcuts</h3>
                  <div className="space-y-2">
                    {shortcuts.map((shortcut, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-b-0">
                        <span className="text-gray-300">{shortcut.action}</span>
                        <kbd className="px-2 py-1 bg-gray-800 rounded text-sm text-gray-300">{shortcut.key}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Support</h3>
                  <div className="space-y-2 text-gray-300">
                    <p>• Email: support@omnistudio.com</p>
                    <p>• Documentation: docs.omnistudio.com</p>
                    <p>• Community: community.omnistudio.com</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showKeyboardShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowKeyboardShortcuts(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-xl border border-gray-700/50 p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <Keyboard size={20} />
                  Keyboard Shortcuts
                </h2>
                <button
                  onClick={() => setShowKeyboardShortcuts(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-3">
                {shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <span className="text-gray-300">{shortcut.action}</span>
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-sm text-gray-300">{shortcut.key}</kbd>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSearch(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-xl border border-gray-700/50 p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <Search className="text-white/40" size={20} />
                <input
                  type="text"
                  placeholder="Search chats, tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-white/40 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => setShowSearch(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((chat) => (
                    <div key={chat.id} className="p-3 hover:bg-gray-800/50 rounded-lg cursor-pointer">
                      <p className="text-sm text-white truncate" title={chat.title}>{chat.title}</p>
                      <p className="text-xs text-gray-400 mt-1">Chat • {new Date(chat.timestamp).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;






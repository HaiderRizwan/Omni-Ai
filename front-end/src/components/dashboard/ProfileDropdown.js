import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  HelpCircle, 
  ChevronRight, 
  Gamepad2, 
  LogOut,
  User
} from 'lucide-react';

const ProfileDropdown = ({ user, onLogout, onSettingsClick, isOpen, onClose }) => {
  const [showVideoTutorials, setShowVideoTutorials] = useState(false);

  // Debug user object to see subscription data
  console.log('ProfileDropdown user object:', user);
  console.log('Subscription check:', {
    plan: user?.plan,
    subscription: user?.subscription,
    isSubscribed: user?.isSubscribed,
    hasActiveSubscription: user?.hasActiveSubscription
  });

  const handleLogout = () => {
    onClose();
    onLogout();
  };

  const handleSettings = () => {
    onClose();
    if (onSettingsClick) {
      onSettingsClick();
    }
  };

  const handleHelp = () => {
    onClose();
    // Add help functionality here
    console.log('Help clicked');
  };

  const handleDiscord = () => {
    onClose();
    // Add Discord functionality here
    console.log('Discord clicked');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl text-white"
          style={{
            background: 'rgba(30, 30, 30, 0.95)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* User Info Header */}
          <div 
            className="p-4"
            style={{
              background: '#2A2A2A'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-rose-500 flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt="User Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={20} className="text-white" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>
                  {user?.firstName || user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs" style={{ color: '#B0B0B0' }}>
                  {user?.email || 'user@example.com'}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div 
            className="py-2"
            style={{
              background: 'rgba(30, 30, 30, 0.3)'
            }}
          >
            {/* Settings */}
            <button
              onClick={handleSettings}
              className="w-full px-4 py-3 text-left text-sm text-white flex items-center gap-3 transition-all duration-200 focus:outline-none focus:ring-0 focus:ring-2 focus:ring-red-500/50"
              style={{
                background: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
              }}
            >
              <Settings size={16} style={{ color: '#B0B0B0' }} />
              <span style={{ color: '#FFFFFF' }}>Settings</span>
            </button>

            {/* Help */}
            <button
              onClick={handleHelp}
              className="w-full px-4 py-3 text-left text-sm text-white flex items-center gap-3 transition-all duration-200 focus:outline-none focus:ring-0 focus:ring-2 focus:ring-red-500/50"
              style={{
                background: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
              }}
            >
              <HelpCircle size={16} style={{ color: '#B0B0B0' }} />
              <span style={{ color: '#FFFFFF' }}>Help</span>
            </button>

            {/* Video Tutorials */}
            <div className="relative">
              <button
                onClick={() => setShowVideoTutorials(!showVideoTutorials)}
                className="w-full px-4 py-3 text-left text-sm text-white flex items-center gap-3 transition-all duration-200 focus:outline-none focus:ring-0 focus:ring-2 focus:ring-red-500/50"
                style={{
                  background: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.backdropFilter = 'blur(10px)';
                  e.target.style.WebkitBackdropFilter = 'blur(10px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.backdropFilter = 'none';
                  e.target.style.WebkitBackdropFilter = 'none';
                }}
              >
                <ChevronRight 
                  size={16} 
                  className={`transition-transform duration-200 ${
                    showVideoTutorials ? 'rotate-90' : ''
                  }`}
                  style={{ color: '#B0B0B0' }}
                />
                <span style={{ color: '#FFFFFF' }}>Video tutorials</span>
              </button>
              
              {/* Video Tutorials Submenu */}
              <AnimatePresence>
                {showVideoTutorials && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-8 py-2 space-y-1">
                      <button 
                        className="w-full px-4 py-2 text-left text-xs transition-colors focus:outline-none focus:ring-0 focus:ring-2 focus:ring-red-500/50"
                        style={{ 
                          color: '#B0B0B0',
                          background: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(42, 42, 42, 0.5)';
                          e.target.style.color = '#FFFFFF';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                          e.target.style.color = '#B0B0B0';
                        }}
                      >
                        Getting Started
                      </button>
                      <button 
                        className="w-full px-4 py-2 text-left text-xs transition-colors focus:outline-none focus:ring-0 focus:ring-2 focus:ring-red-500/50"
                        style={{ 
                          color: '#B0B0B0',
                          background: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(42, 42, 42, 0.5)';
                          e.target.style.color = '#FFFFFF';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                          e.target.style.color = '#B0B0B0';
                        }}
                      >
                        Advanced Features
                      </button>
                      <button 
                        className="w-full px-4 py-2 text-left text-xs transition-colors focus:outline-none focus:ring-0 focus:ring-2 focus:ring-red-500/50"
                        style={{ 
                          color: '#B0B0B0',
                          background: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(42, 42, 42, 0.5)';
                          e.target.style.color = '#FFFFFF';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                          e.target.style.color = '#B0B0B0';
                        }}
                      >
                        API Integration
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Join our Discord */}
            <button
              onClick={handleDiscord}
              className="w-full px-4 py-3 text-left text-sm text-white flex items-center gap-3 transition-all duration-200 focus:outline-none focus:ring-0 focus:ring-2 focus:ring-red-500/50"
              style={{
                background: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
              }}
            >
              <Gamepad2 size={16} style={{ color: '#B0B0B0' }} />
              <span style={{ color: '#FFFFFF' }}>Join our Discord</span>
            </button>

            {/* Divider */}
            <div className="my-2" style={{ 
              height: '1px', 
              background: 'rgba(255, 255, 255, 0.05)',
              margin: '8px 0'
            }}></div>

            {/* My Plan */}
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm" style={{ color: '#B0B0B0' }}>My plan</span>
              <span className="px-2 py-1 text-xs font-medium rounded-full border" style={{ 
                background: (user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trial') ? 'rgba(59, 130, 246, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                color: (user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trial') ? '#60A5FA' : '#9CA3AF',
                borderColor: (user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trial') ? 'rgba(59, 130, 246, 0.3)' : 'rgba(156, 163, 175, 0.3)'
              }}>
                {user?.subscriptionStatus === 'active' ? 'Pro' : 
                 user?.subscriptionStatus === 'trial' ? 'Trial' : 'Free'}
              </span>
            </div>

            {/* Log out */}
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 text-left text-sm text-red-400 flex items-center gap-3 transition-all duration-200 focus:outline-none focus:ring-0 focus:ring-2 focus:ring-red-500/50"
              style={{
                background: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
              }}
            >
              <LogOut size={16} style={{ color: '#F87171' }} />
              <span style={{ color: '#F87171' }}>Log out</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProfileDropdown;

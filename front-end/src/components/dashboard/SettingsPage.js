import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { Check, ExternalLink, X } from 'lucide-react';

const SettingsPage = ({ isOpen, onClose, user }) => {
  const { theme, changeTheme, isDark, isRed } = useTheme();
  const [publishToExplore, setPublishToExplore] = useState(false);
  const [improveModel, setImproveModel] = useState(false);
  const [activeSection, setActiveSection] = useState('general');

  const ToggleSwitch = ({ isOn, onToggle, disabled = false }) => (
    <motion.button
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
        isOn ? 'bg-red-600' : 'bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      whileTap={{ scale: 0.95 }}
    >
      <motion.span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform`}
        animate={{
          x: isOn ? 24 : 4,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
      />
    </motion.button>
  );


  const SettingRow = ({ label, value, icon, children }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-700/30 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="text-gray-300 font-medium">{label}</span>
        {icon && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 500 }}
          >
            {icon}
          </motion.div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children || (
          <span className="text-white font-medium">{value}</span>
        )}
      </div>
    </div>
  );

  const sidebarItems = [
    { id: 'general', label: 'General' },
    { id: 'myplan', label: 'My Plan' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">General Settings</h2>
              <div className="space-y-4">
                <SettingRow
                  label="Username"
                  value="haiderrizwansaleemi"
                  icon={<Check className="w-4 h-4 text-green-500" />}
                />
                <SettingRow
                  label="Language"
                  value="English"
                />
                <SettingRow
                  label="Timezone"
                  value="UTC+5 (Pakistan Standard Time)"
                />
              </div>
            </div>

            {/* Email Section */}
            <div 
              className="p-4 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <h3 className="text-lg font-semibold text-white mb-4">Email</h3>
              <div className="space-y-4">
                <SettingRow
                  label="Email address"
                  value="i222379@nu.edu.pk"
                />
                <SettingRow
                  label="Email verified"
                  value="Yes"
                  icon={<Check className="w-4 h-4 text-green-500" />}
                />
                <div className="pt-2">
                  <button 
                    className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-all duration-200"
                    style={{
                      background: 'rgba(107, 114, 128, 0.3)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid rgba(107, 114, 128, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(107, 114, 128, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(107, 114, 128, 0.3)';
                    }}
                  >
                    Change Email
                  </button>
                </div>
              </div>
            </div>

            {/* Theme Section */}
            <div 
              className="p-4 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <h3 className="text-lg font-semibold text-white mb-4">Theme</h3>
              <div className="space-y-4">
                <SettingRow
                  label="Current theme"
                  value={isDark ? "Dark" : "Red"}
                  icon={<Check className="w-4 h-4 text-green-500" />}
                />
                <div 
                  className="p-4 rounded-lg"
                  style={{
                    background: 'rgba(107, 114, 128, 0.2)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    border: '1px solid rgba(107, 114, 128, 0.2)'
                  }}
                >
                  <h4 className="text-white font-medium mb-2">Theme Options</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="radio" 
                        name="theme" 
                        value="dark" 
                        checked={isDark}
                        onChange={() => changeTheme('dark')}
                        className="text-red-600" 
                      />
                      <span className="text-gray-300">Dark {isDark && '(Current)'}</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="radio" 
                        name="theme" 
                        value="red" 
                        checked={isRed}
                        onChange={() => changeTheme('red')}
                        className="text-red-600" 
                      />
                      <span className="text-gray-300">Red {isRed && '(Current)'}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Section */}
            <div 
              className="p-4 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <h3 className="text-lg font-semibold text-white mb-4">Privacy</h3>
              <div className="space-y-6">
                <div 
                  className="p-4 rounded-lg"
                  style={{
                    background: 'rgba(107, 114, 128, 0.1)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    border: '1px solid rgba(107, 114, 128, 0.1)'
                  }}
                >
                  <h4 className="text-lg font-medium text-white mb-3">Publish to explore</h4>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h5 className="text-white font-medium mb-1">Enable public sharing</h5>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        Allow your generated content to be featured in the public explore gallery.
                      </p>
                    </div>
                    <ToggleSwitch
                      isOn={publishToExplore}
                      onToggle={() => setPublishToExplore(!publishToExplore)}
                    />
                  </div>
                </div>
                
                <div 
                  className="p-4 rounded-lg"
                  style={{
                    background: 'rgba(107, 114, 128, 0.1)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    border: '1px solid rgba(107, 114, 128, 0.1)'
                  }}
                >
                  <h4 className="text-lg font-medium text-white mb-3">Improve the model for everyone</h4>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h5 className="text-white font-medium mb-1">Contribute to model improvement</h5>
                      <p className="text-sm text-gray-400 leading-relaxed mb-2">
                        Help improve our AI models by allowing your usage data to be used for training.
                      </p>
                      <motion.a
                        href="#"
                        className="inline-flex items-center gap-1 text-sm text-red-400 hover:text-red-300 underline transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Learn more
                        <ExternalLink className="w-3 h-3" />
                      </motion.a>
                    </div>
                    <ToggleSwitch
                      isOn={improveModel}
                      onToggle={() => setImproveModel(!improveModel)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'myplan':
        const isSubscribed = user?.subscriptionStatus === 'active';
        const isOnTrial = user?.subscriptionStatus === 'trial';
        const isFree = user?.subscriptionStatus === 'free' || !user?.subscriptionStatus;
        
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">My Plan</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                  <div>
                    <h3 className="text-white font-medium">Current Plan</h3>
                    <p className="text-sm text-gray-400">
                      {isSubscribed ? 'Pro plan with full access to all features' :
                       isOnTrial ? 'Trial plan with premium features' :
                       'Free tier with basic features'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full border ${
                    isSubscribed 
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      : isOnTrial
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                  }`}>
                    {isSubscribed ? 'Pro' : isOnTrial ? 'Trial' : 'Free'}
                  </span>
                </div>
                
                {!isSubscribed && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <h4 className="text-red-400 font-medium mb-2">
                      {isOnTrial ? 'Upgrade to Pro' : 'Upgrade to Premium'}
                    </h4>
                    <p className="text-sm text-gray-300 mb-3">
                      {isOnTrial 
                        ? 'Your trial will end soon. Upgrade to continue enjoying premium features.'
                        : 'Get access to advanced features and higher limits'
                      }
                    </p>
                    <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
                      {isOnTrial ? 'Upgrade Now' : 'Upgrade Now'}
                    </button>
                  </div>
                )}
                
                {isSubscribed && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <h4 className="text-blue-400 font-medium mb-2">Pro Plan Active</h4>
                    <p className="text-sm text-gray-300 mb-3">You have full access to all premium features and higher usage limits.</p>
                    <div className="text-xs text-gray-400">
                      <p>• Unlimited API calls</p>
                      <p>• Advanced analytics</p>
                      <p>• Priority support</p>
                      <p>• All premium features</p>
                    </div>
                  </div>
                )}
                
                {isOnTrial && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <h4 className="text-blue-400 font-medium mb-2">Trial Active</h4>
                    <p className="text-sm text-gray-300 mb-3">You're currently enjoying premium features during your trial period.</p>
                    <div className="text-xs text-gray-400">
                      <p>• Full access to premium features</p>
                      <p>• Higher usage limits</p>
                      <p>• Trial period: 14 days</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      
      
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Enhanced glass overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Enhanced Glass Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative w-full max-w-[900px] h-[600px] bg-white/5 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/20 bg-white/5 backdrop-blur-sm">
              <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-sm text-gray-400 mt-1">Manage your preferences</p>
              </div>
              <motion.button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <X size={20} />
              </motion.button>
            </div>

            {/* Two-column layout */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left Sidebar */}
              <div 
                className="w-[30%] border-r border-white/20"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(15px)',
                  WebkitBackdropFilter: 'blur(15px)'
                }}
              >
                <nav className="p-4">
                  <div className="space-y-1">
                    {sidebarItems.map((item) => (
                      <motion.button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          activeSection === item.id
                            ? 'text-white'
                            : 'text-gray-300 hover:text-white'
                        }`}
                        style={{
                          background: activeSection === item.id 
                            ? 'rgba(239, 68, 68, 0.3)' 
                            : 'transparent',
                          backdropFilter: activeSection === item.id ? 'blur(10px)' : 'none',
                          WebkitBackdropFilter: activeSection === item.id ? 'blur(10px)' : 'none',
                          border: activeSection === item.id ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent'
                        }}
                        onMouseEnter={(e) => {
                          if (activeSection !== item.id) {
                            e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.target.style.backdropFilter = 'blur(10px)';
                            e.target.style.WebkitBackdropFilter = 'blur(10px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (activeSection !== item.id) {
                            e.target.style.background = 'transparent';
                            e.target.style.backdropFilter = 'none';
                            e.target.style.WebkitBackdropFilter = 'none';
                          }
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {item.label}
                      </motion.button>
                    ))}
                  </div>
                </nav>
              </div>

              {/* Right Content Area */}
              <div 
                className="flex-1 overflow-y-auto"
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)'
                }}
              >
                <div className="p-6">
                  {renderContent()}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div 
              className="flex items-center justify-end p-6 border-t border-white/20"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(15px)',
                WebkitBackdropFilter: 'blur(15px)'
              }}
            >
              <motion.button
                onClick={onClose}
                className="px-6 py-2 text-white font-medium rounded-lg transition-all duration-200"
                style={{
                  background: 'rgba(239, 68, 68, 0.3)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(239, 68, 68, 0.4)'
                }}
                whileHover={{ 
                  scale: 1.02,
                  background: 'rgba(239, 68, 68, 0.4)'
                }}
                whileTap={{ scale: 0.98 }}
              >
                Done
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsPage;

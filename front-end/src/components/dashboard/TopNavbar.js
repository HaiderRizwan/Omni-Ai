import React, { useState, useEffect, useRef } from 'react';
import { Filter, Bell, User } from 'lucide-react';
import ProfileDropdown from './ProfileDropdown';

const TopNavbar = ({ user, onLogout, onSettingsClick }) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);

  // Debug user object to see subscription data
  console.log('TopNavbar user object:', user);

  // Mock notifications
  useEffect(() => {
    setNotifications([
      { id: 1, type: 'success', message: 'Chat saved successfully', time: '2m ago' },
      { id: 2, type: 'warning', message: 'API usage at 80% of limit', time: '1h ago' },
      { id: 3, type: 'info', message: 'New feature: Image generation available', time: '3h ago' },
    ]);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCloseDropdown = () => {
    setShowUserDropdown(false);
  };

  const handleFilter = () => {
    // Add filter functionality here
    console.log('Filter clicked');
  };

  const handleBell = () => {
    // Add notifications functionality here
    console.log('Bell clicked');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] border-b border-white/5 bg-noir-900/80 backdrop-blur-md">
      <div className="mx-auto max-w-full px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section - Logo */}
          <div className="flex items-center gap-3">
            <img src="/omnilogo.png" alt="Omni Ai" className="h-9 w-9 object-contain" />
            <span className="text-2xl font-bold font-heading tracking-tighter text-white">
              Omni<span className="text-[var(--primary)]">.ai</span>
            </span>
          </div>

          {/* Right Section - Icons */}
          <div className="flex items-center gap-3">
            {/* Filter Icon */}
            <button
              onClick={handleFilter}
              className="relative rounded-lg p-2 text-white/60 transition hover:bg-white/5 hover:text-white focus:outline-none focus:ring-0 focus:ring-2 focus:ring-[var(--primary)]/50"
            >
              <Filter size={20} />
            </button>

            {/* Bell Icon */}
            <button
              onClick={handleBell}
              className="relative rounded-lg p-2 text-white/60 transition hover:bg-white/5 hover:text-white focus:outline-none focus:ring-0 focus:ring-2 focus:ring-[var(--primary)]/50"
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--primary)] text-xs text-white rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* User Avatar */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 rounded-lg p-1 text-white/60 transition hover:bg-white/5 hover:text-white focus:outline-none focus:ring-0 focus:ring-2 focus:ring-[var(--primary)]/50"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[var(--primary)] to-emerald-500 flex items-center justify-center overflow-hidden">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt="User Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={16} className="text-white" />
                  )}
                </div>
              </button>

              {/* User Dropdown Menu */}
              <ProfileDropdown
                user={user}
                onLogout={onLogout}
                onSettingsClick={onSettingsClick}
                isOpen={showUserDropdown}
                onClose={handleCloseDropdown}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import safeLocalStorage from '../utils/localStorage';

function AuthModal({ isOpen, onClose, mode = 'login' }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const endpoint = mode === 'login' ? '/api/users/login' : '/api/users/register';
      
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          mode === 'login' 
            ? {
                identifier: formData.email, // Backend expects 'identifier' for login
                password: formData.password
              }
            : {
                email: formData.email,
                password: formData.password,
                username: formData.name.toLowerCase().replace(/\s+/g, '').substring(0, 50),
                firstName: formData.name.split(' ')[0] || formData.name,
                lastName: formData.name.split(' ').slice(1).join(' ') || 'User'
              }
        ),
      });

      const data = await response.json();

      if (data.success) {
        // Store user data and token
        safeLocalStorage.setItem('user', JSON.stringify(data.data.user));
        safeLocalStorage.setItem('token', data.data.token);
        
        // Close modal and trigger parent update
        onClose();
        setFormData({ email: '', password: '', confirmPassword: '', name: '' });
        
        // Trigger page reload to show dashboard
        window.location.reload();
      } else {
        // Show detailed validation errors
        if (data.errors && data.errors.length > 0) {
          const errorMessages = data.errors.map(err => `${err.field}: ${err.message}`).join('\n');
          alert(`Validation failed:\n${errorMessages}`);
        } else {
          alert(data.message || 'Authentication failed');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setFormData({ email: '', password: '', confirmPassword: '', name: '' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d0f1a]/95 via-[#0e1020]/90 to-[#0a0b14]/95 p-6 shadow-2xl backdrop-blur-xl">
              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                  </h2>
                  <p className="text-sm text-white/60">
                    {mode === 'login' ? 'Sign in to your account' : 'Join Omni Ai today'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-10 py-3 text-white placeholder-white/40 focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                        placeholder="Enter your full name"
                        required={mode === 'signup'}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-10 py-3 text-white placeholder-white/40 focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-10 py-3 pr-10 text-white placeholder-white/40 focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-10 py-3 pr-10 text-white placeholder-white/40 focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                        placeholder="Confirm your password"
                        required={mode === 'signup'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'login' && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-white/20 bg-white/5 text-red-500 focus:ring-red-500/20"
                      />
                      <span className="ml-2 text-sm text-white/60">Remember me</span>
                    </label>
                    <a href="#" className="text-sm text-red-400 hover:text-red-300">
                      Forgot password?
                    </a>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-lg bg-gradient-to-r from-red-500 to-rose-500 py-3 font-semibold text-white transition hover:from-red-600 hover:to-rose-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                      <span className="ml-2">Processing...</span>
                    </div>
                  ) : (
                    mode === 'login' ? 'Sign In' : 'Create Account'
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-6 text-center">
                <p className="text-sm text-white/60">
                  {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                  <button
                    onClick={toggleMode}
                    className="text-red-400 hover:text-red-300"
                  >
                    {mode === 'login' ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AuthModal;

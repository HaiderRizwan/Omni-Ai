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
          try { (window.__toast?.push || (() => { }))({ message: `Validation failed:\n${errorMessages}`, type: 'error' }); } catch (_) { }
        } else {
          try { (window.__toast?.push || (() => { }))({ message: data.message || 'Authentication failed', type: 'error' }); } catch (_) { }
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      try { (window.__toast?.push || (() => { }))({ message: 'Network error. Please try again.', type: 'error' }); } catch (_) { }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setFormData({ email: '', password: '', confirmPassword: '', name: '' });
  };

  const handleGoogleLogin = async () => {
    try {
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiBase}/api/auth/google/url`);
      const data = await res.json();
      if (data && data.success && data.url) {
        window.location.href = data.url;
      } else {
        try { (window.__toast?.push || (() => { }))({ message: 'Failed to start Google login', type: 'error' }); } catch (_) { }
      }
    } catch (e) {
      try { (window.__toast?.push || (() => { }))({ message: 'Network error. Please try again.', type: 'error' }); } catch (_) { }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 z-[210] w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4"
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="relative rounded-3xl border border-white/10 bg-[#0A0A0A] p-8 shadow-2xl overflow-hidden">
              {/* Noise & Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)]/10 blur-[80px] rounded-full pointer-events-none" />

              {/* Header */}
              <div className="relative z-10 mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-heading font-bold text-white mb-1">
                    {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                  </h2>
                  <p className="text-sm text-white/50">
                    {mode === 'login' ? 'Enter your credentials to access your workspace.' : 'Join the elite creative network today.'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 text-white/40 transition hover:bg-white/5 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
                {mode === 'signup' && (
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-4 py-3.5 text-white placeholder-white/20 focus:border-[var(--primary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/50 transition-all font-sans"
                        placeholder="John Doe"
                        required={mode === 'signup'}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-4 py-3.5 text-white placeholder-white/20 focus:border-[var(--primary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/50 transition-all font-sans"
                      placeholder="name@company.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-12 py-3.5 text-white placeholder-white/20 focus:border-[var(--primary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/50 transition-all font-sans"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-12 py-3.5 text-white placeholder-white/20 focus:border-[var(--primary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/50 transition-all font-sans"
                        placeholder="••••••••"
                        required={mode === 'signup'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'login' && (
                  <div className="flex items-center justify-between mt-2">
                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        className="rounded border-white/20 bg-white/5 text-[var(--primary)] focus:ring-[var(--primary)]/20 cursor-pointer"
                      />
                      <span className="ml-2 text-sm text-white/40 group-hover:text-white/60 transition-colors">Remember me</span>
                    </label>
                    <a href="#" className="text-sm font-medium text-[var(--primary)] hover:text-white transition-colors">
                      Forgot password?
                    </a>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-4 rounded-xl bg-[var(--primary)] text-black py-4 font-bold text-lg hover:bg-[var(--primary-700)] transition-all shadow-[0_0_20px_rgba(204,255,0,0.15)] disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/30 border-t-black"></div>
                      <span className="ml-2">Processing...</span>
                    </div>
                  ) : (
                    mode === 'login' ? 'Sign In' : 'Create Account'
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="relative z-10 mt-8 pt-6 border-t border-white/5">
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="mb-6 flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-3.5 font-medium text-white transition hover:bg-white/10 hover:border-white/20"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5" />
                    Continue with Google
                  </button>
                )}
                <div className="text-center">
                  <p className="text-sm text-white/40">
                    {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                    <button
                      onClick={toggleMode}
                      className="text-white hover:text-[var(--primary)] font-medium transition-colors ml-1"
                    >
                      {mode === 'login' ? 'Sign up' : 'Sign in'}
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AuthModal;

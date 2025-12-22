import './App.css';
import { useState, useEffect } from 'react';
import { useToast } from './components/ToastProvider';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import PromptBar from './components/PromptBar';
import DocumentConverter from './components/DocumentConverter';
import CurrencyConverter from './components/CurrencyConverter';
import Gallery from './components/Gallery';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import { ThemeProvider } from './contexts/ThemeContext';
import safeLocalStorage from './utils/localStorage';
import OAuthSuccess from './components/OAuthSuccess';
import Pricing from './components/Pricing';
import Features from './components/Features';
import Support from './components/Support';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useToast();
  // State for landing page navigation (home, features, pricing, support)
  const [currentView, setCurrentView] = useState('home');

  useEffect(() => {
    try { window.__toast = { push }; } catch (_) { }
    // Check if user is logged in
    const storedUser = safeLocalStorage.getItem('user');
    const token = safeLocalStorage.getItem('token');

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing user data:', error);
        safeLocalStorage.removeItem('user');
        safeLocalStorage.removeItem('token');
      }
    }
    setIsLoading(false);
  }, []);

  // Handle OAuth redirect path without a router (after hooks to avoid conditional hooks)
  if (typeof window !== 'undefined' && window.location && window.location.pathname.startsWith('/oauth')) {
    return <OAuthSuccess />;
  }

  const handleLogout = () => {
    safeLocalStorage.removeItem('user');
    safeLocalStorage.removeItem('token');
    setUser(null);
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0b0f] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // If user is logged in, show dashboard
  if (user) {
    return (
      <ThemeProvider>
        <div className="App">
          <Toaster position="top-right" />
          <Dashboard user={user} onLogout={handleLogout} />
        </div>
      </ThemeProvider>
    );
  }

  // If user is not logged in, show main landing site with navigation
  return (
    <ThemeProvider>
      <div className="App">
        <Toaster position="top-right" />
        <Navbar currentView={currentView} onNavigate={setCurrentView} />

        {currentView === 'home' && (
          <>
            <Hero />
            <PromptBar />
            <Gallery />
            <DocumentConverter />
            <CurrencyConverter />
          </>
        )}

        {currentView === 'features' && <Features />}
        {currentView === 'pricing' && <Pricing />}
        {currentView === 'support' && <Support />}

        <Footer onNavigate={setCurrentView} />
      </div>
    </ThemeProvider>
  );
}



export default App;

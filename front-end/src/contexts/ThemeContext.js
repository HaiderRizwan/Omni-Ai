import React, { createContext, useContext, useState, useEffect } from 'react';
import safeLocalStorage from '../utils/localStorage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark'); // 'dark' (black) or 'red'

  useEffect(() => {
    // Load theme from localStorage on mount
    const savedTheme = safeLocalStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    safeLocalStorage.setItem('theme', newTheme);
  };

  const value = {
    theme,
    changeTheme,
    isDark: theme === 'dark',
    isRed: theme === 'red'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

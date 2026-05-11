import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {}, isDark: false });

export function useThemeProvider() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('vuhai-theme');
    if (saved) return saved;
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vuhai-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  return { theme, toggleTheme, isDark: theme === 'dark' };
}

export { ThemeContext };

export function useTheme() {
  return useContext(ThemeContext);
}

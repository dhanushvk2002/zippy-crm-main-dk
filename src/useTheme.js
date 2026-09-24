import { useState, useEffect, useCallback } from "react";

/**
 * useTheme Hook
 * Manages Light Mode and Dark Mode state with localStorage persistence
 * and applies data-theme attribute to document.documentElement.
 */
export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem("zenve_theme");
      if (stored === "dark" || stored === "light") {
        return stored;
      }
      // Check system preference
      if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    } catch {
      // Fallback
    }
    return "light";
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("zenve_theme", theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
  }, []);

  return [theme, setTheme];
}

export default useTheme;

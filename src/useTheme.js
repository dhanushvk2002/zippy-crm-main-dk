import { useState, useEffect, useCallback } from "react";

const THEME_KEY = "zenve_theme";
const THEME_EVENT = "zenve_theme_change";

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") {
      return stored;
    }
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  } catch {
    // Fallback
  }
  return "light";
}

function applyThemeToDOM(theme) {
  if (typeof document === "undefined") return;
  const isDark = theme === "dark";
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.classList.toggle("theme-dark", isDark);
  if (document.body) {
    document.body.classList.toggle("dark", isDark);
    document.body.classList.toggle("theme-dark", isDark);
  }
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

/**
 * useTheme Hook
 * Manages Light Mode and Dark Mode state with localStorage persistence
 * and applies data-theme attribute and classes to document.documentElement and document.body.
 * Fully synchronized across all components and browser tabs.
 */
export function useTheme() {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    applyThemeToDOM(theme);

    const handleSync = (e) => {
      const next = e.detail || localStorage.getItem(THEME_KEY);
      if (next && (next === "dark" || next === "light")) {
        setThemeState(next);
        applyThemeToDOM(next);
      }
    };

    window.addEventListener(THEME_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(THEME_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [theme]);

  const setTheme = useCallback((newTheme) => {
    const target = newTheme === "dark" ? "dark" : "light";
    try {
      localStorage.setItem(THEME_KEY, target);
    } catch {}
    setThemeState(target);
    applyThemeToDOM(target);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: target }));
  }, []);

  return [theme, setTheme];
}

export default useTheme;

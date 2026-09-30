/**
 * useTheme Hook (Light Mode Only)
 * Dark mode and Light mode toggling has been removed. The website runs strictly in Light Mode.
 * This hook automatically clears any previously stored dark theme preference and ensures
 * that document.documentElement and document.body stay clean in light mode.
 */
export function useTheme() {
  if (typeof document !== "undefined") {
    try {
      localStorage.removeItem("zenve_theme");
      document.documentElement.removeAttribute("data-theme");
      document.documentElement.classList.remove("dark", "theme-dark");
      if (document.body) {
        document.body.removeAttribute("data-theme");
        document.body.classList.remove("dark", "theme-dark");
      }
      document.documentElement.style.colorScheme = "light";
    } catch {}
  }
  return ["light", () => {}];
}

export default useTheme;

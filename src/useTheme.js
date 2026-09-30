/**
 * useTheme Hook (Light Mode Only)
 * Dark mode has been removed. This hook always returns "light"
 * and cleans up any previously stored dark theme preference.
 */
export function useTheme() {
  return ["light", () => {}];
}

export default useTheme;

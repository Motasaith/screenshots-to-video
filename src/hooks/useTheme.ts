/**
 * Light or dark, for the editor only.
 *
 * The theme is a `data-theme` attribute on <html>, which the token block in
 * index.css keys off. It has to go on <html> rather than on the editor's own
 * element because dialogs, dropdowns and tooltips render through portals into
 * <body>, outside the editor's subtree - scoping it to the editor would leave
 * every one of those stranded in light mode over a dark page.
 *
 * On <html> but not for the whole site: the attribute is set when the editor
 * mounts and removed when it unmounts, so the marketing pages and the dashboard
 * are always light. They are designed light, and were never asked to be
 * anything else.
 *
 * The default is light, not the operating system's preference. Somebody opening
 * the editor for the first time should see what everyone else sees; dark is a
 * choice they make, and once made it is remembered.
 */
import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "aivideo-editor-theme";
const ATTR = "data-theme";

function storedTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    // Private browsing, or storage disabled. Not worth failing over: the theme
    // simply stops being remembered between visits.
    return "light";
  }
}

/**
 * The editor's theme, applied for as long as the editor is on screen.
 *
 * The cleanup is the important half. Without it the attribute outlives the
 * editor, and navigating back to the dashboard or the homepage leaves them
 * wearing a theme they have no styling for.
 */
export function useEditorTheme() {
  const [theme, setThemeState] = useState<Theme>(storedTheme);

  useEffect(() => {
    document.documentElement.setAttribute(ATTR, theme);
    return () => {
      document.documentElement.removeAttribute(ATTR);
    };
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // See storedTheme: the choice still applies for this visit.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ditto.
      }
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}

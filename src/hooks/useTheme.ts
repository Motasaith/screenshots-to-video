/**
 * Light or dark, chosen explicitly and remembered.
 *
 * The theme is a `data-theme` attribute on <html>, which the token block in
 * index.css keys off. Nothing else needs to know: every surface in the editor
 * already reads `--sketch-*`, so flipping the attribute repaints all of it.
 *
 * Deliberately not following `prefers-color-scheme` on its own. The marketing
 * pages are designed light, and turning them dark because of an OS setting is a
 * larger decision than a toggle in the editor. The OS preference is used only
 * as the starting point for somebody who has never chosen, and their choice
 * wins from then on.
 */
import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "aivideo-theme";

/** What to show before anyone has expressed a preference. */
function systemTheme(): Theme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function storedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "dark" || v === "light" ? v : null;
  } catch {
    // Private browsing, or storage disabled. Not worth failing over: the theme
    // simply stops being remembered between visits.
    return null;
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

/**
 * Set the theme before React paints.
 *
 * Called from main.tsx rather than an effect. An effect runs after the first
 * paint, so a dark-mode user would see a white flash on every page load - the
 * kind of thing that reads as a bug rather than a delay.
 */
export function initTheme(): Theme {
  const theme = storedTheme() ?? systemTheme();
  applyTheme(theme);
  return theme;
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(
    () => (document.documentElement.getAttribute("data-theme") as Theme) || "light"
  );

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // See storedTheme: the choice still applies for this visit.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(
      (document.documentElement.getAttribute("data-theme") as Theme) === "dark"
        ? "light"
        : "dark"
    );
  }, [setTheme]);

  // Follow the system only while nobody has chosen. Once they have, their
  // choice outranks the OS switching itself to night mode at sunset.
  useEffect(() => {
    if (storedTheme()) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (storedTheme()) return;
      const next: Theme = mq.matches ? "dark" : "light";
      applyTheme(next);
      setThemeState(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return { theme, setTheme, toggleTheme };
}

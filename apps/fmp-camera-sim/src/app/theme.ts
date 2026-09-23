import { useCallback, useEffect, useState } from "react";

// Shares the FMP suite's theme preference (localStorage "fmpTheme": light, dark or auto).
// A first visit is light; public/theme-boot.js applies the saved choice before first paint.

const KEY = "fmpTheme";
type Preference = "light" | "dark" | "auto";
export type Theme = "light" | "dark";

const THEME_COLOR: Record<Theme, string> = { light: "#eee8df", dark: "#0c1016" };

function readPreference(): Preference {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "light" || value === "dark" || value === "auto" ? value : "light";
  } catch {
    return "light";
  }
}

const systemQuery = () => window.matchMedia?.("(prefers-color-scheme: dark)");

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [preference, setPreference] = useState<Preference>(readPreference);
  const [systemDark, setSystemDark] = useState(() => Boolean(systemQuery()?.matches));

  useEffect(() => {
    const query = systemQuery();
    if (!query) return undefined;
    const onChange = () => setSystemDark(query.matches);
    query.addEventListener("change", onChange);
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY) setPreference(readPreference());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      query.removeEventListener("change", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const theme: Theme = preference === "auto" ? (systemDark ? "dark" : "light") : preference;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
  }, [theme]);

  const toggle = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* The choice still applies to this page. */
    }
    setPreference(next);
  }, [theme]);

  return { theme, toggle };
}

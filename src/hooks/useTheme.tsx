import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ThemeMode = "light" | "dark" | "system";
const STORAGE_KEY = "advance_theme_pref";

const applyTheme = (mode: ThemeMode) => {
  const root = document.documentElement;
  const isDark =
    mode === "dark" ||
    (mode === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
};

export const useTheme = () => {
  const { user } = useAuth();
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try { return (localStorage.getItem(STORAGE_KEY) as ThemeMode) || "system"; }
    catch { return "system"; }
  });

  // Apply on mount + when mode changes
  useEffect(() => {
    applyTheme(mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* ignore */ }

    if (mode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => applyTheme("system");
      mq.addEventListener?.("change", listener);
      return () => mq.removeEventListener?.("change", listener);
    }
  }, [mode]);

  // Load from server when signed in
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("theme_preference")
        .eq("id", user.id)
        .maybeSingle();
      const t = data?.theme_preference as ThemeMode | undefined;
      if (t && ["light", "dark", "system"].includes(t)) setModeState(t);
    })();
  }, [user]);

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    if (user) {
      await supabase.from("profiles").update({ theme_preference: newMode } as any).eq("id", user.id);
    }
  }, [user]);

  return { mode, setMode };
};
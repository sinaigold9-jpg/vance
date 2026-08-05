import { useCallback, useEffect } from "react";
import { useTheme as useNextTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ThemeMode = "light" | "dark" | "system";

const VALID: ThemeMode[] = ["light", "dark", "system"];

/**
 * Single source of truth for light / dark / system.
 * next-themes owns the DOM class + localStorage + OS listener,
 * we only mirror the choice to the user profile so it follows the account.
 */
export const useTheme = () => {
  const { user } = useAuth();
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  const mode = (VALID.includes(theme as ThemeMode) ? theme : "system") as ThemeMode;

  // Pull the saved preference once the user is known
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("theme_preference")
        .eq("id", user.id)
        .maybeSingle();
      const saved = data?.theme_preference as ThemeMode | undefined;
      if (!cancelled && saved && VALID.includes(saved) && saved !== theme) {
        setTheme(saved);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const setMode = useCallback(
    async (newMode: ThemeMode) => {
      setTheme(newMode);
      if (user) {
        await supabase
          .from("profiles")
          .update({ theme_preference: newMode })
          .eq("id", user.id);
      }
    },
    [setTheme, user],
  );

  return { mode, setMode, resolvedTheme: (resolvedTheme as "light" | "dark") ?? "dark" };
};

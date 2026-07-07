import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reads which icon ids should be hidden from the front-end UI.
 * Configuration is stored in app_settings under key "hidden_home_icons"
 * as JSON: { "ids": ["tasks", "games", ...] }
 * Nothing is deleted — hidden entries can be restored from the admin panel.
 */
export const useHiddenIcons = (): string[] => {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value, is_active")
        .eq("key", "hidden_home_icons")
        .maybeSingle();
      if (cancelled) return;
      if (!data || data.is_active === false) { setIds([]); return; }
      try {
        const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        const arr = Array.isArray(parsed?.ids) ? parsed.ids : Array.isArray(parsed) ? parsed : [];
        setIds(arr.filter((x: unknown): x is string => typeof x === "string"));
      } catch { setIds([]); }
    })();
    return () => { cancelled = true; };
  }, []);

  return ids;
};
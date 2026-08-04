import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CURRENT_VERSION, CURRENT_VERSION_CODE } from "@/lib/appVersion";

export interface LatestVersionInfo {
  version: string;
  versionCode: number;
  title: string | null;
  description: string | null;
  releaseDate: string | null;
  updateLabel: string | null;
}

/**
 * Single source of truth for the version shown anywhere in the app.
 * Reads the newest published version from the admin "Versions" section and
 * updates live — no code change needed when a new version is published.
 */
export const useLatestVersion = () => {
  const [info, setInfo] = useState<LatestVersionInfo>({
    version: CURRENT_VERSION,
    versionCode: CURRENT_VERSION_CODE,
    title: null,
    description: null,
    releaseDate: null,
    updateLabel: null,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("app_versions")
      .select("version, version_code, title, description, release_date, update_label")
      .eq("is_active", true)
      .eq("status", "published")
      .order("version_code", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setInfo({
        version: data.version,
        versionCode: data.version_code,
        title: data.title ?? null,
        description: data.description ?? null,
        releaseDate: data.release_date ?? null,
        updateLabel: (data as { update_label?: string | null }).update_label ?? null,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("latest_app_version")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_versions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return { ...info, loading, refresh: load };
};

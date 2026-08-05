import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CURRENT_VERSION, CURRENT_VERSION_CODE } from "@/lib/appVersion";

export interface VersionFeature {
  label: string;
  description?: string;
  badge?: string;
}

export interface LatestVersionInfo {
  version: string;
  versionCode: number;
  title: string | null;
  description: string | null;
  releaseDate: string | null;
  updateLabel: string | null;
  features: VersionFeature[];
  fixes: string[];
  futureNotes: string | null;
  isMandatory: boolean;
  sizeBytes: number;
}

const toFeatures = (raw: unknown): VersionFeature[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) =>
      typeof f === "string"
        ? { label: f }
        : f && typeof f === "object"
          ? {
              label: String((f as Record<string, unknown>).label ?? ""),
              description: (f as Record<string, unknown>).description as string | undefined,
              badge: (f as Record<string, unknown>).badge as string | undefined,
            }
          : { label: "" },
    )
    .filter((f) => f.label.trim().length > 0);
};

const toFixes = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) =>
      typeof f === "string"
        ? f
        : f && typeof f === "object"
          ? String((f as Record<string, unknown>).label ?? (f as Record<string, unknown>).text ?? "")
          : "",
    )
    .filter((f) => f.trim().length > 0);
};

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
    features: [],
    fixes: [],
    futureNotes: null,
    isMandatory: false,
    sizeBytes: 0,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("app_versions")
      .select(
        "version, version_code, title, description, release_date, update_label, features, fixes, future_notes, is_mandatory, size_bytes",
      )
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
        updateLabel: data.update_label ?? null,
        features: toFeatures(data.features),
        fixes: toFixes(data.fixes),
        futureNotes: data.future_notes ?? null,
        isMandatory: !!data.is_mandatory,
        sizeBytes: Number(data.size_bytes ?? 0),
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

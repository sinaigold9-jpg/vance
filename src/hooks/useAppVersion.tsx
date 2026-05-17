import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getSeenVersionCode, setSeenVersionCode, CURRENT_VERSION_CODE, CURRENT_VERSION } from "@/lib/appVersion";

export interface VersionFeature {
  icon?: string;
  label: string;
  description?: string;
  badge?: "new" | "feature" | "fix" | "vip";
}

export interface AppVersion {
  id: string;
  version: string;
  version_code: number;
  title: string;
  description: string | null;
  features: VersionFeature[];
  images: string[];
  is_mandatory: boolean;
  target_audience: string;
  theme: string;
  update_label: string | null;
  is_active: boolean;
  release_date: string;
}

const matchesAudience = (target: string, accountType?: string | null) => {
  if (!target || target === "all") return true;
  if (!accountType) return target === "all";
  return target === accountType;
};

export const useAppVersion = () => {
  const { user } = useAuth();
  const [pending, setPending] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState<string | null>(null);

  const fetchProfileType = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("id", user.id)
      .maybeSingle();
    return data?.account_type ?? null;
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) {
      setPending([]);
      setLoading(false);
      return;
    }
    const acct = await fetchProfileType();
    setAccountType(acct);

    const seen = Math.max(getSeenVersionCode(), CURRENT_VERSION_CODE);
    const { data, error } = await supabase
      .from("app_versions")
      .select("*")
      .eq("is_active", true)
      .gt("version_code", seen)
      .order("version_code", { ascending: true });

    if (error) {
      console.error("version fetch error", error);
      setPending([]);
    } else {
      const filtered = (data || [])
        .filter((v: any) => matchesAudience(v.target_audience, acct))
        .map((v: any) => ({
          ...v,
          update_label: v.update_label ?? null,
          features: Array.isArray(v.features) ? (v.features as VersionFeature[]) : [],
          images: Array.isArray(v.images) ? v.images : [],
        })) as AppVersion[];
      setPending(filtered);
    }
    setLoading(false);
  }, [user, fetchProfileType]);

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel("app_versions_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_versions" },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const acknowledgeCurrent = useCallback(() => {
    if (pending.length === 0) return;
    const first = pending[0];
    setSeenVersionCode(first.version_code);
    setPending((prev) => prev.slice(1));
  }, [pending]);

  return {
    pending,
    current: pending[0] || null,
    hasUpdate: pending.length > 0,
    loading,
    accountType,
    currentVersion: CURRENT_VERSION,
    refresh,
    acknowledgeCurrent,
  };
};
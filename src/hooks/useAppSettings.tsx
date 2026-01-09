import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AppSettings {
  appEnabled: boolean;
  appDisabledMessage: string;
  tasksEnabled: boolean;
  tasksDisabledMessage: string;
  luckyWheelEnabled: boolean;
  luckyWheelDisabledMessage: string;
  referralEnabled: boolean;
  referralDisabledMessage: string;
  teamEnabled: boolean;
  teamDisabledMessage: string;
}

export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings>({
    appEnabled: true,
    appDisabledMessage: "",
    tasksEnabled: true,
    tasksDisabledMessage: "",
    luckyWheelEnabled: true,
    luckyWheelDisabledMessage: "",
    referralEnabled: true,
    referralDisabledMessage: "",
    teamEnabled: true,
    teamDisabledMessage: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("app_settings_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("*");

    if (!error && data) {
      const settingsMap: Record<string, string> = {};
      data.forEach((setting) => {
        settingsMap[setting.key] = setting.value || "";
      });

      setSettings({
        appEnabled: settingsMap["app_enabled"] === "true",
        appDisabledMessage: settingsMap["app_disabled_message"] || "التطبيق تحت الصيانة",
        tasksEnabled: settingsMap["tasks_enabled"] === "true",
        tasksDisabledMessage: settingsMap["tasks_disabled_message"] || "نظام المهام متوقف مؤقتاً",
        luckyWheelEnabled: settingsMap["lucky_wheel_enabled"] === "true",
        luckyWheelDisabledMessage: settingsMap["lucky_wheel_disabled_message"] || "عجلة الحظ متوقفة مؤقتاً",
        referralEnabled: settingsMap["referral_enabled"] === "true",
        referralDisabledMessage: settingsMap["referral_disabled_message"] || "نظام الإحالة متوقف مؤقتاً",
        teamEnabled: settingsMap["team_enabled"] === "true",
        teamDisabledMessage: settingsMap["team_disabled_message"] || "نظام الفريق متوقف مؤقتاً",
      });
    }
    setLoading(false);
  };

  return { settings, loading, refetch: fetchSettings };
};

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AppSettings {
  appEnabled: boolean;
  appDisabledMessage: string;
  landingEnabled: boolean;
  landingDisabledMessage: string;
  tasksEnabled: boolean;
  tasksDisabledMessage: string;
  luckyWheelEnabled: boolean;
  luckyWheelDisabledMessage: string;
  referralEnabled: boolean;
  referralDisabledMessage: string;
  teamEnabled: boolean;
  teamDisabledMessage: string;
  walletEnabled: boolean;
  walletDisabledMessage: string;
  adsEnabled: boolean;
  adsDisabledMessage: string;
  offersEnabled: boolean;
  offersDisabledMessage: string;
  chatEnabled: boolean;
  chatDisabledMessage: string;
  depositsEnabled: boolean;
  depositsDisabledMessage: string;
  withdrawalsEnabled: boolean;
  withdrawalsDisabledMessage: string;
}

export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings>({
    appEnabled: true,
    appDisabledMessage: "",
    landingEnabled: true,
    landingDisabledMessage: "",
    tasksEnabled: true,
    tasksDisabledMessage: "",
    luckyWheelEnabled: true,
    luckyWheelDisabledMessage: "",
    referralEnabled: true,
    referralDisabledMessage: "",
    teamEnabled: true,
    teamDisabledMessage: "",
    walletEnabled: true,
    walletDisabledMessage: "",
    adsEnabled: true,
    adsDisabledMessage: "",
    offersEnabled: true,
    offersDisabledMessage: "",
    chatEnabled: true,
    chatDisabledMessage: "",
    depositsEnabled: true,
    depositsDisabledMessage: "",
    withdrawalsEnabled: true,
    withdrawalsDisabledMessage: "",
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
      const settingsMap: Record<string, { is_active: boolean; value: string }> = {};
      data.forEach((setting) => {
        settingsMap[setting.key] = {
          is_active: setting.is_active ?? true,
          value: setting.value || ""
        };
      });

      setSettings({
        appEnabled: settingsMap["app_enabled"]?.is_active ?? true,
        appDisabledMessage: settingsMap["app_disabled_message"]?.value || "التطبيق تحت الصيانة",
        landingEnabled: settingsMap["landing_enabled"]?.is_active ?? true,
        landingDisabledMessage: settingsMap["landing_disabled_message"]?.value || "الصفحة مغلقة حالياً",
        tasksEnabled: settingsMap["tasks_enabled"]?.is_active ?? true,
        tasksDisabledMessage: settingsMap["tasks_disabled_message"]?.value || "نظام المهام متوقف مؤقتاً",
        luckyWheelEnabled: settingsMap["lucky_wheel_enabled"]?.is_active ?? true,
        luckyWheelDisabledMessage: settingsMap["lucky_wheel_disabled_message"]?.value || "عجلة الحظ متوقفة مؤقتاً",
        referralEnabled: settingsMap["referral_enabled"]?.is_active ?? true,
        referralDisabledMessage: settingsMap["referral_disabled_message"]?.value || "نظام الإحالة متوقف مؤقتاً",
        teamEnabled: settingsMap["team_enabled"]?.is_active ?? true,
        teamDisabledMessage: settingsMap["team_disabled_message"]?.value || "نظام الفريق متوقف مؤقتاً",
        walletEnabled: settingsMap["wallet_enabled"]?.is_active ?? true,
        walletDisabledMessage: settingsMap["wallet_disabled_message"]?.value || "المحفظة متوقفة مؤقتاً",
        adsEnabled: settingsMap["ads_enabled"]?.is_active ?? true,
        adsDisabledMessage: settingsMap["ads_disabled_message"]?.value || "نظام الإعلانات متوقف مؤقتاً",
        offersEnabled: settingsMap["offers_enabled"]?.is_active ?? true,
        offersDisabledMessage: settingsMap["offers_disabled_message"]?.value || "العروض متوقفة مؤقتاً",
        chatEnabled: settingsMap["chat_enabled"]?.is_active ?? true,
        chatDisabledMessage: settingsMap["chat_disabled_message"]?.value || "الدردشة متوقفة مؤقتاً",
        depositsEnabled: settingsMap["deposits_enabled"]?.is_active ?? true,
        depositsDisabledMessage: settingsMap["deposits_disabled_message"]?.value || "الإيداعات متوقفة مؤقتاً",
        withdrawalsEnabled: settingsMap["withdrawals_enabled"]?.is_active ?? true,
        withdrawalsDisabledMessage: settingsMap["withdrawals_disabled_message"]?.value || "السحوبات متوقفة مؤقتاً",
      });
    }
    setLoading(false);
  };

  return { settings, loading, refetch: fetchSettings };
};

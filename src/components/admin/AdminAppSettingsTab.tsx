import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Power, Settings, Save, AlertTriangle, CheckCircle, Briefcase, Target, Users, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AppSetting {
  key: string;
  value: string | null;
  is_active: boolean;
}

const settingsConfig = [
  { key: "app_enabled", label: "التطبيق بالكامل", icon: Power, messageKey: "app_disabled_message" },
  { key: "tasks_enabled", label: "نظام المهام اليومية", icon: Briefcase, messageKey: "tasks_disabled_message" },
  { key: "lucky_wheel_enabled", label: "عجلة الحظ", icon: Target, messageKey: "lucky_wheel_disabled_message" },
  { key: "referral_enabled", label: "نظام الإحالة", icon: Share2, messageKey: "referral_disabled_message" },
  { key: "team_enabled", label: "نظام الفريق والرتب", icon: Users, messageKey: "team_disabled_message" },
];

export const AdminAppSettingsTab = () => {
  const [settings, setSettings] = useState<Record<string, AppSetting>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_settings")
      .select("*");

    if (error) {
      console.error("Error fetching settings:", error);
      toast.error("حدث خطأ في تحميل الإعدادات");
    } else {
      const settingsMap: Record<string, AppSetting> = {};
      data?.forEach((setting) => {
        settingsMap[setting.key] = setting;
      });
      setSettings(settingsMap);
    }
    setLoading(false);
  };

  const handleToggle = async (key: string, enabled: boolean) => {
    const value = enabled ? "true" : "false";
    
    const { error } = await supabase
      .from("app_settings")
      .update({ value })
      .eq("key", key);

    if (error) {
      toast.error("حدث خطأ في تحديث الإعداد");
      console.error("Error updating setting:", error);
    } else {
      setSettings((prev) => ({
        ...prev,
        [key]: { ...prev[key], value },
      }));
      toast.success(enabled ? "تم تفعيل الميزة" : "تم إيقاف الميزة");
    }
  };

  const handleMessageUpdate = async (key: string, message: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ value: message })
      .eq("key", key);

    if (error) {
      toast.error("حدث خطأ في تحديث الرسالة");
      console.error("Error updating message:", error);
    } else {
      setSettings((prev) => ({
        ...prev,
        [key]: { ...prev[key], value: message },
      }));
      toast.success("تم حفظ الرسالة");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-bold">إدارة حالة التطبيق والوظائف</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          تحكم في تشغيل أو إيقاف التطبيق بالكامل أو أي وظيفة فرعية في الوقت الفعلي
        </p>

        <div className="space-y-4">
          {settingsConfig.map((config) => {
            const isEnabled = settings[config.key]?.value === "true";
            const messageValue = settings[config.messageKey]?.value || "";
            const Icon = config.icon;

            return (
              <motion.div
                key={config.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-border rounded-xl p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isEnabled ? "bg-emerald/10" : "bg-destructive/10"
                    }`}>
                      <Icon className={`w-5 h-5 ${isEnabled ? "text-emerald" : "text-destructive"}`} />
                    </div>
                    <div>
                      <p className="font-bold">{config.label}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {isEnabled ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald" />
                            <span className="text-emerald">مفعّل</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3 text-destructive" />
                            <span className="text-destructive">متوقف</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggle(config.key, checked)}
                  />
                </div>

                {!isEnabled && (
                  <div className="space-y-2">
                    <Label className="text-sm">رسالة الإيقاف (تظهر للمستخدمين)</Label>
                    <div className="flex gap-2">
                      <Textarea
                        value={messageValue}
                        onChange={(e) => {
                          setSettings((prev) => ({
                            ...prev,
                            [config.messageKey]: { ...prev[config.messageKey], value: e.target.value },
                          }));
                        }}
                        placeholder="أدخل الرسالة التي ستظهر للمستخدمين"
                        className="min-h-[60px]"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleMessageUpdate(config.messageKey, messageValue)}
                        disabled={saving}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

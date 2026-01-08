import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, Save, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AdminBotSettingsTab = () => {
  const [botCode, setBotCode] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBotSettings();
  }, []);

  const fetchBotSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .eq("key", "bot_code")
      .maybeSingle();

    if (data) {
      setBotCode(data.value || "");
      setIsActive(data.is_active || false);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({
          key: "bot_code",
          value: botCode,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" });

      if (error) throw error;
      toast.success("تم حفظ إعدادات البوت بنجاح");
    } catch (error) {
      console.error("Error saving bot settings:", error);
      toast.error("حدث خطأ في حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    const newActive = !isActive;
    setIsActive(newActive);
    
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ 
          is_active: newActive,
          updated_at: new Date().toISOString(),
        })
        .eq("key", "bot_code");

      if (error) throw error;
      toast.success(newActive ? "تم تفعيل البوت" : "تم تعطيل البوت");
    } catch (error) {
      console.error("Error toggling bot:", error);
      setIsActive(!newActive);
      toast.error("حدث خطأ في تغيير حالة البوت");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">إعدادات البوت</h2>
              <p className="text-sm text-muted-foreground">إضافة كود البوت الخارجي</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isActive ? (
                <Power className="w-5 h-5 text-emerald" />
              ) : (
                <PowerOff className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="text-sm">{isActive ? "مفعّل" : "معطّل"}</span>
              <Switch
                checked={isActive}
                onCheckedChange={toggleActive}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              كود HTML/JavaScript للبوت
            </label>
            <Textarea
              placeholder="الصق كود البوت هنا (مثل: <script>...</script> أو <iframe>...</iframe>)"
              value={botCode}
              onChange={(e) => setBotCode(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground mt-2">
              يمكنك إضافة أي كود HTML أو JavaScript للبوت الخارجي. سيظهر البوت في أيقونة ثابتة أسفل يمين الشاشة.
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-gold text-primary-foreground"
          >
            {saving ? (
              <span className="animate-spin mr-2">⏳</span>
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            حفظ الإعدادات
          </Button>
        </div>
      </div>

      {/* Preview */}
      {botCode && isActive && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-bold mb-4">معاينة البوت</h3>
          <div 
            className="border border-border rounded-lg p-4 bg-muted/50 min-h-[200px]"
            dangerouslySetInnerHTML={{ __html: botCode }}
          />
        </div>
      )}
    </motion.div>
  );
};
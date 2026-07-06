import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Ghost, Save, Loader2, Power, Timer, Target, Zap, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DEFAULT_HAUNTED_CONFIG, type HauntedHouseConfig } from "@/components/games/registry";

export const AdminGamesTab = () => {
  const [config, setConfig] = useState<HauntedHouseConfig>(DEFAULT_HAUNTED_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value, is_active")
        .eq("key", "game_haunted_house")
        .maybeSingle();
      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value);
          setConfig({ ...DEFAULT_HAUNTED_CONFIG, ...parsed, enabled: data.is_active !== false });
        } catch {
          setConfig({ ...DEFAULT_HAUNTED_CONFIG, enabled: data.is_active !== false });
        }
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert({
      key: "game_haunted_house",
      value: JSON.stringify(config),
      is_active: config.enabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });
    setSaving(false);
    if (error) toast.error("فشل حفظ الإعدادات: " + error.message);
    else toast.success("تم حفظ إعدادات اللعبة ✅");
  };

  if (loading) return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-indigo-800 flex items-center justify-center">
            <Ghost className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg">بيت الأشباح</h3>
            <p className="text-xs text-muted-foreground">التحكم الكامل في اللعبة</p>
          </div>
        </div>

        <div className="space-y-4">
          <ToggleRow icon={Power} label="تشغيل اللعبة" checked={config.enabled}
            onChange={v => setConfig(c => ({ ...c, enabled: v }))} />

          <NumberRow icon={Target} label="عدد الأشباح للفوز" value={config.target_ghosts}
            min={1} max={50}
            onChange={v => setConfig(c => ({ ...c, target_ghosts: v }))} />

          <NumberRow icon={Timer} label="مدة الجولة (ثانية)" value={config.duration_seconds}
            min={15} max={600}
            onChange={v => setConfig(c => ({ ...c, duration_seconds: v }))} />

          <NumberRow icon={Zap} label="مضاعف سرعة الظهور" value={config.spawn_speed_multiplier}
            step={0.1} min={0.3} max={4}
            onChange={v => setConfig(c => ({ ...c, spawn_speed_multiplier: v }))} />

          <ToggleRow icon={Ghost} label="تفعيل الأشباح الوهمية" checked={config.fake_ghosts_enabled}
            onChange={v => setConfig(c => ({ ...c, fake_ghosts_enabled: v }))} />

          <ToggleRow icon={EyeOff} label="عرض الشاشة التعليمية" checked={config.tutorial_enabled}
            onChange={v => setConfig(c => ({ ...c, tutorial_enabled: v }))} />
        </div>

        <Button onClick={save} disabled={saving} className="w-full mt-5 bg-gradient-gold text-primary-foreground font-bold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 ml-2" /> حفظ الإعدادات</>}
        </Button>
      </div>

      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-muted-foreground">
        <p className="text-sm">قريبًا: إدارة ألعاب إضافية 🎮</p>
      </div>
    </motion.div>
  );
};

const ToggleRow = ({ icon: Icon, label, checked, onChange }: any) => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
    <Label className="flex items-center gap-2 font-medium cursor-pointer"><Icon className="w-4 h-4 text-primary" /> {label}</Label>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

const NumberRow = ({ icon: Icon, label, value, onChange, min, max, step = 1 }: any) => (
  <div className="p-3 rounded-xl bg-muted/40 space-y-2">
    <Label className="flex items-center gap-2 font-medium"><Icon className="w-4 h-4 text-primary" /> {label}</Label>
    <Input type="number" value={value} min={min} max={max} step={step}
      onChange={e => onChange(step < 1 ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0)}
      className="text-center font-bold" />
  </div>
);
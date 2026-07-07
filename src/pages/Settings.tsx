import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sun, Moon, Monitor, Shield, RefreshCw, ArrowRight, ExternalLink, Loader2, CheckCircle2 } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { CURRENT_VERSION } from "@/lib/appVersion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SEO from "@/components/SEO";

const PRIVACY_POLICY_URL = "https://www.termsfeed.com/live/934671e3-6df3-4eca-a394-ba1e27a360d7";

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { mode, setMode } = useTheme();
  const [checking, setChecking] = useState(false);
  const [versionInfo, setVersionInfo] = useState<{ latest: string; upToDate: boolean } | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const checkForUpdate = async () => {
    setChecking(true);
    setVersionInfo(null);
    try {
      const { data, error } = await supabase
        .from("app_versions")
        .select("version, version_code")
        .eq("is_active", true)
        .eq("status", "published")
        .order("version_code", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const latest = data?.version || CURRENT_VERSION;
      const upToDate = latest === CURRENT_VERSION;
      setVersionInfo({ latest, upToDate });
      toast.success(upToDate ? "أنت تستخدم أحدث إصدار" : `يتوفر إصدار جديد: ${latest}`);
    } catch {
      toast.error("تعذّر التحقق من الإصدار");
    } finally {
      setChecking(false);
    }
  };

  const themeOptions: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "فاتح", icon: Sun },
    { id: "dark", label: "داكن", icon: Moon },
    { id: "system", label: "تلقائي", icon: Monitor },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO title="الإعدادات" path="/settings" noIndex />
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <BackButton to="/app" label="رجوع" />
          <h1 className="text-lg font-bold">الإعدادات</h1>
          <div className="w-10" />
        </div>
      </header>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Theme */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Sun className="w-4 h-4" /> المظهر</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map(o => {
                const active = mode === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setMode(o.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                      active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    <o.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{o.label}</span>
                    {active && <CheckCircle2 className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              يتم حفظ اختيارك على حسابك ومزامنته على كل الأجهزة.
            </p>
          </CardContent>
        </Card>

        {/* Check version */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><RefreshCw className="w-4 h-4" /> إصدار التطبيق</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">الإصدار الحالي</span>
              <span className="font-mono font-bold">{CURRENT_VERSION}</span>
            </div>
            <Button onClick={checkForUpdate} disabled={checking} variant="outline" className="w-full">
              {checking ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري التحقق...</> : "التحقق من وجود إصدار جديد"}
            </Button>
            {versionInfo && (
              <div className={`text-sm rounded-xl p-3 ${versionInfo.upToDate ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                {versionInfo.upToDate ? "أنت تستخدم أحدث إصدار متوفر." : `يتوفر إصدار أحدث: ${versionInfo.latest}`}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Privacy Policy */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> سياسة الخصوصية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              يمكنك مراجعة سياسة الخصوصية التي وافقت عليها عند إنشاء الحساب في أي وقت.
            </p>
            <a
              href={PRIVACY_POLICY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-3 bg-muted/40 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium"
            >
              <ExternalLink className="w-4 h-4 text-primary" />
              فتح سياسة الخصوصية
            </a>
          </CardContent>
        </Card>

        <Separator />

        {/* Existing account settings — embed via a wrapper page */}
        <SettingsAccountEmbed />
      </motion.div>
    </div>
  );
};

// Render ProfileSettings inline instead of as a modal by mounting it open with a no-op close
const SettingsAccountEmbed = () => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <ProfileSettings isOpen={open} onClose={() => setOpen(true)} />
      {!open && (
        <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
          فتح إعدادات الحساب
        </Button>
      )}
    </>
  );
};

export default Settings;
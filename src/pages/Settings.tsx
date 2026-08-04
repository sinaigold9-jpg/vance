import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sun, Moon, Monitor, Shield, RefreshCw, ArrowRight, ExternalLink, Loader2, CheckCircle2, Info, BadgeCheck } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { CURRENT_VERSION, CURRENT_VERSION_CODE, setSeenVersionCode } from "@/lib/appVersion";
import { useLatestVersion } from "@/hooks/useLatestVersion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SEO from "@/components/SEO";

const PRIVACY_POLICY_URL = "https://www.termsfeed.com/live/934671e3-6df3-4eca-a394-ba1e27a360d7";

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { mode, setMode } = useTheme();
  const latest = useLatestVersion();
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
      const latestCode = data?.version_code || CURRENT_VERSION_CODE;
      const upToDate = latestCode <= CURRENT_VERSION_CODE;
      setVersionInfo({ latest, upToDate });
      if (upToDate) {
        toast.success("أنت تستخدم أحدث إصدار");
      } else {
        toast.success(`يتوفر إصدار جديد: ${latest} — سيتم فتح شاشة التحديث`);
        // Reset the "seen" flag so UpdateGate shows the update screen again
        setSeenVersionCode(CURRENT_VERSION_CODE - 1);
        setTimeout(() => window.location.reload(), 800);
      }
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
              <span className="font-mono font-bold">{latest.loading ? CURRENT_VERSION : latest.version}</span>
            </div>
            {latest.title && (
              <p className="text-xs text-muted-foreground">{latest.title}</p>
            )}
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

        {/* Account verification */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><BadgeCheck className="w-4 h-4" /> توثيق الحساب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              وثّق حسابك بالتحقق من الوجه عبر الكاميرا واحصل على 50 جنيه كاش باك مرة واحدة.
            </p>
            <Button className="w-full" variant="outline" onClick={() => navigate("/verification")}>
              <ArrowRight className="w-4 h-4 ml-2" />
              فتح توثيق الحساب
            </Button>
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

        {/* About Us */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Info className="w-4 h-4" /> عنا</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              تعرّف على تطبيق Advance، رؤيتنا، وخدماتنا.
            </p>
            <Button className="w-full" variant="outline" onClick={() => navigate("/about")}>
              <ArrowRight className="w-4 h-4 ml-2" />
              فتح صفحة "عنا"
            </Button>
          </CardContent>
        </Card>

        <Separator />

        {/* Account settings (notifications, data saver, battery, change requests) */}
        <AccountSettingsSection />
      </motion.div>
    </div>
  );
};

const AccountSettingsSection = () => {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">إعدادات الحساب</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          الإشعارات، توفير البيانات، تحسين البطارية، وطلبات تعديل بيانات الحساب.
        </p>
        <Button className="w-full" variant="outline" onClick={() => setOpen(true)}>
          <ArrowRight className="w-4 h-4 ml-2" />
          فتح إعدادات الحساب
        </Button>
        <ProfileSettings isOpen={open} onClose={() => setOpen(false)} />
      </CardContent>
    </Card>
  );
};

export default Settings;
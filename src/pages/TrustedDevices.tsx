import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Smartphone, Tablet, Monitor, ShieldCheck, Trash2, Loader2, BellRing, HelpCircle,
} from "lucide-react";
import { BackButton } from "@/components/BackButton";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getDeviceId } from "@/lib/deviceInfo";
import { toast } from "sonner";

interface DeviceRow {
  id: string;
  device_id: string;
  device_name: string;
  device_type: string;
  os: string | null;
  os_version: string | null;
  browser: string | null;
  app_version: string | null;
  is_trusted: boolean;
  first_seen_at: string;
  last_active_at: string;
}

const typeIcon = (t: string) =>
  t === "mobile" ? Smartphone : t === "tablet" ? Tablet : t === "desktop" ? Monitor : HelpCircle;

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("ar-EG", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "numeric", minute: "2-digit", hour12: true,
  });

const TrustedDevices = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [notify, setNotify] = useState(true);
  const [toRemove, setToRemove] = useState<DeviceRow | null>(null);
  const currentId = getDeviceId();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    const [{ data: rows }, { data: profile }] = await Promise.all([
      supabase
        .from("user_devices")
        .select("id, device_id, device_name, device_type, os, os_version, browser, app_version, is_trusted, first_seen_at, last_active_at")
        .eq("user_id", user.id)
        .order("last_active_at", { ascending: false }),
      supabase.from("profiles").select("new_device_notifications").eq("id", user.id).maybeSingle(),
    ]);
    setDevices((rows as DeviceRow[]) ?? []);
    if (profile) setNotify(profile.new_device_notifications !== false);
    setBusy(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const toggleNotify = async (value: boolean) => {
    if (!user) return;
    setNotify(value);
    const { error } = await supabase
      .from("profiles")
      .update({ new_device_notifications: value })
      .eq("id", user.id);
    if (error) {
      setNotify(!value);
      toast.error("تعذّر حفظ الإعداد");
    }
  };

  const removeDevice = async () => {
    if (!toRemove || !user) return;
    const target = toRemove;
    setToRemove(null);
    const { error } = await supabase.from("user_devices").delete().eq("id", target.id);
    if (error) { toast.error("تعذّر إزالة الجهاز"); return; }
    setDevices(d => d.filter(x => x.id !== target.id));
    toast.success("تمت إزالة الجهاز وإلغاء حالة الثقة");
    if (target.device_id === currentId) {
      await supabase.auth.signOut();
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="الأجهزة الموثوقة" path="/settings/devices" noIndex />
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <BackButton to="/settings" label="رجوع" />
          <h1 className="text-lg font-bold">الأجهزة الموثوقة</h1>
          <div className="w-10" />
        </div>
      </header>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BellRing className="w-4 h-4" /> إشعارات الأجهزة الجديدة
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              إرسال إشعار عند تسجيل الدخول إلى حسابك من جهاز جديد.
            </p>
            <Switch checked={notify} onCheckedChange={toggleNotify} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> الأجهزة المرتبطة بحسابك
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {busy ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : devices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">لا توجد أجهزة مسجّلة بعد.</p>
            ) : (
              devices.map(d => {
                const Icon = typeIcon(d.device_type);
                const isCurrent = d.device_id === currentId;
                return (
                  <div key={d.id} className="flex items-start gap-3 p-3 rounded-2xl border border-border bg-card">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium truncate">{d.device_name}</span>
                        {isCurrent && <Badge variant="secondary" className="text-[10px]">هذا الجهاز</Badge>}
                        {d.is_trusted ? (
                          <Badge className="text-[10px]">موثوق</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">غير موثوق</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {[d.os, d.os_version].filter(Boolean).join(" ") || "نظام غير معروف"}
                        {d.browser ? ` · ${d.browser}` : ""}
                        {d.app_version ? ` · إصدار التطبيق ${d.app_version}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">أول تسجيل: {fmt(d.first_seen_at)}</p>
                      <p className="text-xs text-muted-foreground">آخر نشاط: {fmt(d.last_active_at)}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => setToRemove(d)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })
            )}
            <p className="text-xs text-muted-foreground pt-1">
              عند إزالة أي جهاز يتم إلغاء حالة الثقة الخاصة به، ولن يمكن استخدام الحساب منه إلا بعد تسجيل الدخول والتحقق من جديد.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <AlertDialog open={!!toRemove} onOpenChange={o => !o && setToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إزالة الجهاز؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إلغاء ثقة الجهاز «{toRemove?.device_name}»
              {toRemove?.device_id === currentId ? " وسيتم تسجيل خروجك من هذا الجهاز الآن." : "."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={removeDevice}>إزالة</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TrustedDevices;

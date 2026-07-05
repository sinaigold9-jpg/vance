import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, Bot, CheckCircle2, Loader2, RefreshCw, Send, Smartphone, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { registerPushNotifications } from "@/lib/pushNotifications";
import { toast } from "sonner";

type DeliveryLog = {
  id: string;
  channel: string;
  status: string;
  title: string | null;
  message: string | null;
  target_count: number;
  sent_count: number;
  failed_count: number;
  expired_count: number;
  error_details: unknown;
  created_at: string;
};

type Diagnostics = {
  generated_at: string;
  vapid: {
    public_configured: boolean;
    private_configured: boolean;
    subject_configured: boolean;
    public_key_valid: boolean;
    public_key_error: string | null;
    match_verified_by: string;
  };
  push: {
    subscriptions_count: number;
    invalid_recent_subscriptions: number;
    recent_subscriptions: Array<{ id: string; user_id: string; endpoint_tail: string; has_keys: boolean; created_at: string }>;
  };
  telegram: {
    configured: boolean;
    ok: boolean;
    bot_username: string | null;
    error: string | null;
    linked_users_count: number;
  };
  latest_delivery_logs: DeliveryLog[];
  open_errors_count: number;
  issues: Array<{ severity: string; title: string }>;
};

type BrowserPushState = {
  supported: boolean;
  permission: NotificationPermission | "unknown";
  swRegistered: boolean;
  swActive: boolean;
  subscribed: boolean;
  endpointTail?: string;
  error?: string;
};

const statusLabels: Record<string, string> = {
  success: "ناجح",
  partial: "جزئي",
  failed: "فشل",
  skipped: "لم يُرسل",
};

export const AdminNotificationDiagnosticsTab = () => {
  const { user } = useAuth();
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [browserState, setBrowserState] = useState<BrowserPushState | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [testReport, setTestReport] = useState<string[]>([]);

  const hasCriticalIssue = useMemo(() => diagnostics?.issues?.some(i => i.severity === "error") || false, [diagnostics]);

  useEffect(() => {
    refreshAll();
  }, []);

  const inspectBrowserPush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setBrowserState({ supported: false, permission: "unknown", swRegistered: false, swActive: false, subscribed: false, error: "المتصفح الحالي لا يدعم Web Push" });
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      setBrowserState({
        supported: true,
        permission: Notification.permission,
        swRegistered: !!registration,
        swActive: !!registration?.active,
        subscribed: !!subscription,
        endpointTail: subscription?.endpoint?.slice(-18),
      });
    } catch (e: any) {
      setBrowserState({ supported: true, permission: Notification.permission, swRegistered: false, swActive: false, subscribed: false, error: e?.message || "فشل فحص Service Worker" });
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([fetchDiagnostics(), inspectBrowserPush()]);
    setLoading(false);
  };

  const fetchDiagnostics = async () => {
    const { data, error } = await supabase.functions.invoke("notification-diagnostics");
    if (error) {
      toast.error(`فشل التشخيص: ${error.message}`);
      return;
    }
    setDiagnostics(data as Diagnostics);
  };

  const enableThisDevice = async () => {
    if (!user) return;
    setEnabling(true);
    const result = await registerPushNotifications(user.id);
    setEnabling(false);
    await refreshAll();
    if (result.ok) toast.success("تم تسجيل هذا الجهاز في إشعارات Push");
    else toast.error(result.message || "فشل تسجيل الجهاز");
  };

  const runNotificationTest = async () => {
    if (!user) return;
    setTesting(true);
    setTestReport([]);

    const title = "اختبار إشعارات Advance";
    const message = `اختبار فعلي من لوحة الإدارة - ${new Date().toLocaleTimeString("ar-EG")}`;
    const report: string[] = [];

    try {
      const [push, telegram] = await Promise.all([
        supabase.functions.invoke("send-push", { body: { user_id: user.id, title, message, link: "/app", type: "diagnostic" } }),
        supabase.functions.invoke("broadcast-telegram", { body: { user_id: user.id, title, message, link: "/app" } }),
      ]);

      report.push(formatChannelResult("Push Android/iOS", push.data, push.error));
      report.push(formatChannelResult("Telegram Bot", telegram.data, telegram.error));
      setTestReport(report);

      const ok = report.every(item => item.startsWith("✅"));
      toast[ok ? "success" : "error"](ok ? "نجح اختبار الإشعارات فعلياً" : "فشل جزء من الاختبار — راجع التقرير");
      await refreshAll();
    } finally {
      setTesting(false);
    }
  };

  const metricCards = diagnostics ? [
    { label: "أجهزة Push", value: diagnostics.push.subscriptions_count, icon: Smartphone, ok: diagnostics.push.subscriptions_count > 0 },
    { label: "مستخدمو Telegram", value: diagnostics.telegram.linked_users_count, icon: Bot, ok: diagnostics.telegram.linked_users_count > 0 },
    { label: "VAPID", value: diagnostics.vapid.public_key_valid && diagnostics.vapid.private_configured ? "صالح" : "خلل", icon: Bell, ok: diagnostics.vapid.public_key_valid && diagnostics.vapid.private_configured },
    { label: "أخطاء مفتوحة", value: diagnostics.open_errors_count, icon: AlertTriangle, ok: diagnostics.open_errors_count === 0 },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">تشخيص الإشعارات الحقيقي</h2>
          <p className="text-sm text-muted-foreground">فحص Service Worker، الاشتراكات، VAPID، Telegram، وآخر نتائج إرسال فعلية.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refreshAll} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <RefreshCw className="w-4 h-4 ml-2" />}
            تحديث التشخيص
          </Button>
          <Button onClick={runNotificationTest} disabled={testing || !user}>
            {testing ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Send className="w-4 h-4 ml-2" />}
            اختبار الإشعارات
          </Button>
        </div>
      </div>

      {hasCriticalIssue && diagnostics && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>يوجد خلل يمنع وصول بعض الإشعارات</AlertTitle>
          <AlertDescription>{diagnostics.issues.map(i => i.title).join(" — ")}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map(card => (
          <Card key={card.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <card.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="font-bold">{card.value}</p>
                {card.ok ? <CheckCircle2 className="w-4 h-4 text-emerald" /> : <XCircle className="w-4 h-4 text-destructive" />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Smartphone className="w-5 h-5" /> حالة هذا الجهاز</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <StatusLine label="دعم المتصفح" ok={!!browserState?.supported} value={browserState?.supported ? "مدعوم" : browserState?.error || "غير مدعوم"} />
            <StatusLine label="إذن الإشعارات" ok={browserState?.permission === "granted"} value={browserState?.permission || "unknown"} />
            <StatusLine label="Service Worker" ok={!!browserState?.swRegistered && !!browserState?.swActive} value={browserState?.swRegistered ? (browserState.swActive ? "مسجل ونشط" : "مسجل وغير نشط") : "غير مسجل"} />
            <StatusLine label="Push Subscription" ok={!!browserState?.subscribed} value={browserState?.subscribed ? `محفوظ محلياً (${browserState.endpointTail})` : "غير موجود على هذا الجهاز"} />
            <Button variant="outline" onClick={enableThisDevice} disabled={enabling || !user} className="w-full">
              {enabling ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Bell className="w-4 h-4 ml-2" />}
              تسجيل هذا الجهاز الآن
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5" /> حالة الخلفية والقنوات</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <StatusLine label="VAPID Public" ok={!!diagnostics?.vapid.public_key_valid} value={diagnostics?.vapid.public_key_error || "صيغة صحيحة"} />
            <StatusLine label="VAPID Private" ok={!!diagnostics?.vapid.private_configured} value={diagnostics?.vapid.private_configured ? "موجود" : "غير موجود"} />
            <StatusLine label="Telegram Token" ok={!!diagnostics?.telegram.ok} value={diagnostics?.telegram.ok ? `متصل @${diagnostics.telegram.bot_username}` : diagnostics?.telegram.error || "غير مفحوص"} />
            <p className="text-xs text-muted-foreground">{diagnostics?.vapid.match_verified_by}</p>
          </CardContent>
        </Card>
      </div>

      {testReport.length > 0 && (
        <Card className="border-primary/40">
          <CardHeader><CardTitle>تقرير اختبار الإشعارات</CardTitle></CardHeader>
          <CardContent className="space-y-2 whitespace-pre-line text-sm">
            {testReport.map((line, index) => <p key={index}>{line}</p>)}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>آخر عمليات الإرسال الخارجية</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[420px]">
            <div className="space-y-3">
              {(diagnostics?.latest_delivery_logs || []).map(log => (
                <div key={log.id} className="rounded-lg border border-border/50 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{log.channel}</Badge>
                      <Badge variant={log.status === "success" ? "default" : "destructive"}>{statusLabels[log.status] || log.status}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("ar-EG")}</span>
                  </div>
                  <p className="font-medium text-sm">{log.title || "بدون عنوان"}</p>
                  <p className="text-xs text-muted-foreground">المستهدف: {log.target_count} — وصل: {log.sent_count} — فشل: {log.failed_count} — منتهي: {log.expired_count}</p>
                  {Array.isArray(log.error_details) && log.error_details.length > 0 && (
                    <pre className="text-xs bg-muted/50 rounded-md p-2 overflow-auto" dir="ltr">{JSON.stringify(log.error_details, null, 2)}</pre>
                  )}
                </div>
              ))}
              {!diagnostics?.latest_delivery_logs?.length && <p className="text-center text-muted-foreground py-8">لا توجد عمليات إرسال مسجلة بعد</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

const StatusLine = ({ label, ok, value }: { label: string; ok: boolean; value: string }) => (
  <>
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 text-left">
        {ok ? <CheckCircle2 className="w-4 h-4 text-emerald" /> : <XCircle className="w-4 h-4 text-destructive" />}
        <span>{value}</span>
      </span>
    </div>
    <Separator />
  </>
);

function formatChannelResult(label: string, data: any, error: any) {
  const sent = Number(data?.sent_count ?? data?.sent ?? 0);
  const total = Number(data?.target_count ?? data?.total ?? 0);
  const failed = Number(data?.failed_count ?? data?.failed ?? 0);
  const expired = Number(data?.expired_count ?? data?.expired ?? 0);
  const reason = data?.message || data?.error_details?.[0]?.message || error?.message || "سبب غير معروف";
  if (!error && sent > 0 && failed + expired === 0) return `✅ ${label}: وصل فعلياً إلى ${sent}/${total}`;
  return `❌ ${label}: ${reason} — المستهدف ${total} / وصل ${sent} / فشل ${failed} / منتهي ${expired}`;
}
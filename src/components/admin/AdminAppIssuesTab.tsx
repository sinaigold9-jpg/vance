import { useEffect, useState } from "react";
import { AlertTriangle, Bug, CheckCircle2, Loader2, RefreshCw, ShieldAlert, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Issue = {
  id: string;
  source: string;
  severity: string;
  title: string;
  message: string;
  stack: string | null;
  url: string | null;
  user_agent: string | null;
  metadata: unknown;
  status: string;
  created_at: string;
  updated_at: string;
};

const severityLabels: Record<string, string> = {
  info: "معلومة",
  warning: "تحذير",
  error: "خطأ",
  critical: "حرج",
};

const sourceLabels: Record<string, string> = {
  client: "واجهة التطبيق",
  backend: "الخلفية",
  security: "أمان/ثغرات",
  notification: "الإشعارات",
};

export const AdminAppIssuesTab = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [statusFilter, setStatusFilter] = useState("open");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetchIssues();
  }, [statusFilter]);

  const fetchIssues = async () => {
    setLoading(true);
    let query = supabase.from("app_error_reports").select("*").order("created_at", { ascending: false }).limit(100);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    const { data, error } = await query;
    setLoading(false);
    if (error) toast.error(error.message);
    else setIssues((data || []) as Issue[]);
  };

  const updateStatus = async (id: string, status: "resolved" | "ignored" | "open") => {
    const { error } = await supabase
      .from("app_error_reports")
      .update({ status, resolved_at: status === "resolved" ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(status === "resolved" ? "تم إغلاق البلاغ" : "تم تحديث البلاغ");
      fetchIssues();
    }
  };

  const runRealHealthCheck = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("notification-diagnostics");
      if (error) throw error;
      const issues = (data as any)?.issues || [];
      if (!issues.length) {
        toast.success("لم يرصد الفحص السريع خللاً في نظام الإشعارات");
      } else {
        await Promise.all(issues.map((issue: any) => supabase.functions.invoke("log-client-error", {
          body: {
            source: issue.severity === "error" ? "security" : "notification",
            severity: issue.severity === "error" ? "critical" : "warning",
            title: issue.title,
            message: `تم رصد هذا الخلل أثناء فحص النظام الحقيقي في ${new Date().toLocaleString("ar-EG")}`,
            metadata: { diagnostic: data },
          },
        })));
        toast.error(`تم تسجيل ${issues.length} مشكلة حقيقية`);
      }
      fetchIssues();
    } catch (e: any) {
      toast.error(e?.message || "فشل الفحص");
    } finally {
      setChecking(false);
    }
  };

  const counts = {
    open: issues.filter(i => i.status === "open").length,
    critical: issues.filter(i => i.severity === "critical").length,
    errors: issues.filter(i => i.severity === "error").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">أخطاء وثغرات التطبيق</h2>
          <p className="text-sm text-muted-foreground">يعرض أخطاء حقيقية مرصودة من الواجهة والخلفية ونظام الإشعارات، وليس بيانات وهمية.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchIssues} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <RefreshCw className="w-4 h-4 ml-2" />}
            تحديث
          </Button>
          <Button onClick={runRealHealthCheck} disabled={checking}>
            {checking ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <ShieldAlert className="w-4 h-4 ml-2" />}
            فحص سريع حقيقي
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="مفتوحة" value={counts.open} icon={Bug} />
        <StatCard label="حرجة" value={counts.critical} icon={ShieldAlert} />
        <StatCard label="أخطاء" value={counts.errors} icon={AlertTriangle} />
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>سجل البلاغات</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">المفتوحة</SelectItem>
                <SelectItem value="resolved">المغلقة</SelectItem>
                <SelectItem value="ignored">المتجاهلة</SelectItem>
                <SelectItem value="all">الكل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[640px]">
            <div className="space-y-3">
              {loading ? (
                [1, 2, 3].map(i => <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />)
              ) : issues.length ? issues.map(issue => (
                <div key={issue.id} className="rounded-lg border border-border/50 p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={issue.severity === "critical" || issue.severity === "error" ? "destructive" : "outline"}>{severityLabels[issue.severity] || issue.severity}</Badge>
                        <Badge variant="outline">{sourceLabels[issue.source] || issue.source}</Badge>
                        <Badge variant={issue.status === "open" ? "default" : "secondary"}>{issue.status}</Badge>
                      </div>
                      <h3 className="font-bold">{issue.title}</h3>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(issue.created_at).toLocaleString("ar-EG")}</span>
                  </div>

                  <p className="text-sm text-muted-foreground whitespace-pre-line">{issue.message}</p>
                  {issue.url && <p className="text-xs text-muted-foreground break-all" dir="ltr">{issue.url}</p>}
                  {issue.stack && <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-auto max-h-44" dir="ltr">{issue.stack}</pre>}
                  {issue.metadata && <pre className="text-xs bg-muted/30 rounded-md p-3 overflow-auto max-h-44" dir="ltr">{JSON.stringify(issue.metadata, null, 2)}</pre>}

                  <div className="flex flex-wrap gap-2">
                    {issue.status !== "resolved" && <Button size="sm" variant="outline" onClick={() => updateStatus(issue.id, "resolved")}><CheckCircle2 className="w-4 h-4 ml-1" /> تم الإصلاح</Button>}
                    {issue.status !== "ignored" && <Button size="sm" variant="ghost" onClick={() => updateStatus(issue.id, "ignored")}>تجاهل</Button>}
                    {issue.status !== "open" && <Button size="sm" variant="ghost" onClick={() => updateStatus(issue.id, "open")}>إعادة فتح</Button>}
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald" />
                  لا توجد بلاغات ضمن هذا الفلتر
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) => (
  <Card className="border-border/50">
    <CardContent className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </CardContent>
  </Card>
);
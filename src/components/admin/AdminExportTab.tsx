import { useState, useEffect } from "react";
import { Key, Download, Clock, Shield, Copy, CheckCircle, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface ExportKey {
  id: string;
  access_key: string;
  created_at: string;
  expires_at: string;
  is_used: boolean;
  used_at: string | null;
  used_ip: string | null;
  is_revoked: boolean;
}

interface ExportLog {
  id: string;
  key_id: string;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  details: Record<string, unknown> | null;
}

export const AdminExportTab = () => {
  const [keys, setKeys] = useState<ExportKey[]>([]);
  const [logs, setLogs] = useState<ExportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [keysRes, logsRes] = await Promise.all([
      supabase.from("export_access_keys").select("*").order("created_at", { ascending: false }),
      supabase.from("export_logs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setKeys((keysRes.data as ExportKey[]) || []);
    setLogs((logsRes.data as ExportLog[]) || []);
    setLoading(false);
  };

  const generateKey = async () => {
    setGenerating(true);
    try {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const key = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("غير مسجل");

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from("export_access_keys").insert({
        access_key: key,
        created_by: user.id,
        expires_at: expiresAt,
      });

      if (error) throw error;
      toast.success("تم إنشاء مفتاح التصدير بنجاح (صالح لـ 24 ساعة)");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "خطأ في إنشاء المفتاح");
    }
    setGenerating(false);
  };

  const revokeKey = async (id: string) => {
    await supabase.from("export_access_keys").update({ is_revoked: true, revoked_at: new Date().toISOString() }).eq("id", id);
    toast.success("تم إلغاء المفتاح");
    fetchData();
  };

  const downloadExport = async (key: ExportKey) => {
    if (key.is_used || key.is_revoked || new Date(key.expires_at) < new Date()) {
      toast.error("المفتاح غير صالح للاستخدام");
      return;
    }
    setExporting(key.id);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-data?key=${key.access_key}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "خطأ في التصدير");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `database-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("تم تحميل البيانات بنجاح!");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "خطأ في التحميل");
    }
    setExporting(null);
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success("تم نسخ المفتاح");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getStatus = (key: ExportKey) => {
    if (key.is_revoked) return { label: "ملغي", color: "text-destructive", bg: "bg-destructive/10" };
    if (key.is_used) return { label: "مستخدم", color: "text-muted-foreground", bg: "bg-muted" };
    if (new Date(key.expires_at) < new Date()) return { label: "منتهي", color: "text-orange-500", bg: "bg-orange-500/10" };
    return { label: "نشط", color: "text-emerald-500", bg: "bg-emerald-500/10" };
  };

  const formatDate = (d: string) => format(new Date(d), "d MMM yyyy - hh:mm a", { locale: ar });

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin text-4xl">⏳</div></div>;

  return (
    <div className="space-y-6">
      {/* Generate Key */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Key className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">مفتاح تصدير مؤقت</h3>
            <p className="text-sm text-muted-foreground">إنشاء مفتاح لتصدير قاعدة البيانات (صالح 24 ساعة، استخدام واحد)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">تحذير: المفتاح يمنح وصولاً كاملاً لجميع بيانات المستخدمين. استخدمه بحذر شديد.</p>
        </div>
        <Button onClick={generateKey} disabled={generating} className="w-full sm:w-auto">
          <Key className="w-4 h-4 ml-2" />
          {generating ? "جارٍ الإنشاء..." : "إنشاء مفتاح جديد"}
        </Button>
      </div>

      {/* Active Keys */}
      <div className="space-y-3">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Shield className="w-5 h-5" /> المفاتيح ({keys.length})
        </h3>
        {keys.length === 0 && <p className="text-center py-8 text-muted-foreground">لا يوجد مفاتيح</p>}
        {keys.map((key) => {
          const status = getStatus(key);
          const isActive = !key.is_used && !key.is_revoked && new Date(key.expires_at) >= new Date();
          return (
            <div key={key.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${status.color} ${status.bg}`}>{status.label}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(key.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {isActive && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => copyKey(key.access_key)}>
                        {copiedKey === key.access_key ? <CheckCircle className="w-3 h-3 ml-1" /> : <Copy className="w-3 h-3 ml-1" />}
                        نسخ
                      </Button>
                      <Button size="sm" onClick={() => downloadExport(key)} disabled={exporting === key.id}>
                        <Download className="w-3 h-3 ml-1" />
                        {exporting === key.id ? "جارٍ التحميل..." : "تحميل البيانات"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => revokeKey(key.id)}>
                        <Trash2 className="w-3 h-3 ml-1" />
                        إلغاء
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="font-mono text-xs bg-muted p-2 rounded-lg break-all select-all">{key.access_key}</div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ينتهي: {formatDate(key.expires_at)}</span>
                {key.used_at && <span>استُخدم: {formatDate(key.used_at)}</span>}
                {key.used_ip && <span>IP: {key.used_ip}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-lg">سجل التصدير</h3>
          {logs.map((log) => (
            <div key={log.id} className="bg-card border border-border rounded-xl p-3 text-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold">{log.action}</span>
                <span className="text-xs text-muted-foreground">{formatDate(log.created_at)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 space-x-3 rtl:space-x-reverse">
                {log.ip_address && <span>IP: {log.ip_address}</span>}
                {log.details && typeof log.details === "object" && "total_records" in log.details && (
                  <span>السجلات: {String(log.details.total_records)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

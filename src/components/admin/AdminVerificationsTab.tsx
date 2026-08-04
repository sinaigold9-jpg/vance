import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BadgeCheck, XCircle, AlertTriangle, Eye } from "lucide-react";

interface Row {
  id: string;
  user_id: string;
  image_path: string;
  quality_score: number;
  liveness_score: number;
  face_signature: string | null;
  status: string;
  rejection_reason: string | null;
  retry_allowed: boolean;
  duplicate_flag: boolean;
  reward_granted: boolean;
  created_at: string;
  profiles?: { full_name: string; membership_id: string | null; email: string | null } | null;
}

export const AdminVerificationsTab = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [preview, setPreview] = useState<{ row: Row; url: string } | null>(null);
  const [reason, setReason] = useState("");
  const [allowRetry, setAllowRetry] = useState(true);
  const [working, setWorking] = useState(false);
  const [dupes, setDupes] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("account_verifications")
      .select("*, profiles(full_name, membership_id, email)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    const list = ((data as unknown as Row[]) || []);
    setRows(list);
    const counts: Record<string, number> = {};
    list.forEach((r) => { if (r.face_signature) counts[r.face_signature] = (counts[r.face_signature] || 0) + 1; });
    setDupes(counts);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin_account_verifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "account_verifications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const openPreview = async (row: Row) => {
    const { data, error } = await supabase.storage
      .from("verification-selfies")
      .createSignedUrl(row.image_path, 300);
    if (error || !data) { toast.error("تعذّر فتح الصورة"); return; }
    setReason(row.rejection_reason || "");
    setAllowRetry(true);
    setPreview({ row, url: data.signedUrl });
  };

  const review = async (decision: "approved" | "rejected") => {
    if (!preview) return;
    if (decision === "rejected" && !reason.trim()) { toast.error("اكتب سبب الرفض"); return; }
    setWorking(true);
    const { data, error } = await supabase.rpc("review_account_verification", {
      _request_id: preview.row.id,
      _decision: decision,
      _reason: decision === "rejected" ? reason.trim() : null,
      _allow_retry: decision === "rejected" ? allowRetry : false,
    });
    setWorking(false);
    if (error) { toast.error(error.message); return; }
    const res = data as { reward_granted?: boolean; duplicate?: boolean } | null;
    if (decision === "approved") {
      toast.success(res?.reward_granted ? "تم التوثيق ومنح 50 جنيه كاش باك" : "تم التوثيق بدون مكافأة (مكررة أو ممنوحة سابقاً)");
      if (res?.duplicate) toast.warning("تنبيه: نفس بصمة الوجه مستخدمة في حساب موثق آخر");
    } else toast.success("تم رفض الطلب");
    setPreview(null);
    load();
  };

  const filtered = rows.filter((r) => (filter === "all" ? true : r.status === filter));

  const statusBadge = (s: string) =>
    s === "pending" ? <Badge className="bg-amber-500/20 text-amber-600 border-amber-400/40">قيد المراجعة</Badge>
      : s === "approved" ? <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-400/40">موثق</Badge>
      : <Badge className="bg-red-500/20 text-red-600 border-red-400/40">مرفوض</Badge>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">توثيق الحسابات</h2>
        <p className="text-sm text-muted-foreground">مراجعة صور التحقق من الوجه. تُمنح مكافأة 50 جنيه كاش باك مرة واحدة فقط لكل حساب.</p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="pending">قيد المراجعة</TabsTrigger>
          <TabsTrigger value="approved">موثقة</TabsTrigger>
          <TabsTrigger value="rejected">مرفوضة</TabsTrigger>
          <TabsTrigger value="all">الكل</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground p-8">لا توجد طلبات</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.id} className="p-4 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold">{r.profiles?.full_name || "مستخدم"}</span>
                  {statusBadge(r.status)}
                  <Badge variant="outline">جودة {Math.round(r.quality_score)}%</Badge>
                  {r.reward_granted && <Badge className="bg-primary/20 text-primary border-primary/40">مُنحت المكافأة</Badge>}
                  {(r.duplicate_flag || (r.face_signature && dupes[r.face_signature] > 1)) && (
                    <Badge className="bg-orange-500/20 text-orange-600 border-orange-400/40 gap-1">
                      <AlertTriangle className="w-3 h-3" /> وجه مكرر
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {r.profiles?.membership_id || r.user_id.slice(0, 8)} · {new Date(r.created_at).toLocaleString("ar-EG", { hour12: true })}
                </div>
                {r.rejection_reason && <div className="text-xs text-destructive mt-1">سبب الرفض: {r.rejection_reason}</div>}
              </div>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => openPreview(r)}>
                <Eye className="w-4 h-4" /> مراجعة
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>مراجعة طلب التوثيق</DialogTitle></DialogHeader>
          {preview && (
            <div className="space-y-3">
              <img src={preview.url} alt="صورة التوثيق" className="w-full rounded-xl border border-border" />
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">المستخدم:</span> {preview.row.profiles?.full_name}</p>
                <p><span className="text-muted-foreground">رقم العضوية:</span> {preview.row.profiles?.membership_id || "—"}</p>
                <p><span className="text-muted-foreground">جودة الصورة:</span> {Math.round(preview.row.quality_score)}%</p>
                {preview.row.face_signature && dupes[preview.row.face_signature] > 1 && (
                  <p className="text-orange-500 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> بصمة الوجه مستخدمة في {dupes[preview.row.face_signature]} حسابات — راجع قبل القبول.
                  </p>
                )}
              </div>
              {preview.row.status === "pending" ? (
                <>
                  <div className="space-y-2">
                    <Label>سبب الرفض (عند الرفض)</Label>
                    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: الوجه غير واضح / يوجد أكثر من شخص" />
                    <div className="flex items-center justify-between">
                      <Label>السماح بإعادة المحاولة</Label>
                      <Switch checked={allowRetry} onCheckedChange={setAllowRetry} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-1" disabled={working} onClick={() => review("approved")}>
                      <BadgeCheck className="w-4 h-4" /> قبول ومنح المكافأة
                    </Button>
                    <Button variant="destructive" className="flex-1 gap-1" disabled={working} onClick={() => review("rejected")}>
                      <XCircle className="w-4 h-4" /> رفض
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">تمت مراجعة هذا الطلب مسبقاً.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVerificationsTab;

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/BackButton";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { LivenessCapture, type LivenessResult } from "@/components/verification/LivenessCapture";
import {
  BadgeCheck, ShieldCheck, Coins, Lock, Clock, XCircle, RefreshCw, Loader2, ScanFace,
} from "lucide-react";

interface VerificationRow {
  id: string;
  status: string;
  quality_score: number;
  rejection_reason: string | null;
  retry_allowed: boolean;
  reward_granted: boolean;
  created_at: string;
  reviewed_at: string | null;
}

const MIN_QUALITY = 55;

const AccountVerification = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [row, setRow] = useState<VerificationRow | null>(null);
  const [busy, setBusy] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("account_verifications")
      .select("id,status,quality_score,rejection_reason,retry_allowed,reward_granted,created_at,reviewed_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setRow((data as VerificationRow) ?? null);
    setBusy(false);
  }, [user]);

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel("account_verification_self")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "account_verifications", filter: `user_id=eq.${user.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, user]);

  const submit = async (r: LivenessResult) => {
    if (!user) return;
    setScanning(false);
    if (r.quality < MIN_QUALITY) {
      toast.error(`جودة الصورة ${r.quality}% — الحد الأدنى ${MIN_QUALITY}%. أعد المحاولة في إضاءة أفضل.`);
      return;
    }
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("verification-selfies")
        .upload(path, r.blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw upErr;

      const { error } = await supabase.from("account_verifications").insert({
        user_id: user.id,
        image_path: path,
        quality_score: r.quality,
        liveness_score: r.liveness,
        face_signature: r.signature,
        status: "pending",
        device_info: { ua: navigator.userAgent.slice(0, 200) },
      });
      if (error) throw error;
      toast.success("تم إرسال طلب التوثيق للمراجعة");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل إرسال الطلب");
    } finally {
      setUploading(false);
    }
  };

  const canStart = !row || (row.status === "rejected" && row.retry_allowed);

  const statusCard = () => {
    if (!row) {
      return (
        <div className="rounded-2xl border border-border bg-muted/30 p-4 flex items-center gap-3">
          <ScanFace className="w-5 h-5 text-muted-foreground" />
          <div><p className="font-bold">لم يبدأ التوثيق</p>
            <p className="text-xs text-muted-foreground">ابدأ الآن للحصول على شارة التوثيق و50 جنيه كاش باك.</p></div>
        </div>
      );
    }
    if (row.status === "pending") {
      return (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-500" />
          <div><p className="font-bold text-amber-500">قيد المراجعة</p>
            <p className="text-xs text-muted-foreground">تمت مراجعة الجودة ({row.quality_score}%) وسيتم اعتماد الطلب من الإدارة قريباً.</p></div>
        </div>
      );
    }
    if (row.status === "approved") {
      return (
        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 flex items-center gap-3">
          <BadgeCheck className="w-5 h-5 text-emerald-500" />
          <div><p className="font-bold text-emerald-500">تم توثيق الحساب</p>
            <p className="text-xs text-muted-foreground">
              {row.reward_granted ? "تمت إضافة 50 جنيه كاش باك إلى محفظتك." : "تم التوثيق (مكافأة التوثيق تُمنح مرة واحدة فقط لكل مستخدم)."}
            </p></div>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 space-y-2">
        <div className="flex items-center gap-3">
          {row.retry_allowed ? <RefreshCw className="w-5 h-5 text-destructive" /> : <XCircle className="w-5 h-5 text-destructive" />}
          <div><p className="font-bold text-destructive">{row.retry_allowed ? "مطلوب إعادة المحاولة" : "مرفوض"}</p>
            <p className="text-xs text-muted-foreground">{row.rejection_reason || "لم يتم قبول الطلب."}</p></div>
        </div>
        {!row.retry_allowed && (
          <p className="text-xs text-muted-foreground">لا يمكنك إعادة الإرسال إلا بعد سماح الإدارة بذلك.</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="توثيق الحساب" path="/verification" noIndex />
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <BackButton to="/settings" label="رجوع" />
          <h1 className="text-lg font-bold">توثيق الحساب</h1>
          <div className="w-10" />
        </div>
      </header>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {busy ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : scanning ? (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ScanFace className="w-4 h-4" /> التحقق من الوجه</CardTitle></CardHeader>
            <CardContent>
              <LivenessCapture onDone={submit} onCancel={() => setScanning(false)} />
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-l from-primary/20 to-transparent p-5 flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 grid place-items-center">
                  <BadgeCheck className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">وثّق حسابك في Advance</h2>
                  <p className="text-xs text-muted-foreground">تحقق حقيقي من الوجه عبر كاميرا جهازك فقط.</p>
                </div>
              </div>
              <CardContent className="pt-5 space-y-3">
                {[
                  { icon: ShieldCheck, t: "موثوقية أعلى للحساب", d: "حساب موثق ومعتمد من إدارة Advance." },
                  { icon: Coins, t: "50 جنيه كاش باك", d: "تُضاف تلقائياً بعد اعتماد التوثيق — مرة واحدة فقط لكل حساب." },
                  { icon: Lock, t: "حماية مستقبلية", d: "يساعد على استرجاع حسابك وحمايته من الاستخدام غير المصرح به." },
                ].map((b) => (
                  <div key={b.t} className="flex gap-3 items-start p-3 rounded-xl bg-secondary/30">
                    <b.icon className="w-5 h-5 text-primary mt-0.5" />
                    <div><p className="font-medium text-sm">{b.t}</p><p className="text-xs text-muted-foreground">{b.d}</p></div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {statusCard()}

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">شروط الصورة</CardTitle></CardHeader>
              <CardContent className="space-y-1.5 text-sm text-muted-foreground">
                <p>• الوجه ظاهر بالكامل من الأمام مع وضوح العينين والأنف والفم.</p>
                <p>• بدون نظارة شمسية أو كمامة أو قناع أو أي شيء يحجب الملامح.</p>
                <p>• شخص واحد فقط أمام الكاميرا وإضاءة جيدة وكاميرا ثابتة.</p>
                <p>• لا يمكن رفع صورة من المعرض — الكاميرا المباشرة فقط.</p>
                <p>• لا يمكن حذف الصورة أو تعديلها أو إعادة إرسالها بعد الإرسال إلا بموافقة الإدارة.</p>
                <p>• الصورة تظهر للإدارة فقط ولا تظهر في ملفك الشخصي ولا لأي مستخدم آخر.</p>
              </CardContent>
            </Card>

            <Button
              className="w-full h-12 text-base bg-gradient-gold text-primary-foreground"
              disabled={!canStart || uploading}
              onClick={() => setScanning(true)}
            >
              {uploading ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري الإرسال...</> : (
                <><ScanFace className="w-5 h-5 ml-2" /> {row?.status === "rejected" ? "إعادة توثيق الحساب" : "بدء توثيق الحساب"}</>
              )}
            </Button>
            {!canStart && row?.status !== "approved" && (
              <p className="text-center text-xs text-muted-foreground">لديك طلب قيد المعالجة حالياً.</p>
            )}
            {row?.status === "approved" && (
              <div className="text-center"><Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-400/40 gap-1"><BadgeCheck className="w-3 h-3" /> حساب موثق</Badge></div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

export default AccountVerification;

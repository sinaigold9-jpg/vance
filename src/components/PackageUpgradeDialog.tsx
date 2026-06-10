import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, User, Mail, Phone, IdCard, Upload, CreditCard, Copy, Tag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface PackageUpgradeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  packageName: string;
  packagePrice: number;
  targetAccountType: string;
}

export const PackageUpgradeDialog = ({ isOpen, onClose, packageName, packagePrice, targetAccountType }: PackageUpgradeDialogProps) => {
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string; email: string | null; phone: string | null; membership_id: string | null; } | null>(null);
  const [discountInput, setDiscountInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [checkingCode, setCheckingCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();

  const finalPrice = Math.max(0, packagePrice - discountAmount);

  useEffect(() => {
    if (isOpen && user) {
      fetchUserProfile();
    }
    if (!isOpen) {
      setDiscountInput("");
      setAppliedCode(null);
      setDiscountAmount(0);
    }
  }, [isOpen, user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("full_name, email, phone, membership_id").eq("id", user.id).maybeSingle();
    if (data) setUserProfile(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText("01080048591");
      setCopied(true);
      toast({ title: "تم النسخ", description: "تم نسخ رقم المحفظة" });
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleApplyCode = async () => {
    const code = discountInput.trim();
    if (!code) return;
    setCheckingCode(true);
    try {
      const { data, error } = await supabase.rpc("apply_discount_code", {
        _code: code,
        _package: targetAccountType,
        _base_price: packagePrice,
      });
      if (error) throw error;
      const res = data as any;
      if (!res?.success) {
        toast({ title: "كود غير صالح", description: res?.error || "تعذر تطبيق الكود", variant: "destructive" });
        setAppliedCode(null);
        setDiscountAmount(0);
        return;
      }
      setAppliedCode(res.code);
      setDiscountAmount(Number(res.discount_amount) || 0);
      toast({ title: "تم تطبيق الخصم 🎉", description: `وفّرت ${res.discount_amount} جنيه` });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message || "تعذر التحقق من الكود", variant: "destructive" });
    } finally {
      setCheckingCode(false);
    }
  };

  const removeCode = () => {
    setAppliedCode(null);
    setDiscountAmount(0);
    setDiscountInput("");
  };

  const handleSubmit = async () => {
    if (!user) { toast({ title: "خطأ", description: "يرجى تسجيل الدخول", variant: "destructive" }); return; }
    if (!receiptFile) { toast({ title: "خطأ", description: "يرجى رفع إيصال الدفع", variant: "destructive" }); return; }

    setUploading(true);
    try {
      // Upload receipt
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, receiptFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);

      const { data: profile } = await supabase.from("profiles").select("account_type").eq("id", user.id).single();

      await supabase.from("package_upgrade_requests").insert([{
        user_id: user.id,
        current_package: profile?.account_type || 'beginner',
        requested_package: targetAccountType as "beginner" | "vip1" | "vip2" | "vip3",
        receipt_url: publicUrl,
        amount: finalPrice,
        discount_code: appliedCode,
        discount_amount: discountAmount,
      }]);

      await supabase.from("activity_logs").insert({ user_id: user.id, action: "طلب ترقية باقة", details: { package: packageName, base_price: packagePrice, discount_code: appliedCode, discount_amount: discountAmount, final_price: finalPrice }, amount: finalPrice });

      setSuccess(true);
    } catch (error) {
      console.error(error);
      toast({ title: "خطأ", description: "حدث خطأ أثناء إرسال الطلب", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => { setSuccess(false); setReceiptFile(null); onClose(); };

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md text-center" dir="rtl">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald/20 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-emerald" />
            </div>
            <h2 className="text-2xl font-bold mb-2">تم الإرسال بنجاح 🎉</h2>
            <p className="text-muted-foreground mb-6">سنراجع الإيصال وتُفعّل الباقة تلقائياً</p>
            <Button onClick={handleClose} className="w-full bg-gradient-gold text-primary-foreground">حسناً</Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">ترقية إلى {packageName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Stepper */}
          <div className="flex items-center justify-between text-[11px] font-medium">
            {["تأكيد البيانات","التحويل","رفع الإيصال"].map((s, i) => (
              <div key={s} className="flex items-center gap-1.5 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${i===0||(i===1)||(i===2&&receiptFile) ? "bg-gradient-gold text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i+1}</div>
                <span className="text-muted-foreground">{s}</span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <h4 className="font-bold text-sm text-muted-foreground mb-3">بيانات المستخدم</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><User className="w-4 h-4 text-primary" /><span>{userProfile?.full_name || "جاري التحميل..."}</span></div>
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /><span>{userProfile?.email || "غير متوفر"}</span></div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /><span>{userProfile?.phone || "غير متوفر"}</span></div>
              <div className="flex items-center gap-2"><IdCard className="w-4 h-4 text-primary" /><span>رقم العضوية: {userProfile?.membership_id || "غير متوفر"}</span></div>
            </div>
          </div>

          {/* Discount code */}
          <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              كود الخصم (اختياري)
            </label>
            {appliedCode ? (
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-emerald/10 border border-emerald/30">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald" />
                  <span className="font-bold">{appliedCode}</span>
                  <span className="text-emerald">-{discountAmount} جنيه</span>
                </div>
                <Button size="sm" variant="ghost" onClick={removeCode}>إلغاء</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={discountInput}
                  onChange={e => setDiscountInput(e.target.value.toUpperCase())}
                  placeholder="أدخل الكود"
                  className="font-mono"
                />
                <Button onClick={handleApplyCode} disabled={checkingCode || !discountInput.trim()} variant="outline">
                  {checkingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : "تطبيق"}
                </Button>
              </div>
            )}
          </div>

          {/* Price summary */}
          <div className="p-4 rounded-xl bg-gradient-gold/10 border border-gold/30 space-y-1">
            {discountAmount > 0 && (
              <>
                <div className="flex justify-between text-sm text-muted-foreground"><span>السعر الأصلي</span><span className="line-through">{packagePrice} جنيه</span></div>
                <div className="flex justify-between text-sm text-emerald"><span>الخصم</span><span>-{discountAmount} جنيه</span></div>
              </>
            )}
            <div className="flex justify-between items-center pt-1">
              <span className="text-muted-foreground">المبلغ المطلوب</span>
              <span className="text-3xl font-black text-gradient-gold">{finalPrice} جنيه</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <p className="font-bold">حوّل المبلغ على هذا الرقم:</p>
            </div>
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background/60">
              <p className="text-2xl font-black text-primary" dir="ltr">01080048591</p>
              <Button size="sm" variant="outline" onClick={handleCopyNumber} className="gap-1">
                {copied ? <Check className="w-4 h-4 text-emerald" /> : <Copy className="w-4 h-4" />}
                {copied ? "تم" : "نسخ"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">فودافون كاش / اتصالات / أورنج / WE</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Upload className="w-4 h-4" />
              رفع صورة إيصال التحويل
            </label>
            <Input type="file" accept="image/*" onChange={handleFileChange} className="cursor-pointer" />
            {receiptFile && <p className="text-xs text-emerald">✓ تم اختيار: {receiptFile.name}</p>}
          </div>

          <Button onClick={handleSubmit} disabled={uploading || !receiptFile} className="w-full bg-gradient-gold text-primary-foreground h-12 text-lg">
            {uploading ? <><Loader2 className="w-5 h-5 animate-spin ml-2" />جاري الإرسال...</> : "إرسال طلب الترقية"}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">ستتم مراجعة الإيصال خلال دقائق وتفعيل الباقة تلقائياً عند القبول.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, User, Mail, Phone, IdCard, Upload, CreditCard } from "lucide-react";
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
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      fetchUserProfile();
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
        amount: packagePrice,
      }]);

      await supabase.from("activity_logs").insert({ user_id: user.id, action: "طلب ترقية باقة", details: { package: packageName, price: packagePrice }, amount: packagePrice });

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
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">ترقية إلى {packageName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <h4 className="font-bold text-sm text-muted-foreground mb-3">بيانات المستخدم</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><User className="w-4 h-4 text-primary" /><span>{userProfile?.full_name || "جاري التحميل..."}</span></div>
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /><span>{userProfile?.email || "غير متوفر"}</span></div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /><span>{userProfile?.phone || "غير متوفر"}</span></div>
              <div className="flex items-center gap-2"><IdCard className="w-4 h-4 text-primary" /><span>رقم العضوية: {userProfile?.membership_id || "غير متوفر"}</span></div>
            </div>
          </div>

          <div className="text-center p-4 rounded-xl bg-gradient-gold/10 border border-gold/30">
            <p className="text-muted-foreground mb-1">قيمة الباقة</p>
            <p className="text-3xl font-black text-gradient-gold">{packagePrice} جنيه</p>
          </div>

          <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <p className="font-bold">أرسل المبلغ على الرقم:</p>
            </div>
            <p className="text-2xl font-black text-primary text-center" dir="ltr">01080048591</p>
            <p className="text-xs text-muted-foreground text-center mt-1">فودافون كاش</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Upload className="w-4 h-4" />
              رفع إيصال الدفع
            </label>
            <Input type="file" accept="image/*" onChange={handleFileChange} className="cursor-pointer" />
            {receiptFile && <p className="text-xs text-emerald">✓ تم اختيار: {receiptFile.name}</p>}
          </div>

          <Button onClick={handleSubmit} disabled={uploading || !receiptFile} className="w-full bg-gradient-gold text-primary-foreground h-12 text-lg">
            {uploading ? <><Loader2 className="w-5 h-5 animate-spin ml-2" />جاري الإرسال...</> : "إرسال طلب الترقية"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
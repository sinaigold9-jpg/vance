import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, User, Mail, Phone, IdCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface DepositDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: {
    full_name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

export const DepositDialog = ({ isOpen, onClose, userProfile }: DepositDialogProps) => {
  const [amount, setAmount] = useState("");
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [membershipId, setMembershipId] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      fetchMembershipId();
    }
  }, [isOpen, user]);

  const fetchMembershipId = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("membership_id")
      .eq("id", user.id)
      .maybeSingle();
    if (data) {
      setMembershipId(data.membership_id || "");
    }
  };

  const handleSubmit = async () => {
    if (!user || !amount) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    setUploading(true);

    try {
      // Create transaction record
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: "deposit",
          amount: parsedAmount,
          status: "pending",
          notes: `طلب شحن - ${userProfile?.full_name} - ${userProfile?.email} - ${userProfile?.phone} - رقم العضوية: ${membershipId}`,
        });

      if (transactionError) throw transactionError;

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "طلب إيداع",
        amount: parsedAmount,
        details: { 
          user_name: userProfile?.full_name,
          user_email: userProfile?.email,
          user_phone: userProfile?.phone,
          membership_id: membershipId,
        },
      });

      setSuccess(true);
      toast.success("تم إرسال طلب الشحن بنجاح");
    } catch (error) {
      console.error("Error submitting deposit:", error);
      toast.error("حدث خطأ في إرسال الطلب");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setAmount("");
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">طلب شحن الرصيد</DialogTitle>
        </DialogHeader>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <CheckCircle2 className="w-16 h-16 text-emerald mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">تم الإرسال بنجاح 🎉</h3>
            <p className="text-muted-foreground">
              سنراجع طلبك وسيتم إضافة الرصيد بعد التأكيد
            </p>
            <Button onClick={handleClose} className="mt-4">
              إغلاق
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* User Info */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-sm text-muted-foreground">بيانات المستخدم</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm">{userProfile?.full_name || "غير متوفر"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-sm">{userProfile?.email || "غير متوفر"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <span className="text-sm">{userProfile?.phone || "غير متوفر"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IdCard className="w-4 h-4 text-primary" />
                  <span className="text-sm">رقم العضوية: {membershipId || "غير متوفر"}</span>
                </div>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">المبلغ المطلوب شحنه</label>
              <Input
                type="number"
                placeholder="أدخل المبلغ"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <Button
              className="w-full h-12 bg-gradient-gold text-primary-foreground font-bold"
              onClick={handleSubmit}
              disabled={!amount || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  جاري الإرسال...
                </>
              ) : (
                "إرسال طلب الشحن"
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              سيتم إرسال بياناتك إلى خدمة العملاء للمراجعة وإضافة الرصيد
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

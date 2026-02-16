import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WithdrawalPinSetupProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

export const WithdrawalPinSetup = ({ isOpen, onClose, userId, onSuccess }: WithdrawalPinSetupProps) => {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (pin.length !== 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أرقام");
      return;
    }

    if (!/^\d{6}$/.test(pin)) {
      toast.error("كلمة المرور يجب أن تحتوي على أرقام فقط");
      return;
    }

    if (pin !== confirmPin) {
      toast.error("كلمات المرور غير متطابقة");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke('set-withdrawal-pin', {
        body: { pin },
      });

      if (response.error) throw response.error;

      toast.success("تم إنشاء كلمة مرور السحب بنجاح");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error setting pin:", error);
      toast.error("حدث خطأ في إنشاء كلمة المرور");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPin("");
    setConfirmPin("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            إنشاء كلمة مرور السحب
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
            <p className="text-sm text-amber-600">
              كلمة مرور السحب مختلفة عن كلمة مرور الحساب وتُستخدم لتأكيد عمليات السحب
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">كلمة مرور السحب (6 أرقام)</label>
            <div className="relative">
              <Input
                type={showPin ? "text" : "password"}
                placeholder="أدخل 6 أرقام"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-lg tracking-widest pr-10"
                maxLength={6}
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute left-3 top-1/2 -translate-y-1/2"
              >
                {showPin ? (
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Eye className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">تأكيد كلمة المرور</label>
            <div className="relative">
              <Input
                type={showConfirmPin ? "text" : "password"}
                placeholder="أعد إدخال 6 أرقام"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-lg tracking-widest pr-10"
                maxLength={6}
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
                className="absolute left-3 top-1/2 -translate-y-1/2"
              >
                {showConfirmPin ? (
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Eye className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isLoading || pin.length !== 6 || confirmPin.length !== 6}
            className="w-full bg-gradient-gold text-primary-foreground h-12"
          >
            {isLoading ? "جاري الحفظ..." : "حفظ كلمة المرور"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

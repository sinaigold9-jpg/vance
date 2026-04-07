import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OTPVerifyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  purpose: "login" | "withdrawal" | "registration" | "data_change";
  onVerified: () => void;
  title?: string;
}

const purposeLabels: Record<string, string> = {
  login: "تسجيل الدخول",
  withdrawal: "سحب الأموال",
  registration: "التسجيل",
  data_change: "تغيير البيانات",
};

export const OTPVerifyDialog = ({ isOpen, onClose, purpose, onVerified, title }: OTPVerifyDialogProps) => {
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setOtp("");
      setSent(false);
      setCountdown(0);
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const sendOTP = useCallback(async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { purpose },
      });
      if (error) throw error;
      if (data?.error === "telegram_not_linked") {
        toast.error("يرجى ربط حساب تليجرام أولاً من إعدادات الحساب");
        onClose();
        return;
      }
      if (data?.error === "rate_limited") {
        toast.error(data.message);
        return;
      }
      if (data?.error) {
        toast.error(data.message || "حدث خطأ");
        return;
      }
      setSent(true);
      setCountdown(60);
      toast.success("تم إرسال رمز التحقق عبر تليجرام");
    } catch (err) {
      console.error(err);
      toast.error("فشل إرسال رمز التحقق");
    } finally {
      setSending(false);
    }
  }, [purpose, onClose]);

  // Auto-send on open
  useEffect(() => {
    if (isOpen && !sent) {
      sendOTP();
    }
  }, [isOpen]);

  const verifyOTP = async () => {
    if (otp.length !== 6) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { code: otp, purpose },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success("تم التحقق بنجاح ✅");
        onVerified();
        onClose();
      } else {
        toast.error(data?.message || "رمز غير صحيح");
        setOtp("");
      }
    } catch (err) {
      console.error(err);
      toast.error("فشل التحقق من الرمز");
    } finally {
      setVerifying(false);
    }
  };

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && sent) {
      verifyOTP();
    }
  }, [otp]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center flex items-center justify-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            {title || `تحقق - ${purposeLabels[purpose]}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!sent ? (
            <div className="text-center py-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">جاري إرسال رمز التحقق...</p>
            </div>
          ) : (
            <>
              <p className="text-center text-sm text-muted-foreground">
                تم إرسال رمز مكون من 6 أرقام إلى حساب تليجرام الخاص بك
              </p>

              <div className="flex justify-center" dir="ltr">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {verifying && (
                <div className="text-center">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                  <p className="text-xs text-muted-foreground mt-1">جاري التحقق...</p>
                </div>
              )}

              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    إعادة الإرسال بعد {countdown} ثانية
                  </p>
                ) : (
                  <Button variant="ghost" size="sm" onClick={sendOTP} disabled={sending} className="text-primary gap-1">
                    <RefreshCw className="w-4 h-4" />
                    إعادة إرسال الرمز
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Mail, Lock, Loader2, Shield, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "email" | "otp" | "password" | "done";

export const ForgotPasswordDialog = ({ isOpen, onClose }: Props) => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setStep("email"); setEmail(""); setCode(""); setNewPassword(""); setCountdown(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const sendCode = async () => {
    if (!email.trim()) { toast.error("أدخل البريد الإلكتروني"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-password-reset", {
        body: { email: email.trim() },
      });
      if (error) throw error;
      if ((data as any)?.error === "telegram_not_linked") {
        toast.error((data as any).message || "تليجرام غير مربوط");
        setLoading(false);
        return;
      }
      if ((data as any)?.error === "rate_limited") {
        toast.error((data as any).message);
        setLoading(false);
        return;
      }
      toast.success("تم إرسال رمز التحقق عبر تليجرام");
      setCountdown(60);
      setStep("otp");
    } catch (e) {
      toast.error("تعذر إرسال الرمز");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndContinue = () => {
    if (code.length !== 6) return;
    setStep("password");
  };

  useEffect(() => {
    if (step === "otp" && code.length === 6) verifyAndContinue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  const submitNewPassword = async () => {
    if (newPassword.length < 6) { toast.error("كلمة المرور 6 أحرف على الأقل"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { email: email.trim(), code, newPassword },
      });
      if (error) throw error;
      if ((data as any)?.error) {
        toast.error((data as any).message || "رمز غير صحيح");
        setStep("otp"); setCode("");
        return;
      }
      toast.success("تم تغيير كلمة المرور بنجاح ✅");
      setStep("done");
      setTimeout(() => onClose(), 1200);
    } catch (e) {
      toast.error("فشلت العملية، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center flex items-center justify-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            استعادة كلمة المرور
          </DialogTitle>
        </DialogHeader>

        {step === "email" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground text-center">
              أدخل بريدك الإلكتروني وسنرسل رمز تحقق إلى حساب تليجرام المرتبط بك.
            </p>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="email" dir="ltr" placeholder="example@email.com"
                value={email} onChange={e => setEmail(e.target.value)}
                className="pr-10 h-12" />
            </div>
            <Button onClick={sendCode} disabled={loading} className="w-full h-12 bg-gradient-gold text-primary-foreground font-bold">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "إرسال رمز التحقق"}
            </Button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground text-center">
              أدخل الرمز المكون من 6 أرقام المرسل إلى تليجرام (صالح لمدة 60 ثانية)
            </p>
            <div className="flex justify-center" dir="ltr">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
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
            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-xs text-muted-foreground">إعادة الإرسال بعد {countdown}ث</p>
              ) : (
                <Button variant="ghost" size="sm" onClick={sendCode} disabled={loading}>إعادة إرسال الرمز</Button>
              )}
            </div>
          </div>
        )}

        {step === "password" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground text-center">أدخل كلمة المرور الجديدة</p>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type={showPwd ? "text" : "password"} placeholder="كلمة مرور جديدة (6 أحرف فأكثر)"
                value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="pr-10 pl-10 h-12" autoComplete="new-password" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute left-3 top-1/2 -translate-y-1/2">
                {showPwd ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
            <Button onClick={submitNewPassword} disabled={loading} className="w-full h-12 bg-gradient-gold text-primary-foreground font-bold">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "تأكيد"}
            </Button>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-6">
            <Shield className="w-12 h-12 mx-auto text-primary mb-2" />
            <p className="font-bold">تم تغيير كلمة المرور بنجاح</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
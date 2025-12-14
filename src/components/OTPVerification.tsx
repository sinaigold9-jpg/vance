import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";

interface OTPVerificationProps {
  type: "email" | "phone";
  target: string;
  onVerified: () => void;
  onResend: () => Promise<void>;
}

export const OTPVerification = ({ type, target, onVerified, onResend }: OTPVerificationProps) => {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error("يرجى إدخال رمز التحقق كاملاً");
      return;
    }

    setIsVerifying(true);
    
    // Simulate OTP verification (in production, this would be server-side)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // For demo purposes, accept any 6-digit code
    // In production, this would verify against actual OTP
    if (otp.length === 6) {
      toast.success(`تم التحقق من ${type === "email" ? "البريد الإلكتروني" : "رقم الهاتف"} بنجاح`);
      onVerified();
    } else {
      toast.error("رمز التحقق غير صحيح");
    }
    
    setIsVerifying(false);
  };

  const handleResend = async () => {
    setIsResending(true);
    await onResend();
    setCountdown(60);
    setCanResend(false);
    setIsResending(false);
    toast.success("تم إرسال رمز تحقق جديد");
  };

  const Icon = type === "email" ? Mail : Phone;
  const title = type === "email" ? "تحقق من البريد الإلكتروني" : "تحقق من رقم الهاتف";
  const maskedTarget = type === "email" 
    ? target.replace(/(.{2})(.*)(@.*)/, "$1***$3")
    : target.replace(/(\d{3})(\d*)(\d{2})/, "$1****$3");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6"
    >
      <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-8 h-8 text-primary" />
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-muted-foreground text-sm">
          أرسلنا رمز تحقق مكون من 6 أرقام إلى
        </p>
        <p className="text-foreground font-medium mt-1" dir="ltr">{maskedTarget}</p>
      </div>

      <div className="flex justify-center" dir="ltr">
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={setOtp}
        >
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

      <Button
        onClick={handleVerify}
        disabled={otp.length !== 6 || isVerifying}
        className="w-full bg-gradient-gold text-primary-foreground shadow-gold"
      >
        {isVerifying ? (
          <span className="animate-spin">⏳</span>
        ) : (
          <>
            تأكيد
            <ArrowRight className="w-5 h-5 mr-2" />
          </>
        )}
      </Button>

      <div className="text-center">
        {canResend ? (
          <Button
            variant="ghost"
            onClick={handleResend}
            disabled={isResending}
            className="text-primary"
          >
            {isResending ? (
              <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 ml-2" />
            )}
            إعادة إرسال الرمز
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            إعادة الإرسال بعد <span className="text-primary font-bold">{countdown}</span> ثانية
          </p>
        )}
      </div>
    </motion.div>
  );
};

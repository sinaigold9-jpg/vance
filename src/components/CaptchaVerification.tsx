import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CaptchaVerificationProps {
  onVerify: (verified: boolean) => void;
  disabled?: boolean;
}

const generateCaptcha = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let captcha = '';
  for (let i = 0; i < 6; i++) {
    captcha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return captcha;
};

export const CaptchaVerification = ({ onVerify, disabled = false }: CaptchaVerificationProps) => {
  const [captchaCode, setCaptchaCode] = useState("");
  const [userInput, setUserInput] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [error, setError] = useState("");

  const refreshCaptcha = useCallback(() => {
    setCaptchaCode(generateCaptcha());
    setUserInput("");
    setError("");
  }, []);

  useEffect(() => {
    refreshCaptcha();
  }, [refreshCaptcha]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isLocked && lockCountdown > 0) {
      interval = setInterval(() => {
        setLockCountdown((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            refreshCaptcha();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLocked, lockCountdown, refreshCaptcha]);

  const handleVerify = () => {
    if (userInput === captchaCode) {
      setError("");
      onVerify(true);
    } else {
      setError("رمز التحقق غير صحيح");
      setIsLocked(true);
      setLockCountdown(20);
      onVerify(false);
    }
  };

  const renderCaptchaChar = (char: string, index: number) => {
    const rotation = Math.random() * 20 - 10;
    const translateY = Math.random() * 10 - 5;
    const fontSize = 20 + Math.random() * 8;
    
    return (
      <span
        key={index}
        style={{
          display: 'inline-block',
          transform: `rotate(${rotation}deg) translateY(${translateY}px)`,
          fontSize: `${fontSize}px`,
          fontFamily: index % 2 === 0 ? 'serif' : 'monospace',
          fontWeight: index % 3 === 0 ? 'bold' : 'normal',
          fontStyle: index % 4 === 0 ? 'italic' : 'normal',
          color: `hsl(${index * 45}, 70%, 50%)`,
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
        }}
      >
        {char}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">رمز التحقق</span>
      </div>
      
      {/* Captcha Display */}
      <div className="relative">
        <div 
          className="h-16 rounded-lg bg-gradient-to-r from-muted via-muted/80 to-muted flex items-center justify-center select-none overflow-hidden border border-border"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.03) 5px, rgba(0,0,0,0.03) 10px)',
          }}
        >
          {isLocked ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <p className="text-destructive font-bold text-lg">{lockCountdown} ثانية</p>
              <p className="text-xs text-muted-foreground">انتظر لإعادة المحاولة</p>
            </motion.div>
          ) : (
            <div className="flex items-center gap-1 tracking-widest">
              {captchaCode.split('').map((char, index) => renderCaptchaChar(char, index))}
            </div>
          )}
        </div>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute left-1 top-1/2 -translate-y-1/2"
          onClick={refreshCaptcha}
          disabled={isLocked || disabled}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Input */}
      <Input
        type="text"
        placeholder="أدخل الرمز كما يظهر"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        className="text-center text-lg tracking-widest"
        disabled={isLocked || disabled}
        dir="ltr"
      />

      {error && (
        <p className="text-destructive text-sm text-center">{error}</p>
      )}

      <Button
        type="button"
        onClick={handleVerify}
        disabled={!userInput || isLocked || disabled}
        className="w-full"
        variant="outline"
      >
        تحقق من الرمز
      </Button>
    </div>
  );
};
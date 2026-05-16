import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Check, Loader2, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface TelegramVerificationGateProps {
  children: React.ReactNode;
  botUsername: string;
}

export const TelegramVerificationGate = ({ children, botUsername }: TelegramVerificationGateProps) => {
  // ⚠️ التحقق عبر بوت تليجرام معطّل مؤقتاً حتى إصلاح اتصال البوت.
  // لإعادة تفعيله: احذف السطر التالي وأعد منطق التحقق الأصلي.
  return <>{children}</>;

  // eslint-disable-next-line no-unreachable
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Check verification status
  useEffect(() => {
    if (!user) return;
    checkVerification();
  }, [user]);

  // Poll for telegram linking and verification
  useEffect(() => {
    if (!user || isVerified) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("telegram_chat_id, is_verified")
        .eq("id", user.id)
        .single();
      if (data?.telegram_chat_id) setTelegramLinked(true);
      if (data?.is_verified) {
        setIsVerified(true);
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [user, isVerified]);

  const checkVerification = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("telegram_chat_id, is_verified")
      .eq("id", user.id)
      .single();
    
    setIsVerified(data?.is_verified ?? false);
    setTelegramLinked(!!data?.telegram_chat_id);
    setLoading(false);
  };

  const generateLinkCode = async () => {
    setGeneratingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { purpose: "telegram_link" },
      });
      if (error) throw error;
      if (data?.link_code) {
        setLinkCode(data.link_code);
      }
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ في إنشاء رمز الربط");
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleConfirmAccount = async () => {
    setConfirming(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-account");
      if (error) throw error;
      if (data?.success) {
        setIsVerified(true);
        toast.success("تم تفعيل حسابك بنجاح! 🎉");
      } else {
        toast.error(data?.message || "فشل التفعيل");
      }
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ. يرجى المحاولة مرة أخرى.");
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isVerified) {
    return <>{children}</>;
  }

  const telegramLink = linkCode ? `https://t.me/${botUsername}?start=${linkCode}` : "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">تفعيل الحساب</h1>
          <p className="text-muted-foreground">
            لاستخدام التطبيق، يجب تفعيل حسابك عبر بوت تليجرام
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 space-y-4">
          {/* Step 1: Link Telegram */}
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${telegramLinked ? 'bg-emerald-500 text-white' : 'bg-primary/10 text-primary'}`}>
              {telegramLinked ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <div className="flex-1">
              <p className="font-semibold">ربط حساب تليجرام</p>
              <p className="text-sm text-muted-foreground">اضغط على الزر لفتح البوت في تليجرام</p>
            </div>
          </div>

          {!telegramLinked && (
            <div className="space-y-3 pr-11">
              {!linkCode ? (
                <Button
                  onClick={generateLinkCode}
                  disabled={generatingCode}
                  className="w-full gap-2"
                >
                  {generatingCode ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                  التحقق عبر تليجرام
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => window.open(telegramLink, "_blank")}
                    className="w-full gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    فتح بوت تليجرام
                  </Button>
                  <div className="text-center">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mt-1">في انتظار الربط...</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Confirm Account */}
          <div className="flex items-start gap-3 pt-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isVerified ? 'bg-emerald-500 text-white' : telegramLinked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {isVerified ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <div className="flex-1">
              <p className={`font-semibold ${!telegramLinked ? 'text-muted-foreground' : ''}`}>تأكيد الحساب</p>
              <p className="text-sm text-muted-foreground">اضغط على "تأكيد الحساب" في البوت أو هنا</p>
            </div>
          </div>

          {telegramLinked && !isVerified && (
            <div className="space-y-3 pr-11">
              <Button
                onClick={handleConfirmAccount}
                disabled={confirming}
                className="w-full gap-2"
                variant="default"
              >
                {confirming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                تأكيد الحساب
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                أو اضغط على زر "تأكيد الحساب" داخل بوت تليجرام
              </p>
            </div>
          )}
        </div>

        {/* Retry */}
        {linkCode && !telegramLinked && (
          <Button
            variant="ghost"
            onClick={() => { setLinkCode(null); generateLinkCode(); }}
            className="w-full gap-2 text-muted-foreground"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة إنشاء رمز الربط
          </Button>
        )}

        <p className="text-xs text-center text-muted-foreground">
          Advance©2025
        </p>
      </motion.div>
    </div>
  );
};

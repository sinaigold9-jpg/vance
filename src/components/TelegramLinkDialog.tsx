import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Check, Loader2, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface TelegramLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  botUsername: string;
  onLinked?: () => void;
}

export const TelegramLinkDialog = ({ isOpen, onClose, botUsername, onLinked }: TelegramLinkDialogProps) => {
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      generateLinkCode();
    }
  }, [isOpen, user]);

  // Poll to check if linked
  useEffect(() => {
    if (!isOpen || !linkCode || isLinked) return;
    const interval = setInterval(async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("telegram_chat_id")
        .eq("id", user.id)
        .single();
      if (data?.telegram_chat_id) {
        setIsLinked(true);
        onLinked?.();
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen, linkCode, isLinked, user]);

  const generateLinkCode = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const telegramLink = linkCode ? `https://t.me/${botUsername}?start=${linkCode}` : "";

  const copyLink = async () => {
    if (!telegramLink) return;
    await navigator.clipboard.writeText(telegramLink);
    toast.success("تم نسخ الرابط");
  };

  const handleClose = () => {
    setLinkCode(null);
    setIsLinked(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center flex items-center justify-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" />
            ربط حساب تليجرام
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLinked ? (
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center py-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald/20 flex items-center justify-center">
                <Check className="w-12 h-12 text-emerald" />
              </div>
              <h3 className="text-xl font-bold mb-2">تم الربط بنجاح! 🎉</h3>
              <p className="text-muted-foreground">سيتم إرسال رموز التحقق إلى تليجرام</p>
              <Button onClick={handleClose} className="mt-4 w-full">حسناً</Button>
            </motion.div>
          ) : loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">جاري إنشاء رمز الربط...</p>
            </div>
          ) : linkCode ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-center">
                <p className="text-sm text-muted-foreground mb-2">اضغط على الزر أدناه لفتح البوت في تليجرام</p>
              </div>

              <Button
                onClick={() => window.open(telegramLink, "_blank")}
                className="w-full h-12 text-lg gap-2"
              >
                <ExternalLink className="w-5 h-5" />
                فتح بوت تليجرام
              </Button>

              <Button variant="outline" onClick={copyLink} className="w-full gap-2">
                <Copy className="w-4 h-4" />
                نسخ الرابط
              </Button>

              <div className="text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground mt-1">في انتظار تأكيد الربط...</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">حدث خطأ. يرجى المحاولة مرة أخرى.</p>
              <Button onClick={generateLinkCode} className="mt-2">إعادة المحاولة</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

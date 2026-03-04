import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Smartphone, CheckCircle, Shield, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import appIcon from "@/assets/app-icon.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const DownloadPage = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) checkIfDownloaded();
  }, [user]);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) { setIsInstalled(true); return; }
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const checkIfDownloaded = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("activity_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("action", "مكافأة تنزيل التطبيق")
      .limit(1);
    if (data && data.length > 0) setHasDownloaded(true);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
        toast.success("تم تثبيت التطبيق بنجاح! 🎉");
      }
    } else {
      toast.info("يمكنك تثبيت التطبيق من خلال إعدادات المتصفح > إضافة إلى الشاشة الرئيسية");
    }

    if (user && !hasDownloaded) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance, total_earnings")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        await supabase.from("profiles").update({
          balance: profile.balance + 20,
          total_earnings: profile.total_earnings + 20,
        }).eq("id", user.id);

        await supabase.from("activity_logs").insert({
          user_id: user.id,
          action: "مكافأة تنزيل التطبيق",
          amount: 20,
        });

        toast.success("تم إضافة 20 جنيه إلى محفظتك!");
        setHasDownloaded(true);
      }
    }

    setTimeout(() => setIsDownloading(false), 2000);
  };

  const features = [
    { icon: Zap, text: "سريع وخفيف", color: "text-yellow-500" },
    { icon: Shield, text: "آمن 100%", color: "text-emerald" },
    { icon: Star, text: "تقييم 4.9", color: "text-amber-500" },
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-6">
        <BackButton />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
          <img src={appIcon} alt="Advance" className="w-28 h-28 mx-auto rounded-3xl shadow-gold" />
          <div>
            <h1 className="text-3xl font-black text-foreground">Advance</h1>
            <p className="text-muted-foreground">تطبيق الربح الأول في مصر</p>
          </div>
        </motion.div>

        {/* Features Row */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center justify-center gap-4">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-1">
              <feature.icon className={`w-4 h-4 ${feature.color}`} />
              <span className="text-xs text-muted-foreground">{feature.text}</span>
            </div>
          ))}
        </motion.div>

        {/* Download Button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="relative">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full h-16 text-xl font-bold bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90 rounded-2xl"
            >
              {isDownloading ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 animate-pulse" />
                  جارٍ التثبيت...
                </span>
              ) : isInstalled ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-6 h-6" />
                  تم تثبيت التطبيق ✓
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Smartphone className="w-6 h-6" />
                  تثبيت التطبيق
                </span>
              )}
            </Button>
            {!hasDownloaded && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -left-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full shadow-lg"
              >
                20ج.م
              </motion.span>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-card border border-border/50 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-foreground text-center">مميزات التطبيق</h3>
          <div className="space-y-3">
            {["أكمل المهام اليومية واربح", "سحب سريع عبر المحافظ الإلكترونية", "عجلة حظ يومية مجانية", "نظام إحالات ومكافآت", "دعم فني على مدار الساعة"].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald flex-shrink-0" />
                <span className="text-foreground text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground">Advance © 2025 - جميع الحقوق محفوظة</p>
      </div>
    </div>
  );
};

export default DownloadPage;

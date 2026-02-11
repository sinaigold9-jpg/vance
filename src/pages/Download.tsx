import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Smartphone, CheckCircle, Shield, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import appIcon from "@/assets/app-icon.png";

export const DownloadPage = () => {
  const [displayCount, setDisplayCount] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchCounter();
    maybeIncrement();
  }, []);

  const fetchCounter = async () => {
    const { data } = await supabase
      .from("download_counter")
      .select("*")
      .eq("id", "main")
      .maybeSingle();

    if (data) {
      setDisplayCount(data.count);
    }
  };

  const maybeIncrement = async () => {
    const { data } = await supabase
      .from("download_counter")
      .select("*")
      .eq("id", "main")
      .maybeSingle();

    if (!data) return;

    const today = new Date().toISOString().split("T")[0];
    const lastDate = data.last_increment_date;
    let dailyUsed = data.daily_increment_used;

    // Reset daily counter if new day
    if (lastDate !== today) {
      dailyUsed = 0;
    }

    // Max 7 increments per day, random 1-3
    if (dailyUsed < 7) {
      const increment = Math.min(Math.floor(Math.random() * 3) + 1, 7 - dailyUsed);
      await supabase
        .from("download_counter")
        .update({
          count: data.count + increment,
          daily_increment_used: dailyUsed + increment,
          last_increment_date: today,
          last_updated_at: new Date().toISOString(),
        })
        .eq("id", "main");

      setDisplayCount(data.count + increment);
    } else {
      setDisplayCount(data.count);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);

    // Trigger actual download
    const link = document.createElement("a");
    link.href = "/downloads/app-release.apk";
    link.download = "Advance.apk";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Give user 20 EGP reward
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance, total_earnings")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        await supabase
          .from("profiles")
          .update({
            balance: profile.balance + 20,
            total_earnings: profile.total_earnings + 20,
          })
          .eq("id", user.id);

        await supabase.from("activity_logs").insert({
          user_id: user.id,
          action: "مكافأة تنزيل التطبيق",
          amount: 20,
        });

        toast.success("تم إضافة 20 جنيه إلى محفظتك!");
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

        {/* App Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <img
            src={appIcon}
            alt="Advance"
            className="w-28 h-28 mx-auto rounded-3xl shadow-gold"
          />
          <div>
            <h1 className="text-3xl font-black text-foreground">Advance</h1>
            <p className="text-muted-foreground">تطبيق الربح الأول في مصر</p>
          </div>
        </motion.div>

        {/* Download Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-card border border-border/50 rounded-2xl p-6"
        >
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Smartphone className="w-6 h-6 text-primary" />
              <span className="text-muted-foreground">عدد التنزيلات</span>
            </div>
            <p className="text-4xl font-black text-gradient-gold">
              {displayCount.toLocaleString()}+
            </p>
            <div className="flex items-center justify-center gap-4 pt-2">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-1">
                  <feature.icon className={`w-4 h-4 ${feature.color}`} />
                  <span className="text-xs text-muted-foreground">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Download Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full h-16 text-xl font-bold bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90 rounded-2xl"
          >
            {isDownloading ? (
              <span className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 animate-pulse" />
                جارٍ التنزيل...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Download className="w-6 h-6" />
                تنزيل التطبيق (+20 ج.م)
              </span>
            )}
          </Button>
        </motion.div>

        {/* Features List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-card border border-border/50 rounded-2xl p-6 space-y-4"
        >
          <h3 className="font-bold text-foreground text-center">مميزات التطبيق</h3>
          <div className="space-y-3">
            {[
              "أكمل المهام اليومية واربح",
              "سحب سريع عبر المحافظ الإلكترونية",
              "عجلة حظ يومية مجانية",
              "نظام إحالات ومكافآت",
              "دعم فني على مدار الساعة",
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald flex-shrink-0" />
                <span className="text-foreground text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground">
          Advance © 2025 - جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
};

export default DownloadPage;

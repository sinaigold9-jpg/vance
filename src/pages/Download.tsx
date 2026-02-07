import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Smartphone, CheckCircle, Shield, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/BackButton";
import appIcon from "@/assets/app-icon.png";

export const DownloadPage = () => {
  const [downloadCount, setDownloadCount] = useState(7328);
  const [displayCount, setDisplayCount] = useState(7328);
  const [isDownloading, setIsDownloading] = useState(false);

  // Animate count upward smoothly
  useEffect(() => {
    const interval = setInterval(() => {
      setDownloadCount(prev => prev + Math.floor(Math.random() * 3) + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Smooth animation for display count
  useEffect(() => {
    if (displayCount < downloadCount) {
      const timer = setTimeout(() => {
        setDisplayCount(prev => Math.min(prev + 1, downloadCount));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [displayCount, downloadCount]);

  const handleDownload = () => {
    setIsDownloading(true);
    // Increment download count
    setDownloadCount(prev => prev + 1);
    
    // Trigger actual download
    const link = document.createElement('a');
    link.href = '/downloads/app-release.apk';
    link.download = 'Advance.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

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
            <motion.p
              key={displayCount}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-4xl font-black text-gradient-gold"
            >
              {displayCount.toLocaleString()}+
            </motion.p>
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
                تنزيل التطبيق
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
              "دعم فني على مدار الساعة"
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald flex-shrink-0" />
                <span className="text-foreground text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Advance © 2025 - جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
};

export default DownloadPage;

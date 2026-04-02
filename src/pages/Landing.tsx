import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings } from "@/hooks/useAppSettings";
const appIcon = "/app-icon-optimized.webp";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Landing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAdmin } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const { settings, loading: settingsLoading } = useAppSettings();

  useEffect(() => {
    if (user) {
      navigate("/app");
    }
  }, [user, navigate]);

  // PWA install prompt
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    }
  };

  const refCode = searchParams.get("ref");

  // Show locked screen if landing is disabled (admins can still pass)
  if (!settingsLoading && !settings.landingEnabled && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background via-background to-background/90">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center space-y-6"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-black text-foreground">الصفحة مغلقة</h1>
          <p className="text-muted-foreground">
            {settings.landingDisabledMessage || "الصفحة مغلقة حالياً، يرجى المحاولة لاحقاً"}
          </p>
          <p className="text-muted-foreground text-sm mt-4">
            جميع الحقوق محفوظة لـ Advance 2025©
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background via-background to-background/90">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        {/* Logo */}
        <div className="mb-8">
          <img 
            src="/icon-192.png" 
            alt="Advance" 
            width={128}
            height={128}
            fetchPriority="high"
            className="w-32 h-32 mx-auto mb-4 rounded-3xl shadow-gold"
          />
          <h1 className="text-4xl font-black text-foreground">Advance</h1>
          <p className="text-primary text-sm mt-2">7 أيام تجربة مجانية!</p>
        </div>

        {/* Auth Buttons */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4">
          <Button
            size="lg"
            className="w-full bg-gradient-gold text-primary-foreground shadow-gold text-lg py-6"
            onClick={() => navigate(refCode ? `/auth?ref=${refCode}` : "/auth")}
          >
            إنشاء حساب جديد
            <ArrowLeft className="w-5 h-5 mr-2" />
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="w-full text-lg py-6"
            onClick={() => navigate("/auth?mode=login")}
          >
            تسجيل الدخول
            <ArrowRight className="w-5 h-5 mr-2" />
          </Button>

          {/* Admin access - only show for logged in admins */}
          {!isInstalled && (
            <div className="relative">
              <Button
                variant="outline"
                size="lg"
                className="w-full text-lg py-6 border-primary/50 text-primary hover:bg-primary/10"
                onClick={deferredPrompt ? handleInstall : () => navigate("/download")}
              >
                <Smartphone className="w-5 h-5 ml-2" />
                {deferredPrompt ? "تثبيت التطبيق" : "تنزيل التطبيق"}
              </Button>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -left-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-pulse"
              >
                20ج.م
              </motion.span>
            </div>
          )}

          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin")}
              className="w-full text-muted-foreground"
            >
              لوحة تحكم الإدارة
            </Button>
          )}
        </div>

        {/* Footer */}
        <p className="text-foreground text-lg font-bold mt-8">
          ابدأ الآن
        </p>
        <p className="text-muted-foreground text-sm mt-4">
          جميع الحقوق محفوظة لـ Advance 2025©
        </p>
      </motion.div>
    </div>
  );
};

export default Landing;

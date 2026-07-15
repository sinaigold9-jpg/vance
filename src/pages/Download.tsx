import { motion } from "framer-motion";
import { Download, Smartphone, Apple, Share2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import SEO from "@/components/SEO";
import { useNavigate } from "react-router-dom";

const DownloadPage = () => {
  const navigate = useNavigate();

  const downloadLinks = [
    {
      name: "تطبيق الويب",
      icon: Smartphone,
      description: "استخدم التطبيق مباشرة من المتصفح",
      link: window.location.origin,
      color: "from-blue-500 to-cyan-500",
    },
    {
      name: "iOS",
      icon: Apple,
      description: "حمل التطبيق من App Store",
      link: "https://apps.apple.com",
      color: "from-gray-700 to-gray-900",
      coming: true,
    },
    {
      name: "Android",
      icon: Download,
      description: "حمل التطبيق من Google Play",
      link: "https://play.google.com",
      color: "from-green-500 to-emerald-500",
      coming: true,
    },
  ];

  const features = [
    { icon: CheckCircle2, title: "سريع وآمن", description: "أداء عالي وحماية كاملة لبياناتك" },
    { icon: CheckCircle2, title: "لا يحتاج تثبيت", description: "استخدم التطبيق مباشرة دون تنزيل" },
    { icon: CheckCircle2, title: "متوفر في كل مكان", description: "متاح على جميع الأجهزة والأنظمة" },
    { icon: CheckCircle2, title: "تحديثات تلقائية", description: "احصل على آخر الميزات تلقائياً" },
  ];

  const handleDownload = (link: string, coming: boolean) => {
    if (coming) return;
    window.open(link, "_blank");
  };

  const handleInstallPWA = async () => {
    if ("BeforeInstallPromptEvent" in window) {
      const event = (window as any).deferredPrompt;
      if (event) {
        event.prompt();
        const { outcome } = await event.userChoice;
        if (outcome === "accepted") {
          console.log("PWA installed");
        }
      }
    }
  };

  return (
    <div className="min-h-screen pb-12">
      <SEO
        title="تحميل تطبيق Advance"
        description="حمل تطبيق Advance على جهازك واستمتع بميزات رائعة"
        path="/download"
      />

      <PageHeader
        title="تحميل التطبيق"
        subtitle="استمتع بتجربة أفضل مع تطبيق Advance"
        onBack={() => navigate("/app")}
      />

      <div className="space-y-12">
        {/* Main Download Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {downloadLinks.map((platform, index) => {
              const Icon = platform.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => !platform.coming && handleDownload(platform.link, platform.coming)}
                  className={`group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 ${
                    !platform.coming ? "cursor-pointer hover:border-primary/50 transition-all" : ""
                  }`}
                >
                  {/* Background Gradient */}
                  <div
                    className={`absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity bg-gradient-to-br ${platform.color}`}
                  />

                  {/* Coming Soon Badge */}
                  {platform.coming && (
                    <div className="absolute top-3 right-3 bg-amber-500/20 text-amber-600 px-3 py-1 rounded-full text-xs font-semibold">
                      قريباً
                    </div>
                  )}

                  {/* Content */}
                  <div className="relative z-10 space-y-4">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-1">{platform.name}</h3>
                      <p className="text-sm text-muted-foreground">{platform.description}</p>
                    </div>

                    {!platform.coming && (
                      <Button
                        className={`w-full bg-gradient-to-r ${platform.color} text-white hover:shadow-lg transition-all`}
                        onClick={() => handleDownload(platform.link, false)}
                      >
                        <Download className="w-4 h-4 ml-2" />
                        تحميل الآن
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* PWA Install Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-card rounded-2xl border border-border/50 p-8"
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <Smartphone className="w-8 h-8 text-primary" />
                <h2 className="text-2xl font-bold">التطبيق على شاشتك الرئيسية</h2>
              </div>
              <p className="text-muted-foreground text-lg">
                يمكنك تثبيت التطبيق على شاشتك الرئيسية والوصول إليه بسهولة مثل أي تطبيق آخر
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>لا يحتاج مساحة كبيرة</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>يعمل دون اتصال إنترن�� (جزئياً)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>تحديثات سريعة وتلقائية</span>
                </div>
              </div>
            </div>
            <Button
              size="lg"
              onClick={handleInstallPWA}
              className="bg-gradient-gold text-primary-foreground hover:shadow-gold"
            >
              <Share2 className="w-5 h-5 ml-2" />
              تثبيت التطبيق
            </Button>
          </div>
        </motion.div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold text-foreground">لماذا تحمل تطبيق Advance؟</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex gap-4 p-4 rounded-xl bg-card border border-border/50"
                >
                  <Icon className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Instructions Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-card rounded-2xl border border-border/50 p-8 space-y-6"
        >
          <h2 className="text-2xl font-bold text-foreground">كيفية التثبيت؟</h2>

          <div className="space-y-4">
            {/* iOS Instructions */}
            <div>
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <Apple className="w-5 h-5" />
                iPhone و iPad
              </h3>
              <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
                <li>اضغط على زر المشاركة (Share)</li>
                <li>اختر "أضف إلى الشاشة الرئيسية"</li>
                <li>اختر اسم التطبيق واضغط "إضافة"</li>
                <li>سيظهر التطبيق على شاشتك الرئيسية</li>
              </ol>
            </div>

            {/* Android Instructions */}
            <div>
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <Download className="w-5 h-5" />
                أجهزة Android
              </h3>
              <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
                <li>اضغط على القائمة (≡)</li>
                <li>اختر "تثبيت التطبيق" أو "أضف إلى الشاشة الرئيسية"</li>
                <li>قم بتأكيد التثبيت</li>
                <li>سيظهر التطبيق على شاشتك الرئيسية</li>
              </ol>
            </div>
          </div>
        </motion.div>

        {/* Support Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-card rounded-2xl border border-border/50 p-8 text-center space-y-4"
        >
          <h2 className="text-2xl font-bold text-foreground">هل تحتاج إلى مساعدة؟</h2>
          <p className="text-muted-foreground">
            إذا واجهت أي مشاكل في التحميل أو التثبيت، تواصل معنا مباشرة
          </p>
          <Button variant="outline" onClick={() => navigate("/app/support")}>
            التواصل مع الدعم الفني
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default DownloadPage;

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Sparkles, 
  TrendingUp, 
  Users, 
  Gift, 
  Shield, 
  Clock, 
  ArrowLeft,
  HeadphonesIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const Landing = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const features = [
    {
      icon: TrendingUp,
      title: "أرباح يومية مضمونة",
      description: "أكمل 3 مهام بسيطة يومياً واحصل على أرباح فورية"
    },
    {
      icon: Gift,
      title: "عجلة الحظ",
      description: "فرصة للفوز بجوائز إضافية كل يوم لأعضاء VIP"
    },
    {
      icon: Users,
      title: "نظام الإحالة",
      description: "ادعُ أصدقاءك واكسب 8 جنيه عن كل صديق يسجل ويشحن"
    },
    {
      icon: Shield,
      title: "آمن وموثوق",
      description: "نظام سحب سريع وآمن على جميع المحافظ الإلكترونية"
    },
    {
      icon: Clock,
      title: "سهل وسريع",
      description: "لا يحتاج وقت طويل - دقائق قليلة يومياً فقط"
    }
  ];

  const packages = [
    { name: "المبتدئ", price: "100 ج.م", daily: "9 ج.م/يوم" },
    { name: "VIP 1", price: "500 ج.م", daily: "45 ج.م/يوم" },
    { name: "VIP 2", price: "850 ج.م", daily: "75 ج.م/يوم" },
    { name: "VIP 3", price: "1500 ج.م", daily: "105 ج.م/يوم" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/90">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-gold opacity-5" />
        <div className="max-w-lg mx-auto px-4 py-8">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold animate-pulse-glow">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">كاش تاسك</h1>
                <p className="text-xs text-muted-foreground">اربح يومياً</p>
              </div>
            </div>
            
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin")}
                className="gap-2"
              >
                <HeadphonesIcon className="w-4 h-4" />
                لوحة التحكم
              </Button>
            )}
          </div>

          {/* Hero Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-gold flex items-center justify-center shadow-gold animate-pulse-glow">
              <Sparkles className="w-12 h-12 text-primary-foreground" />
            </div>
            
            <h2 className="text-3xl font-bold text-foreground">
              اربح حتى <span className="text-primary">105 ج.م</span> يومياً
            </h2>
            
            <p className="text-muted-foreground text-lg">
              انضم لآلاف المستخدمين الذين يكسبون يومياً من المهام البسيطة
            </p>

            {/* CTA Buttons */}
            <div className="space-y-3 pt-4">
              {user ? (
                <Button
                  size="lg"
                  className="w-full bg-gradient-gold text-primary-foreground shadow-gold text-lg py-6"
                  onClick={() => navigate("/app")}
                >
                  الذهاب للتطبيق
                  <ArrowLeft className="w-5 h-5 mr-2" />
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="w-full bg-gradient-gold text-primary-foreground shadow-gold text-lg py-6"
                    onClick={() => navigate("/auth")}
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
                  </Button>
                </>
              )}
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/admin")}
                className="w-full border-primary/50 text-primary hover:bg-primary/10"
              >
                <HeadphonesIcon className="w-5 h-5 ml-2" />
                لوحة تحكم خدمة العملاء
              </Button>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Features Section */}
      <section className="max-w-lg mx-auto px-4 py-12">
        <h3 className="text-xl font-bold text-center text-foreground mb-8">
          لماذا كاش تاسك؟
        </h3>
        <div className="space-y-4">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-1">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Packages Preview */}
      <section className="max-w-lg mx-auto px-4 py-12">
        <h3 className="text-xl font-bold text-center text-foreground mb-8">
          الباقات المتاحة
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {packages.map((pkg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-xl bg-card border border-border text-center"
            >
              <h4 className="font-bold text-foreground mb-2">{pkg.name}</h4>
              <p className="text-primary font-bold text-lg">{pkg.price}</p>
              <p className="text-xs text-muted-foreground mt-1">{pkg.daily}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">
          ابدأ الآن واحصل على أرباحك اليومية
        </p>
        {!user && (
          <Button
            size="lg"
            className="bg-gradient-gold text-primary-foreground shadow-gold"
            onClick={() => navigate("/auth")}
          >
            سجل الآن مجاناً
            <ArrowLeft className="w-5 h-5 mr-2" />
          </Button>
        )}
      </section>
    </div>
  );
};

export default Landing;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";

const signUpSchema = z.object({
  fullName: z.string().min(2, "الاسم يجب أن يكون أكثر من حرفين"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  phone: z.string().min(11, "رقم الهاتف يجب أن يكون 11 رقم"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

const signInSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const validation = signInSchema.safeParse({ email, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login")) {
            toast.error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("تم تسجيل الدخول بنجاح");
          navigate("/");
        }
      } else {
        const validation = signUpSchema.safeParse({ fullName, email, phone, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, fullName, phone);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("هذا البريد الإلكتروني مسجل بالفعل");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("تم إنشاء الحساب بنجاح");
          navigate("/");
        }
      }
    } catch (error) {
      toast.error("حدث خطأ غير متوقع");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-background/80">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold animate-pulse-glow mb-4">
            <Sparkles className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">كاش تاسك</h1>
          <p className="text-muted-foreground mt-2">اربح يومياً من المهام البسيطة</p>
        </div>

        {/* Auth Form */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <div className="flex gap-2 mb-6">
            <Button
              variant={isLogin ? "default" : "outline"}
              className="flex-1"
              onClick={() => setIsLogin(true)}
            >
              تسجيل الدخول
            </Button>
            <Button
              variant={!isLogin ? "default" : "outline"}
              className="flex-1"
              onClick={() => setIsLogin(false)}
            >
              حساب جديد
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="الاسم الكامل"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pr-10 text-right"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="رقم الهاتف"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pr-10 text-right"
                    dir="ltr"
                  />
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pr-10 text-right"
                dir="ltr"
              />
            </div>

            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10 pl-10 text-right"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Eye className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-gold text-primary-foreground shadow-gold"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <>
                  {isLogin ? "دخول" : "إنشاء حساب"}
                  <ArrowRight className="w-5 h-5 mr-2" />
                </>
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;

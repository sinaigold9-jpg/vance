import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff, Chrome, Apple, UserPlus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { PrivacyPolicyModal } from "@/components/PrivacyPolicyModal";
const appIcon = "/placeholder.svg";
import { lovable } from "@/integrations/lovable/index";
import { ForgotPasswordDialog } from "@/components/ForgotPasswordDialog";

const signUpSchema = z.object({
  fullName: z.string().min(2, "الاسم يجب أن يكون أكثر من حرفين").max(50, "الاسم طويل جداً"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  phone: z.string().min(11, "رقم الهاتف يجب أن يكون 11 رقم").max(15, "رقم الهاتف غير صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

const signInSchema = z.object({
  identifier: z.string().min(1, "البريد الإلكتروني أو رقم الهاتف مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralFromUrl, setReferralFromUrl] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [registeredViaReferral, setRegisteredViaReferral] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const ref = searchParams.get("ref");
    const mode = searchParams.get("mode");
    if (ref) {
      setReferralFromUrl(ref);
      setReferralCode(ref);
      setIsLogin(false);
      setRegisteredViaReferral(true);
    } else if (mode === "register") {
      setIsLogin(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      navigate("/app");
    }
  }, [user, navigate]);

  const normalizePhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("20") && digits.length > 11) {
      const rest = digits.slice(2);
      if (rest.length === 11 && rest.startsWith("0")) return rest;
      if (rest.length === 10 && rest.startsWith("1")) return `0${rest}`;
      return rest;
    }
    if (digits.length === 10 && digits.startsWith("1")) return `0${digits}`;
    return digits;
  };

  const validateReferralCode = async (code: string): Promise<string | null> => {
    const clean = code.trim();
    if (!clean) return null;
    const { data, error } = await supabase.functions.invoke("referral-validate", {
      body: { ref: clean },
    });
    if (error) return null;
    return data?.referredBy ?? null;
  };

  const signInWithPhone = async (rawPhone: string, pw: string) => {
    const phoneToSend = normalizePhone(rawPhone) || rawPhone;
    const { data, error } = await supabase.functions.invoke("phone-login", {
      body: { phone: phoneToSend, password: pw },
    });
    if (error) throw new Error(error.message);
    const access_token = data?.access_token as string | undefined;
    const refresh_token = data?.refresh_token as string | undefined;
    if (!access_token || !refresh_token) {
      throw new Error("تعذر إكمال تسجيل الدخول برقم الهاتف");
    }
    await supabase.auth.setSession({ access_token, refresh_token });
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setIsLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result?.error) {
        toast.error("فشل تسجيل الدخول");
        return;
      }
      if (!result?.redirected) {
        toast.success("تم تسجيل الدخول بنجاح");
        navigate("/app");
      }
    } catch {
      toast.error("فشل تسجيل الدخول");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!privacyAccepted) {
      setShowPrivacyPolicy(true);
      return;
    }
    handleSubmit(e);
  };

  const handlePrivacyAccept = () => {
    setPrivacyAccepted(true);
    setShowPrivacyPolicy(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const validation = signInSchema.safeParse({ identifier, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setIsLoading(false);
          return;
        }

        const isPhoneNumber = /^[+0]/.test(identifier.trim()) || /^\d{10,15}$/.test(identifier.trim());

        if (isPhoneNumber) {
          try {
            await signInWithPhone(identifier, password);
            toast.success("تم تسجيل الدخول بنجاح");
            navigate("/app");
          } catch (err) {
            const msg = err instanceof Error ? err.message : "حدث خطأ في تسجيل الدخول";
            toast.error(msg.includes("غير مسجل") ? msg : "رقم الهاتف أو كلمة المرور غير صحيحة");
          }
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(identifier, password);
        if (error) {
          if (error.message.includes("Invalid login")) {
            toast.error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
          } else {
            toast.error("حدث خطأ في تسجيل الدخول");
          }
          setIsLoading(false);
          return;
        }

        toast.success("تم تسجيل الدخول بنجاح");
        navigate("/app");
      } else {
        const validation = signUpSchema.safeParse({ 
          fullName, email, phone, password, confirmPassword
        });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setIsLoading(false);
          return;
        }

        let referredBy: string | null = null;
        if (referralCode.trim()) {
          referredBy = await validateReferralCode(referralCode.trim());
        } else if (referralFromUrl) {
          referredBy = await validateReferralCode(referralFromUrl);
        }

        const { error } = await signUp(email, password, fullName, phone, referredBy);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("هذا البريد الإلكتروني مسجل بالفعل");
          } else {
            toast.error(error.message);
          }
        } else {
          if ((registeredViaReferral || referralCode.trim()) && referredBy) {
            toast.success("تم التسجيل عبر كود الإحالة بنجاح!");
          } else {
            toast.success("تم إنشاء حسابك بنجاح! 🎉 لديك 7 أيام تجربة مجانية");
          }
          navigate("/app?onboarding=true");
        }
      }
    } catch (error) {
      toast.error("حدث خطأ غير متوقع");
    }

    setIsLoading(false);
  };

  const inputClass = "pr-10 text-right h-12 rounded-lg border-2 border-border bg-muted/30 focus:border-primary focus:bg-background transition-all duration-200";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background via-background to-primary/5">
      <SEO title="تسجيل الدخول" path="/auth" noIndex />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <motion.div 
          className="text-center mb-6"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        >
          <img 
            src={appIcon} 
            alt="Advance" 
            className="w-20 h-20 mx-auto mb-2 rounded-2xl shadow-gold"
          />
          <h1 className="text-2xl font-black text-foreground">Advance</h1>
        </motion.div>

        {/* Auth Card */}
        <motion.div 
          className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-2xl"
          layout
          transition={{ layout: { duration: 0.3, type: "spring", stiffness: 300, damping: 30 } }}
        >
          {/* Mode Toggle - Tab Style */}
          <div className="grid grid-cols-2 border-b-2 border-border">
            <button
              type="button"
              className={`flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all duration-200 ${
                isLogin 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              }`}
              onClick={() => setIsLogin(true)}
            >
              <LogIn className="w-4 h-4" />
              تسجيل الدخول
            </button>
            <button
              type="button"
              className={`flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all duration-200 ${
                !isLogin 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              }`}
              onClick={() => setIsLogin(false)}
            >
              <UserPlus className="w-4 h-4" />
              حساب جديد
            </button>
          </div>

          {/* Form Body */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.p
                key={isLogin ? "login-sub" : "signup-sub"}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="text-muted-foreground text-sm text-center mb-5"
              >
                {isLogin ? "مرحباً بعودتك!" : "🎁 7 أيام تجربة مجانية!"}
              </motion.p>
            </AnimatePresence>

            <form onSubmit={isLogin ? handleSubmit : handleSignupClick} className="space-y-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isLogin ? "login-fields" : "signup-fields"}
                  initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {!isLogin && (
                    <>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="الاسم الكامل"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div className="relative">
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="tel"
                          placeholder="رقم الهاتف المحمول"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="البريد الإلكتروني"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="كود الإحالة (اختياري)"
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value)}
                          className={`${inputClass} font-mono`}
                          dir="ltr"
                        />
                      </div>
                    </>
                  )}

                  {isLogin && (
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="البريد الإلكتروني أو رقم الهاتف"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className={inputClass}
                        dir="ltr"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="كلمة المرور"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputClass} pl-10`}
                      autoComplete={isLogin ? "current-password" : "new-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>

                  {!isLogin && (
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="تأكيد كلمة المرور"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`${inputClass} pl-10`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {isLogin && (
                <div className="text-left">
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-gold text-primary-foreground shadow-gold text-lg font-bold h-12 rounded-lg mt-4"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <>
                    {isLogin ? "دخول" : "ابدأ الآن"}
                    <ArrowRight className="w-5 h-5 mr-2" />
                  </>
                )}
              </Button>

              {isLogin && (
                <>
                  <div className="relative py-3">
                    <div className="h-px bg-border" />
                    <span className="absolute left-1/2 -translate-x-1/2 -top-1 bg-card px-3 text-xs text-muted-foreground">
                      أو
                    </span>
                  </div>
                  <div className="grid gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2 h-11 rounded-lg border-2 border-border"
                      onClick={() => handleOAuth("google")}
                      disabled={isLoading}
                    >
                      <Chrome className="w-5 h-5" />
                      الدخول عبر Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2 h-11 rounded-lg border-2 border-border"
                      onClick={() => handleOAuth("apple")}
                      disabled={isLoading}
                    >
                      <Apple className="w-5 h-5" />
                      الدخول عبر Apple
                    </Button>
                  </div>
                </>
              )}
            </form>
          </div>
        </motion.div>

        <div className="py-4 text-center">
          <p className="text-muted-foreground text-xs">
            جميع الحقوق محفوظة لـ Advance 2025©
          </p>
        </div>

        <PrivacyPolicyModal 
          isOpen={showPrivacyPolicy} 
          onAccept={handlePrivacyAccept}
        />
        <ForgotPasswordDialog isOpen={showForgot} onClose={() => setShowForgot(false)} />
      </motion.div>
    </div>
  );
};

export default Auth;

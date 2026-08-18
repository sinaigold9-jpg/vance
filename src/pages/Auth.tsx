import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  Eye,
  EyeOff,
  Chrome,
  Apple,
  UserPlus,
  LogIn,
  Loader2,
} from "lucide-react";
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

const signUpSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "الاسم يجب أن يكون أكثر من حرفين")
      .max(50, "الاسم طويل جداً"),
    email: z.string().email("البريد الإلكتروني غير صحيح"),
    phone: z
      .string()
      .min(11, "رقم الهاتف يجب أن يكون 11 رقم")
      .max(15, "رقم الهاتف غير صحيح"),
    password: z
      .string()
      .min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمات المرور غير متطابقة",
    path: ["confirmPassword"],
  });

const emailLoginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

const phoneLoginSchema = z.object({
  phone: z.string().min(8, "رقم الهاتف غير صحيح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
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

      if (rest.length === 10 && rest.startsWith("1")) {
        return `0${rest}`;
      }

      return rest;
    }

    if (digits.length === 10 && digits.startsWith("1")) {
      return `0${digits}`;
    }

    return digits;
  };

  const validateReferralCode = async (
    code: string
  ): Promise<string | null> => {
    const clean = code.trim();

    if (!clean) return null;

    const { data, error } = await supabase.functions.invoke(
      "referral-validate",
      {
        body: { ref: clean },
      }
    );

    if (error) {
      console.error("referral-validate failed:", error);
      return null;
    }

    return data?.referredBy ?? null;
  };

  const signInWithPhone = async (rawPhone: string, pw: string) => {
    const phoneToSend = normalizePhone(rawPhone) || rawPhone;

    let response: Awaited<ReturnType<typeof supabase.functions.invoke>>;

    try {
      response = await supabase.functions.invoke("phone-login", {
        body: {
          phone: phoneToSend,
          password: pw,
        },
      });
    } catch (invokeError) {
      console.error("phone-login invoke failed:", invokeError);
      throw new Error("NETWORK_ERROR");
    }

    const { data, error } = response;

    if (error) {
      console.error("phone-login failed:", error);

      let status: number | undefined;

      if (
        error &&
        typeof error === "object" &&
        "context" in error &&
        (error as { context?: unknown }).context instanceof Response
      ) {
        status = (error as { context: Response }).context.status;
      }

      if (status === 400 || status === 401 || status === 404) {
        throw new Error("INVALID_CREDENTIALS");
      }

      throw new Error("SERVICE_UNAVAILABLE");
    }

    if (data?.error) {
      console.error("phone-login returned error:", data.error);
      throw new Error("INVALID_CREDENTIALS");
    }

    const access_token = data?.access_token as string | undefined;
    const refresh_token = data?.refresh_token as string | undefined;

    if (!access_token || !refresh_token) {
      console.error("phone-login missing tokens in response:", data);
      throw new Error("INCOMPLETE_SESSION");
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (sessionError) {
      console.error("setSession failed:", sessionError);
      throw new Error("SERVICE_UNAVAILABLE");
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setIsLoading(true);

    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });

      if (result?.error) {
        console.error(`OAuth (${provider}) failed:`, result.error);
        toast.error(
          provider === "google"
            ? "تعذر تسجيل الدخول باستخدام Google"
            : "تعذر تسجيل الدخول باستخدام Apple"
        );
        return;
      }

      if (!result?.redirected) {
        toast.success("تم تسجيل الدخول بنجاح");
        navigate("/app");
      }
    } catch (error) {
      console.error(`OAuth (${provider}) failed:`, error);
      toast.error(
        provider === "google"
          ? "تعذر تسجيل الدخول باستخدام Google"
          : "تعذر تسجيل الدخول باستخدام Apple"
      );
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
        if (loginMethod === "phone") {
          const validation = phoneLoginSchema.safeParse({
            phone,
            password,
          });

          if (!validation.success) {
            toast.error(validation.error.errors[0].message);
            setIsLoading(false);
            return;
          }

          try {
            await signInWithPhone(phone, password);
            toast.success("تم تسجيل الدخول بنجاح");
            navigate("/app");
          } catch (err) {
            console.error("Phone login failed:", err);

            const code = err instanceof Error ? err.message : "";

            if (code === "INVALID_CREDENTIALS") {
              toast.error("رقم الهاتف أو كلمة المرور غير صحيحة");
            } else if (code === "NETWORK_ERROR") {
              toast.error("تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى.");
            } else if (code === "SERVICE_UNAVAILABLE") {
              toast.error("الخدمة غير متاحة حاليًا، يرجى المحاولة لاحقًا.");
            } else {
              toast.error("تعذر إكمال تسجيل الدخول برقم الهاتف");
            }
          }

          setIsLoading(false);
          return;
        }

        const validation = emailLoginSchema.safeParse({
          email,
          password,
        });

        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(email, password);

        if (error) {
          console.error("signIn failed:", error);

          if (error.message.includes("Invalid login")) {
            toast.error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
          } else {
            toast.error(
              "حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة مرة أخرى."
            );
          }

          setIsLoading(false);
          return;
        }

        toast.success("تم تسجيل الدخول بنجاح");
        navigate("/app");
      } else {
        const validation = signUpSchema.safeParse({
          fullName,
          email,
          phone,
          password,
          confirmPassword,
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

        const { error } = await signUp(
          email,
          password,
          fullName,
          phone,
          referredBy
        );

        if (error) {
          console.error("signUp failed:", error);

          if (error.message.includes("already registered")) {
            toast.error("هذا البريد الإلكتروني مسجل بالفعل");
          } else {
            toast.error(
              "حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة مرة أخرى."
            );
          }
        } else {
          if (
            (registeredViaReferral || referralCode.trim()) &&
            referredBy
          ) {
            toast.success("تم التسجيل عبر كود الإحالة بنجاح!");
          } else {
            toast.success(
              "تم إنشاء حسابك بنجاح! 🎉 لديك 7 أيام تجربة مجانية"
            );
          }

          navigate("/app?onboarding=true");
        }
      }
    } catch (error) {
      console.error("Auth submit failed:", error);
      toast.error("حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى.");
    }

    setIsLoading(false);
  };

  const inputClass =
    "pr-10 text-right h-12 rounded-lg border-2 border-border bg-muted/30 focus:border-primary focus:bg-background transition-all duration-200";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background via-background to-primary/5">
      <SEO title="تسجيل الدخول" path="/auth" noIndex />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <motion.div
          className="text-center mb-6"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{
            delay: 0.1,
            type: "spring",
            stiffness: 200,
          }}
        >
          <img
            src={appIcon}
            alt="Advance"
            className="w-20 h-20 mx-auto mb-2 rounded-2xl shadow-gold"
          />
          <h1 className="text-2xl font-black text-foreground">Advance</h1>
        </motion.div>

        <motion.div
          className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-2xl"
          layout
          transition={{
            layout: {
              duration: 0.3,
              type: "spring",
              stiffness: 300,
              damping: 30,
            },
          }}
        >
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

            <form
              onSubmit={isLogin ? handleSubmit : handleSignupClick}
              className="space-y-3"
            >
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
                    <>
                      <div className="grid grid-cols-2 gap-2 mb-1">
                        <button
                          type="button"
                          onClick={() => setLoginMethod("email")}
                          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                            loginMethod === "email"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          <Mail className="w-3.5 h-3.5" />
                          البريد الإلكتروني
                        </button>

                        <button
                          type="button"
                          onClick={() => setLoginMethod("phone")}
                          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                            loginMethod === "phone"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                          رقم الهاتف
                        </button>
                      </div>

                      {loginMethod === "email" ? (
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
                      ) : (
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
                      )}
                    </>
                  )}

                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="كلمة المرور"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                     

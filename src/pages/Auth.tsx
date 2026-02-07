import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff, Chrome, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PrivacyPolicyModal } from "@/components/PrivacyPolicyModal";
import appIcon from "@/assets/app-icon.png";
import { lovable } from "@/integrations/lovable/index";

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
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") === "login");
  const [identifier, setIdentifier] = useState(""); // Can be email or phone
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState(""); // Visible input for referral code
  const [referralFromUrl, setReferralFromUrl] = useState<string | null>(null); // Hidden from user
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [registeredViaReferral, setRegisteredViaReferral] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  // Check for referral link - automatically store it
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setReferralFromUrl(ref);
      setReferralCode(ref); // Pre-fill the referral code input
      setIsLogin(false); // Show registration form when coming from referral link
      setRegisteredViaReferral(true);
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

    // Common Egyptian formats:
    // 010xxxxxxxxx (11)
    // 1xxxxxxxxx (10)  -> prefix 0
    // 2010xxxxxxxxx (13) -> strip 20
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
    
    // Try to validate as membership_id first, then as user_id
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

        // Check if identifier is a phone number (starts with 0/+ or mostly digits)
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
          fullName, 
          email, 
          phone, 
          password, 
          confirmPassword
        });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setIsLoading(false);
          return;
        }

        // Validate referral code if present
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
          // Show special message if registered via referral
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-background/80">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md flex-1 flex flex-col justify-center"
      >
        {/* Logo - Larger */}
        <div className="text-center mb-8">
          <img 
            src={appIcon} 
            alt="Advance" 
            className="w-32 h-32 mx-auto mb-4 rounded-3xl shadow-gold"
          />
          <h1 className="text-4xl font-black text-foreground">Advance</h1>
          {!isLogin && (
            <p className="text-primary text-sm mt-2">7 أيام تجربة مجانية!</p>
          )}
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

          <form onSubmit={isLogin ? handleSubmit : handleSignupClick} className="space-y-4">
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
                    placeholder="رقم الهاتف المحمول"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pr-10 text-right"
                    dir="ltr"
                  />
                </div>
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
                
                {/* Referral Code Input */}
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="كود الإحالة (اختياري)"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    className="pr-10 text-right font-mono"
                    dir="ltr"
                  />
                </div>
              </>
            )}

            {isLogin && (
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="البريد الإلكتروني أو رقم الهاتف"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pr-10 text-right"
                  dir="ltr"
                />
              </div>
            )}

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

            {!isLogin && (
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="تأكيد كلمة المرور"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10 pl-10 text-right"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
            )}

            {/* No referral code input field - it's handled automatically */}

            <Button
              type="submit"
              className="w-full bg-gradient-gold text-primary-foreground shadow-gold text-lg font-bold h-12"
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
                <div className="relative py-2">
                  <div className="h-px bg-border" />
                  <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-card px-3 text-xs text-muted-foreground">
                    أو
                  </span>
                </div>
                <div className="grid gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => handleOAuth("google")}
                    disabled={isLoading}
                  >
                    <Chrome className="w-5 h-5" />
                    الدخول عبر Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
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

      {/* Copyright Footer */}
      <div className="py-4 text-center">
        <p className="text-muted-foreground text-sm">
          جميع الحقوق محفوظة لـ Advance 2025©
        </p>
      </div>

      <PrivacyPolicyModal 
        isOpen={showPrivacyPolicy} 
        onAccept={handlePrivacyAccept}
      />
    </div>
  );
};

export default Auth;

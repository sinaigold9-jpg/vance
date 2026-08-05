import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BalanceCard } from "@/components/BalanceCard";
import { PackageCard } from "@/components/PackageCard";
import { DailyTasks } from "@/components/DailyTasks";
import { LuckyWheel } from "@/components/LuckyWheel";
import { EarningMethods } from "@/components/EarningMethods";
import { HomeGrid } from "@/components/HomeGrid";
import { PageHeader } from "@/components/PageHeader";
import { TeamSection } from "@/components/TeamSection";
import { SupportSection } from "@/components/SupportSection";
import { SocialLinks } from "@/components/SocialLinks";
import { AppSidebar } from "@/components/AppSidebar";
import { DepositDialog } from "@/components/DepositDialog";
import { WithdrawalDialog } from "@/components/WithdrawalDialog";
import { WithdrawalPinSetup } from "@/components/WithdrawalPinSetup";
import { OnboardingTour } from "@/components/OnboardingTour";
import { BotWidget } from "@/components/BotWidget";
import { BalanceReveal } from "@/components/BalanceReveal";
import { EarningsInfo } from "@/components/EarningsInfo";
import { ProfileSection } from "@/components/profile/ProfileSection";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { OffersPage } from "@/components/OffersPage";
import { HomeOffersPreview } from "@/components/HomeOffersPreview";
import { ContestBanner } from "@/components/contest/ContestBanner";
import { PromotionBanner } from "@/components/PromotionBanner";
import { FloatingLuckyWheel } from "@/components/FloatingLuckyWheel";
import { FAQ } from "@/components/FAQ";
import { UpdatesFeed } from "@/components/UpdatesFeed";
import { GamesCenter } from "@/pages/GamesCenter";
import { WithdrawalHistory } from "@/components/WithdrawalHistory";
import { PointsConverter } from "@/components/PointsConverter";
import { ProfileCompletion } from "@/components/ProfileCompletion";
import { InstallPWA } from "@/components/InstallPWA";
import { EmailSubscription } from "@/components/EmailSubscription";
import { TelegramVerificationGate } from "@/components/TelegramVerificationGate";
import { CashbackPage } from "@/components/cashback/CashbackPage";

import { useAppSettings } from "@/hooks/useAppSettings";
import { AlertTriangle, Lock, Coins } from "lucide-react";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { registerPushNotifications } from "@/lib/pushNotifications";
const appIcon = "/placeholder.svg";
import { toast } from "sonner";
import { PermissionsRequest } from "@/components/PermissionsRequest";
import { CURRENT_VERSION } from "@/lib/appVersion";

const OWNER_EMAIL = "sinaigold9@gmail.com";

type AccountType = "beginner" | "vip1" | "vip2" | "vip3";

interface PackageFromDB {
  id: string;
  name: string;
  price: number;
  task_reward: number;
  daily_tasks: number;
  daily_earnings: number;
  min_withdrawal: number;
  has_daily_wheel: boolean;
  account_type: string;
  is_active: boolean;
}

const getVipLevel = (accountType: string): number => {
  switch (accountType) {
    case "beginner": return 0;
    case "vip1": return 1;
    case "vip2": return 2;
    case "vip3": return 3;
    default: return 4;
  }
};

// Map URL paths to tab names
const pathToTab: Record<string, string> = {
  "/app": "home",
  "/app/tasks": "tasks",
  "/app/wheel": "wheel",
  "/app/wallet": "wallet",
  "/app/cashback": "cashback",
  "/app/team": "team",
  "/app/packages": "packages",
  "/app/earnings": "earnings",
  "/app/offers": "offers",
  "/app/profile": "profile",
  "/app/support": "support",
  "/app/faq": "faq",
  "/app/updates": "updates",
  "/app/games": "games",
  "/app/download": "download",
};

const tabToPath: Record<string, string> = {
  home: "/app",
  tasks: "/app/tasks",
  wheel: "/app/wheel",
  wallet: "/app/wallet",
  cashback: "/app/cashback",
  team: "/app/team",
  packages: "/app/packages",
  earnings: "/app/earnings",
  offers: "/app/offers",
  profile: "/app/profile",
  support: "/app/support",
  faq: "/app/faq",
  updates: "/app/updates",
  games: "/app/games",
  download: "/app/download",
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Derive active tab from URL
  const getTabFromPath = () => pathToTab[location.pathname] || "home";
  const [activeTab, setActiveTab] = useState(getTabFromPath);
  
  const [accountType, setAccountType] = useState<AccountType>("beginner");
  const [balance, setBalance] = useState(0);
  const [points, setPoints] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [canSpinWheel, setCanSpinWheel] = useState(true);
  const [luckyWheelUsed, setLuckyWheelUsed] = useState(false);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBalanceReveal, setShowBalanceReveal] = useState(false);
  const [isBalanceRevealed, setIsBalanceRevealed] = useState(true);
  const [showPointsConverter, setShowPointsConverter] = useState(false);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [withdrawalPin, setWithdrawalPin] = useState<string | null>(null);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);
  const [membershipId, setMembershipId] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [userProfile, setUserProfile] = useState<{ full_name: string; email: string | null; phone: string | null; } | null>(null);
  const [packagesData, setPackagesData] = useState<PackageFromDB[]>([]);
  const [disabledFeatures, setDisabledFeatures] = useState<Record<string, boolean>>({});
  
  const { user, signOut } = useAuth();
  const { settings: appSettings } = useAppSettings();

  // Sync URL with active tab
  useEffect(() => {
    const currentTab = getTabFromPath();
    if (currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [location.pathname]);

  // Check if trial has expired
  const isTrialExpired = () => {
    if (accountType !== "beginner" || !trialEndDate) return false;
    return new Date() > new Date(trialEndDate);
  };

  useEffect(() => { 
    fetchPackages();
    if (user) {
      fetchUserProfile();
      supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", user.id).then(() => {});
      registerPushNotifications(user.id).catch(console.error);
      if (searchParams.get("onboarding") === "true") {
        setShowOnboarding(true);
      }
    }

    const channel = supabase
      .channel("packages-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "packages" }, () => {
        fetchPackages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, searchParams]);

  const fetchPackages = async () => {
    const { data } = await supabase.from("packages").select("*").eq("is_active", true).order("price", { ascending: true });
    if (data) setPackagesData(data);
  };

  const fetchUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (data) {
      setAccountType(data.account_type as AccountType);
      setBalance(data.balance || 0);
      setPoints((data as { points?: number }).points || 0);
      setLuckyWheelUsed(data.lucky_wheel_used || false);
      setMembershipId(data.membership_id || "");
      setReferralCode(data.referral_code || "");
      setWithdrawalPin(data.withdrawal_pin);
      setTrialEndDate(data.trial_end_date);
      setUserProfile({ full_name: data.full_name, email: data.email, phone: data.phone });
      setDisabledFeatures((data.disabled_features as Record<string, boolean> | null) || {});
      
      if (!data.full_name || data.full_name === "" || !data.phone || data.phone === "") {
        setShowProfileCompletion(true);
      }
      
      if (data.account_type === "beginner") { 
        setCanSpinWheel(!data.lucky_wheel_used); 
      } else {
        const today = new Date().toDateString();
        const lastSpin = data.last_wheel_spin ? new Date(data.last_wheel_spin).toDateString() : null;
        setCanSpinWheel(lastSpin !== today);
      }
    }
  };

  const currentPackage = packagesData.find((p) => p.account_type === accountType) || packagesData[0];

  const handleBalanceUpdate = (newBalance: number, earnings: number) => {
    setBalance(newBalance);
    setTodayEarnings((prev) => prev + earnings);
  };

  const handleSpinWheel = async (prize: number) => {
    if (!user) return;
    const newBalance = balance + prize;
    setBalance(newBalance);
    setTodayEarnings((prev) => prev + prize);
    if (accountType === "beginner") {
      await supabase.from("profiles").update({ lucky_wheel_used: true, balance: newBalance }).eq("id", user.id);
      setCanSpinWheel(false);
      setLuckyWheelUsed(true);
    } else {
      await supabase.from("profiles").update({ last_wheel_spin: new Date().toISOString(), balance: newBalance }).eq("id", user.id);
      setCanSpinWheel(false);
    }
    await supabase.from("activity_logs").insert({ user_id: user.id, action: "أرباح عجلة الحظ", amount: prize });
  };

  const handleWithdraw = (amount: number) => { setBalance((prev) => prev - amount); };
  const handleDeposit = () => { setShowDepositDialog(true); };

  const handleOpenWallet = () => {
    handleTabChange("wallet");
  };

  const handleOpenWithdraw = () => {
    if (disabledFeatures.withdrawal) {
      toast.error("ميزة السحب معطلة لحسابك");
      return;
    }
    if (!withdrawalPin) { 
      setShowPinSetup(true); 
      return;
    }
    
    setShowWithdrawDialog(true);
  };

  const trialExpired = isTrialExpired();
  const isAppBlocked = !!disabledFeatures.app_blocked;
  const tabFeatureMap: Record<string, string> = {
    tasks: "tasks",
    wallet: "wallet",
    team: "team",
  };

  useEffect(() => {
    if (isAppBlocked) {
      return;
    }
    const featureKey = tabFeatureMap[activeTab];
    if (featureKey && disabledFeatures[featureKey]) {
      setActiveTab("home");
      if (location.pathname !== "/app") navigate("/app", { replace: true });
    }
  }, [activeTab, disabledFeatures, location.pathname, navigate, isAppBlocked]);

  const pointsToEgp = (pts: number) => Math.floor(pts / 1000) * 165;

  const isOwner = user?.email === OWNER_EMAIL;

  if (!appSettings.appEnabled && !isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-2xl p-8 text-center max-w-md"
        >
          <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">التطبيق متوقف مؤقتاً</h1>
          <p className="text-muted-foreground">{appSettings.appDisabledMessage}</p>
        </motion.div>
      </div>
    );
  }

  if (isAppBlocked && !isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-destructive/50 rounded-2xl p-8 text-center max-w-md"
        >
          <Lock className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4 text-destructive">حسابك موقوف</h1>
          <p className="text-muted-foreground mb-6">تم إيقاف حسابك من قبل الإدارة. يرجى التواصل مع الدعم الفني لمزيد من المعلومات.</p>
          <Button variant="outline" onClick={() => signOut()}>تسجيل الخروج</Button>
        </motion.div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            {trialExpired && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-destructive" />
                <div>
                  <p className="font-bold text-destructive">انتهت فترة التجربة</p>
                  <p className="text-sm text-muted-foreground">قم بترقية باقتك للاستمرار في استخدام الميزات</p>
                </div>
              </motion.div>
            )}
            
            <PromotionBanner />
            <ContestBanner location="home" />
            <HomeOffersPreview onViewAll={() => handleTabChange("offers")} />
            <SocialLinks />
            <EmailSubscription />
            
            <div className="pt-4">
              <h2 className="text-lg font-bold text-foreground mb-4">الأقسام</h2>
              <HomeGrid activeTab={activeTab} onTabChange={handleTabChange} />
            </div>
          </motion.div>
        );
      case "download":
        return (
          <motion.div key="download" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <PageHeader title="تحميل التطبيق" subtitle="استمتع بتجربة أفضل مع Advance" onBack={() => handleTabChange("home")} />
            <div className="space-y-6">
              <div className="bg-gradient-card rounded-2xl border border-border/50 p-8 space-y-6">
                <h2 className="text-2xl font-bold text-foreground">اختر طريقة التحميل</h2>
                <p className="text-muted-foreground">حمل التطبيق على جهازك للحصول على أفضل تجربة</p>
              </div>
            </div>
          </motion.div>
        );
      case "packages": {
        const highlightPkg = searchParams.get("highlight");
        const discountPct = Number(searchParams.get("discount")) || 0;
        return (
          <motion.div key="packages" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
            <PageHeader title="الباقات" subtitle="كلما زادت الباقة، زادت الأرباح" onBack={() => handleTabChange("home")} />
            <div className="grid gap-4">
              {packagesData.filter((p) => p.account_type !== "beginner").map((pkg) => {
                const vipLevel = getVipLevel(pkg.account_type);
                const isHighlighted = highlightPkg === pkg.account_type;
                const appliedDiscount = isHighlighted ? discountPct : 0;
                return (
                  <PackageCard
                    key={pkg.id}
                    name={pkg.name}
                    price={pkg.price}
                    rewardPerTask={pkg.task_reward}
                    dailyTasks={pkg.daily_tasks}
                    dailyEarnings={pkg.daily_earnings}
                    minWithdraw={pkg.min_withdrawal}
                    hasLuckyWheel={pkg.has_daily_wheel}
                    luckyWheelFrequency={pkg.account_type === "beginner" ? "مرة واحدة" : "يومياً"}
                    isVip={vipLevel > 0}
                    vipLevel={vipLevel}
                    isActive={pkg.account_type === accountType}
                    accountType={pkg.account_type}
                    isHighlighted={isHighlighted}
                    discountPercentage={appliedDiscount}
                  />
                );
              })}
            </div>
          </motion.div>
        );
      }
      case "earnings":
        return (
          <motion.div key="earnings" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <PageHeader title="الأرباح" subtitle="حاسبة أرباح الباقات" onBack={() => handleTabChange("home")} />
            <EarningsInfo />
          </motion.div>
        );
      case "tasks":
        return (
          <motion.div key="tasks" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            <PageHeader title="المهام اليومية" subtitle="أكمل المهام واربح المكافآت" onBack={() => handleTabChange("home")} />
            {!appSettings.tasksEnabled ? (
              <div className="bg-gradient-card rounded-2xl p-8 text-center border border-border">
                <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">نظام المهام متوقف</h3>
                <p className="text-muted-foreground">{appSettings.tasksDisabledMessage}</p>
              </div>
            ) : trialExpired ? (
              <div className="bg-gradient-card rounded-2xl p-8 text-center border border-border">
                <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">انتهت فترة التجربة</h3>
                <p className="text-muted-foreground mb-4">قم بترقية باقتك للاستمرار في إنجاز المهام</p>
                <Button onClick={() => handleTabChange("packages")} className="bg-gradient-gold text-primary-foreground">ترقية الباقة</Button>
              </div>
            ) : user ? (
              <DailyTasks userId={user.id} accountType={accountType} onBalanceUpdate={handleBalanceUpdate} />
            ) : (
              <div className="bg-gradient-card rounded-2xl p-6 text-center"><p className="text-muted-foreground">يرجى تسجيل الدخول</p></div>
            )}
          </motion.div>
        );
      case "wheel":
        return (
          <motion.div key="wheel" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            <PageHeader title="عجلة الحظ" subtitle="جرب حظك واربح جوائز رائعة" onBack={() => handleTabChange("home")} />
            {!appSettings.luckyWheelEnabled || disabledFeatures.wheel ? (
              <div className="bg-gradient-card rounded-2xl p-8 text-center border border-border">
                <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">عجلة الحظ متوقفة</h3>
                <p className="text-muted-foreground">{disabledFeatures.wheel ? "عجلة الحظ معطلة لحسابك" : appSettings.luckyWheelDisabledMessage}</p>
              </div>
            ) : trialExpired ? (
              <div className="bg-gradient-card rounded-2xl p-8 text-center border border-border">
                <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">انتهت فترة التجربة</h3>
                <p className="text-muted-foreground mb-4">قم بترقية باقتك لاستخدام عجلة الحظ</p>
                <Button onClick={() => handleTabChange("packages")} className="bg-gradient-gold text-primary-foreground">ترقية الباقة</Button>
              </div>
            ) : (
              <LuckyWheel prizes={[3, 5, 1, 10]} canSpin={canSpinWheel && !trialExpired && !disabledFeatures.wheel} onSpin={handleSpinWheel} accountType={accountType} luckyWheelUsed={luckyWheelUsed} />
            )}
          </motion.div>
        );
      case "team":
        return (
          <motion.div key="team" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <PageHeader title="الفريق" subtitle="ادعُ أصدقاءك واربح" onBack={() => handleTabChange("home")} />
            {user && <TeamSection userId={user.id} referralCode={referralCode} membershipId={membershipId} isTrialExpired={trialExpired} teamEnabled={appSettings.teamEnabled} teamDisabledMessage={appSettings.teamDisabledMessage} />}
          </motion.div>
        );
      case "wallet":
        return (
          <motion.div key="wallet" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            <PageHeader title="المحفظة" subtitle="إيداع وسحب الأموال" onBack={() => handleTabChange("home")} />
            <BalanceCard balance={balance} todayEarnings={todayEarnings} accountType={accountType} onRevealClick={() => {}} isRevealed={true} />
            <div className="bg-gradient-card rounded-2xl shadow-card border border-border/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Coins className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">نقاط الأرباح</h3>
                  <p className="text-sm text-muted-foreground">يمكنك تحويلها إلى رصيد</p>
                </div>
              </div>
              <div className="bg-secondary/30 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-primary">{points.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">نقاطك الحالية</p>
              </div>
              {points >= 100 && (
                <Button 
                  onClick={() => setShowPointsConverter(true)} 
                  variant="outline" 
                  className="w-full mt-4 border-primary text-primary hover:bg-primary/10"
                >
                  <Coins className="w-4 h-4 ml-2" />
                  تحويل النقاط إلى رصيد
                </Button>
              )}
            </div>
            <div className="bg-gradient-card rounded-2xl shadow-card border border-border/50 p-6">
              <div className="text-center mb-6">
                <p className="text-muted-foreground text-sm">رصيدك الحالي</p>
                <p className="text-3xl font-black text-gradient-gold">
                  {balance.toLocaleString()} جنيه
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleOpenWithdraw} className="flex-1 h-12 bg-gradient-gold text-primary-foreground">سحب</Button>
                <Button variant="outline" onClick={handleDeposit} className="flex-1 h-12">إيداع</Button>
              </div>
              <Button
                onClick={() => handleTabChange("cashback")}
                variant="outline"
                className="w-full h-12 mt-3 border-primary/40 text-primary hover:bg-primary/10"
              >
                <Gift className="w-4 h-4 ml-2" />
                الكاش باك
              </Button>
            </div>
            <WithdrawalHistory />
            <EarningMethods
              accountType={accountType}
              referralCode={referralCode}
              membershipId={membershipId}
              referralEarnings={accountType === "beginner" ? 5 : 8}
              shareEarnings={accountType === "beginner" ? 1 : 2}
              teamEarnings={0}
              totalReferrals={0}
              totalShares={0}
              teamMembers={0}
            />
          </motion.div>
        );
      case "cashback":
        return (
          <motion.div key="cashback" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <PageHeader title="الكاش باك" subtitle="استرداد نقدي على كل عملية شحن" onBack={() => handleTabChange("wallet")} />
            <CashbackPage />
          </motion.div>
        );
      case "support":
        return (
          <motion.div key="support" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <PageHeader title="الدعم الفني" subtitle="تواصل معنا للمسا��دة" onBack={() => handleTabChange("home")} />
            <SupportSection />
          </motion.div>
        );
      case "profile":
        return (
          <motion.div key="profile" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <PageHeader title="الملف الشخصي" subtitle="إعدادات حسابك" onBack={() => handleTabChange("home")} />
            {user && userProfile && (
              <ProfileSection 
                userProfile={{
                  ...userProfile,
                  membership_id: membershipId,
                  account_type: accountType,
                  balance: balance,
                  total_earnings: todayEarnings
                }} 
                onRefresh={fetchUserProfile}
              />
            )}
          </motion.div>
        );
      case "offers":
        return (
          <motion.div key="offers" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <PageHeader title="العروض والمسابقات" subtitle="ترقبوا المفاجآت" onBack={() => handleTabChange("home")} />
            {trialExpired ? (
              <div className="bg-gradient-card rounded-2xl p-8 text-center border border-border">
                <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">انتهت فترة التجربة</h3>
                <p className="text-muted-foreground mb-4">قم بترقية باقتك للوصول إلى العروض والمسابقات</p>
                <Button onClick={() => handleTabChange("packages")}>عرض الباقات</Button>
              </div>
            ) : (
              <OffersPage />
            )}
          </motion.div>
        );
      case "faq":
        return (
          <motion.div key="faq" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <PageHeader title="الأسئلة الشائعة" subtitle="دليل استخدام التطبيق" onBack={() => handleTabChange("home")} />
            <FAQ />
          </motion.div>
        );
      case "updates":
        return (
          <motion.div key="updates" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <PageHeader title="الجديد" subtitle="آخر تحديثات Advance" onBack={() => handleTabChange("home")} />
            <UpdatesFeed />
          </motion.div>
        );
      case "games":
        return (
          <motion.div key="games" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            {trialExpired ? (
              <div className="space-y-6">
                <PageHeader title="مركز الألعاب" subtitle="ترقب المزيد" onBack={() => handleTabChange("home")} />
                <div className="bg-gradient-card rounded-2xl p-8 text-center border border-border">
                  <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">انتهت فترة التجربة</h3>
                  <p className="text-muted-foreground mb-4">قم بترقية باقتك للعب في مركز الألعاب</p>
                  <Button onClick={() => handleTabChange("packages")}>عرض الباقات</Button>
                </div>
              </div>
            ) : (
              <GamesCenter onBack={() => handleTabChange("home")} />
            )}
          </motion.div>
        );
      default:
        return null;
    }
  };

  const handleTabChange = (tab: string) => {
    const featureKey = tabFeatureMap[tab];
    if (featureKey && disabledFeatures[featureKey]) {
      toast.error("هذا القسم معطل لحسابك");
      navigate("/app");
      setActiveTab("home");
      return;
    }

    const path = tabToPath[tab] || "/app";
    navigate(path);
    setActiveTab(tab);
  };

  const botUsername = "AdvanceAppBot";

  return (
    <TelegramVerificationGate botUsername={botUsername}>
    <div className="min-h-screen pb-8">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={appIcon} alt="A Pro" className="w-10 h-10 rounded-full ring-2 ring-primary/30" />
              <div className="leading-tight">
                <h1 className="text-lg font-black text-foreground">
                  A <span className="text-gradient-gold">Pro</span>
                </h1>
                <p className="text-[10px] text-muted-foreground -mt-0.5">Advance</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user && <NotificationBell />}
              <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </main>

      <div className="max-w-4xl mx-auto px-4 pb-6">
        <div className="text-center py-4 border-t border-border/30">
          <p className="text-xs text-muted-foreground">جميع الحقوق محفوظة لـ Advance©2025</p>
        </div>
      </div>

      <DepositDialog isOpen={showDepositDialog} onClose={() => setShowDepositDialog(false)} userProfile={userProfile} />
      <PermissionsRequest />
      {user && <WithdrawalPinSetup isOpen={showPinSetup} onClose={() => setShowPinSetup(false)} userId={user.id} onSuccess={() => { fetchUserProfile(); }} />}
      {user && <WithdrawalDialog isOpen={showWithdrawDialog} onClose={() => setShowWithdrawDialog(false)} userId={user.id} balance={balance} minWithdraw={currentPackage?.min_withdrawal || 500} withdrawalPin={withdrawalPin} onWithdraw={handleWithdraw} accountType={accountType} trialEndDate={trialEndDate} />}
      {user && showPointsConverter && (
        <PointsConverter
          isOpen={showPointsConverter}
          onClose={() => setShowPointsConverter(false)}
          userId={user.id}
          currentPoints={points}
          onConvert={(newBalance, newPoints) => {
            setBalance(newBalance);
            setPoints(newPoints);
          }}
        />
      )}
      {user && showProfileCompletion && (
        <ProfileCompletion
          isOpen={showProfileCompletion}
          onClose={() => setShowProfileCompletion(false)}
          userId={user.id}
          onComplete={fetchUserProfile}
        />
      )}
      
      {showOnboarding && <OnboardingTour onComplete={() => setShowOnboarding(false)} />}
      <BotWidget />
      <FloatingLuckyWheel />
      <InstallPWA />
    </div>
    </TelegramVerificationGate>
  );
};

export default Index;

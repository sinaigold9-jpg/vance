import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { AdsPage } from "@/components/ads/AdsPage";
import { ProfileSection } from "@/components/profile/ProfileSection";
import { SponsorPage } from "@/components/profile/SponsorPage";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { OffersPage } from "@/components/OffersPage";

import { useAppSettings } from "@/hooks/useAppSettings";
import { LogIn, LogOut, AlertTriangle, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import appIcon from "@/assets/app-icon.png";

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
    default: return 4; // Custom packages
  }
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("home");
  const [accountType, setAccountType] = useState<AccountType>("beginner");
  const [balance, setBalance] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [canSpinWheel, setCanSpinWheel] = useState(true);
  const [luckyWheelUsed, setLuckyWheelUsed] = useState(false);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBalanceReveal, setShowBalanceReveal] = useState(false);
  const [isBalanceRevealed, setIsBalanceRevealed] = useState(false);
  const [withdrawalPin, setWithdrawalPin] = useState<string | null>(null);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);
  const [membershipId, setMembershipId] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [userProfile, setUserProfile] = useState<{ full_name: string; email: string | null; phone: string | null; } | null>(null);
  const [packagesData, setPackagesData] = useState<PackageFromDB[]>([]);
  
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { settings: appSettings } = useAppSettings();

  // Check if trial has expired
  const isTrialExpired = () => {
    if (accountType !== "beginner" || !trialEndDate) return false;
    return new Date() > new Date(trialEndDate);
  };

  useEffect(() => { 
    fetchPackages();
    if (user) {
      fetchUserProfile();
      if (searchParams.get("onboarding") === "true") {
        setShowOnboarding(true);
      }
    }

    // Real-time subscription for packages
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
      setLuckyWheelUsed(data.lucky_wheel_used || false);
      setMembershipId(data.membership_id || "");
      setReferralCode(data.referral_code || "");
      setWithdrawalPin(data.withdrawal_pin);
      setTrialEndDate(data.trial_end_date);
      setUserProfile({ full_name: data.full_name, email: data.email, phone: data.phone });
      
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
    setBalance((prev) => prev + prize);
    setTodayEarnings((prev) => prev + prize);
    if (accountType === "beginner") {
      await supabase.from("profiles").update({ lucky_wheel_used: true, balance: balance + prize }).eq("id", user.id);
      setCanSpinWheel(false);
      setLuckyWheelUsed(true);
    } else {
      await supabase.from("profiles").update({ last_wheel_spin: new Date().toISOString(), balance: balance + prize }).eq("id", user.id);
      setCanSpinWheel(false);
    }
    await supabase.from("activity_logs").insert({ user_id: user.id, action: "أرباح عجلة الحظ", amount: prize });
  };

  const handleWithdraw = (amount: number) => { setBalance((prev) => prev - amount); };
  const handleDeposit = () => { setShowDepositDialog(true); };

  const handleOpenWallet = () => {
    // Check if PIN is set first
    if (!withdrawalPin) {
      setShowPinSetup(true);
      return;
    }
    
    // If PIN is set but balance not revealed, show reveal dialog
    if (!isBalanceRevealed) {
      setShowBalanceReveal(true);
      return;
    }
    
    setActiveTab("wallet");
  };

  const handleOpenWithdraw = () => {
    if (!withdrawalPin) { 
      setShowPinSetup(true); 
      return;
    }
    
    if (!isBalanceRevealed) {
      setShowBalanceReveal(true);
      return;
    }
    
    setShowWithdrawDialog(true);
  };

  const handleBalanceRevealSuccess = () => {
    setIsBalanceRevealed(true);
    setShowBalanceReveal(false);
    setActiveTab("wallet");
  };

  const trialExpired = isTrialExpired();

  // Check if app is disabled
  if (!appSettings.appEnabled) {
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
            <BalanceCard balance={isBalanceRevealed ? balance : null} todayEarnings={todayEarnings} accountType={accountType} onRevealClick={() => !withdrawalPin ? setShowPinSetup(true) : setShowBalanceReveal(true)} isRevealed={isBalanceRevealed} />
            <SocialLinks />
            
            {/* Navigation Grid */}
            <div className="pt-4">
              <h2 className="text-lg font-bold text-foreground mb-4">الأقسام</h2>
              <HomeGrid activeTab={activeTab} onTabChange={handleTabChange} />
            </div>
          </motion.div>
        );
      case "packages":
        return (
          <motion.div key="packages" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
            <PageHeader title="الباقات" subtitle="كلما زادت الباقة، زادت الأرباح" onBack={() => setActiveTab("home")} />
            <div className="grid gap-4">
              {packagesData.map((pkg, index) => {
                const vipLevel = getVipLevel(pkg.account_type);
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
                  />
                );
              })}
            </div>
          </motion.div>
        );
      case "earnings":
        return (
          <motion.div key="earnings" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <PageHeader title="الأرباح" subtitle="حاسبة أرباح الباقات" onBack={() => setActiveTab("home")} />
            <EarningsInfo />
          </motion.div>
        );
      case "tasks":
        return (
          <motion.div key="tasks" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            <PageHeader title="المهام وعجلة الحظ" subtitle="أكمل المهام واربح" onBack={() => setActiveTab("home")} />
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
                <Button onClick={() => setActiveTab("packages")} className="bg-gradient-gold text-primary-foreground">ترقية الباقة</Button>
              </div>
            ) : user ? (
              <DailyTasks userId={user.id} accountType={accountType} onBalanceUpdate={handleBalanceUpdate} />
            ) : (
              <div className="bg-gradient-card rounded-2xl p-6 text-center"><p className="text-muted-foreground">يرجى تسجيل الدخول</p></div>
            )}
            {!appSettings.luckyWheelEnabled ? (
              <div className="bg-gradient-card rounded-2xl p-8 text-center border border-border">
                <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">عجلة الحظ متوقفة</h3>
                <p className="text-muted-foreground">{appSettings.luckyWheelDisabledMessage}</p>
              </div>
            ) : (
              <LuckyWheel prizes={[3, 5, 1, 10]} canSpin={canSpinWheel && !trialExpired} onSpin={handleSpinWheel} accountType={accountType} luckyWheelUsed={luckyWheelUsed} trialExpired={trialExpired} />
            )}
          </motion.div>
        );
      case "team":
        return (
          <motion.div key="team" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <PageHeader title="الفريق" subtitle="ادعُ أصدقاءك واربح" onBack={() => setActiveTab("home")} />
            {user && <TeamSection userId={user.id} referralCode={referralCode} isTrialExpired={trialExpired} teamEnabled={appSettings.teamEnabled} teamDisabledMessage={appSettings.teamDisabledMessage} />}
          </motion.div>
        );
      case "wallet":
        return (
          <motion.div key="wallet" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            <PageHeader title="المحفظة" subtitle="إيداع وسحب الأموال" onBack={() => setActiveTab("home")} />
            <div className="bg-gradient-card rounded-2xl shadow-card border border-border/50 p-6">
              <div className="text-center mb-6">
                <p className="text-muted-foreground text-sm">رصيدك الحالي</p>
                <p className="text-3xl font-black text-gradient-gold">
                  {isBalanceRevealed ? `${balance.toLocaleString()} جنيه` : "••••••"}
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleOpenWithdraw} className="flex-1 h-12 bg-gradient-gold text-primary-foreground">سحب</Button>
                <Button variant="outline" onClick={handleDeposit} className="flex-1 h-12">إيداع</Button>
              </div>
            </div>
            <EarningMethods accountType={accountType} referralCode={referralCode} membershipId={membershipId} referralEarnings={accountType === "beginner" ? 5 : 8} shareEarnings={accountType === "beginner" ? 2 : 5} teamEarnings={6} totalReferrals={5} totalShares={12} teamMembers={2} />
          </motion.div>
        );
      case "support":
        return (
          <motion.div key="support" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <PageHeader title="الدعم الفني" subtitle="تواصل معنا للمساعدة" onBack={() => setActiveTab("home")} />
            <SupportSection />
          </motion.div>
        );
      case "ads":
        return (
          <motion.div key="ads" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <PageHeader title="الإعلانات" subtitle="تصفح وأنشئ إعلاناتك" onBack={() => setActiveTab("home")} />
            <AdsPage userBalance={balance} />
          </motion.div>
        );
      case "profile":
        return (
          <motion.div key="profile" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <PageHeader title="الملف الشخصي" subtitle="إعدادات حسابك" onBack={() => setActiveTab("home")} />
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
                onNavigateToAds={() => setActiveTab("ads")}
              />
            )}
          </motion.div>
        );
      case "offers":
        return (
          <motion.div key="offers" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <PageHeader title="العروض والمسابقات" subtitle="ترقبوا المفاجآت" onBack={() => setActiveTab("home")} />
            <OffersPage />
          </motion.div>
        );
      case "sponsor":
        return (
          <motion.div key="sponsor" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <PageHeader title="ممول" subtitle="إنشاء صفحة ممول وإدارة إعلاناتك" onBack={() => setActiveTab("home")} />
            <SponsorPage 
              userBalance={balance}
              onNavigateToAds={() => setActiveTab("ads")}
            />
          </motion.div>
        );
      default:
        return null;
    }
  };

  const handleTabChange = (tab: string) => {
    if (tab === "wallet") {
      handleOpenWallet();
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-screen pb-8">
      
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
              <img src={appIcon} alt="Advance" className="w-10 h-10 rounded-xl" />
              <div>
                <h1 className="text-lg font-bold text-foreground">Advance</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user && <NotificationBell />}
              {user ? <Button variant="outline" size="sm" onClick={signOut} className="gap-2"><LogOut className="w-4 h-4" />خروج</Button> : <Button variant="default" size="sm" onClick={() => navigate("/auth")} className="gap-2 bg-gradient-gold text-primary-foreground"><LogIn className="w-4 h-4" />دخول</Button>}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </main>

      <DepositDialog isOpen={showDepositDialog} onClose={() => setShowDepositDialog(false)} userProfile={userProfile} />
      {user && <WithdrawalPinSetup isOpen={showPinSetup} onClose={() => setShowPinSetup(false)} userId={user.id} onSuccess={() => { fetchUserProfile(); }} />}
      {user && <WithdrawalDialog isOpen={showWithdrawDialog} onClose={() => setShowWithdrawDialog(false)} userId={user.id} balance={balance} minWithdraw={currentPackage?.min_withdrawal || 500} withdrawalPin={withdrawalPin} onWithdraw={handleWithdraw} accountType={accountType} trialEndDate={trialEndDate} />}
      {user && withdrawalPin && <BalanceReveal isOpen={showBalanceReveal} onClose={() => setShowBalanceReveal(false)} withdrawalPin={withdrawalPin} onSuccess={handleBalanceRevealSuccess} />}
      
      {showOnboarding && <OnboardingTour onComplete={() => setShowOnboarding(false)} />}
      <BotWidget />
    </div>
  );
};

export default Index;
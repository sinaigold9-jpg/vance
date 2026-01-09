import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BalanceCard } from "@/components/BalanceCard";
import { PackageCard } from "@/components/PackageCard";
import { DailyTasks } from "@/components/DailyTasks";
import { LuckyWheel } from "@/components/LuckyWheel";
import { EarningMethods } from "@/components/EarningMethods";
import { Navigation } from "@/components/Navigation";
import { TeamSection } from "@/components/TeamSection";
import { SupportSection } from "@/components/SupportSection";
import { SocialLinks } from "@/components/SocialLinks";
import { AppSidebar } from "@/components/AppSidebar";
import { DepositDialog } from "@/components/DepositDialog";
import { WithdrawalDialog } from "@/components/WithdrawalDialog";
import { WithdrawalPinSetup } from "@/components/WithdrawalPinSetup";
import { OnboardingTour } from "@/components/OnboardingTour";
import { BotWidget } from "@/components/BotWidget";
import { AppToggle } from "@/components/AppToggle";
import { useAppSettings } from "@/hooks/useAppSettings";
import { LogIn, LogOut, AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import appIcon from "@/assets/app-icon.png";

type AccountType = "beginner" | "vip1" | "vip2" | "vip3";

const packagesData = [
  { name: "باقة المبتدئين", price: 0, rewardPerTask: 3, dailyTasks: 3, dailyEarnings: 9, minWithdraw: 500, hasLuckyWheel: true, luckyWheelFrequency: "مرة واحدة", isVip: false, vipLevel: 0, note: "7 أيام تجربة مجانية" },
  { name: "VIP 1", price: 500, rewardPerTask: 15, dailyTasks: 3, dailyEarnings: 45, minWithdraw: 1000, hasLuckyWheel: true, luckyWheelFrequency: "يومياً", isVip: true, vipLevel: 1 },
  { name: "VIP 2", price: 850, rewardPerTask: 25, dailyTasks: 3, dailyEarnings: 75, minWithdraw: 1500, hasLuckyWheel: true, luckyWheelFrequency: "يومياً", isVip: true, vipLevel: 2 },
  { name: "VIP 3", price: 1500, rewardPerTask: 35, dailyTasks: 3, dailyEarnings: 105, minWithdraw: 2000, hasLuckyWheel: true, luckyWheelFrequency: "يومياً", isVip: true, vipLevel: 3 },
];

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
  const [withdrawalPin, setWithdrawalPin] = useState<string | null>(null);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);
  const [membershipId, setMembershipId] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [userProfile, setUserProfile] = useState<{ full_name: string; email: string | null; phone: string | null; } | null>(null);
  
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { settings: appSettings } = useAppSettings();

  // Check if trial has expired
  const isTrialExpired = () => {
    if (accountType !== "beginner" || !trialEndDate) return false;
    return new Date() > new Date(trialEndDate);
  };

  useEffect(() => { 
    if (user) {
      fetchUserProfile();
      // Check for onboarding flag
      if (searchParams.get("onboarding") === "true") {
        setShowOnboarding(true);
      }
    }
  }, [user, searchParams]);

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
      
      // Show PIN setup if not set
      if (!data.withdrawal_pin) {
        setShowPinSetup(true);
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

  const currentPackage = packagesData.find((p) => p.vipLevel === (accountType === "beginner" ? 0 : parseInt(accountType.replace("vip", "")))) || packagesData[0];

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

  const handleOpenWithdraw = () => {
    if (!withdrawalPin) { setShowPinSetup(true); }
    else { setShowWithdrawDialog(true); }
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
          <motion.div key="home" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            {trialExpired && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-destructive" />
                <div>
                  <p className="font-bold text-destructive">انتهت فترة التجربة</p>
                  <p className="text-sm text-muted-foreground">قم بترقية باقتك للاستمرار في استخدام الميزات</p>
                </div>
              </motion.div>
            )}
            <BalanceCard balance={balance} todayEarnings={todayEarnings} accountType={accountType} />
            <SocialLinks />
            <EarningMethods accountType={accountType} referralCode={referralCode} membershipId={membershipId} referralEarnings={accountType === "beginner" ? 5 : 8} shareEarnings={accountType === "beginner" ? 2 : 5} teamEarnings={6} totalReferrals={5} totalShares={12} teamMembers={2} />
          </motion.div>
        );
      case "packages":
        return (
          <motion.div key="packages" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-2">اختر باقتك</h1>
              <p className="text-muted-foreground">كلما زادت الباقة، زادت الأرباح</p>
            </div>
            <div className="grid gap-4">
              {packagesData.map((pkg, index) => (
                <PackageCard key={index} {...pkg} isActive={pkg.vipLevel === (accountType === "beginner" ? 0 : parseInt(accountType.replace("vip", "")))} />
              ))}
            </div>
          </motion.div>
        );
      case "tasks":
        return (
          <motion.div key="tasks" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
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
            {user && <TeamSection userId={user.id} referralCode={referralCode} isTrialExpired={trialExpired} teamEnabled={appSettings.teamEnabled} teamDisabledMessage={appSettings.teamDisabledMessage} />}
          </motion.div>
        );
      case "wallet":
        return (
          <motion.div key="wallet" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            <div className="bg-gradient-card rounded-2xl shadow-card border border-border/50 p-6">
              <div className="text-center mb-6">
                <p className="text-muted-foreground text-sm">رصيدك الحالي</p>
                <p className="text-3xl font-black text-gradient-gold">{balance.toLocaleString()} جنيه</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleOpenWithdraw} className="flex-1 h-12 bg-gradient-gold text-primary-foreground">سحب</Button>
                <Button variant="outline" onClick={handleDeposit} className="flex-1 h-12">إيداع</Button>
              </div>
            </div>
          </motion.div>
        );
      case "support":
        return <motion.div key="support" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}><SupportSection /></motion.div>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <AppToggle />
      
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
              <img src={appIcon} alt="Advance" className="w-10 h-10 rounded-xl" />
              <div><h1 className="text-lg font-bold text-foreground">Advance</h1><p className="text-xs text-muted-foreground">اربح يومياً</p></div>
            </div>
            <div className="flex items-center gap-2">
              {user ? <Button variant="outline" size="sm" onClick={signOut} className="gap-2"><LogOut className="w-4 h-4" />خروج</Button> : <Button variant="default" size="sm" onClick={() => navigate("/auth")} className="gap-2 bg-gradient-gold text-primary-foreground"><LogIn className="w-4 h-4" />دخول</Button>}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6"><AnimatePresence mode="wait">{renderContent()}</AnimatePresence></main>
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <DepositDialog isOpen={showDepositDialog} onClose={() => setShowDepositDialog(false)} userProfile={userProfile} />
      {user && <WithdrawalPinSetup isOpen={showPinSetup} onClose={() => setShowPinSetup(false)} userId={user.id} onSuccess={() => { fetchUserProfile(); }} />}
      {user && <WithdrawalDialog isOpen={showWithdrawDialog} onClose={() => setShowWithdrawDialog(false)} userId={user.id} balance={balance} minWithdraw={currentPackage.minWithdraw} withdrawalPin={withdrawalPin} onWithdraw={handleWithdraw} accountType={accountType} trialEndDate={trialEndDate} />}
      
      {showOnboarding && <OnboardingTour onComplete={() => setShowOnboarding(false)} />}
      <BotWidget />
    </div>
  );
};

export default Index;
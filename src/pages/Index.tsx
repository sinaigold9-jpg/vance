import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BalanceCard } from "@/components/BalanceCard";
import { PackageCard } from "@/components/PackageCard";
import { DailyTasks } from "@/components/DailyTasks";
import { LuckyWheel } from "@/components/LuckyWheel";
import { EarningMethods } from "@/components/EarningMethods";
import { EarningsInfo } from "@/components/EarningsInfo";
import { Navigation } from "@/components/Navigation";
import { WalletSection } from "@/components/WalletSection";
import { TeamSection } from "@/components/TeamSection";
import { AppSidebar } from "@/components/AppSidebar";
import { DepositDialog } from "@/components/DepositDialog";
import { BackButton } from "@/components/BackButton";
import { Sparkles, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type AccountType = "beginner" | "vip1" | "vip2" | "vip3";

const packagesData = [
  {
    name: "باقة المبتدئين",
    price: 100,
    initialBalance: 50,
    rewardPerTask: 3,
    dailyTasks: 3,
    dailyEarnings: 9,
    minWithdraw: 500,
    hasLuckyWheel: true,
    luckyWheelFrequency: "مرة واحدة بعد الشحن",
    isVip: false,
    vipLevel: 0,
  },
  {
    name: "VIP 1",
    price: 500,
    rewardPerTask: 15,
    dailyTasks: 3,
    dailyEarnings: 45,
    minWithdraw: 1000,
    hasLuckyWheel: true,
    luckyWheelFrequency: "يومياً",
    isVip: true,
    vipLevel: 1,
  },
  {
    name: "VIP 2",
    price: 850,
    rewardPerTask: 25,
    dailyTasks: 3,
    dailyEarnings: 75,
    minWithdraw: 1500,
    hasLuckyWheel: true,
    luckyWheelFrequency: "يومياً",
    isVip: true,
    vipLevel: 2,
  },
  {
    name: "VIP 3",
    price: 1500,
    rewardPerTask: 35,
    dailyTasks: 3,
    dailyEarnings: 105,
    minWithdraw: 2000,
    hasLuckyWheel: true,
    luckyWheelFrequency: "يومياً",
    isVip: true,
    vipLevel: 3,
  },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [accountType, setAccountType] = useState<AccountType>("beginner");
  const [balance, setBalance] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [canSpinWheel, setCanSpinWheel] = useState(true);
  const [luckyWheelUsed, setLuckyWheelUsed] = useState(false);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [dailyCode, setDailyCode] = useState("");
  const [isPackageActivated, setIsPackageActivated] = useState(false);
  const [membershipId, setMembershipId] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    email: string | null;
    phone: string | null;
  } | null>(null);
  const [tasks, setTasks] = useState([
    { id: 1, completed: false, reward: 3 },
    { id: 2, completed: false, reward: 3 },
    { id: 3, completed: false, reward: 3 },
  ]);
  
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchDailyCode();
    }
  }, [user]);

  const fetchDailyCode = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from("daily_codes")
      .select("code, is_active")
      .eq("valid_date", today)
      .eq("is_active", true)
      .maybeSingle();

    if (data && !error) {
      setDailyCode(data.code);
    } else {
      setDailyCode(""); // No active code for today
    }
  };

  const fetchUserProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (data && !error) {
      setAccountType(data.account_type as AccountType);
      setBalance(data.balance || 0);
      setLuckyWheelUsed(data.lucky_wheel_used || false);
      setIsPackageActivated(data.is_package_activated || false);
      setMembershipId(data.membership_id || "");
      setReferralCode(data.referral_code || "");
      setUserProfile({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
      });

      // For beginners, wheel can only spin once (if not used yet)
      // For VIP, check if spun today
      if (data.account_type === "beginner") {
        setCanSpinWheel(!data.lucky_wheel_used);
      } else {
        // VIP users can spin once per day
        const today = new Date().toDateString();
        const lastSpin = data.last_wheel_spin ? new Date(data.last_wheel_spin).toDateString() : null;
        setCanSpinWheel(lastSpin !== today);
      }
    }
  };

  const currentPackage = packagesData.find(
    (p) => p.vipLevel === (accountType === "beginner" ? 0 : parseInt(accountType.replace("vip", "")))
  ) || packagesData[0];

  const handleCompleteTask = (taskId: number, code: string) => {
    // This is mock - actual implementation would verify code from database
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: true } : task
      )
    );
    setBalance((prev) => prev + currentPackage.rewardPerTask);
    setTodayEarnings((prev) => prev + currentPackage.rewardPerTask);
    return true;
  };

  const handleSpinWheel = async (prize: number) => {
    if (!user) return;

    setBalance((prev) => prev + prize);
    setTodayEarnings((prev) => prev + prize);

    // Update database
    if (accountType === "beginner") {
      // Mark wheel as used forever for beginners
      await supabase
        .from("profiles")
        .update({ 
          lucky_wheel_used: true,
          balance: balance + prize,
        })
        .eq("id", user.id);
      setCanSpinWheel(false);
      setLuckyWheelUsed(true);
    } else {
      // Update last spin time for VIP
      await supabase
        .from("profiles")
        .update({ 
          last_wheel_spin: new Date().toISOString(),
          balance: balance + prize,
        })
        .eq("id", user.id);
      setCanSpinWheel(false);
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "أرباح عجلة الحظ",
      amount: prize,
    });
  };

  const handleWithdraw = (amount: number) => {
    setBalance((prev) => prev - amount);
  };

  const handleDeposit = () => {
    setShowDepositDialog(true);
  };

  const mockTransactions = [
    { id: "1", type: "earning" as const, amount: 9, status: "completed" as const, date: "اليوم 10:30 ص", description: "أرباح المهام اليومية" },
    { id: "2", type: "earning" as const, amount: 15, status: "completed" as const, date: "أمس 3:45 م", description: "عجلة الحظ" },
    { id: "3", type: "withdrawal" as const, amount: 500, status: "pending" as const, date: "قبل يومين", description: "طلب سحب" },
  ];

  const mockTeamMembers = [
    { id: "1", name: "أحمد محمد", joinDate: "15 ديسمبر", totalDeposits: 500, isActive: true },
    { id: "2", name: "سارة علي", joinDate: "12 ديسمبر", totalDeposits: 850, isActive: true },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <motion.div
            key="home"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <BalanceCard
              balance={balance}
              todayEarnings={todayEarnings}
              accountType={accountType}
            />
            <EarningMethods
              accountType={accountType}
              referralCode={referralCode}
              membershipId={membershipId}
              referralEarnings={accountType === "beginner" ? 5 : 8}
              shareEarnings={accountType === "beginner" ? 2 : 5}
              teamEarnings={accountType !== "beginner" ? 6 : 0}
              totalReferrals={5}
              totalShares={12}
              teamMembers={mockTeamMembers.length}
            />
          </motion.div>
        );
      case "packages":
        return (
          <motion.div
            key="packages"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-2">اختر باقتك</h1>
              <p className="text-muted-foreground">كلما زادت الباقة، زادت الأرباح</p>
            </div>
            <div className="grid gap-4">
              {packagesData.map((pkg, index) => (
                <PackageCard
                  key={index}
                  {...pkg}
                  isActive={pkg.vipLevel === (accountType === "beginner" ? 0 : parseInt(accountType.replace("vip", "")))}
                />
              ))}
            </div>
          </motion.div>
        );
      case "earnings":
        return (
          <motion.div
            key="earnings"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <EarningsInfo />
          </motion.div>
        );
      case "tasks":
        return (
          <motion.div
            key="tasks"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <DailyTasks
              tasks={tasks}
              rewardPerTask={currentPackage.rewardPerTask}
              onCompleteTask={handleCompleteTask}
              dailyCode={dailyCode}
              isPackageActivated={accountType !== "beginner" || isPackageActivated}
            />
            <LuckyWheel
              prizes={[5, 10, 2, 15, 3, 20, 1, 25]}
              canSpin={canSpinWheel}
              onSpin={handleSpinWheel}
              accountType={accountType}
              luckyWheelUsed={luckyWheelUsed}
            />
          </motion.div>
        );
      case "team":
        return (
          <motion.div
            key="team"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <TeamSection
              isVip={accountType !== "beginner"}
              teamCode="TEAM-XYZ789"
              teamMembers={mockTeamMembers}
              teamEarnings={6}
              earningsPerMember={3}
            />
          </motion.div>
        );
      case "wallet":
        return (
          <motion.div
            key="wallet"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <WalletSection
              balance={balance}
              minWithdraw={currentPackage.minWithdraw}
              transactions={mockTransactions}
              onWithdraw={handleWithdraw}
              onDeposit={handleDeposit}
            />
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
              <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-gold animate-pulse-glow">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Advance</h1>
                <p className="text-xs text-muted-foreground">اربح يومياً</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  خروج
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate("/auth")}
                  className="gap-2 bg-gradient-gold text-primary-foreground"
                >
                  <LogIn className="w-4 h-4" />
                  تسجيل الدخول
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Deposit Dialog */}
      <DepositDialog
        isOpen={showDepositDialog}
        onClose={() => setShowDepositDialog(false)}
        userProfile={userProfile}
      />
    </div>
  );
};

export default Index;

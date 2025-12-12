import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BalanceCard } from "@/components/BalanceCard";
import { PackageCard } from "@/components/PackageCard";
import { DailyTasks } from "@/components/DailyTasks";
import { LuckyWheel } from "@/components/LuckyWheel";
import { EarningMethods } from "@/components/EarningMethods";
import { Navigation } from "@/components/Navigation";
import { WalletSection } from "@/components/WalletSection";
import { TeamSection } from "@/components/TeamSection";
import { Sparkles } from "lucide-react";

type AccountType = "beginner" | "vip1" | "vip2" | "vip3";

// Mock data
const DAILY_CODE = "EARN2024";

const packagesData = [
  {
    name: "باقة المبتدئين",
    price: 100,
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
  const [balance, setBalance] = useState(127);
  const [todayEarnings, setTodayEarnings] = useState(9);
  const [canSpinWheel, setCanSpinWheel] = useState(true);
  const [tasks, setTasks] = useState([
    { id: 1, completed: false, reward: 3 },
    { id: 2, completed: false, reward: 3 },
    { id: 3, completed: false, reward: 3 },
  ]);

  const currentPackage = packagesData.find(
    (p) => p.vipLevel === (accountType === "beginner" ? 0 : parseInt(accountType.replace("vip", "")))
  ) || packagesData[0];

  const handleCompleteTask = (taskId: number, code: string) => {
    if (code === DAILY_CODE) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, completed: true } : task
        )
      );
      setBalance((prev) => prev + currentPackage.rewardPerTask);
      setTodayEarnings((prev) => prev + currentPackage.rewardPerTask);
      return true;
    }
    return false;
  };

  const handleSpinWheel = (prize: number) => {
    setBalance((prev) => prev + prize);
    setTodayEarnings((prev) => prev + prize);
    if (accountType === "beginner") {
      setCanSpinWheel(false);
    }
  };

  const handleWithdraw = (amount: number) => {
    setBalance((prev) => prev - amount);
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
              referralCode="ABC123"
              referralEarnings={8}
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
                  onSelect={() => {
                    const newType = pkg.vipLevel === 0 ? "beginner" : `vip${pkg.vipLevel}` as AccountType;
                    setAccountType(newType);
                  }}
                />
              ))}
            </div>
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
              dailyCode={DAILY_CODE}
            />
            <LuckyWheel
              prizes={[5, 10, 2, 15, 3, 20, 1, 25]}
              canSpin={canSpinWheel}
              onSpin={handleSpinWheel}
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
              <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-gold animate-pulse-glow">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">كاش تاسك</h1>
                <p className="text-xs text-muted-foreground">اربح يومياً</p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-xs text-muted-foreground">كود اليوم</p>
              <p className="text-sm font-bold text-primary">{DAILY_CODE}</p>
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
    </div>
  );
};

export default Index;

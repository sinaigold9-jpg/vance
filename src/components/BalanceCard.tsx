import { motion } from "framer-motion";
import { Wallet, TrendingUp, Award } from "lucide-react";

interface BalanceCardProps {
  balance: number | null;
  todayEarnings: number;
  accountType: "beginner" | "vip1" | "vip2" | "vip3";
  onRevealClick?: () => void;
  isRevealed?: boolean;
}

const accountLabels = {
  beginner: "مبتدئ",
  vip1: "VIP 1",
  vip2: "VIP 2",
  vip3: "VIP 3",
};

const accountColors = {
  beginner: "from-beginner to-blue-600",
  vip1: "from-vip1 to-blue-700",
  vip2: "from-vip2 to-purple-700",
  vip3: "from-gold to-gold-dark",
};

export const BalanceCard = ({ balance, todayEarnings, accountType, onRevealClick, isRevealed = true }: BalanceCardProps) => {
  const displayBalance = isRevealed && balance !== null ? balance.toLocaleString() : "••••••";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-card shadow-card border border-border/50"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-24 h-24 bg-emerald/10 rounded-full blur-2xl translate-x-1/2 translate-y-1/2" />
      
      <div className="relative p-6">
        {/* Account Type Badge */}
        <div className="flex justify-between items-start mb-6">
          <div className={`px-4 py-1.5 rounded-full bg-gradient-to-l ${accountColors[accountType]} text-primary-foreground font-bold text-sm`}>
            <Award className="inline-block w-4 h-4 ml-1" />
            {accountLabels[accountType]}
          </div>
          <Wallet className="w-8 h-8 text-primary" />
        </div>

        {/* Balance */}
        <div className="mb-6">
          <p className="text-muted-foreground text-sm mb-1">رصيدك الحالي</p>
          <div className="flex items-baseline gap-2 cursor-pointer" onClick={!isRevealed ? onRevealClick : undefined}>
            <span className="text-4xl font-black text-gradient-gold">{displayBalance}</span>
            <span className="text-xl text-muted-foreground">جنيه</span>
          </div>
        </div>

        {/* Today's Earnings */}
        <div className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3">
          <div className="w-10 h-10 rounded-full bg-emerald/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs">أرباح اليوم</p>
            <p className="text-lg font-bold text-emerald">+{todayEarnings} جنيه</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

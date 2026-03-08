import { motion } from "framer-motion";
import { Wallet, TrendingUp, Award, Sparkles } from "lucide-react";

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
      className="relative overflow-hidden rounded-2xl bg-gradient-card shadow-elevated border border-border/30"
    >
      {/* Premium decorative elements */}
      <div className="absolute top-0 left-0 w-40 h-40 bg-primary/8 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald/8 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/3 rounded-full blur-[80px]" />
      
      {/* Shimmer line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="relative p-6">
        {/* Account Type Badge */}
        <div className="flex justify-between items-start mb-6">
          <div className={`px-4 py-1.5 rounded-full bg-gradient-to-l ${accountColors[accountType]} text-primary-foreground font-bold text-sm shadow-lg`}>
            <Award className="inline-block w-4 h-4 ml-1" />
            {accountLabels[accountType]}
          </div>
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            <Wallet className="w-8 h-8 text-primary/70" />
          </motion.div>
        </div>

        {/* Balance */}
        <div className="mb-6">
          <p className="text-muted-foreground text-sm mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            رصيدك الحالي
          </p>
          <div className="flex items-baseline gap-2 cursor-pointer" onClick={!isRevealed ? onRevealClick : undefined}>
            <motion.span
              key={displayBalance}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-black text-gradient-gold tracking-tight"
            >
              {displayBalance}
            </motion.span>
            <span className="text-xl text-muted-foreground font-bold">جنيه</span>
          </div>
        </div>

        {/* Today's Earnings */}
        <div className="flex items-center gap-3 bg-secondary/40 rounded-xl p-3 border border-border/30">
          <div className="w-10 h-10 rounded-xl bg-emerald/15 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs">أرباح اليوم</p>
            <motion.p
              key={todayEarnings}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="text-lg font-black text-emerald"
            >
              +{todayEarnings} جنيه
            </motion.p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

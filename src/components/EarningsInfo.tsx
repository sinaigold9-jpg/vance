import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Calendar, Crown, Coins, Calculator, Loader2, Target, Percent } from "lucide-react";
import { BackButton } from "./BackButton";
import { supabase } from "@/integrations/supabase/client";

interface PackageEarnings {
  id?: string;
  name: string;
  price: number;
  dailyEarnings: number;
  monthlyEarnings: number;
  yearlyEarnings: number;
  rewardPerTask: number;
  dailyTasks: number;
  minWithdraw: number;
  isVip: boolean;
  vipLevel: number;
}

const getVipLevel = (accountType: string): number => {
  switch (accountType) {
    case "beginner": return 0;
    case "vip1": return 1;
    case "vip2": return 2;
    case "vip3": return 3;
    default: return 0;
  }
};

const vipColors: Record<number, string> = {
  0: "border-beginner/50 bg-beginner/10",
  1: "border-vip1/50 bg-vip1/10",
  2: "border-vip2/50 bg-vip2/10",
  3: "border-vip3/50 bg-vip3/10",
};

const vipTextColors: Record<number, string> = {
  0: "text-beginner",
  1: "text-vip1",
  2: "text-vip2",
  3: "text-vip3",
};

export const EarningsInfo = () => {
  const [packages, setPackages] = useState<PackageEarnings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPackages = async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (!error && data) {
        const formatted = data.map((pkg) => {
          const vipLevel = getVipLevel(pkg.account_type);
          const dailyEarnings = pkg.daily_earnings;
          return {
            id: pkg.id,
            name: pkg.name,
            price: pkg.price,
            dailyEarnings,
            monthlyEarnings: dailyEarnings * 30,
            yearlyEarnings: Math.round(dailyEarnings * 365),
            rewardPerTask: pkg.task_reward,
            dailyTasks: pkg.daily_tasks,
            minWithdraw: pkg.min_withdrawal,
            isVip: vipLevel > 0,
            vipLevel,
          };
        });
        setPackages(formatted);
      }
      setLoading(false);
    };

    fetchPackages();

    // Real-time subscription for packages
    const channel = supabase
      .channel("packages-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "packages" }, () => {
        fetchPackages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton />
      
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold mb-4">
          <Calculator className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">حاسبة الأرباح</h1>
        <p className="text-muted-foreground">تفاصيل الأرباح لجميع الباقات</p>
      </div>

      {/* Professional Earnings Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`rounded-2xl border-2 ${vipColors[pkg.vipLevel as keyof typeof vipColors]} bg-card overflow-hidden shadow-lg`}
          >
            {/* Header */}
            <div className={`p-4 bg-gradient-to-l ${pkg.isVip ? 'from-primary/20 to-transparent' : 'from-muted/30 to-transparent'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pkg.isVip ? 'bg-gradient-gold' : 'bg-primary/20'}`}>
                  {pkg.isVip ? (
                    <Crown className="w-6 h-6 text-primary-foreground" />
                  ) : (
                    <Target className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground">سعر: {pkg.price} جنيه</p>
                </div>
              </div>
            </div>

            {/* Earnings Grid */}
            <div className="p-4 space-y-3">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">ربح المهمة</p>
                  <p className={`font-bold ${vipTextColors[pkg.vipLevel as keyof typeof vipTextColors]}`}>{pkg.rewardPerTask} جنيه</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">المهام/يوم</p>
                  <p className={`font-bold ${vipTextColors[pkg.vipLevel as keyof typeof vipTextColors]}`}>{pkg.dailyTasks}</p>
                </div>
              </div>

              {/* Earnings Boxes */}
              <div className="bg-primary/5 rounded-xl p-3 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">الأرباح اليومية</span>
                </div>
                <p className={`text-2xl font-black ${vipTextColors[pkg.vipLevel as keyof typeof vipTextColors]}`}>
                  {pkg.dailyEarnings} <span className="text-sm font-normal text-muted-foreground">جنيه</span>
                </p>
              </div>

              <div className="bg-emerald/5 rounded-xl p-3 border border-emerald/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald" />
                  <span className="text-sm font-medium text-foreground">الأرباح الشهرية</span>
                </div>
                <p className="text-2xl font-black text-emerald">
                  {pkg.monthlyEarnings} <span className="text-sm font-normal text-muted-foreground">جنيه</span>
                </p>
              </div>

              <div className="bg-gold/5 rounded-xl p-3 border border-gold/20">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-gold" />
                  <span className="text-sm font-medium text-foreground">الأرباح السنوية</span>
                </div>
                <p className="text-2xl font-black text-gold">
                  {pkg.yearlyEarnings.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">جنيه</span>
                </p>
              </div>

              {/* ROI & Min Withdrawal */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-1">
                  <Percent className="w-3 h-3 text-gold" />
                  <span className="text-xs text-muted-foreground">العائد السنوي:</span>
                  <span className="text-xs font-bold text-gold">
                    {Math.round((pkg.yearlyEarnings / pkg.price) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Coins className="w-3 h-3 text-primary" />
                  <span className="text-xs text-muted-foreground">أقل سحب:</span>
                  <span className="text-xs font-bold text-primary">{pkg.minWithdraw} جنيه</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Note */}
      <div className="bg-muted/50 rounded-xl p-4 border border-border">
        <p className="text-sm text-muted-foreground text-center">
          💡 الأرباح المذكورة هي من المهام اليومية فقط ولا تشمل أرباح الإحالات والفريق وعجلة الحظ
        </p>
      </div>
    </div>
  );
};

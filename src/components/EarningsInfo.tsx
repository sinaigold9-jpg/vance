import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Calendar, Crown, Coins, Calculator, Loader2, Target, Gift, Clock } from "lucide-react";
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

const vipGradients: Record<number, string> = {
  0: "from-gray-500 to-gray-600",
  1: "from-amber-500 to-orange-500",
  2: "from-purple-500 to-violet-500",
  3: "from-emerald-500 to-teal-500",
};

const vipTextColors: Record<number, string> = {
  0: "text-gray-400",
  1: "text-amber-500",
  2: "text-purple-500",
  3: "text-emerald-500",
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
      
      <div className="text-center mb-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold mb-4">
          <Calculator className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">حاسبة الأرباح</h1>
        <p className="text-muted-foreground">تفاصيل الأرباح لجميع الباقات</p>
      </div>

      {/* Grid Layout - bottom to top ordering via flex-col-reverse, LTR grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" dir="ltr">
        {[...packages].reverse().map((pkg, index) => (
          <motion.div
            key={pkg.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="bg-gradient-card rounded-2xl border border-border/50 overflow-hidden shadow-lg"
          >
            {/* Package Header */}
            <div className={`p-4 bg-gradient-to-l ${vipGradients[pkg.vipLevel]} bg-opacity-20`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${vipGradients[pkg.vipLevel]} flex items-center justify-center`}>
                  {pkg.isVip ? (
                    <Crown className="w-6 h-6 text-white" />
                  ) : (
                    <Target className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${vipTextColors[pkg.vipLevel]}`}>{pkg.name}</h3>
                  <p className="text-xs text-muted-foreground">{pkg.price} جنيه</p>
                </div>
              </div>
            </div>

            {/* Earnings Grid */}
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-2 text-center">
                  <Calendar className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                  <p className="text-[10px] text-muted-foreground">يومياً</p>
                  <p className="text-sm font-black text-blue-500">{pkg.dailyEarnings}</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2 text-center">
                  <TrendingUp className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
                  <p className="text-[10px] text-muted-foreground">شهرياً</p>
                  <p className="text-sm font-black text-emerald">{pkg.monthlyEarnings}</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 text-center">
                  <Crown className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                  <p className="text-[10px] text-muted-foreground">سنوياً</p>
                  <p className="text-sm font-black text-amber-500">{pkg.yearlyEarnings.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted/40 rounded-xl p-2 text-center">
                  <Gift className="w-3 h-3 mx-auto mb-1 text-primary" />
                  <p className="text-[9px] text-muted-foreground">ربح المهمة</p>
                  <p className={`font-bold text-xs ${vipTextColors[pkg.vipLevel]}`}>{pkg.rewardPerTask} ج</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-2 text-center">
                  <Clock className="w-3 h-3 mx-auto mb-1 text-primary" />
                  <p className="text-[9px] text-muted-foreground">المهام/يوم</p>
                  <p className={`font-bold text-xs ${vipTextColors[pkg.vipLevel]}`}>{pkg.dailyTasks}</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-2 text-center">
                  <Coins className="w-3 h-3 mx-auto mb-1 text-primary" />
                  <p className="text-[9px] text-muted-foreground">أقل سحب</p>
                  <p className={`font-bold text-xs ${vipTextColors[pkg.vipLevel]}`}>{pkg.minWithdraw} ج</p>
                </div>
              </div>

              {/* ROI */}
              <div className="p-2 bg-primary/10 rounded-xl text-center">
                <p className="text-[10px] text-muted-foreground">العائد السنوي</p>
                <p className="text-lg font-black text-primary">
                  {Math.round((pkg.yearlyEarnings / pkg.price) * 100)}%
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-muted/50 rounded-xl p-4 border border-border">
        <p className="text-sm text-muted-foreground text-center">
          💡 الأرباح المذكورة هي من المهام اليومية فقط ولا تشمل أرباح الإحالات والفريق وعجلة الحظ
        </p>
      </div>
    </div>
  );
};
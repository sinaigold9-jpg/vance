import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Calendar, Crown, Coins, Calculator, Loader2, Target, Gift, Clock, ChevronDown, ChevronUp } from "lucide-react";
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
  0: "text-gray-500",
  1: "text-amber-500",
  2: "text-purple-500",
  3: "text-emerald-500",
};

export const EarningsInfo = () => {
  const [packages, setPackages] = useState<PackageEarnings[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);

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
      
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold mb-4">
          <Calculator className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">حاسبة الأرباح</h1>
        <p className="text-muted-foreground">تفاصيل الأرباح لجميع الباقات</p>
      </div>

      {/* Combined Packages Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-card rounded-2xl border border-border/50 overflow-hidden shadow-lg"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-l from-primary/20 to-primary/10 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">جميع الباقات</h3>
              <p className="text-sm text-muted-foreground">اضغط على أي باقة لعرض التفاصيل</p>
            </div>
          </div>
        </div>

        {/* Packages List */}
        <div className="divide-y divide-border/50">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id || index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Package Header - Clickable */}
              <button
                onClick={() => setExpandedPackage(expandedPackage === pkg.id ? null : pkg.id || null)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${vipGradients[pkg.vipLevel]} flex items-center justify-center`}>
                    {pkg.isVip ? (
                      <Crown className="w-5 h-5 text-white" />
                    ) : (
                      <Target className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="text-right">
                    <h4 className={`font-bold ${vipTextColors[pkg.vipLevel]}`}>{pkg.name}</h4>
                    <p className="text-xs text-muted-foreground">{pkg.price} جنيه</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <p className="text-sm font-bold text-emerald">{pkg.dailyEarnings} ج/يوم</p>
                    <p className="text-xs text-muted-foreground">{pkg.yearlyEarnings.toLocaleString()} ج/سنة</p>
                  </div>
                  {expandedPackage === pkg.id ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Expanded Details */}
              {expandedPackage === pkg.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4"
                >
                  {/* Earnings Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                      <Calendar className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                      <p className="text-xs text-muted-foreground">يومياً</p>
                      <p className="text-lg font-black text-blue-600">{pkg.dailyEarnings}</p>
                      <p className="text-[10px] text-muted-foreground">جنيه</p>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                      <TrendingUp className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                      <p className="text-xs text-muted-foreground">شهرياً</p>
                      <p className="text-lg font-black text-emerald">{pkg.monthlyEarnings}</p>
                      <p className="text-[10px] text-muted-foreground">جنيه</p>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                      <Crown className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                      <p className="text-xs text-muted-foreground">سنوياً</p>
                      <p className="text-lg font-black text-amber-600">{pkg.yearlyEarnings.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">جنيه</p>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-muted/40 rounded-xl p-2 text-center">
                      <Gift className="w-4 h-4 mx-auto mb-1 text-primary" />
                      <p className="text-[10px] text-muted-foreground">ربح المهمة</p>
                      <p className={`font-bold text-sm ${vipTextColors[pkg.vipLevel]}`}>{pkg.rewardPerTask} ج</p>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-2 text-center">
                      <Clock className="w-4 h-4 mx-auto mb-1 text-primary" />
                      <p className="text-[10px] text-muted-foreground">المهام/يوم</p>
                      <p className={`font-bold text-sm ${vipTextColors[pkg.vipLevel]}`}>{pkg.dailyTasks}</p>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-2 text-center">
                      <Coins className="w-4 h-4 mx-auto mb-1 text-primary" />
                      <p className="text-[10px] text-muted-foreground">أقل سحب</p>
                      <p className={`font-bold text-sm ${vipTextColors[pkg.vipLevel]}`}>{pkg.minWithdraw} ج</p>
                    </div>
                  </div>

                  {/* ROI */}
                  <div className="mt-3 p-2 bg-primary/10 rounded-xl text-center">
                    <p className="text-xs text-muted-foreground">العائد السنوي</p>
                    <p className="text-xl font-black text-primary">
                      {Math.round((pkg.yearlyEarnings / pkg.price) * 100)}%
                    </p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Note */}
      <div className="bg-muted/50 rounded-xl p-4 border border-border">
        <p className="text-sm text-muted-foreground text-center">
          💡 الأرباح المذكورة هي من المهام اليومية فقط ولا تشمل أرباح الإحالات والفريق وعجلة الحظ
        </p>
      </div>
    </div>
  );
};

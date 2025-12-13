import { motion } from "framer-motion";
import { TrendingUp, Calendar, Crown, Coins, Calculator } from "lucide-react";
import { BackButton } from "./BackButton";

interface PackageEarnings {
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

const packagesEarnings: PackageEarnings[] = [
  {
    name: "باقة المبتدئين",
    price: 100,
    dailyEarnings: 9,
    monthlyEarnings: 270,
    yearlyEarnings: 3285,
    rewardPerTask: 3,
    dailyTasks: 3,
    minWithdraw: 500,
    isVip: false,
    vipLevel: 0,
  },
  {
    name: "VIP 1",
    price: 500,
    dailyEarnings: 45,
    monthlyEarnings: 1350,
    yearlyEarnings: 16425,
    rewardPerTask: 15,
    dailyTasks: 3,
    minWithdraw: 1000,
    isVip: true,
    vipLevel: 1,
  },
  {
    name: "VIP 2",
    price: 850,
    dailyEarnings: 75,
    monthlyEarnings: 2250,
    yearlyEarnings: 27375,
    rewardPerTask: 25,
    dailyTasks: 3,
    minWithdraw: 1500,
    isVip: true,
    vipLevel: 2,
  },
  {
    name: "VIP 3",
    price: 1500,
    dailyEarnings: 105,
    monthlyEarnings: 3150,
    yearlyEarnings: 38325,
    rewardPerTask: 35,
    dailyTasks: 3,
    minWithdraw: 2000,
    isVip: true,
    vipLevel: 3,
  },
];

const vipColors = {
  0: "border-beginner/50 bg-beginner/10",
  1: "border-vip1/50 bg-vip1/10",
  2: "border-vip2/50 bg-vip2/10",
  3: "border-vip3/50 bg-vip3/10",
};

const vipTextColors = {
  0: "text-beginner",
  1: "text-vip1",
  2: "text-vip2",
  3: "text-vip3",
};

export const EarningsInfo = () => {
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

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <Calendar className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-xs text-muted-foreground">يومياً</p>
          <p className="text-sm font-bold text-foreground">من المهام</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <TrendingUp className="w-5 h-5 mx-auto mb-1 text-emerald" />
          <p className="text-xs text-muted-foreground">شهرياً</p>
          <p className="text-sm font-bold text-foreground">30 يوم</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <Crown className="w-5 h-5 mx-auto mb-1 text-gold" />
          <p className="text-xs text-muted-foreground">سنوياً</p>
          <p className="text-sm font-bold text-foreground">365 يوم</p>
        </div>
      </div>

      {/* Packages Earnings Details */}
      <div className="space-y-4">
        {packagesEarnings.map((pkg, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`rounded-2xl border-2 ${vipColors[pkg.vipLevel as keyof typeof vipColors]} bg-card overflow-hidden`}
          >
            {/* Header */}
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {pkg.isVip && (
                    <div className={`w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center`}>
                      <Crown className="w-5 h-5 text-primary-foreground" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{pkg.name}</h3>
                    <p className="text-sm text-muted-foreground">سعر الشحن: {pkg.price} جنيه</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">الحد الأدنى للسحب</p>
                  <p className={`text-sm font-bold ${vipTextColors[pkg.vipLevel as keyof typeof vipTextColors]}`}>
                    {pkg.minWithdraw} جنيه
                  </p>
                </div>
              </div>
            </div>

            {/* Earnings Details */}
            <div className="p-4 space-y-4">
              {/* Task Details */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">ربح المهمة الواحدة</span>
                </div>
                <span className="text-sm font-bold text-foreground">{pkg.rewardPerTask} جنيه</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">عدد المهام اليومية</span>
                </div>
                <span className="text-sm font-bold text-foreground">{pkg.dailyTasks} مهام</span>
              </div>

              {/* Earnings Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-primary/10 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">يومياً</p>
                  <p className={`text-lg font-black ${vipTextColors[pkg.vipLevel as keyof typeof vipTextColors]}`}>
                    {pkg.dailyEarnings}
                  </p>
                  <p className="text-xs text-muted-foreground">جنيه</p>
                </div>
                <div className="bg-emerald/10 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">شهرياً</p>
                  <p className="text-lg font-black text-emerald">
                    {pkg.monthlyEarnings}
                  </p>
                  <p className="text-xs text-muted-foreground">جنيه</p>
                </div>
                <div className="bg-gold/10 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">سنوياً</p>
                  <p className="text-lg font-black text-gold">
                    {pkg.yearlyEarnings.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">جنيه</p>
                </div>
              </div>

              {/* ROI Info */}
              <div className="p-3 rounded-xl bg-gradient-to-l from-gold/10 to-transparent border border-gold/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">العائد على الاستثمار (سنوياً)</span>
                  <span className="text-sm font-bold text-gold">
                    {Math.round((pkg.yearlyEarnings / pkg.price) * 100)}%
                  </span>
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

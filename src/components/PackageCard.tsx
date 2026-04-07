import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Crown, Check, Zap, ArrowUp, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PackageUpgradeDialog } from "./PackageUpgradeDialog";

interface PackageCardProps {
  name: string;
  price: number;
  initialBalance?: number;
  rewardPerTask: number;
  dailyTasks: number;
  dailyEarnings: number;
  minWithdraw: number;
  hasLuckyWheel: boolean;
  luckyWheelFrequency: string;
  isVip?: boolean;
  vipLevel?: number;
  isActive?: boolean;
  accountType?: string;
  isHighlighted?: boolean;
  discountPercentage?: number;
}

const vipColors = {
  0: "border-beginner/50 bg-beginner/5",
  1: "border-vip1/50 bg-vip1/5",
  2: "border-vip2/50 bg-vip2/5",
  3: "border-vip3/50 bg-vip3/5",
};

const vipGradients = {
  0: "from-beginner to-blue-600",
  1: "from-vip1 to-blue-700",
  2: "from-vip2 to-purple-700",
  3: "from-gold to-gold-dark",
};

const accountTypes = ["beginner", "vip1", "vip2", "vip3"];

export const PackageCard = ({
  name,
  price,
  initialBalance,
  rewardPerTask,
  dailyTasks,
  dailyEarnings,
  minWithdraw,
  hasLuckyWheel,
  luckyWheelFrequency,
  isVip = false,
  vipLevel = 0,
  isActive = false,
  accountType = "beginner",
  isHighlighted = false,
  discountPercentage = 0,
}: PackageCardProps) => {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const targetAccountType = accountTypes[vipLevel];
  const cardRef = useRef<HTMLDivElement>(null);

  const discountedPrice = discountPercentage > 0
    ? Math.round(price * (1 - discountPercentage / 100))
    : price;

  // Auto-scroll to highlighted card
  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [isHighlighted]);

  return (
    <>
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        className={`relative overflow-hidden rounded-2xl border-2 ${
          isHighlighted
            ? "border-primary ring-2 ring-primary/30 shadow-lg"
            : vipColors[vipLevel as keyof typeof vipColors]
        } bg-gradient-card shadow-card transition-all duration-300`}
      >
        {isVip && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-transparent via-gold to-transparent" />
        )}
        
        {isActive && (
          <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-emerald text-primary-foreground text-xs font-bold">
            باقتك الحالية
          </div>
        )}

        {isHighlighted && discountPercentage > 0 && (
          <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center gap-1 animate-pulse">
            <Percent className="w-3 h-3" />
            خصم {discountPercentage}%
          </div>
        )}

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            {isVip && (
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${vipGradients[vipLevel as keyof typeof vipGradients]} flex items-center justify-center shadow-gold`}>
                <Crown className="w-6 h-6 text-primary-foreground" />
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-foreground">{name}</h3>
              <p className="text-muted-foreground text-sm">سعر الشحن</p>
            </div>
          </div>

          <div className="mb-6">
            {vipLevel === 0 ? (
              <>
                <span className="text-xl font-black text-emerald">مجانية لمدة 7 أيام</span>
                {initialBalance && (
                  <p className="text-xs text-amber-500 mt-1">تبدأ بـ {initialBalance} ج.م رصيد افتتاحي</p>
                )}
              </>
            ) : discountPercentage > 0 ? (
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-primary">{discountedPrice}</span>
                <span className="text-muted-foreground">جنيه</span>
                <span className="text-lg text-muted-foreground line-through">{price}</span>
              </div>
            ) : (
              <>
                <span className="text-3xl font-black text-gradient-gold">{price}</span>
                <span className="text-muted-foreground mr-2">جنيه</span>
              </>
            )}
          </div>

          <div className="space-y-3 mb-6">
            <FeatureItem icon={<Zap className="w-4 h-4" />} text={`${rewardPerTask} جنيه لكل مهمة`} />
            <FeatureItem icon={<Check className="w-4 h-4" />} text={`${dailyTasks} مهام يومية`} />
            <FeatureItem icon={<Check className="w-4 h-4" />} text={`${dailyEarnings} جنيه أرباح يومية`} highlight />
            <FeatureItem icon={<Check className="w-4 h-4" />} text={`الحد الأدنى للسحب: ${minWithdraw} جنيه`} />
            <FeatureItem icon={<Check className="w-4 h-4" />} text={`عجلة الحظ: ${luckyWheelFrequency}`} />
          </div>

          {!isActive && (
            <Button
              onClick={() => setShowUpgradeDialog(true)}
              className={`w-full gap-2 ${isHighlighted ? "bg-primary text-primary-foreground" : "bg-gradient-gold text-primary-foreground"}`}
            >
              <ArrowUp className="w-4 h-4" />
              {isHighlighted && discountPercentage > 0
                ? `ترقية بـ ${discountedPrice} جنيه`
                : "ترقية الباقة"
              }
            </Button>
          )}
        </div>
      </motion.div>

      <PackageUpgradeDialog
        isOpen={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        packageName={name}
        packagePrice={discountedPrice}
        targetAccountType={targetAccountType}
      />
    </>
  );
};

const FeatureItem = ({ icon, text, highlight = false }: { icon: React.ReactNode; text: string; highlight?: boolean }) => (
  <div className="flex items-center gap-2">
    <span className={`${highlight ? "text-emerald" : "text-primary"}`}>{icon}</span>
    <span className={`text-sm ${highlight ? "text-emerald font-bold" : "text-muted-foreground"}`}>{text}</span>
  </div>
);

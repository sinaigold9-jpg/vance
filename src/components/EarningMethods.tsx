import { motion } from "framer-motion";
import { Gift, Users, Share2, CircleDot, Crown, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface EarningMethodsProps {
  accountType: "beginner" | "vip1" | "vip2" | "vip3";
  referralCode: string;
  referralEarnings: number;
  shareEarnings: number;
  teamEarnings: number;
  totalReferrals: number;
  totalShares: number;
  teamMembers: number;
}

export const EarningMethods = ({
  accountType,
  referralCode,
  referralEarnings,
  shareEarnings,
  teamEarnings,
  totalReferrals,
  totalShares,
  teamMembers,
}: EarningMethodsProps) => {
  const [copied, setCopied] = useState(false);
  const isVip = accountType !== "beginner";

  const copyReferralLink = () => {
    navigator.clipboard.writeText(`https://app.example.com/ref/${referralCode}`);
    setCopied(true);
    toast({
      title: "✓ تم النسخ",
      description: "تم نسخ رابط الإحالة بنجاح",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const methods: Array<{
    icon: React.ReactNode;
    title: string;
    description: string;
    available: boolean;
    color: string;
    bgColor: string;
    stats?: string;
    badge?: string;
  }> = [
    {
      icon: <Gift className="w-6 h-6" />,
      title: "المهام اليومية",
      description: "أكمل 3 مهام يومياً",
      available: true,
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "دعوة صديق",
      description: `${referralEarnings} جنيه لكل صديق يسجل ويشحن`,
      stats: `${totalReferrals} إحالة`,
      available: true,
      color: "text-emerald",
      bgColor: "bg-emerald/20",
    },
    {
      icon: <Share2 className="w-6 h-6" />,
      title: "مشاركة التطبيق",
      description: `${shareEarnings} جنيه لكل مستخدم جديد`,
      stats: `${totalShares} مشاركة`,
      available: true,
      color: "text-vip1",
      bgColor: "bg-vip1/20",
    },
    {
      icon: <CircleDot className="w-6 h-6" />,
      title: "عجلة الحظ",
      description: isVip ? "مرة واحدة يومياً" : "مرة واحدة بعد الشحن الأول",
      available: true,
      color: "text-vip2",
      bgColor: "bg-vip2/20",
      badge: isVip ? "يومية" : "مرة واحدة",
    },
  ];

  // Add team earnings for VIP only
  if (isVip) {
    methods.push({
      icon: <Crown className="w-6 h-6" />,
      title: "أرباح الفريق",
      description: `${teamEarnings} جنيه لكل عضو جديد يشحن`,
      stats: `${teamMembers} عضو`,
      available: true,
      color: "text-gold",
      bgColor: "bg-gold/20",
      badge: "VIP فقط",
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-card rounded-2xl shadow-card border border-border/50 overflow-hidden"
    >
      <div className="p-6 border-b border-border/50">
        <h2 className="text-xl font-bold text-foreground mb-1">طرق الربح</h2>
        <p className="text-muted-foreground text-sm">
          {isVip ? "4 طرق متاحة لك" : "3 طرق متاحة لك"}
        </p>
      </div>

      <div className="p-6 space-y-4">
        {methods.map((method, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 border border-border/30"
          >
            <div className={`w-12 h-12 rounded-xl ${method.bgColor} flex items-center justify-center ${method.color}`}>
              {method.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-foreground">{method.title}</p>
                {method.badge && (
                  <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold text-xs font-bold">
                    {method.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{method.description}</p>
            </div>
            {method.stats && (
              <div className="text-left">
                <p className={`font-bold ${method.color}`}>{method.stats}</p>
              </div>
            )}
          </motion.div>
        ))}

        {/* Referral Link */}
        <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/30">
          <p className="text-sm text-muted-foreground mb-2">رابط الإحالة الخاص بك</p>
          <div className="flex gap-2">
            <div className="flex-1 px-4 py-2 rounded-lg bg-background/50 text-foreground text-sm truncate">
              https://app.example.com/ref/{referralCode}
            </div>
            <Button
              onClick={copyReferralLink}
              className="bg-gradient-gold text-primary-foreground hover:opacity-90"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

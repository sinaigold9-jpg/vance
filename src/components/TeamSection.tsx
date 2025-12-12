import { motion } from "framer-motion";
import { Users, Crown, Lock, TrendingUp, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface TeamMember {
  id: string;
  name: string;
  joinDate: string;
  totalDeposits: number;
  isActive: boolean;
}

interface TeamSectionProps {
  isVip: boolean;
  teamCode: string;
  teamMembers: TeamMember[];
  teamEarnings: number;
  earningsPerMember: number;
}

export const TeamSection = ({
  isVip,
  teamCode,
  teamMembers,
  teamEarnings,
  earningsPerMember,
}: TeamSectionProps) => {
  const [copied, setCopied] = useState(false);

  const copyTeamCode = () => {
    navigator.clipboard.writeText(teamCode);
    setCopied(true);
    toast({
      title: "✓ تم النسخ",
      description: "تم نسخ كود الفريق بنجاح",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isVip) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-card rounded-2xl shadow-card border border-border/50 p-8 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">نظام الفريق مقفل</h2>
        <p className="text-muted-foreground mb-6">
          قم بالترقية إلى إحدى باقات VIP للحصول على أرباح الفريق
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Crown className="w-4 h-4 text-gold" />
          <span>3 جنيه لكل عضو جديد يشحن في فريقك</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Team Stats */}
      <div className="bg-gradient-card rounded-2xl shadow-card border border-border/50 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold">
            <Users className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">فريقك</h2>
            <p className="text-muted-foreground text-sm">{earningsPerMember} جنيه لكل عضو</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-secondary/50 rounded-xl p-4 text-center">
            <p className="text-3xl font-black text-gradient-gold">{teamMembers.length}</p>
            <p className="text-sm text-muted-foreground">عضو في الفريق</p>
          </div>
          <div className="bg-secondary/50 rounded-xl p-4 text-center">
            <p className="text-3xl font-black text-emerald">+{teamEarnings}</p>
            <p className="text-sm text-muted-foreground">جنيه أرباح</p>
          </div>
        </div>

        {/* Team Code */}
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
          <p className="text-sm text-muted-foreground mb-2">كود الفريق الخاص بك</p>
          <div className="flex gap-2">
            <div className="flex-1 px-4 py-2 rounded-lg bg-background/50 text-foreground text-lg font-bold text-center">
              {teamCode}
            </div>
            <Button
              onClick={copyTeamCode}
              className="bg-gradient-gold text-primary-foreground hover:opacity-90"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-gradient-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <h3 className="text-lg font-bold text-foreground">أعضاء الفريق</h3>
        </div>
        <div className="divide-y divide-border/50">
          {teamMembers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              لا يوجد أعضاء في الفريق حتى الآن
            </div>
          ) : (
            teamMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 flex items-center gap-4"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  member.isActive ? "bg-emerald/20" : "bg-muted/30"
                }`}>
                  <Users className={`w-5 h-5 ${member.isActive ? "text-emerald" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">{member.name}</p>
                  <p className="text-xs text-muted-foreground">انضم في {member.joinDate}</p>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1 text-emerald">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-bold">{member.totalDeposits} جنيه</span>
                  </div>
                  <span className={`text-xs ${member.isActive ? "text-emerald" : "text-muted-foreground"}`}>
                    {member.isActive ? "نشط" : "غير نشط"}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};

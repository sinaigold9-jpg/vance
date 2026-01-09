import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Crown, Lock, TrendingUp, Copy, Check, Share2, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TeamMember {
  id: string;
  full_name: string;
  created_at: string;
  account_type: string;
  total_earnings: number;
}

interface TeamSectionProps {
  userId: string;
  referralCode: string;
  isTrialExpired?: boolean;
  teamEnabled?: boolean;
  teamDisabledMessage?: string;
}

const getRankLabel = (rank: string) => {
  switch (rank) {
    case "M": return "M (قائد)";
    case "GM": return "GM (مدير عام)";
    case "AGM": return "AGM (مساعد مدير)";
    default: return "عضو";
  }
};

const getRankColor = (rank: string) => {
  switch (rank) {
    case "M": return "text-amber-500";
    case "GM": return "text-purple-500";
    case "AGM": return "text-blue-500";
    default: return "text-muted-foreground";
  }
};

export const TeamSection = ({
  userId,
  referralCode,
  isTrialExpired = false,
  teamEnabled = true,
  teamDisabledMessage = "",
}: TeamSectionProps) => {
  const [copied, setCopied] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamEarnings, setTeamEarnings] = useState(0);
  const [userRank, setUserRank] = useState("member");
  const [loading, setLoading] = useState(true);

  // Generate referral link
  const referralLink = `${window.location.origin}/auth?ref=${userId}`;

  useEffect(() => {
    if (userId) {
      fetchTeamData();
    }
  }, [userId]);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      // Fetch team members (users referred by this user)
      const { data: members } = await supabase
        .from("profiles")
        .select("id, full_name, created_at, account_type, total_earnings")
        .eq("referred_by", userId)
        .order("created_at", { ascending: false });

      if (members) {
        setTeamMembers(members);
        
        // Calculate team earnings (3 EGP per member who deposited)
        const activeMembers = members.filter(m => m.account_type !== "beginner");
        setTeamEarnings(activeMembers.length * 3);

        // Calculate rank based on team size
        const memberCount = members.length;
        if (memberCount >= 250) {
          setUserRank("M");
        } else if (memberCount >= 100) {
          setUserRank("GM");
        } else if (memberCount >= 10) {
          setUserRank("AGM");
        } else {
          setUserRank("member");
        }

        // Update team_members_count and team_rank in profile
        await supabase
          .from("profiles")
          .update({ 
            team_members_count: memberCount,
            team_rank: memberCount >= 250 ? "M" : memberCount >= 100 ? "GM" : memberCount >= 10 ? "AGM" : "member"
          })
          .eq("id", userId);
      }
    } catch (error) {
      console.error("Error fetching team data:", error);
    }
    setLoading(false);
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({
      title: "✓ تم النسخ",
      description: "تم نسخ رابط الإحالة بنجاح",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferralLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "انضم لتطبيق Advance",
          text: "انضم لتطبيق Advance واربح يومياً!",
          url: referralLink,
        });
      } catch (error) {
        copyReferralLink();
      }
    } else {
      copyReferralLink();
    }
  };

  if (!teamEnabled) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-card rounded-2xl shadow-card border border-border/50 p-8 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">نظام الفريق متوقف</h2>
        <p className="text-muted-foreground">{teamDisabledMessage}</p>
      </motion.div>
    );
  }

  if (isTrialExpired) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-card rounded-2xl shadow-card border border-border/50 p-8 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">انتهت فترة التجربة</h2>
        <p className="text-muted-foreground">
          قم بترقية باقتك للاستمرار في استخدام نظام الفريق
        </p>
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
            <p className="text-muted-foreground text-sm">3 جنيه لكل عضو يشحن</p>
          </div>
        </div>

        {/* Rank Badge */}
        <div className="flex items-center justify-center gap-2 mb-4 p-3 bg-secondary/50 rounded-xl">
          <Award className={`w-6 h-6 ${getRankColor(userRank)}`} />
          <span className={`font-bold text-lg ${getRankColor(userRank)}`}>
            رتبتك: {getRankLabel(userRank)}
          </span>
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

        {/* Rank Progress */}
        <div className="mb-6 p-4 bg-muted/30 rounded-xl">
          <p className="text-sm text-muted-foreground mb-2">التقدم نحو الترقية</p>
          {userRank === "member" && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>AGM</span>
                <span>{teamMembers.length}/10 عضو</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all" 
                  style={{ width: `${Math.min((teamMembers.length / 10) * 100, 100)}%` }} 
                />
              </div>
            </div>
          )}
          {userRank === "AGM" && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>GM</span>
                <span>{teamMembers.length}/100 عضو</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 transition-all" 
                  style={{ width: `${Math.min((teamMembers.length / 100) * 100, 100)}%` }} 
                />
              </div>
            </div>
          )}
          {userRank === "GM" && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>M (قائد)</span>
                <span>{teamMembers.length}/250 عضو</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all" 
                  style={{ width: `${Math.min((teamMembers.length / 250) * 100, 100)}%` }} 
                />
              </div>
            </div>
          )}
          {userRank === "M" && (
            <p className="text-amber-500 font-bold text-center">🏆 أنت قائد فريق!</p>
          )}
        </div>

        {/* Referral Link */}
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
          <p className="text-sm text-muted-foreground mb-2">رابط الإحالة الخاص بك</p>
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-2 rounded-lg bg-background/50 text-foreground text-sm overflow-hidden">
              <span className="truncate block">{referralLink}</span>
            </div>
            <Button
              onClick={copyReferralLink}
              variant="outline"
              size="icon"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </Button>
            <Button
              onClick={shareReferralLink}
              className="bg-gradient-gold text-primary-foreground hover:opacity-90"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-gradient-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <h3 className="text-lg font-bold text-foreground">أعضاء الفريق</h3>
        </div>
        <div className="divide-y divide-border/50 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              جاري التحميل...
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              لا يوجد أعضاء في الفريق حتى الآن
              <br />
              <span className="text-sm">شارك رابط الإحالة لدعوة الأصدقاء</span>
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
                  member.account_type !== "beginner" ? "bg-emerald/20" : "bg-muted/30"
                }`}>
                  <Users className={`w-5 h-5 ${member.account_type !== "beginner" ? "text-emerald" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">{member.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    انضم في {new Date(member.created_at).toLocaleDateString("ar-EG")}
                  </p>
                </div>
                <div className="text-left">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    member.account_type !== "beginner" 
                      ? "bg-emerald/20 text-emerald" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {member.account_type === "beginner" ? "تجريبي" : member.account_type.toUpperCase()}
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

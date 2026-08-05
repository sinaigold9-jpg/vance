import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { MembershipCard } from "./MembershipCard";
import { supabase } from "@/integrations/supabase/client";
const appIcon = "/placeholder.svg";
import { 
  User, Mail, Phone, CreditCard, 
  Gift, Crown, Clock, Lock, Shield, Settings, BadgeCheck
} from "lucide-react";
import { CURRENT_VERSION } from "@/lib/appVersion";

interface ProfileSectionProps {
  userProfile: {
    full_name: string;
    email: string | null;
    phone: string | null;
    membership_id: string;
    account_type: string;
    balance: number;
    total_earnings: number;
  } | null;
  onRefresh: () => void;
}

export const ProfileSection = ({ userProfile, onRefresh }: ProfileSectionProps) => {
  const { user, isAdmin, isStaff, staffRole } = useAuth();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [badge, setBadge] = useState<{ name: string; icon: string; color: string } | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("avatar_url, created_at, is_verified")
        .eq("id", user.id)
        .maybeSingle();
      setAvatarUrl((p as any)?.avatar_url ?? null);
      setCreatedAt((p as any)?.created_at ?? null);
      setIsVerified(Boolean((p as any)?.is_verified));

      const { data: ub } = await supabase
        .from("user_badges")
        .select("badge_id, badges(name, icon, color)")
        .eq("user_id", user.id)
        .order("granted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const b = (ub as any)?.badges;
      if (b) setBadge({ name: b.name, icon: b.icon, color: b.color });
    })();
  }, [user]);

  const getAccountTypeBadge = (type: string) => {
    switch (type) {
      case "vip3":
        return <Badge className="bg-gradient-gold text-primary-foreground gap-1"><Crown className="w-3 h-3" />VIP3</Badge>;
      case "vip2":
        return <Badge className="bg-purple-500 text-white gap-1"><Crown className="w-3 h-3" />VIP2</Badge>;
      case "vip1":
        return <Badge className="bg-blue-500 text-white gap-1"><Crown className="w-3 h-3" />VIP1</Badge>;
      default:
        return <Badge variant="secondary">مبتدئ</Badge>;
    }
  };

  if (!userProfile) return null;

  return (
    <div className="space-y-6">
      {/* Digital membership card */}
      <MembershipCard
        fullName={userProfile.full_name}
        membershipId={userProfile.membership_id}
        accountType={userProfile.account_type}
        avatarUrl={avatarUrl}
        badge={badge}
        joinedAt={createdAt}
      />

      {/* Main Profile Card */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              الملف الشخصي
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
              className="rounded-full"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Info */}
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={avatarUrl || appIcon} alt={userProfile.full_name} className="object-cover" />
              <AvatarFallback className="bg-gradient-gold text-primary-foreground text-2xl">
                {userProfile.full_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-bold">{userProfile.full_name}</h3>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {getAccountTypeBadge(userProfile.account_type)}
                {isVerified && (
                  <Badge className="gap-1 bg-emerald-500/15 text-emerald-500 border-emerald-400/40">
                    <BadgeCheck className="w-3 h-3" /> موثق
                  </Badge>
                )}
                {badge && (
                  <Badge style={{ backgroundColor: badge.color + "22", color: badge.color, borderColor: badge.color + "55" }} className="gap-1 border">
                    <span>{badge.icon}</span> {badge.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Account Details (Read-only) */}
          <div className="grid gap-4">
            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                <p className="font-medium">{userProfile.email || "غير محدد"}</p>
              </div>
              <Lock className="w-4 h-4 text-muted-foreground mr-auto" />
            </div>

            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                <p className="font-medium">{userProfile.phone || "غير محدد"}</p>
              </div>
              <Lock className="w-4 h-4 text-muted-foreground mr-auto" />
            </div>

            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">رقم العضوية</p>
                <p className="font-medium font-mono">{userProfile.membership_id}</p>
              </div>
              <Lock className="w-4 h-4 text-muted-foreground mr-auto" />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-card rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gradient-gold">
                {userProfile.balance.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">الرصيد (جنيه)</p>
            </div>
            <div className="bg-gradient-card rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-accent">
                {userProfile.total_earnings.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">إجمالي الأرباح</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Panel Button - Only for admin */}
      {isAdmin && (
        <Card 
          className="border-vip-gold/50 bg-vip-gold/5 hover:bg-vip-gold/10 transition-colors cursor-pointer" 
          onClick={() => navigate("/admin")}
        >
          <CardContent className="py-6 flex items-center gap-4">
            <div className="bg-vip-gold/20 p-3 rounded-xl">
              <Shield className="w-8 h-8 text-vip-gold" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-vip-gold">لوحة التحكم</h3>
              <p className="text-sm text-muted-foreground">إدارة التطبيق والمستخدمين</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* App version footer */}
      <div className="text-center py-2">
        <p className="text-xs text-muted-foreground">
          إصدار التطبيق: <span className="font-mono font-bold text-foreground">{CURRENT_VERSION}</span>
        </p>
      </div>
    </div>
  );
};

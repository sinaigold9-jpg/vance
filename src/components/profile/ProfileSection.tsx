import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  User, Mail, Phone, CreditCard, Camera, Upload, Save, 
  Megaphone, Gift, Crown, Clock, Lock 
} from "lucide-react";

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
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [advertiserProfile, setAdvertiserProfile] = useState<{
    advertiser_name: string;
    advertiser_image: string | null;
  } | null>(null);
  const [advertiserName, setAdvertiserName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingAdvertiser, setIsCreatingAdvertiser] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAdvertiserProfile();
    }
  }, [user]);

  const fetchAdvertiserProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("advertiser_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setAdvertiserProfile({
        advertiser_name: data.advertiser_name,
        advertiser_image: data.advertiser_image
      });
      setAdvertiserName(data.advertiser_name);
    }
  };

  const handleCreateAdvertiserProfile = async () => {
    if (!user || !advertiserName.trim()) {
      toast.error("يرجى إدخال اسم المعلن");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.from("advertiser_profiles").insert({
        user_id: user.id,
        advertiser_name: advertiserName
      });

      if (error) throw error;

      toast.success("تم إنشاء ملف المعلن بنجاح");
      fetchAdvertiserProfile();
      setIsCreatingAdvertiser(false);
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAdvertiserProfile = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("advertiser_profiles")
        .update({ advertiser_name: advertiserName })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("تم تحديث ملف المعلن");
      fetchAdvertiserProfile();
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsLoading(true);

    try {
      const fileName = `${user.id}/advertiser-${Date.now()}.${file.name.split('.').pop()}`;
      const { data, error } = await supabase.storage
        .from('ad-images')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('ad-images')
        .getPublicUrl(data.path);

      await supabase
        .from("advertiser_profiles")
        .update({ advertiser_image: urlData.publicUrl })
        .eq("user_id", user.id);

      toast.success("تم تحديث صورة المعلن");
      fetchAdvertiserProfile();
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ في رفع الصورة");
    } finally {
      setIsLoading(false);
    }
  };

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
      {/* Main Profile Card */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            الملف الشخصي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Info */}
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-gradient-gold text-primary-foreground text-2xl">
                {userProfile.full_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-bold">{userProfile.full_name}</h3>
              {getAccountTypeBadge(userProfile.account_type)}
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

      {/* Advertiser Profile */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            ملف المعلن
          </CardTitle>
        </CardHeader>
        <CardContent>
          {advertiserProfile ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={advertiserProfile.advertiser_image || undefined} />
                    <AvatarFallback className="bg-primary/20">
                      {advertiserProfile.advertiser_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-1 rounded-full"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  <Label>اسم المعلن</Label>
                  <Input
                    value={advertiserName}
                    onChange={e => setAdvertiserName(e.target.value)}
                    placeholder="اسم المعلن"
                  />
                </div>
              </div>
              <Button
                onClick={handleUpdateAdvertiserProfile}
                disabled={isLoading || advertiserName === advertiserProfile.advertiser_name}
                className="w-full gap-2"
              >
                <Save className="w-4 h-4" />
                حفظ التغييرات
              </Button>
            </div>
          ) : isCreatingAdvertiser ? (
            <div className="space-y-4">
              <div>
                <Label>اسم المعلن</Label>
                <Input
                  value={advertiserName}
                  onChange={e => setAdvertiserName(e.target.value)}
                  placeholder="أدخل اسم المعلن"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateAdvertiserProfile}
                  disabled={isLoading}
                  className="flex-1 gap-2 bg-gradient-gold text-primary-foreground"
                >
                  إنشاء
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreatingAdvertiser(false)}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                أنشئ ملف معلن لنشر إعلاناتك
              </p>
              <Button
                onClick={() => setIsCreatingAdvertiser(true)}
                className="gap-2 bg-gradient-gold text-primary-foreground"
              >
                <Megaphone className="w-4 h-4" />
                إنشاء ملف معلن
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coming Soon Sections */}
      <Card className="border-border/50 border-dashed">
        <CardContent className="py-8 text-center">
          <Megaphone className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-bold mb-1">الإعلانات</h3>
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            قريباً
          </Badge>
        </CardContent>
      </Card>

      <Card className="border-border/50 border-dashed">
        <CardContent className="py-8 text-center">
          <Gift className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-bold mb-1">العروض والمسابقات</h3>
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            قريباً
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
};

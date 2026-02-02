import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CreateAdForm } from "@/components/ads/CreateAdForm";
import { 
  Megaphone, Camera, Save, Plus, ArrowLeft, LayoutList
} from "lucide-react";

interface SponsorPageProps {
  userBalance: number;
  onNavigateToAds?: () => void;
}

export const SponsorPage = ({ userBalance, onNavigateToAds }: SponsorPageProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [advertiserProfile, setAdvertiserProfile] = useState<{
    advertiser_name: string;
    advertiser_image: string | null;
  } | null>(null);
  const [advertiserName, setAdvertiserName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingAdvertiser, setIsCreatingAdvertiser] = useState(false);
  const [showCreateAdForm, setShowCreateAdForm] = useState(false);

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
      toast.error("يرجى إدخال اسم الممول");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.from("advertiser_profiles").insert({
        user_id: user.id,
        advertiser_name: advertiserName
      });

      if (error) throw error;

      toast.success("تم إنشاء صفحة الممول بنجاح");
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

      toast.success("تم تحديث بيانات الممول");
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

      toast.success("تم تحديث صورة الممول");
      fetchAdvertiserProfile();
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ في رفع الصورة");
    } finally {
      setIsLoading(false);
    }
  };

  if (showCreateAdForm) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setShowCreateAdForm(false)}
          className="gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          العودة لصفحة الممول
        </Button>
        <CreateAdForm 
          onSuccess={() => {
            setShowCreateAdForm(false);
            toast.success("تم إنشاء الإعلان بنجاح!");
            if (onNavigateToAds) onNavigateToAds();
          }}
          onCancel={() => setShowCreateAdForm(false)}
          userBalance={userBalance}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            صفحة الممول
          </CardTitle>
        </CardHeader>
        <CardContent>
          {advertiserProfile ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={advertiserProfile.advertiser_image || undefined} />
                    <AvatarFallback className="bg-primary/20 text-2xl">
                      {advertiserProfile.advertiser_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-1.5 rounded-full"
                  >
                    <Camera className="w-4 h-4" />
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
                  <Label>اسم الممول</Label>
                  <Input
                    value={advertiserName}
                    onChange={e => setAdvertiserName(e.target.value)}
                    placeholder="اسم الممول"
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
              
              <Separator className="my-4" />
              
              {/* Actions */}
              <div className="grid gap-3">
                <Button
                  onClick={() => setShowCreateAdForm(true)}
                  className="w-full gap-2 bg-gradient-gold text-primary-foreground h-12"
                >
                  <Plus className="w-5 h-5" />
                  إنشاء إعلان جديد
                </Button>
                
                <Button
                  variant="outline"
                  onClick={onNavigateToAds}
                  className="w-full gap-2 h-12"
                >
                  <LayoutList className="w-5 h-5" />
                  عرض إعلاناتي
                </Button>
              </div>
            </div>
          ) : isCreatingAdvertiser ? (
            <div className="space-y-4">
              <div>
                <Label>اسم الممول</Label>
                <Input
                  value={advertiserName}
                  onChange={e => setAdvertiserName(e.target.value)}
                  placeholder="أدخل اسم الممول"
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
            <div className="text-center py-8">
              <Megaphone className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-bold mb-2">أنشئ صفحة ممول</h3>
              <p className="text-muted-foreground mb-6">
                أنشئ صفحة ممول لنشر إعلاناتك والوصول لجمهور أكبر
              </p>
              <Button
                onClick={() => setIsCreatingAdvertiser(true)}
                className="gap-2 bg-gradient-gold text-primary-foreground"
              >
                <Megaphone className="w-4 h-4" />
                إنشاء صفحة ممول
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

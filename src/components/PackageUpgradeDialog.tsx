import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, User, Mail, Phone, IdCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface PackageUpgradeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  packageName: string;
  packagePrice: number;
  targetAccountType: string;
}

export const PackageUpgradeDialog = ({
  isOpen,
  onClose,
  packageName,
  packagePrice,
  targetAccountType,
}: PackageUpgradeDialogProps) => {
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    email: string | null;
    phone: string | null;
    membership_id: string | null;
  } | null>(null);
  const { user } = useAuth();

  const fetchUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, phone, membership_id, account_type")
      .eq("id", user.id)
      .maybeSingle();
    if (data) {
      setUserProfile({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        membership_id: data.membership_id,
      });
    }
  };

  useState(() => {
    if (isOpen && user) {
      fetchUserProfile();
    }
  });

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "خطأ",
        description: "يرجى تسجيل الدخول أولاً",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type, full_name, email, phone, membership_id")
        .eq("id", user.id)
        .single();

      // Create upgrade request
      const { error: requestError } = await supabase
        .from("package_upgrade_requests")
        .insert([{
          user_id: user.id,
          current_package: profile?.account_type || 'beginner',
          requested_package: targetAccountType as "beginner" | "vip1" | "vip2" | "vip3",
        }]);

      if (requestError) throw requestError;

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "طلب ترقية باقة",
        details: { 
          package: packageName, 
          price: packagePrice,
          user_name: profile?.full_name,
          user_email: profile?.email,
          user_phone: profile?.phone,
          membership_id: profile?.membership_id,
        },
        amount: packagePrice,
      });

      setSuccess(true);
    } catch (error) {
      console.error("Error submitting upgrade request:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إرسال الطلب",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    onClose();
  };

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md text-center" dir="rtl">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="py-8"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald/20 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-emerald" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              تم الإرسال بنجاح 🎉
            </h2>
            <p className="text-muted-foreground mb-6">
              سنراجع المعلومات المقدمة وتُفعّل الباقة تلقائياً
            </p>
            <Button onClick={handleClose} className="w-full bg-gradient-gold text-primary-foreground">
              حسناً
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            ترقية إلى {packageName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Info */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <h4 className="font-bold text-sm text-muted-foreground mb-3">بيانات المستخدم</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="text-sm">{userProfile?.full_name || "جاري التحميل..."}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-sm">{userProfile?.email || "غير متوفر"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <span className="text-sm">{userProfile?.phone || "غير متوفر"}</span>
              </div>
              <div className="flex items-center gap-2">
                <IdCard className="w-4 h-4 text-primary" />
                <span className="text-sm">رقم العضوية: {userProfile?.membership_id || "غير متوفر"}</span>
              </div>
            </div>
          </div>

          {/* Price Info */}
          <div className="text-center p-4 rounded-xl bg-gradient-gold/10 border border-gold/30">
            <p className="text-muted-foreground mb-1">قيمة الباقة</p>
            <p className="text-3xl font-black text-gradient-gold">{packagePrice} جنيه</p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full bg-gradient-gold text-primary-foreground h-12 text-lg"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin ml-2" />
                جاري الإرسال...
              </>
            ) : (
              "إرسال طلب الترقية"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            سيتم إرسال بياناتك إلى خدمة العملاء للمراجعة والتفعيل
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

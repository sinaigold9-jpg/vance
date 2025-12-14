import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Phone, CheckCircle, Loader2 } from "lucide-react";
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
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file || !user) {
      toast({
        title: "خطأ",
        description: "يرجى رفع إيصال الدفع",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload receipt to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', user.id)
        .single();

      // Create upgrade request
      const { error: requestError } = await supabase
        .from('package_upgrade_requests')
        .insert([{
          user_id: user.id,
          current_package: profile?.account_type || 'beginner',
          requested_package: targetAccountType as "beginner" | "vip1" | "vip2" | "vip3",
        }]);

      if (requestError) throw requestError;

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'طلب ترقية باقة',
        details: { 
          package: packageName, 
          price: packagePrice,
          receipt_url: publicUrl 
        },
        amount: packagePrice,
      });

      setSuccess(true);
    } catch (error) {
      console.error('Error submitting upgrade request:', error);
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
    setFile(null);
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
          {/* Vodafone Cash Info */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-foreground">فودافون كاش</p>
                <p className="text-sm text-muted-foreground">أرسل قيمة الباقة على الرقم التالي</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border text-center">
              <p className="text-2xl font-bold text-primary tracking-wider">01080048591</p>
            </div>
          </div>

          {/* Price Info */}
          <div className="text-center p-4 rounded-xl bg-gradient-gold/10 border border-gold/30">
            <p className="text-muted-foreground mb-1">قيمة الباقة</p>
            <p className="text-3xl font-black text-gradient-gold">{packagePrice} جنيه</p>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              رفع إيصال الدفع
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="receipt-upload"
              />
              <label
                htmlFor="receipt-upload"
                className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {file ? file.name : "اختر صورة الإيصال"}
                </span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="w-full bg-gradient-gold text-primary-foreground h-12 text-lg"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin ml-2" />
                جاري الإرسال...
              </>
            ) : (
              "تأكيد الطلب"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

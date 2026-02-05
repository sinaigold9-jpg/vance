import { useState } from "react";
import { motion } from "framer-motion";
import { User, Phone, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileCompletionProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onComplete: () => void;
}

export const ProfileCompletion = ({
  isOpen,
  onClose,
  userId,
  onComplete,
}: ProfileCompletionProps) => {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!fullName.trim() || fullName.length < 2) {
      toast.error("الاسم يجب أن يكون أكثر من حرفين");
      return;
    }

    if (!phone.trim() || phone.length < 11) {
      toast.error("رقم الهاتف يجب أن يكون 11 رقم على الأقل");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          full_name: fullName.trim(),
          phone: phone.trim(),
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("تم إكمال بيانات حسابك بنجاح!");
      onComplete();
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("حدث خطأ في حفظ البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" dir="rtl" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            أكمل بيانات حسابك
          </DialogTitle>
        </DialogHeader>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 py-4"
        >
          <div className="bg-primary/10 rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">
              لإكمال تسجيلك، يرجى إدخال اسمك ورقم هاتفك
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              الاسم الكامل
            </label>
            <Input
              type="text"
              placeholder="أدخل اسمك الكامل"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Phone className="w-4 h-4" />
              رقم الهاتف المحمول
            </label>
            <Input
              type="tel"
              placeholder="01xxxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              className="text-left"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isLoading || !fullName.trim() || !phone.trim()}
            className="w-full bg-gradient-gold text-primary-foreground h-12"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin ml-2" />
                جاري الحفظ...
              </>
            ) : (
              "حفظ البيانات"
            )}
          </Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
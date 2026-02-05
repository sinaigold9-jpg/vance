import { useState } from "react";
import { motion } from "framer-motion";
import { Coins, ArrowDownCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PointsConverterProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentPoints: number;
  onConvert: (newBalance: number, newPoints: number) => void;
}

// 1000 points = 165 EGP
const POINTS_TO_EGP_RATE = 165 / 1000; // 0.165 EGP per point

export const PointsConverter = ({
  isOpen,
  onClose,
  userId,
  currentPoints,
  onConvert,
}: PointsConverterProps) => {
  const [pointsToConvert, setPointsToConvert] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [convertedAmount, setConvertedAmount] = useState(0);

  const calculatedAmount = pointsToConvert 
    ? Math.floor(parseInt(pointsToConvert) * POINTS_TO_EGP_RATE * 100) / 100
    : 0;

  const handleConvert = async () => {
    const points = parseInt(pointsToConvert);
    
    if (isNaN(points) || points <= 0) {
      toast.error("يرجى إدخال عدد صحيح من النقاط");
      return;
    }

    if (points > currentPoints) {
      toast.error("لا تملك نقاط كافية");
      return;
    }

    if (points < 100) {
      toast.error("الحد الأدنى للتحويل 100 نقطة");
      return;
    }

    setIsLoading(true);

    try {
      const amountToAdd = Math.floor(points * POINTS_TO_EGP_RATE * 100) / 100;
      const newPoints = currentPoints - points;

      // Get current balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", userId)
        .single();

      if (!profile) throw new Error("Profile not found");

      const newBalance = (profile.balance || 0) + amountToAdd;

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({ 
          points: newPoints,
          balance: newBalance 
        })
        .eq("id", userId);

      if (error) throw error;

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: userId,
        action: "تحويل نقاط إلى رصيد",
        amount: amountToAdd,
        details: {
          points_converted: points,
          amount_added: amountToAdd,
        },
      });

      setConvertedAmount(amountToAdd);
      setSuccess(true);
      onConvert(newBalance, newPoints);
    } catch (error) {
      console.error("Error converting points:", error);
      toast.error("حدث خطأ في تحويل النقاط");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPointsToConvert("");
    setSuccess(false);
    setConvertedAmount(0);
    onClose();
  };

  const setMaxPoints = () => {
    setPointsToConvert(currentPoints.toString());
  };

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md" dir="rtl">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-8"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald/20 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">تم التحويل 🎉</h2>
            <p className="text-muted-foreground mb-2">
              تم إضافة <span className="text-primary font-bold">{convertedAmount} جنيه</span> لرصيدك
            </p>
            <Button onClick={handleClose} className="w-full bg-gradient-gold text-primary-foreground mt-4">
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
          <DialogTitle className="text-xl flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            تحويل النقاط إلى رصيد
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-primary/10 rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">رصيد النقاط</p>
            <p className="text-2xl font-bold text-primary">{currentPoints.toLocaleString()} نقطة</p>
            <p className="text-xs text-muted-foreground mt-2">
              كل 1000 نقطة = 165 جنيه
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">عدد النقاط للتحويل</label>
              <Button variant="link" size="sm" onClick={setMaxPoints} className="h-auto p-0 text-xs">
                تحويل الكل
              </Button>
            </div>
            <Input
              type="number"
              placeholder="أدخل عدد النقاط (الحد الأدنى 100)"
              value={pointsToConvert}
              onChange={(e) => setPointsToConvert(e.target.value)}
              min={100}
              max={currentPoints}
            />
          </div>

          {calculatedAmount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald/10 border border-emerald/30 rounded-xl p-4 text-center"
            >
              <div className="flex items-center justify-center gap-2 text-emerald">
                <ArrowDownCircle className="w-5 h-5" />
                <span className="text-lg font-bold">{calculatedAmount} جنيه</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                سيُضاف لرصيدك
              </p>
            </motion.div>
          )}

          <Button
            onClick={handleConvert}
            disabled={isLoading || !pointsToConvert || parseInt(pointsToConvert) < 100}
            className="w-full bg-gradient-gold text-primary-foreground h-12"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin ml-2" />
                جاري التحويل...
              </>
            ) : (
              "تحويل الآن"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            ملاحظة: التحويل فوري ولا يمكن التراجع عنه
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface BalanceRevealProps {
  isOpen: boolean;
  onClose: () => void;
  withdrawalPin: string;
  onSuccess: () => void;
}

export const BalanceReveal = ({ isOpen, onClose, withdrawalPin, onSuccess }: BalanceRevealProps) => {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (pin.length !== 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أرقام");
      return;
    }

    if (pin !== withdrawalPin) {
      toast.error("كلمة المرور غير صحيحة");
      return;
    }

    setIsLoading(true);
    
    // Simulate a brief loading state
    setTimeout(() => {
      setIsLoading(false);
      toast.success("تم التحقق بنجاح");
      setPin("");
      onSuccess();
    }, 500);
  };

  const handleClose = () => {
    setPin("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            الوصول للمحفظة
          </DialogTitle>
        </DialogHeader>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 py-4"
        >
          <div className="bg-primary/10 rounded-xl p-4 text-center">
            <Lock className="w-10 h-10 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              أدخل كلمة مرور السحب للوصول إلى رصيدك
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">كلمة مرور السحب (6 أرقام)</label>
            <div className="relative">
              <Input
                type={showPin ? "text" : "password"}
                placeholder="أدخل 6 أرقام"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-lg tracking-widest pr-10"
                maxLength={6}
                dir="ltr"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute left-3 top-1/2 -translate-y-1/2"
              >
                {showPin ? (
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Eye className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isLoading || pin.length !== 6}
            className="w-full bg-gradient-gold text-primary-foreground h-12"
          >
            {isLoading ? "جاري التحقق..." : "تأكيد"}
          </Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
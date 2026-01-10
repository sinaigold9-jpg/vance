import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, User, Phone, Lock, Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WithdrawalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  balance: number;
  minWithdraw: number;
  withdrawalPin: string | null;
  onWithdraw: (amount: number) => void;
  accountType: string;
  trialEndDate: string | null;
}

export const WithdrawalDialog = ({
  isOpen,
  onClose,
  userId,
  balance,
  minWithdraw,
  withdrawalPin,
  onWithdraw,
  accountType,
  trialEndDate,
}: WithdrawalDialogProps) => {
  const [amount, setAmount] = useState("");
  const [walletNumber, setWalletNumber] = useState("");
  const [walletHolderName, setWalletHolderName] = useState("");
  const [paymentGateway, setPaymentGateway] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isInTrial = trialEndDate && new Date(trialEndDate) > new Date();
  const isBeginner = accountType === "beginner";

  const handleSubmit = async () => {
    if (isInTrial && isBeginner) {
      toast.error("لا يمكنك السحب خلال فترة التجربة المجانية. قم بترقية باقتك أولاً.");
      return;
    }

    const parsedAmount = parseFloat(amount);
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    if (parsedAmount < minWithdraw) {
      toast.error(`الحد الأدنى للسحب هو ${minWithdraw} جنيه`);
      return;
    }

    if (parsedAmount > balance) {
      toast.error("الرصيد غير كافي");
      return;
    }

    if (!walletNumber || !walletHolderName || !paymentGateway) {
      toast.error("يرجى ملء جميع البيانات");
      return;
    }

    if (pin !== withdrawalPin) {
      toast.error("كلمة مرور السحب غير صحيحة");
      return;
    }

    setIsLoading(true);

    try {
      // Deduct balance immediately
      const newBalance = balance - parsedAmount;
      
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", userId);

      if (updateError) throw updateError;

      // Create withdrawal transaction
      const { error } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          type: "withdrawal",
          amount: parsedAmount,
          status: "pending",
          payment_gateway: paymentGateway as "vodafone" | "etisalat" | "orange" | "we",
          phone_number: walletNumber,
          wallet_holder_name: walletHolderName,
          wallet_number: walletNumber,
        });

      if (error) throw error;

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: userId,
        action: "طلب سحب",
        amount: parsedAmount,
        details: {
          wallet_number: walletNumber,
          wallet_holder_name: walletHolderName,
          payment_gateway: paymentGateway,
        },
      });

      setSuccess(true);
      onWithdraw(parsedAmount);
    } catch (error) {
      console.error("Error submitting withdrawal:", error);
      toast.error("حدث خطأ في إرسال الطلب");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAmount("");
    setWalletNumber("");
    setWalletHolderName("");
    setPaymentGateway("");
    setPin("");
    setSuccess(false);
    onClose();
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
            <h2 className="text-2xl font-bold text-foreground mb-2">تم تقديم الطلب 🎉</h2>
            <p className="text-muted-foreground mb-6">
              سيتم مراجعة طلب السحب خلال 24 ساعة
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
          <DialogTitle className="text-xl flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            طلب سحب
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isInTrial && isBeginner && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
              <p className="text-sm text-amber-600">
                أنت في فترة التجربة المجانية. لا يمكنك السحب إلا بعد ترقية الباقة.
              </p>
            </div>
          )}

          <div className="bg-primary/10 rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">رصيدك الحالي</p>
            <p className="text-2xl font-bold text-primary">{balance.toLocaleString()} جنيه</p>
            <p className="text-xs text-muted-foreground mt-1">
              الحد الأدنى للسحب: {minWithdraw} جنيه
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">المبلغ المراد سحبه</label>
            <Input
              type="number"
              placeholder="أدخل المبلغ"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isInTrial && isBeginner}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">بوابة الدفع</label>
            <Select value={paymentGateway} onValueChange={setPaymentGateway} disabled={isInTrial && isBeginner}>
              <SelectTrigger>
                <SelectValue placeholder="اختر بوابة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vodafone">فودافون كاش</SelectItem>
                <SelectItem value="etisalat">اتصالات كاش</SelectItem>
                <SelectItem value="orange">اورنج موني</SelectItem>
                <SelectItem value="we">WE Pay</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Phone className="w-4 h-4" />
              رقم المحفظة الإلكترونية
            </label>
            <Input
              type="tel"
              placeholder="01xxxxxxxxx"
              value={walletNumber}
              onChange={(e) => setWalletNumber(e.target.value)}
              dir="ltr"
              disabled={isInTrial && isBeginner}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              اسم صاحب المحفظة
            </label>
            <Input
              type="text"
              placeholder="الاسم كما هو مسجل في المحفظة"
              value={walletHolderName}
              onChange={(e) => setWalletHolderName(e.target.value)}
              disabled={isInTrial && isBeginner}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Lock className="w-4 h-4" />
              كلمة مرور السحب (6 أرقام)
            </label>
            <div className="relative">
              <Input
                type={showPin ? "text" : "password"}
                placeholder="أدخل كلمة مرور السحب"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center tracking-widest pr-10"
                maxLength={6}
                dir="ltr"
                disabled={isInTrial && isBeginner}
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
            disabled={isLoading || !amount || !walletNumber || !walletHolderName || !paymentGateway || !pin || (isInTrial && isBeginner)}
            className="w-full bg-gradient-gold text-primary-foreground h-12"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin ml-2" />
                جاري الإرسال...
              </>
            ) : (
              "تقديم طلب السحب"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
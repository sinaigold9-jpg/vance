import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, CheckCircle2, User, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface DepositDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: {
    full_name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

export const DepositDialog = ({ isOpen, onClose, userProfile }: DepositDialogProps) => {
  const [amount, setAmount] = useState("");
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
    if (!file || !user || !amount) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    setUploading(true);

    try {
      // Upload receipt
      const fileExt = file.name.split(".").pop();
      const fileName = `deposits/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: "deposit",
          amount: parsedAmount,
          status: "pending",
          payment_gateway: "vodafone",
          notes: `Receipt: ${fileName}`,
        });

      if (transactionError) throw transactionError;

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "طلب إيداع",
        amount: parsedAmount,
        details: { receipt: fileName },
      });

      setSuccess(true);
      toast.success("تم إرسال طلب الإيداع بنجاح");
    } catch (error) {
      console.error("Error submitting deposit:", error);
      toast.error("حدث خطأ في إرسال الطلب");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setAmount("");
    setFile(null);
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">طلب إيداع</DialogTitle>
        </DialogHeader>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <CheckCircle2 className="w-16 h-16 text-emerald mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">تم الإرسال بنجاح 🎉</h3>
            <p className="text-muted-foreground">
              سنراجع المعلومات المقدمة وسيتم إضافة الرصيد تلقائياً
            </p>
            <Button onClick={handleClose} className="mt-4">
              إغلاق
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* User Info */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-sm text-muted-foreground">بيانات المستخدم</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm">{userProfile?.full_name || "غير متوفر"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-sm">{userProfile?.email || "غير متوفر"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <span className="text-sm">{userProfile?.phone || "غير متوفر"}</span>
                </div>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">المبلغ المراد إيداعه</label>
              <Input
                type="number"
                placeholder="أدخل المبلغ"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Payment Info */}
            <div className="bg-primary/10 rounded-xl p-4 border border-primary/30">
              <h4 className="font-bold text-primary mb-2">معلومات الدفع</h4>
              <p className="text-sm text-muted-foreground mb-2">
                أرسل الإيداع على حساب فودافون كاش:
              </p>
              <p className="text-2xl font-bold text-primary text-center py-2 bg-background/50 rounded-lg">
                01080048591
              </p>
            </div>

            {/* Upload Receipt */}
            <div className="space-y-2">
              <label className="text-sm font-medium">صورة الإيصال</label>
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="deposit-receipt"
                />
                <label
                  htmlFor="deposit-receipt"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {file ? file.name : "اضغط لرفع صورة الإيصال"}
                  </span>
                </label>
              </div>
            </div>

            <Button
              className="w-full h-12 bg-gradient-gold text-primary-foreground font-bold"
              onClick={handleSubmit}
              disabled={!file || !amount || uploading}
            >
              {uploading ? "جاري الإرسال..." : "إرسال طلب الإيداع"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

import { motion } from "framer-motion";
import { Wallet, ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "earning";
  amount: number;
  status: "pending" | "completed" | "rejected";
  date: string;
  description: string;
}

interface WalletSectionProps {
  balance: number;
  minWithdraw: number;
  transactions: Transaction[];
  onWithdraw: (amount: number) => void;
  onDeposit?: () => void;
}

export const WalletSection = ({ balance, minWithdraw, transactions, onWithdraw, onDeposit }: WalletSectionProps) => {
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ صحيح",
        variant: "destructive",
      });
      return;
    }
    if (amount < minWithdraw) {
      toast({
        title: "خطأ",
        description: `الحد الأدنى للسحب هو ${minWithdraw} جنيه`,
        variant: "destructive",
      });
      return;
    }
    if (amount > balance) {
      toast({
        title: "خطأ",
        description: "الرصيد غير كافي",
        variant: "destructive",
      });
      return;
    }
    onWithdraw(amount);
    setWithdrawAmount("");
    setShowWithdrawForm(false);
    toast({
      title: "✓ تم تقديم الطلب",
      description: "سيتم مراجعة طلب السحب خلال 24 ساعة",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-emerald" />;
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "مكتمل";
      case "pending":
        return "قيد المراجعة";
      case "rejected":
        return "مرفوض";
      default:
        return "";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Balance Card */}
      <div className="bg-gradient-card rounded-2xl shadow-card border border-border/50 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold">
            <Wallet className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">رصيدك الحالي</p>
            <p className="text-3xl font-black text-gradient-gold">{balance.toLocaleString()} جنيه</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => setShowWithdrawForm(!showWithdrawForm)}
            className="flex-1 h-12 bg-gradient-gold text-primary-foreground font-bold hover:opacity-90"
          >
            <ArrowUpCircle className="w-5 h-5 ml-2" />
            سحب
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-12 border-primary/30 text-primary hover:bg-primary/10"
            onClick={onDeposit}
          >
            <ArrowDownCircle className="w-5 h-5 ml-2" />
            إيداع
          </Button>
        </div>

        {showWithdrawForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 p-4 rounded-xl bg-secondary/50 border border-border/50"
          >
            <p className="text-sm text-muted-foreground mb-3">
              الحد الأدنى للسحب: <span className="text-primary font-bold">{minWithdraw} جنيه</span>
            </p>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="المبلغ المطلوب"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="bg-background/50 border-border/50"
              />
              <Button
                onClick={handleWithdraw}
                className="bg-emerald text-primary-foreground hover:bg-emerald/90 px-6"
              >
                تأكيد
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Transactions */}
      <div className="bg-gradient-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <h2 className="text-xl font-bold text-foreground">سجل العمليات</h2>
        </div>
        <div className="divide-y divide-border/50">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              لا توجد عمليات حتى الآن
            </div>
          ) : (
            transactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 flex items-center gap-4"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  transaction.type === "earning" ? "bg-emerald/20" :
                  transaction.type === "deposit" ? "bg-vip1/20" : "bg-primary/20"
                }`}>
                  {transaction.type === "withdrawal" ? (
                    <ArrowUpCircle className="w-5 h-5 text-primary" />
                  ) : (
                    <ArrowDownCircle className={`w-5 h-5 ${
                      transaction.type === "earning" ? "text-emerald" : "text-vip1"
                    }`} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">{transaction.description}</p>
                  <p className="text-xs text-muted-foreground">{transaction.date}</p>
                </div>
                <div className="text-left">
                  <p className={`font-bold ${
                    transaction.type === "withdrawal" ? "text-primary" : "text-emerald"
                  }`}>
                    {transaction.type === "withdrawal" ? "-" : "+"}{transaction.amount} جنيه
                  </p>
                  <div className="flex items-center gap-1 justify-end">
                    {getStatusIcon(transaction.status)}
                    <span className="text-xs text-muted-foreground">{getStatusLabel(transaction.status)}</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  ArrowUpCircle, Clock, CheckCircle2, XCircle, Hash, 
  Calendar, User, Smartphone 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface WithdrawalTransaction {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  payment_gateway: string | null;
  wallet_number: string | null;
  wallet_holder_name: string | null;
  transaction_number: string | null;
  created_at: string;
  processed_at: string | null;
}

const walletLogos: Record<string, { name: string; color: string; bgColor: string }> = {
  vodafone: { name: "فودافون كاش", color: "#E60000", bgColor: "#E60000/10" },
  etisalat: { name: "اتصالات كاش", color: "#00A651", bgColor: "#00A651/10" },
  orange: { name: "أورنج موني", color: "#FF6600", bgColor: "#FF6600/10" },
  we: { name: "WE Pay", color: "#6B46C1", bgColor: "#6B46C1/10" },
};

export const WithdrawalHistory = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<WithdrawalTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWithdrawals();
    }
  }, [user]);

  const fetchWithdrawals = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "withdrawal")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTransactions(data);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="w-5 h-5 text-emerald" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-amber-500 animate-pulse" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved":
        return "تم التحويل";
      case "rejected":
        return "مرفوض";
      default:
        return "قيد المراجعة";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald/10 text-emerald border-emerald/30";
      case "rejected":
        return "bg-destructive/10 text-destructive border-destructive/30";
      default:
        return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin text-2xl">⏳</div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ArrowUpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>لا توجد عمليات سحب حتى الآن</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <ArrowUpCircle className="w-5 h-5 text-primary" />
        سجل السحوبات
      </h3>

      {transactions.map((tx, index) => {
        const wallet = tx.payment_gateway ? walletLogos[tx.payment_gateway] : null;
        
        return (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                {/* Amount & Status */}
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black text-primary">
                    {tx.amount.toLocaleString()} ج.م
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(tx.status)}`}>
                    {getStatusLabel(tx.status)}
                  </span>
                </div>

                {/* Wallet Info */}
                {wallet && (
                  <div 
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: `${wallet.color}15` }}
                  >
                    <Smartphone className="w-4 h-4" style={{ color: wallet.color }} />
                    <span className="text-sm font-medium" style={{ color: wallet.color }}>
                      {wallet.name}
                    </span>
                  </div>
                )}

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  {tx.wallet_number && (
                    <div className="flex items-center gap-1">
                      <Smartphone className="w-3 h-3" />
                      <span dir="ltr">{tx.wallet_number}</span>
                    </div>
                  )}
                  {tx.wallet_holder_name && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{tx.wallet_holder_name}</span>
                    </div>
                  )}
                  {tx.transaction_number && (
                    <div className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      <span dir="ltr" className="font-mono text-xs">{tx.transaction_number}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {format(new Date(tx.created_at), "dd MMM yyyy - HH:mm", { locale: ar })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Icon */}
              <div className="shrink-0">
                {getStatusIcon(tx.status)}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
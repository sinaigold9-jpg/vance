import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Search, DollarSign, CheckCircle, XCircle, Clock, 
  ArrowUpCircle, ArrowDownCircle, User, Phone, Mail 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Database } from "@/integrations/supabase/types";

type TransactionStatus = Database["public"]["Enums"]["transaction_status"];
type TransactionType = Database["public"]["Enums"]["transaction_type"];

interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  payment_gateway: string | null;
  phone_number: string | null;
  notes: string | null;
  created_at: string;
  user_profile?: {
    full_name: string;
    email: string | null;
    phone: string | null;
  };
}

export const AdminTransactionsTab = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<"deposit" | "withdrawal" | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter, typeFilter]);

  const fetchTransactions = async () => {
    setLoading(true);
    let query = supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    if (typeFilter !== "all") {
      query = query.eq("type", typeFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching transactions:", error);
      toast.error("حدث خطأ في تحميل المعاملات");
    } else {
      // Fetch profiles separately
      const userIds = [...new Set((data || []).map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const transactionsWithProfiles: Transaction[] = (data || []).map(t => ({
        ...t,
        user_profile: profilesMap.get(t.user_id) || undefined
      }));
      
      setTransactions(transactionsWithProfiles);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (transactionId: string, newStatus: TransactionStatus) => {
    const { error } = await supabase
      .from("transactions")
      .update({ 
        status: newStatus,
        processed_at: new Date().toISOString()
      })
      .eq("id", transactionId);

    if (error) {
      toast.error("حدث خطأ في تحديث الحالة");
    } else {
      toast.success(newStatus === "approved" ? "تم قبول المعاملة" : "تم رفض المعاملة");
      fetchTransactions();
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const profile = t.user_profile;
    return (
      profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile?.phone?.includes(searchQuery) ||
      t.phone_number?.includes(searchQuery)
    );
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "deposit": return "إيداع";
      case "withdrawal": return "سحب";
      case "task_earning": return "ربح مهمة";
      case "referral_earning": return "ربح إحالة";
      case "share_earning": return "ربح مشاركة";
      case "wheel_earning": return "ربح عجلة";
      case "team_earning": return "ربح فريق";
      default: return type;
    }
  };

  const getPaymentGatewayLabel = (gateway: string | null) => {
    switch (gateway) {
      case "vodafone": return "فودافون كاش";
      case "etisalat": return "اتصالات كاش";
      case "orange": return "اورنج كاش";
      case "we": return "وي باي";
      default: return gateway || "-";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="w-4 h-4 text-emerald" />;
      case "rejected": return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-vip-gold" />;
    }
  };

  const getTypeIcon = (type: string) => {
    if (type === "deposit" || type.includes("earning")) {
      return <ArrowDownCircle className="w-4 h-4 text-emerald" />;
    }
    return <ArrowUpCircle className="w-4 h-4 text-destructive" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input placeholder="البحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TransactionStatus | "all")}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="pending">معلقة</SelectItem>
            <SelectItem value="approved">مقبولة</SelectItem>
            <SelectItem value="rejected">مرفوضة</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "deposit" | "withdrawal" | "all")}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="النوع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="deposit">إيداع</SelectItem>
            <SelectItem value="withdrawal">سحب</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filteredTransactions.map((transaction, index) => (
          <motion.div key={transaction.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getTypeIcon(transaction.type)}
                  <span className="font-bold">{getTypeLabel(transaction.type)}</span>
                  {getStatusIcon(transaction.status)}
                </div>
                <div className="text-2xl font-bold text-primary">{transaction.amount} ج</div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center gap-1"><User className="w-3 h-3" />{transaction.user_profile?.full_name || "غير معروف"}</p>
                  {transaction.user_profile?.email && <p className="flex items-center gap-1"><Mail className="w-3 h-3" />{transaction.user_profile.email}</p>}
                  {transaction.payment_gateway && <p className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{getPaymentGatewayLabel(transaction.payment_gateway)} - {transaction.phone_number}</p>}
                  <p className="text-xs">رقم العملية: {transaction.id.slice(0, 8)}</p>
                </div>
              </div>
              {transaction.status === "pending" && (
                <div className="flex flex-col gap-2">
                  <Button size="sm" className="bg-emerald hover:bg-emerald/90" onClick={() => handleUpdateStatus(transaction.id, "approved")}><CheckCircle className="w-4 h-4 ml-1" />قبول</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(transaction.id, "rejected")}><XCircle className="w-4 h-4 ml-1" />رفض</Button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {filteredTransactions.length === 0 && <div className="text-center py-12 text-muted-foreground">لا يوجد معاملات</div>}
      </div>
    </div>
  );
};

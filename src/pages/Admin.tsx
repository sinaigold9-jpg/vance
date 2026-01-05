import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Users, DollarSign, Package, 
  ArrowUpDown, Clock, RefreshCw, FileUp, HeadphonesIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { AdminTransactionsTab } from "@/components/admin/AdminTransactionsTab";
import { AdminPackagesTab } from "@/components/admin/AdminPackagesTab";
import { AdminActivityTab } from "@/components/admin/AdminActivityTab";
import { AdminUpgradeRequestsTab } from "@/components/admin/AdminUpgradeRequestsTab";
import { AdminSupportTab } from "@/components/admin/AdminSupportTab";

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("users");
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingTransactions: 0,
  });

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/");
      toast.error("ليس لديك صلاحية الوصول لهذه الصفحة");
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  const fetchStats = async () => {
    try {
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { data: deposits } = await supabase
        .from("transactions")
        .select("amount")
        .eq("type", "deposit")
        .eq("status", "approved");

      const { data: withdrawals } = await supabase
        .from("transactions")
        .select("amount")
        .eq("type", "withdrawal")
        .eq("status", "approved");

      const { count: pendingCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      setStats({
        totalUsers: usersCount || 0,
        totalDeposits: deposits?.reduce((sum, t) => sum + Number(t.amount), 0) || 0,
        totalWithdrawals: withdrawals?.reduce((sum, t) => sum + Number(t.amount), 0) || 0,
        pendingTransactions: pendingCount || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <BackButton to="/" label="العودة للتطبيق" />
            <h1 className="text-xl font-bold">لوحة التحكم</h1>
            <Button variant="outline" size="icon" onClick={fetchStats}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">المستخدمين</p>
                <p className="text-xl font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الإيداعات</p>
                <p className="text-xl font-bold">{stats.totalDeposits} ج</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <ArrowUpDown className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">السحوبات</p>
                <p className="text-xl font-bold">{stats.totalWithdrawals} ج</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-vip-gold/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-vip-gold" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">معلقة</p>
                <p className="text-xl font-bold">{stats.pendingTransactions}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex-wrap h-auto gap-2 bg-muted/50 p-2 rounded-xl">
            <TabsTrigger value="users" className="flex-1 min-w-[80px]">
              <Users className="w-4 h-4 ml-1" />
              المستخدمين
            </TabsTrigger>
            <TabsTrigger value="upgrades" className="flex-1 min-w-[80px]">
              <FileUp className="w-4 h-4 ml-1" />
              الترقيات
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex-1 min-w-[80px]">
              <DollarSign className="w-4 h-4 ml-1" />
              المعاملات
            </TabsTrigger>
            <TabsTrigger value="packages" className="flex-1 min-w-[80px]">
              <Package className="w-4 h-4 ml-1" />
              الباقات
            </TabsTrigger>
            <TabsTrigger value="support" className="flex-1 min-w-[80px]">
              <HeadphonesIcon className="w-4 h-4 ml-1" />
              الدعم
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 min-w-[80px]">
              <Clock className="w-4 h-4 ml-1" />
              النشاطات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <AdminUsersTab />
          </TabsContent>

          <TabsContent value="upgrades" className="mt-6">
            <AdminUpgradeRequestsTab />
          </TabsContent>

          <TabsContent value="transactions" className="mt-6">
            <AdminTransactionsTab />
          </TabsContent>

          <TabsContent value="packages" className="mt-6">
            <AdminPackagesTab />
          </TabsContent>

          <TabsContent value="support" className="mt-6">
            <AdminSupportTab />
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <AdminActivityTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;

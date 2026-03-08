import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Users, DollarSign, Package, 
  ArrowUpDown, Clock, RefreshCw, FileUp, HeadphonesIcon, Bot, Settings, Power, MessageCircle,
  Megaphone, Bell, Gift, Key, Edit, Mail, Shield
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
import { AdminBotSettingsTab } from "@/components/admin/AdminBotSettingsTab";
import { AdminAppSettingsTab } from "@/components/admin/AdminAppSettingsTab";
import { AdminChatTab } from "@/components/admin/AdminChatTab";
import { AdminAdsTab } from "@/components/admin/AdminAdsTab";
import { AdminNotificationsTab } from "@/components/admin/AdminNotificationsTab";
import { AdminPromotionsTab } from "@/components/admin/AdminPromotionsTab";
import { AdminExportTab } from "@/components/admin/AdminExportTab";
import { AdminChangeRequestsTab } from "@/components/admin/AdminChangeRequestsTab";
import { AdminEmailTab } from "@/components/admin/AdminEmailTab";
import { AdminOffersContestsTab } from "@/components/admin/AdminOffersContestsTab";
import { AdminInternalLinksTab } from "@/components/admin/AdminInternalLinksTab";
import { AdminStaffTab } from "@/components/admin/AdminStaffTab";

// All admin tabs definition
const ALL_TABS = [
  { key: "users", label: "المستخدمين", icon: Users },
  { key: "upgrades", label: "الترقيات", icon: FileUp },
  { key: "transactions", label: "المعاملات", icon: DollarSign },
  { key: "packages", label: "الباقات", icon: Package },
  { key: "ads", label: "الإعلانات", icon: Megaphone },
  { key: "notifications", label: "الإشعارات", icon: Bell },
  { key: "promotions", label: "العروض", icon: Gift },
  { key: "support", label: "الدعم", icon: HeadphonesIcon },
  { key: "chat", label: "المحادثات", icon: MessageCircle },
  { key: "bot", label: "البوت", icon: Bot },
  { key: "app-settings", label: "التحكم", icon: Power },
  { key: "activity", label: "النشاطات", icon: Clock },
  { key: "export", label: "التصدير", icon: Key },
  { key: "change-requests", label: "طلبات التعديل", icon: Edit },
  { key: "email-management", label: "البريد", icon: Mail },
  { key: "offers-contests", label: "العروض والمسابقات", icon: Gift },
  { key: "internal-links", label: "الروابط", icon: Key },
  { key: "staff", label: "الموظفين", icon: Shield },
];

const TAB_COMPONENTS: Record<string, React.ComponentType> = {
  users: AdminUsersTab,
  upgrades: AdminUpgradeRequestsTab,
  transactions: AdminTransactionsTab,
  packages: AdminPackagesTab,
  ads: AdminAdsTab,
  notifications: AdminNotificationsTab,
  promotions: AdminPromotionsTab,
  support: AdminSupportTab,
  chat: AdminChatTab,
  bot: AdminBotSettingsTab,
  "app-settings": AdminAppSettingsTab,
  activity: AdminActivityTab,
  export: AdminExportTab,
  "change-requests": AdminChangeRequestsTab,
  "email-management": AdminEmailTab,
  "offers-contests": AdminOffersContestsTab,
  "internal-links": AdminInternalLinksTab,
  staff: AdminStaffTab,
};

const Admin = () => {
  const { user, isAdmin, isStaff, staffPermissions, staffRole, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingTransactions: 0,
  });

  // Determine which tabs to show
  const visibleTabs = isAdmin
    ? ALL_TABS // Admin sees everything
    : ALL_TABS.filter(tab => staffPermissions.includes(tab.key)); // Staff sees only permitted tabs

  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    if (visibleTabs.length > 0 && !activeTab) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [visibleTabs, activeTab]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
      toast.error("يرجى تسجيل الدخول أولاً");
      return;
    }
    if (!loading && user && !isAdmin && !isStaff) {
      navigate("/");
      toast.error("ليس لديك صلاحية الوصول لهذه الصفحة");
    }
  }, [user, isAdmin, isStaff, loading, navigate]);

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

  if (!isAdmin && !isStaff) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <BackButton to="/" label="العودة للتطبيق" />
            <div className="text-center">
              <h1 className="text-xl font-bold">لوحة التحكم</h1>
              {isStaff && !isAdmin && (
                <p className="text-xs text-muted-foreground">{staffRole}</p>
              )}
            </div>
            {isAdmin && (
              <Button variant="outline" size="icon" onClick={fetchStats}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
            {!isAdmin && <div className="w-10" />}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards - Only for admin */}
        {isAdmin && (
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
        )}

        {/* Tabs */}
        {visibleTabs.length > 0 && activeTab && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full flex-wrap h-auto gap-2 bg-muted/50 p-2 rounded-xl">
              {visibleTabs.map(tab => (
                <TabsTrigger key={tab.key} value={tab.key} className="flex-1 min-w-[80px]">
                  <tab.icon className="w-4 h-4 ml-1" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {visibleTabs.map(tab => {
              const Component = TAB_COMPONENTS[tab.key];
              return Component ? (
                <TabsContent key={tab.key} value={tab.key} className="mt-6">
                  <Component />
                </TabsContent>
              ) : null;
            })}
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Admin;

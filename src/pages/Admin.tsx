import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Users, DollarSign, Package, 
  ArrowUpDown, Clock, RefreshCw, FileUp, HeadphonesIcon, Bot, Power, MessageCircle,
  Bell, Gift, Key, Edit, Mail, Shield, Rocket, Bug, Stethoscope, Search, PanelLeft
} from "lucide-react";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";
import SEO from "@/components/SEO";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { AdminTransactionsTab } from "@/components/admin/AdminTransactionsTab";
import { AdminPackagesTab } from "@/components/admin/AdminPackagesTab";
import { AdminActivityTab } from "@/components/admin/AdminActivityTab";
import { AdminUpgradeRequestsTab } from "@/components/admin/AdminUpgradeRequestsTab";
import { AdminSupportTab } from "@/components/admin/AdminSupportTab";
import { AdminBotSettingsTab } from "@/components/admin/AdminBotSettingsTab";
import { AdminAppSettingsTab } from "@/components/admin/AdminAppSettingsTab";
import { AdminChatTab } from "@/components/admin/AdminChatTab";
import { AdminNotificationsTab } from "@/components/admin/AdminNotificationsTab";
import { AdminPromotionsTab } from "@/components/admin/AdminPromotionsTab";
import { AdminExportTab } from "@/components/admin/AdminExportTab";
import { AdminChangeRequestsTab } from "@/components/admin/AdminChangeRequestsTab";
import { AdminEmailTab } from "@/components/admin/AdminEmailTab";
import { AdminOffersContestsTab } from "@/components/admin/AdminOffersContestsTab";
import { AdminInternalLinksTab } from "@/components/admin/AdminInternalLinksTab";
import { AdminStaffTab } from "@/components/admin/AdminStaffTab";
import { AdminVersionsTab } from "@/components/admin/AdminVersionsTab";
import { AdminVerificationsTab } from "@/components/admin/AdminVerificationsTab";
import { AdminContestsTab } from "@/components/admin/AdminContestsTab";
import { AdminUpdatesTab } from "@/components/admin/AdminUpdatesTab";
import { AdminDiscountCodesTab } from "@/components/admin/AdminDiscountCodesTab";
import { AdminExternalMessagesTab } from "@/components/admin/AdminExternalMessagesTab";
import { AdminNotificationDiagnosticsTab } from "@/components/admin/AdminNotificationDiagnosticsTab";
import { AdminAppIssuesTab } from "@/components/admin/AdminAppIssuesTab";
import { AdminGamesTab } from "@/components/admin/AdminGamesTab";
import { AdminBadgesTab } from "@/components/admin/AdminBadgesTab";
import { AdminAboutUsTab } from "@/components/admin/AdminAboutUsTab";
import { AdminCashbackTab } from "@/components/admin/AdminCashbackTab";
import { Sparkles } from "lucide-react";
import { Tag, Send, Gamepad2, Award, Info, Coins } from "lucide-react";

// All admin tabs definition
const ALL_TABS = [
  { key: "users", label: "المستخدمين", icon: Users },
  { key: "upgrades", label: "الترقيات", icon: FileUp },
  { key: "transactions", label: "المعاملات", icon: DollarSign },
  { key: "packages", label: "الباقات", icon: Package },
  { key: "notifications", label: "الإشعارات", icon: Bell },
  { key: "notification-diagnostics", label: "تشخيص الإشعارات", icon: Stethoscope },
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
  { key: "versions", label: "الإصدارات", icon: Rocket },
  { key: "verifications", label: "توثيق الحسابات", icon: Shield },
  { key: "contests", label: "المسابقات", icon: Trophy },
  { key: "updates", label: "التحديثات", icon: Sparkles },
  { key: "discount-codes", label: "أكواد الخصم", icon: Tag },
  { key: "cashback", label: "الكاش باك", icon: Coins },
  { key: "external-messages", label: "الرسائل الخارجية", icon: Send },
  { key: "app-issues", label: "الأخطاء والثغرات", icon: Bug },
  { key: "games", label: "الألعاب", icon: Gamepad2 },
  { key: "badges", label: "الأوسمة", icon: Award },
  { key: "about-us", label: "عنا", icon: Info },
];

const TAB_COMPONENTS: Record<string, React.ComponentType> = {
  users: AdminUsersTab,
  upgrades: AdminUpgradeRequestsTab,
  transactions: AdminTransactionsTab,
  packages: AdminPackagesTab,
  notifications: AdminNotificationsTab,
  "notification-diagnostics": AdminNotificationDiagnosticsTab,
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
  versions: AdminVersionsTab,
  verifications: AdminVerificationsTab,
  contests: AdminContestsTab,
  updates: AdminUpdatesTab,
  "discount-codes": AdminDiscountCodesTab,
  cashback: AdminCashbackTab,
  "external-messages": AdminExternalMessagesTab,
  "app-issues": AdminAppIssuesTab,
  games: AdminGamesTab,
  badges: AdminBadgesTab,
  "about-us": AdminAboutUsTab,
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
  const [search, setSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const filteredTabs = useMemo(() => {
    const q = search.trim();
    if (!q) return visibleTabs;
    return visibleTabs.filter(t => t.label.includes(q) || t.key.includes(q.toLowerCase()));
  }, [search, visibleTabs]);

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

  const ActiveComponent = activeTab ? TAB_COMPONENTS[activeTab] : null;
  const activeMeta = visibleTabs.find(t => t.key === activeTab);

  const NavList = () => (
    <div className="space-y-1">
      {filteredTabs.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">لا توجد نتائج</p>
      )}
      {filteredTabs.map(tab => {
        const active = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setMobileNavOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-right ${
              active
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "hover:bg-muted text-foreground/80"
            }`}
          >
            <tab.icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );

  const SearchBox = () => (
    <div className="relative">
      <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="بحث سريع في الأقسام..."
        className="pr-9"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO title="لوحة التحكم" path="/admin" noIndex />
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BackButton to="/" label="العودة للتطبيق" />
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileNavOpen(true)}
              >
                <PanelLeft className="w-4 h-4" />
              </Button>
            </div>
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

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6 items-start">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-24 bg-card border border-border rounded-2xl p-3 gap-3">
          {SearchBox()}
          <ScrollArea className="h-[calc(100vh-14rem)] pl-1">
            {NavList()}
          </ScrollArea>
        </aside>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="right" className="w-72 p-4 flex flex-col gap-3">
            <h2 className="font-bold text-lg">الأقسام</h2>
            {SearchBox()}
            <ScrollArea className="flex-1 -mx-1 px-1">
              {NavList()}
            </ScrollArea>
          </SheetContent>
        </Sheet>

        <main className="flex-1 min-w-0">
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

        {/* Active section */}
        {ActiveComponent && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-4 py-3">
              {activeMeta && <activeMeta.icon className="w-5 h-5 text-primary" />}
              <h2 className="font-bold">{activeMeta?.label}</h2>
            </div>
            <ActiveComponent />
          </div>
        )}
        </main>
      </div>
    </div>
  );
};

export default Admin;

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Bell, Send, Search, MessageSquare, 
  Megaphone, DollarSign, Filter, Mail, Sparkles, PartyPopper, Save
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  link?: string | null;
  profiles?: { full_name: string; membership_id: string };
}

export const AdminNotificationsTab = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string; membership_id: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // Send notification form
  const [sendTab, setSendTab] = useState<"offers" | "messages">("offers");
  const [targetType, setTargetType] = useState<"all" | "single">("all");
  const [targetUser, setTargetUser] = useState("");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifLink, setNotifLink] = useState("");
  const [notifType, setNotifType] = useState("general");
  const [isSending, setIsSending] = useState(false);

  // Welcome message settings
  const [welcomeTitle, setWelcomeTitle] = useState("");
  const [welcomeBody, setWelcomeBody] = useState("");
  const [isSavingWelcome, setIsSavingWelcome] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
    fetchWelcomeSettings();
  }, [typeFilter]);

  const fetchWelcomeSettings = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["welcome_message_title", "welcome_message_body"]);
    
    if (data) {
      setWelcomeTitle(data.find(s => s.key === "welcome_message_title")?.value || "");
      setWelcomeBody(data.find(s => s.key === "welcome_message_body")?.value || "");
    }
  };

  const handleSaveWelcome = async () => {
    setIsSavingWelcome(true);
    try {
      await supabase.from("app_settings").update({ value: welcomeTitle }).eq("key", "welcome_message_title");
      await supabase.from("app_settings").update({ value: welcomeBody }).eq("key", "welcome_message_body");
      toast.success("تم حفظ رسالة الترحيب بنجاح");
    } catch {
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setIsSavingWelcome(false);
    }
  };

  const fetchNotifications = async () => {
    setIsLoading(true);
    let query = supabase
      .from("notifications")
      .select(`
        *,
        profiles:user_id (full_name, membership_id)
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (typeFilter !== "all") {
      query = query.eq("type", typeFilter);
    }

    const { data } = await query;
    if (data) setNotifications(data as any);
    setIsLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, membership_id")
      .order("full_name");
    
    if (data) setUsers(data);
  };

  const handleSendNotification = async () => {
    if (!notifTitle || !notifMessage) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }

    // For private messages, must select a user
    if (sendTab === "messages" && !targetUser) {
      toast.error("يرجى اختيار المستخدم لإرسال رسالة خاصة");
      return;
    }

    if (sendTab === "offers" && targetType === "single" && !targetUser) {
      toast.error("يرجى اختيار المستخدم");
      return;
    }

    setIsSending(true);

    const finalType = sendTab === "messages" ? "private_message" : notifType;

    try {
      if (sendTab === "messages") {
        // Always single user for private messages
        const { error } = await supabase.from("notifications").insert({
          user_id: targetUser,
          title: notifTitle,
          message: notifMessage,
          type: finalType,
          link: notifLink || null
        });

        if (error) throw error;

        supabase.functions.invoke("send-push", {
          body: { user_id: targetUser, title: notifTitle, message: notifMessage, link: notifLink || "/app" }
        }).catch(() => {});

        toast.success("تم إرسال الرسالة الخاصة");
      } else if (targetType === "all") {
        const notifications = users.map(user => ({
          user_id: user.id,
          title: notifTitle,
          message: notifMessage,
          type: finalType,
          link: notifLink || null
        }));

        const { error } = await supabase.from("notifications").insert(notifications);
        if (error) throw error;

        for (const u of users) {
          supabase.functions.invoke("send-push", {
            body: { user_id: u.id, title: notifTitle, message: notifMessage, link: notifLink || "/app" }
          }).catch(() => {});
        }

        toast.success(`تم إرسال الإشعار إلى ${users.length} مستخدم`);
      } else {
        const { error } = await supabase.from("notifications").insert({
          user_id: targetUser,
          title: notifTitle,
          message: notifMessage,
          type: finalType,
          link: notifLink || null
        });

        if (error) throw error;

        supabase.functions.invoke("send-push", {
          body: { user_id: targetUser, title: notifTitle, message: notifMessage, link: notifLink || "/app" }
        }).catch(() => {});

        toast.success("تم إرسال الإشعار");
      }

      setNotifTitle("");
      setNotifMessage("");
      setNotifLink("");
      setTargetUser("");
      fetchNotifications();
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ");
    } finally {
      setIsSending(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "private_message":
        return <Mail className="w-4 h-4 text-blue-500" />;
      case "chat":
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case "ad_interaction":
      case "ad_click":
      case "ad_approved":
      case "ad_rejected":
        return <Megaphone className="w-4 h-4 text-amber-500" />;
      case "transaction":
        return <DollarSign className="w-4 h-4 text-green-500" />;
      case "offer":
      case "update":
        return <Sparkles className="w-4 h-4 text-primary" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      general: "عام",
      private_message: "رسالة خاصة",
      chat: "محادثة",
      offer: "عرض",
      marketing: "تسويق",
      gift: "هدية",
      game: "لعبة",
      update: "تحديث",
      ad_interaction: "تفاعل إعلان",
      ad_click: "نقرة إعلان",
      ad_approved: "موافقة إعلان",
      ad_rejected: "رفض إعلان",
      transaction: "معاملة"
    };
    return <Badge variant="outline" className="text-xs">{labels[type] || type}</Badge>;
  };

  const filteredNotifications = notifications.filter(n =>
    n.title.includes(searchQuery) ||
    n.message.includes(searchQuery) ||
    n.profiles?.full_name.includes(searchQuery) ||
    n.profiles?.membership_id?.includes(searchQuery)
  );

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.is_read).length,
    privateMessages: notifications.filter(n => n.type === "private_message").length,
    today: notifications.filter(n => 
      new Date(n.created_at).toDateString() === new Date().toDateString()
    ).length
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">إجمالي الإشعارات</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{stats.unread}</p>
            <p className="text-xs text-muted-foreground">غير مقروءة</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.privateMessages}</p>
            <p className="text-xs text-muted-foreground">رسائل واردة</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-accent">{stats.today}</p>
            <p className="text-xs text-muted-foreground">اليوم</p>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Message Settings */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <PartyPopper className="w-5 h-5" />
            رسالة الترحيب للمستخدمين الجدد
          </CardTitle>
          <p className="text-xs text-muted-foreground">تظهر تلقائياً في قسم الرسائل الخاصة عند إنشاء حساب جديد</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>عنوان رسالة الترحيب</Label>
            <Input
              value={welcomeTitle}
              onChange={e => setWelcomeTitle(e.target.value)}
              placeholder="مرحباً بك في Advance! 🎉"
            />
          </div>
          <div>
            <Label>نص رسالة الترحيب</Label>
            <Textarea
              value={welcomeBody}
              onChange={e => setWelcomeBody(e.target.value)}
              placeholder="أهلاً وسهلاً بك! نتمنى لك تجربة ممتعة..."
              rows={3}
            />
          </div>
          <Button
            onClick={handleSaveWelcome}
            disabled={isSavingWelcome}
            className="gap-2"
            variant="outline"
          >
            <Save className="w-4 h-4" />
            حفظ رسالة الترحيب
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Send Notification Form */}
        <Card className="border-border/50 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Send className="w-5 h-5" />
              إرسال إشعار
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Send Type Tabs */}
            <Tabs value={sendTab} onValueChange={(v) => setSendTab(v as "offers" | "messages")}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="offers" className="gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  عروض وتحديثات
                </TabsTrigger>
                <TabsTrigger value="messages" className="gap-1.5 text-xs">
                  <Mail className="w-3.5 h-3.5" />
                  رسالة خاصة
                </TabsTrigger>
              </TabsList>

              <TabsContent value="offers" className="space-y-4 mt-4">
                <div>
                  <Label>إرسال إلى</Label>
                  <Select value={targetType} onValueChange={(v: "all" | "single") => setTargetType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المستخدمين</SelectItem>
                      <SelectItem value="single">مستخدم محدد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {targetType === "single" && (
                  <div>
                    <Label>اختر المستخدم</Label>
                    <Select value={targetUser} onValueChange={setTargetUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المستخدم" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} ({user.membership_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>نوع الإشعار</Label>
                  <Select value={notifType} onValueChange={setNotifType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">عام</SelectItem>
                      <SelectItem value="offer">عرض خاص</SelectItem>
                      <SelectItem value="update">تحديث / تطوير</SelectItem>
                      <SelectItem value="transaction">معاملة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="messages" className="space-y-4 mt-4">
                <div>
                  <Label>اختر المستخدم</Label>
                  <Select value={targetUser} onValueChange={setTargetUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المستخدم" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name} ({user.membership_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>

            <div>
              <Label>العنوان</Label>
              <Input
                value={notifTitle}
                onChange={e => setNotifTitle(e.target.value)}
                placeholder={sendTab === "messages" ? "عنوان الرسالة" : "عنوان الإشعار"}
              />
            </div>

            <div>
              <Label>{sendTab === "messages" ? "نص الرسالة" : "الرسالة"}</Label>
              <Textarea
                value={notifMessage}
                onChange={e => setNotifMessage(e.target.value)}
                placeholder={sendTab === "messages" ? "اكتب رسالتك الخاصة هنا..." : "نص الإشعار"}
                rows={3}
              />
            </div>

            <div>
              <Label>الرابط (اختياري)</Label>
              <Input
                value={notifLink}
                onChange={e => setNotifLink(e.target.value)}
                placeholder="/app/wallet أو https://example.com"
              />
            </div>

            <Button
              onClick={handleSendNotification}
              disabled={isSending}
              className="w-full gap-2 bg-gradient-gold text-primary-foreground"
            >
              {sendTab === "messages" ? <Mail className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {sendTab === "messages" 
                ? "إرسال رسالة خاصة" 
                : targetType === "all" 
                  ? `إرسال للجميع (${users.length})` 
                  : "إرسال"
              }
            </Button>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5" />
              سجل الإشعارات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="بحث..."
                  className="pr-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-44">
                  <Filter className="w-4 h-4 ml-2" />
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="general">عام</SelectItem>
                  <SelectItem value="private_message">رسائل واردة</SelectItem>
                  <SelectItem value="offer">عروض خاصة</SelectItem>
                  <SelectItem value="update">تحديثات</SelectItem>
                  <SelectItem value="chat">محادثة</SelectItem>
                  <SelectItem value="ad_interaction">تفاعل إعلان</SelectItem>
                  <SelectItem value="transaction">معاملة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-secondary/30 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredNotifications.length > 0 ? (
                <div className="space-y-3">
                  {filteredNotifications.map(notification => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-4 rounded-xl border ${
                        notification.is_read 
                          ? 'bg-secondary/20 border-border/50' 
                          : 'bg-primary/5 border-primary/20'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="mt-1">
                          {getTypeIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-medium text-sm">{notification.title}</p>
                            {getTypeBadge(notification.type)}
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-primary rounded-full" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>{notification.profiles?.full_name}</span>
                            <span>•</span>
                            <span>{format(new Date(notification.created_at), "dd MMM HH:mm", { locale: ar })}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">لا توجد إشعارات</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

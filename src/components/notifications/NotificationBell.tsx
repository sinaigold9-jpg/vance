import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, MessageSquare, Megaphone, DollarSign, Check, Mail, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_id: string | null;
  link: string | null;
}

type TabType = "offers" | "messages";

const OFFER_TYPES = ["general", "ad_interaction", "ad_click", "ad_approved", "ad_rejected", "transaction", "offer", "update"];
const MESSAGE_TYPES = ["private_message", "chat"];

export const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("offers");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      const channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            setNotifications(prev => [payload.new as Notification, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);

      // Send welcome message for new users (no notifications yet)
      if (data.length === 0) {
        sendWelcomeMessage();
      }
    }
  };

  const sendWelcomeMessage = async () => {
    if (!user) return;
    try {
      // Fetch welcome message settings
      const { data: settings } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["welcome_message_title", "welcome_message_body"]);

      const title = settings?.find(s => s.key === "welcome_message_title")?.value || "مرحباً بك في Advance! 🎉";
      const body = settings?.find(s => s.key === "welcome_message_body")?.value || "أهلاً وسهلاً بك! نتمنى لك تجربة ممتعة ومربحة.";

      const { data: inserted } = await supabase.from("notifications").insert({
        user_id: user.id,
        title,
        message: body,
        type: "private_message",
        is_read: false
      }).select().single();

      if (inserted) {
        setNotifications([inserted]);
        setUnreadCount(1);
      }
    } catch {}
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "private_message":
      case "chat":
        return <Mail className="w-4 h-4 text-blue-500" />;
      case "ad_interaction":
      case "ad_click":
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

  const isMessageType = (type: string) => MESSAGE_TYPES.includes(type);

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === "messages") return isMessageType(n.type);
    return !isMessageType(n.type);
  });

  const offersUnread = notifications.filter(n => !n.is_read && !isMessageType(n.type)).length;
  const messagesUnread = notifications.filter(n => !n.is_read && isMessageType(n.type)).length;

  if (!user) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-destructive text-white text-xs w-5 h-5 rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute left-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-border">
                <h3 className="font-bold text-sm">الإشعارات</h3>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs gap-1 h-7"
                  >
                    <Check className="w-3 h-3" />
                    قراءة الكل
                  </Button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border">
                <button
                  onClick={() => setActiveTab("offers")}
                  className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors relative flex items-center justify-center gap-1.5 ${
                    activeTab === "offers"
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  العروض والتحديثات
                  {offersUnread > 0 && (
                    <span className="bg-destructive text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                      {offersUnread > 9 ? "9+" : offersUnread}
                    </span>
                  )}
                  {activeTab === "offers" && (
                    <motion.div layoutId="notif-tab" className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("messages")}
                  className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors relative flex items-center justify-center gap-1.5 ${
                    activeTab === "messages"
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  رسائل خاصة
                  {messagesUnread > 0 && (
                    <span className="bg-destructive text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                      {messagesUnread > 9 ? "9+" : messagesUnread}
                    </span>
                  )}
                  {activeTab === "messages" && (
                    <motion.div layoutId="notif-tab" className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              </div>

              {/* Content */}
              <ScrollArea className="max-h-80">
                {filteredNotifications.length > 0 ? (
                  <div className="divide-y divide-border">
                    {filteredNotifications.map(notification => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`p-3 hover:bg-secondary/50 transition-colors cursor-pointer ${
                          !notification.is_read ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => {
                          markAsRead(notification.id);
                          if (notification.link) {
                            setIsOpen(false);
                            if (notification.link.startsWith('http')) {
                              window.open(notification.link, '_blank');
                            } else {
                              navigate(notification.link);
                            }
                          }
                        }}
                      >
                        <div className="flex gap-3">
                          <div className="mt-1">
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-1">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1.5">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                                locale: ar
                              })}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    {activeTab === "offers" ? (
                      <>
                        <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>لا توجد عروض أو تحديثات</p>
                      </>
                    ) : (
                      <>
                        <Mail className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>لا توجد رسائل خاصة</p>
                      </>
                    )}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

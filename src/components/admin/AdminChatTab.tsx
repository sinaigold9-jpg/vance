import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, Send, Loader2, User, Headphones,
  CheckCheck, Search, Users, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatUser {
  id: string;
  full_name: string;
  email: string | null;
  membership_id: string | null;
  unread_count: number;
  last_message: string;
  last_message_time: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  is_from_admin: boolean;
  is_read: boolean;
  created_at: string;
}

export const AdminChatTab = () => {
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChatUsers();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('admin-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => {
          fetchChatUsers();
          if (selectedUser) {
            fetchMessages(selectedUser.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id);
      markMessagesAsRead(selectedUser.id);
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const fetchChatUsers = async () => {
    setIsLoading(true);
    
    // Get all users who have sent messages
    const { data: messagesData } = await supabase
      .from("chat_messages")
      .select("user_id, message, created_at, is_read, is_from_admin")
      .order("created_at", { ascending: false });

    if (!messagesData) {
      setIsLoading(false);
      return;
    }

    // Group by user and get latest message + unread count
    const userMap = new Map<string, { lastMsg: string; lastTime: string; unread: number }>();
    
    messagesData.forEach((msg) => {
      const existing = userMap.get(msg.user_id);
      if (!existing) {
        userMap.set(msg.user_id, {
          lastMsg: msg.message,
          lastTime: msg.created_at,
          unread: !msg.is_from_admin && !msg.is_read ? 1 : 0,
        });
      } else if (!msg.is_from_admin && !msg.is_read) {
        existing.unread++;
      }
    });

    // Get user profiles
    const userIds = Array.from(userMap.keys());
    if (userIds.length === 0) {
      setChatUsers([]);
      setIsLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, membership_id")
      .in("id", userIds);

    if (profiles) {
      const chatUsersList: ChatUser[] = profiles.map((p) => {
        const msgData = userMap.get(p.id);
        return {
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          membership_id: p.membership_id,
          unread_count: msgData?.unread || 0,
          last_message: msgData?.lastMsg || "",
          last_message_time: msgData?.lastTime || "",
        };
      }).sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());

      setChatUsers(chatUsersList);
    }
    setIsLoading(false);
  };

  const fetchMessages = async (userId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const markMessagesAsRead = async (userId: string) => {
    await supabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_from_admin", false);
    
    fetchChatUsers();
  };

  const handleSendMessage = async () => {
    if (!selectedUser || !newMessage.trim()) return;
    
    setIsSending(true);
    
    try {
      const { error } = await supabase.from("chat_messages").insert({
        user_id: selectedUser.id,
        message: newMessage.trim(),
        is_from_admin: true,
      });

      if (error) throw error;
      
      setNewMessage("");
      fetchMessages(selectedUser.id);
      toast.success("تم إرسال الرسالة");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("حدث خطأ أثناء إرسال الرسالة");
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "اليوم";
    if (days === 1) return "أمس";
    return date.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
  };

  const filteredUsers = chatUsers.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.membership_id?.includes(searchQuery)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      {/* Users List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-bold">المحادثات</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchChatUsers}
              className="mr-auto"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 h-9"
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          {filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">لا توجد محادثات</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredUsers.map((chatUser) => (
                <motion.button
                  key={chatUser.id}
                  onClick={() => setSelectedUser(chatUser)}
                  className={`w-full p-3 rounded-lg text-right transition-colors ${
                    selectedUser?.id === chatUser.id
                      ? "bg-primary/20 border border-primary/50"
                      : "hover:bg-muted"
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm truncate">{chatUser.full_name}</span>
                        {chatUser.unread_count > 0 && (
                          <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                            {chatUser.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{chatUser.last_message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(chatUser.last_message_time)}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="md:col-span-2 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">{selectedUser.full_name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedUser.membership_id || selectedUser.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.is_from_admin ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-3 ${
                          msg.is_from_admin
                            ? "bg-gradient-gold text-primary-foreground rounded-tl-sm"
                            : "bg-secondary text-secondary-foreground rounded-tr-sm"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {msg.is_from_admin ? (
                            <img src="/ai-support-avatar.png" alt="AI" className="w-4 h-4 rounded-full object-cover" />
                          ) : (
                            <User className="w-3 h-3" />
                          )}
                          <span className="text-xs opacity-80">
                            {msg.is_from_admin ? "أنت" : selectedUser.full_name}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-xs opacity-60">{formatTime(msg.created_at)}</span>
                          {msg.is_from_admin && (
                            <CheckCheck className={`w-3 h-3 ${msg.is_read ? "text-emerald" : "opacity-60"}`} />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="اكتب ردك..."
                  className="flex-1"
                  disabled={isSending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="bg-gradient-gold text-primary-foreground px-4"
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>اختر محادثة للبدء</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

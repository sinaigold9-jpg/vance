import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, Send, Loader2, User, Headphones,
  CheckCheck, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  is_from_admin: boolean;
  is_read: boolean;
  created_at: string;
}

export const ChatSection = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchMessages();
      
      // Subscribe to realtime updates
      const channel = supabase
        .channel('chat-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newMsg = payload.new as ChatMessage;
            setMessages((prev) => [...prev, newMsg]);
            scrollToBottom();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const fetchMessages = async () => {
    if (!user) return;
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
    } else {
      setMessages(data || []);
    }
    setIsLoading(false);
  };

  const handleSendMessage = async () => {
    if (!user || !newMessage.trim()) return;
    
    setIsSending(true);
    
    try {
      const { error } = await supabase.from("chat_messages").insert({
        user_id: user.id,
        message: newMessage.trim(),
        is_from_admin: false,
      });

      if (error) throw error;
      
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("حدث خطأ أثناء إرسال الرسالة");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
  };

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-card rounded-2xl shadow-card border border-border/50 p-6 text-center"
      >
        <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">يرجى تسجيل الدخول للوصول للمحادثة</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-card rounded-2xl shadow-card border border-border/50 overflow-hidden flex flex-col h-[500px]"
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Headphones className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">محادثة الدعم</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
              متصل الآن
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">ابدأ محادثة جديدة مع خدمة العملاء</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {messages.map((msg, index) => {
                const showDate = index === 0 || 
                  formatDate(messages[index - 1].created_at) !== formatDate(msg.created_at);
                
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="text-center my-3">
                        <span className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">
                          {formatDate(msg.created_at)}
                        </span>
                      </div>
                    )}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.is_from_admin ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-3 ${
                          msg.is_from_admin
                            ? "bg-secondary text-secondary-foreground rounded-tr-sm"
                            : "bg-gradient-gold text-primary-foreground rounded-tl-sm"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {msg.is_from_admin ? (
                            <Headphones className="w-3 h-3" />
                          ) : (
                            <User className="w-3 h-3" />
                          )}
                          <span className="text-xs opacity-80">
                            {msg.is_from_admin ? "خدمة العملاء" : "أنت"}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-xs opacity-60">{formatTime(msg.created_at)}</span>
                          {!msg.is_from_admin && (
                            msg.is_read ? (
                              <CheckCheck className="w-3 h-3 text-emerald" />
                            ) : (
                              <Clock className="w-3 h-3 opacity-60" />
                            )
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </AnimatePresence>
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border/50 bg-card/50">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="اكتب رسالتك..."
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
    </motion.div>
  );
};

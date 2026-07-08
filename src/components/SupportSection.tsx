import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  HeadphonesIcon, User, Mail, Phone, IdCard, 
  MessageSquare, Star, Send, Loader2, CheckCircle2,
  MessageCircle, Sparkles, Bot, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChatSection } from "./ChatSection";

interface UserProfile {
  full_name: string;
  email: string | null;
  phone: string | null;
  membership_id: string | null;
  account_type: string;
}

export const SupportSection = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [ticketType, setTicketType] = useState<string>("");
  const [rating, setRating] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("ai");
  const [showTicketForm, setShowTicketForm] = useState(false);
  // AI chat state
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "أهلاً بك! أنا مساعد Advance. اسألني عن أي شيء يخص التطبيق (الباقات، السحب، المهام، الألعاب، ...)." },
  ]);
  const [suggestions, setSuggestions] = useState<Array<{ label: string; action: string }>>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const { user } = useAuth();

  const canAccessLiveChat = userProfile && ["vip1", "vip2", "vip3"].includes(userProfile.account_type);

  // Initial static suggestions shown before the first AI reply.
  const initialSuggestions: Array<{ label: string; action: string }> = [
    { label: "الباقات", action: "ask:ما الفرق بين الباقات؟" },
    { label: "المهام اليومية", action: "ask:متى تتجدد المهام اليومية؟" },
    { label: "الألعاب", action: "ask:ما الألعاب المتاحة في التطبيق؟" },
    { label: "السحب", action: "ask:كيف أسحب أرباحي؟" },
  ];

  const handleSuggestion = (action: string) => {
    if (action.startsWith("navigate:")) {
      const path = action.slice("navigate:".length);
      navigate(path);
      return;
    }
    if (action.startsWith("ask:")) {
      sendAi(action.slice("ask:".length));
      return;
    }
    if (action === "ticket") {
      setActiveTab("ticket");
      setShowTicketForm(true);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, phone, membership_id, account_type")
      .eq("id", user.id)
      .maybeSingle();
    if (data) {
      setUserProfile(data);
    }
  };

  const sendAi = async (override?: string) => {
    const text = (override ?? aiInput).trim();
    if (!text || aiLoading) return;
    const newMsgs = [...aiMessages, { role: "user" as const, content: text }];
    setAiMessages(newMsgs);
    setAiInput("");
    setAiLoading(true);
    setSuggestions([]);
    try {
      const { data, error } = await supabase.functions.invoke("support-ai-chat", {
        body: { messages: newMsgs.map(({ role, content }) => ({ role, content })) },
      });
      if (error) throw error;
      const reply = (data as { reply?: string; error?: string })?.reply
        || (data as { error?: string })?.error
        || "حدث خطأ.";
      const nextSuggestions = (data as { suggestions?: Array<{ label: string; action: string }> })?.suggestions || [];
      setAiMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setSuggestions(nextSuggestions);
    } catch (e: any) {
      setAiMessages((prev) => [...prev, { role: "assistant", content: "تعذر الاتصال بالخدمة. حاول لاحقاً أو اترك رسالة للدعم." }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !userProfile) {
      toast.error("يرجى تسجيل الدخول أولاً");
      return;
    }

    if (!ticketType) {
      toast.error("يرجى اختيار نوع الطلب");
      return;
    }

    if (ticketType === "rating" && rating === 0) {
      toast.error("يرجى اختيار عدد النجوم");
      return;
    }

    if (!message.trim()) {
      toast.error("يرجى كتابة رسالتك");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        full_name: userProfile.full_name,
        email: userProfile.email || "",
        phone: userProfile.phone || "",
        membership_id: userProfile.membership_id,
        ticket_type: ticketType,
        rating: ticketType === "rating" ? rating : null,
        message: message.trim(),
      });

      if (error) throw error;

      setSuccess(true);
      toast.success("تم إرسال رسالتك بنجاح");
    } catch (error) {
      console.error("Error submitting ticket:", error);
      toast.error("حدث خطأ أثناء إرسال الرسالة");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTicketType("");
    setRating(0);
    setMessage("");
    setSuccess(false);
  };

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-card rounded-2xl shadow-card border border-border/50 p-6 text-center"
      >
        <HeadphonesIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">يرجى تسجيل الدخول للوصول للدعم الفني</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="bg-gradient-card rounded-2xl shadow-card border border-border/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <HeadphonesIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">الدعم الفني</h2>
            <p className="text-muted-foreground text-sm">مساعد ذكي فوري + دعم بشري عند الحاجة</p>
          </div>
        </div>
      </div>

      {/* Tabs for Chat and Tickets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50">
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="w-4 h-4" />
            مساعد ذكي
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2" disabled={!canAccessLiveChat}>
            <MessageCircle className="w-4 h-4" />
            مباشر
            {!canAccessLiveChat && <span className="text-[10px] mr-1">VIP</span>}
          </TabsTrigger>
          <TabsTrigger value="ticket" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            رسالة للإدارة
          </TabsTrigger>
        </TabsList>

        {/* AI Assistant */}
        <TabsContent value="ai" className="mt-4">
          <div className="bg-gradient-card rounded-2xl shadow-card border border-border/50 p-3 flex flex-col h-[60vh] min-h-[420px]">
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {aiMessages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-primary/20 text-primary" : "bg-gradient-gold text-primary-foreground"}`}>
                    {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`rounded-2xl px-3.5 py-2.5 max-w-[80%] text-sm leading-relaxed whitespace-pre-line ${m.role === "user" ? "bg-primary/10 text-foreground" : "bg-muted/60 text-foreground"}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center"><Bot className="w-4 h-4 text-primary-foreground" /></div>
                  <div className="bg-muted/60 rounded-2xl px-4 py-2.5 text-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:120ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:240ms]" />
                  </div>
                </div>
              )}
            </div>
            {/* Dynamic suggestions from AI (or initial defaults) */}
            <div className="pt-3 flex flex-wrap gap-2">
              {(suggestions.length > 0 ? suggestions : initialSuggestions).map((s, i) => (
                <button
                  key={`${s.action}-${i}`}
                  onClick={() => handleSuggestion(s.action)}
                  disabled={aiLoading}
                  className="text-xs px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition disabled:opacity-50"
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="pt-3 mt-3 border-t border-border/40 flex gap-2">
              <Input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendAi(); }}
                placeholder="اكتب سؤالك هنا..."
                disabled={aiLoading}
                className="flex-1"
              />
              <Button onClick={() => sendAi()} disabled={aiLoading || !aiInput.trim()} className="bg-gradient-gold text-primary-foreground">
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <button
              onClick={() => setActiveTab("ticket")}
              className="mt-2 text-xs text-amber-300 hover:text-amber-200 self-center"
            >
              لم تجد ما تبحث عنه؟ اترك رسالة للدعم →
            </button>
          </div>
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          {canAccessLiveChat ? (
            <ChatSection />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-card rounded-2xl shadow-card border border-border/50 p-8 text-center"
            >
              <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-bold mb-2">الدعم المباشر لباقات VIP فقط</h3>
              <p className="text-sm text-muted-foreground mb-4">
                قم بترقية باقتك إلى أي باقة VIP للوصول إلى المحادثة المباشرة مع فريق الدعم
              </p>
              <Button
                className="bg-gradient-gold text-primary-foreground"
                onClick={() => {
                  const event = new CustomEvent("navigate-tab", { detail: "packages" });
                  window.dispatchEvent(event);
                }}
              >
                ترقية الباقة الآن
              </Button>
              <p className="text-xs text-muted-foreground mt-3">يمكنك استخدام "مساعد ذكي" أو "رسالة للإدارة" الآن</p>
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="ticket" className="mt-4 space-y-4">
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-card rounded-2xl shadow-card border border-border/50 p-8 text-center"
            >
              <CheckCircle2 className="w-16 h-16 text-emerald mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">تم الإرسال بنجاح 🎉</h3>
              <p className="text-muted-foreground mb-6">
                شكراً لتواصلك معنا، سنرد عليك في أقرب وقت ممكن
              </p>
              <Button onClick={resetForm} className="bg-gradient-gold text-primary-foreground">
                إرسال رسالة أخرى
              </Button>
            </motion.div>
          ) : !showTicketForm ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-card rounded-2xl shadow-card border border-border/50 p-8 text-center space-y-4"
            >
              <MessageSquare className="w-12 h-12 mx-auto text-amber-300" />
              <h3 className="text-lg font-bold">اترك رسالة للإدارة</h3>
              <p className="text-sm text-muted-foreground">
                جرب أولاً المساعد الذكي للحصول على إجابة فورية. إذا احتجت لمراسلة الإدارة بشأن مشكلة محددة، افتح النموذج بالأسفل.
              </p>
              <Button onClick={() => setShowTicketForm(true)} className="bg-gradient-gold text-primary-foreground">
                فتح نموذج الرسالة
              </Button>
            </motion.div>
          ) : (
            <>
              <button
                onClick={() => setShowTicketForm(false)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> رجوع
              </button>
              {/* User Info (Auto-filled) */}
              <div className="bg-gradient-card rounded-2xl shadow-card border border-border/50 p-4">
                <h4 className="font-bold text-sm text-muted-foreground mb-3">بياناتك المسجلة</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <span className="text-sm truncate">{userProfile?.full_name || "..."}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <span className="text-sm truncate">{userProfile?.email || "..."}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <span className="text-sm">{userProfile?.phone || "..."}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IdCard className="w-4 h-4 text-primary" />
                    <span className="text-sm">{userProfile?.membership_id || "..."}</span>
                  </div>
                </div>
              </div>

              {/* Ticket Form */}
              <div className="bg-gradient-card rounded-2xl shadow-card border border-border/50 p-4 space-y-4">
                {/* Ticket Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">نوع الطلب</label>
                  <Select value={ticketType} onValueChange={setTicketType}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الطلب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="complaint">شكوى</SelectItem>
                      <SelectItem value="inquiry">استفسار</SelectItem>
                      <SelectItem value="suggestion">اقتراح</SelectItem>
                      <SelectItem value="rating">تقييم التطبيق</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Rating Stars (only for rating type) */}
                {ticketType === "rating" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">تقييمك للتطبيق</label>
                    <div className="flex gap-2 justify-center py-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-8 h-8 ${
                              star <= rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">رسالتك</label>
                  <Textarea
                    placeholder="اكتب رسالتك هنا..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[120px] resize-none"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !ticketType || !message.trim()}
                  className="w-full h-12 bg-gradient-gold text-primary-foreground font-bold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin ml-2" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 ml-2" />
                      إرسال
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

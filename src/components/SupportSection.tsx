import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  HeadphonesIcon, User, Mail, Phone, IdCard, 
  MessageSquare, Star, Send, Loader2, CheckCircle2,
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [ticketType, setTicketType] = useState<string>("");
  const [rating, setRating] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("ticket");
  const { user } = useAuth();

  const canAccessLiveChat = userProfile && ["vip1", "vip2", "vip3"].includes(userProfile.account_type);

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
      if (["vip2", "vip3"].includes(data.account_type)) {
        setActiveTab("chat");
      }
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
            <p className="text-muted-foreground text-sm">نحن هنا لمساعدتك</p>
          </div>
        </div>
      </div>

      {/* Tabs for Chat and Tickets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50">
          <TabsTrigger value="chat" className="gap-2" disabled={!canAccessLiveChat}>
            <MessageCircle className="w-4 h-4" />
            المحادثة المباشرة
            {!canAccessLiveChat && <span className="text-[10px] mr-1">VIP2+</span>}
          </TabsTrigger>
          <TabsTrigger value="ticket" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            إرسال طلب
          </TabsTrigger>
        </TabsList>

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
              <h3 className="text-lg font-bold mb-2">الدعم المباشر لباقات VIP2 وأعلى</h3>
              <p className="text-sm text-muted-foreground mb-4">
                قم بترقية باقتك إلى VIP2 أو VIP3 للوصول إلى المحادثة المباشرة مع فريق الدعم
              </p>
              <p className="text-xs text-muted-foreground">يمكنك استخدام "إرسال طلب" للتواصل معنا الآن</p>
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
          ) : (
            <>
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

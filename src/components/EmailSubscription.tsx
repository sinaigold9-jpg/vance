import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Gift, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const EmailSubscription = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) checkSubscription();
  }, [user]);

  const checkSubscription = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("email_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (data) {
      setIsSubscribed(true);
      setEmail(data.email);
    }
    setLoading(false);
  };

  const handleSubscribe = async () => {
    if (!user || !email.trim()) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("email_subscriptions")
        .insert({ user_id: user.id, email: email.trim(), reward_claimed: true });

      if (error) {
        if (error.code === "23505") {
          toast.error("أنت مشترك بالفعل");
        } else {
          throw error;
        }
        return;
      }

      // Add 5 EGP reward
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", user.id)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ balance: profile.balance + 5 })
          .eq("id", user.id);
      }

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "مكافأة الاشتراك بالبريد الإلكتروني",
        amount: 5,
      });

      setIsSubscribed(true);
      toast.success("تم الاشتراك بنجاح! تم إضافة 5 ج.م لرصيدك 🎉");
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("حدث خطأ، يرجى المحاولة مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) return null;

  if (isSubscribed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary/10 border border-primary/30 rounded-2xl p-4 flex items-center gap-3"
      >
        <CheckCircle className="w-6 h-6 text-primary shrink-0" />
        <div>
          <p className="font-bold text-sm text-foreground">مشترك في العروض</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30 rounded-2xl p-5 space-y-3"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-sm">اشترك لتلقي العروض</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Gift className="w-3 h-3" />
            واحصل على 5 ج.م مكافأة فورية!
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="أدخل بريدك الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          dir="ltr"
          className="flex-1"
        />
        <Button onClick={handleSubscribe} disabled={submitting || !email.trim()} size="sm" className="shrink-0">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "اشترك"}
        </Button>
      </div>
    </motion.div>
  );
};

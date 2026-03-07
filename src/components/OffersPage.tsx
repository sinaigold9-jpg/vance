import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Trophy, Share2, Users, MessageCircle, Clock, CheckCircle2, Star, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "./BackButton";
import { PromotionBanner } from "./PromotionBanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface OfferContest {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  type: "offer" | "contest";
  reward_type: string;
  reward_amount: number;
  required_task: string;
  custom_task_description: string | null;
  display_location: string;
  is_active: boolean;
  max_participants: number | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  display_order: number;
}

interface Participation {
  id: string;
  offer_id: string;
  status: string;
  points_earned: number;
  balance_earned: number;
}

const TASK_LABELS: Record<string, { label: string; icon: typeof Share2 }> = {
  share_app: { label: "مشاركة التطبيق", icon: Share2 },
  invite_friends: { label: "دعوة أصدقاء", icon: Users },
  share_facebook: { label: "مشاركة على فيسبوك", icon: ExternalLink },
  share_telegram: { label: "مشاركة على تيليجرام", icon: MessageCircle },
  share_whatsapp: { label: "مشاركة على واتساب", icon: MessageCircle },
  custom: { label: "مهمة مخصصة", icon: Star },
};

export const OffersPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<OfferContest[]>([]);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "offers" | "contests">("all");
  const [loading, setLoading] = useState(true);
  const [countdowns, setCountdowns] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("offers-contests-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "offers_contests" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newCountdowns: Record<string, string> = {};
      items.forEach(item => {
        if (item.ends_at) {
          const diff = new Date(item.ends_at).getTime() - Date.now();
          if (diff > 0) {
            const days = Math.floor(diff / 86400000);
            const hours = Math.floor((diff % 86400000) / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            newCountdowns[item.id] = days > 0
              ? `${days}ي ${hours}س ${mins}د`
              : `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
          } else {
            newCountdowns[item.id] = "انتهى";
          }
        }
      });
      setCountdowns(newCountdowns);
    }, 1000);
    return () => clearInterval(interval);
  }, [items]);

  const fetchData = async () => {
    setLoading(true);
    const { data: offersData } = await supabase
      .from("offers_contests")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (offersData) setItems(offersData as unknown as OfferContest[]);

    if (user) {
      const { data: partData } = await supabase
        .from("offer_participations")
        .select("*")
        .eq("user_id", user.id);
      if (partData) setParticipations(partData as unknown as Participation[]);
    }
    setLoading(false);
  };

  const getParticipation = (offerId: string) =>
    participations.find(p => p.offer_id === offerId);

  const handleParticipate = async (item: OfferContest) => {
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً");
      return;
    }

    const existing = getParticipation(item.id);
    if (existing) {
      toast.info("أنت مشترك بالفعل في هذا النشاط");
      return;
    }

    const { error } = await supabase
      .from("offer_participations")
      .insert({ offer_id: item.id, user_id: user.id, status: "pending" });

    if (error) {
      toast.error("حدث خطأ في الاشتراك");
      return;
    }

    // Execute the task
    await executeTask(item);
  };

  const executeTask = async (item: OfferContest) => {
    const appUrl = window.location.origin;
    const shareText = `🎉 ${item.title} - جرب تطبيق Advance الآن! ${appUrl}`;

    switch (item.required_task) {
      case "share_app":
        if (navigator.share) {
          try {
            await navigator.share({ title: "Advance", text: shareText, url: appUrl });
            await completeParticipation(item);
          } catch {
            toast.info("تم إلغاء المشاركة");
          }
        } else {
          await navigator.clipboard.writeText(shareText);
          toast.success("تم نسخ رابط المشاركة");
          await completeParticipation(item);
        }
        break;
      case "share_facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}`, "_blank");
        await completeParticipation(item);
        break;
      case "share_telegram":
        window.open(`https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(shareText)}`, "_blank");
        await completeParticipation(item);
        break;
      case "share_whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
        await completeParticipation(item);
        break;
      case "invite_friends":
      case "custom":
        toast.success("تم تسجيل مشاركتك! سيتم مراجعتها من الإدارة");
        break;
    }
  };

  const completeParticipation = async (item: OfferContest) => {
    if (!user) return;

    await supabase
      .from("offer_participations")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        points_earned: item.reward_type === "points" ? item.reward_amount : 0,
        balance_earned: item.reward_type === "balance" ? item.reward_amount : 0,
      })
      .eq("offer_id", item.id)
      .eq("user_id", user.id);

    // Award the reward
    if (item.reward_type === "balance") {
      await supabase.rpc("admin_update_user_balance", {
        _user_id: user.id,
        _new_balance: undefined,
      });
      // Direct update for user's own balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance, points")
        .eq("id", user.id)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ balance: profile.balance + item.reward_amount })
          .eq("id", user.id);
      }
    } else if (item.reward_type === "points") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", user.id)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ points: (profile.points || 0) + item.reward_amount })
          .eq("id", user.id);
      }
    }

    // Update participation to rewarded
    await supabase
      .from("offer_participations")
      .update({ status: "rewarded", rewarded_at: new Date().toISOString() })
      .eq("offer_id", item.id)
      .eq("user_id", user.id);

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: item.type === "offer" ? "مكافأة عرض ترويجي" : "مكافأة مسابقة",
      amount: item.reward_amount,
    });

    toast.success(`🎉 تم الحصول على ${item.reward_amount} ${item.reward_type === "points" ? "نقطة" : "ج.م"}!`);
    fetchData();
  };

  const filtered = items.filter(item => {
    if (activeTab === "offers") return item.type === "offer";
    if (activeTab === "contests") return item.type === "contest";
    return true;
  });

  return (
    <div className="space-y-6">
      <BackButton />

      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-foreground mb-2">العروض والمسابقات</h2>
        <p className="text-muted-foreground text-sm">اشترك في العروض واربح مكافآت رائعة</p>
      </div>

      {/* Promotion Banner */}
      <PromotionBanner location="offers" />

      {/* Tabs */}
      <div className="flex gap-2 justify-center">
        {([["all", "الكل"], ["offers", "العروض"], ["contests", "المسابقات"]] as const).map(([key, label]) => (
          <Button
            key={key}
            variant={activeTab === key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(key)}
            className="rounded-full px-5"
          >
            {key === "offers" && <Gift className="w-4 h-4 ml-1" />}
            {key === "contests" && <Trophy className="w-4 h-4 ml-1" />}
            {label}
          </Button>
        ))}
      </div>

      {/* Items */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin text-3xl">⏳</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Gift className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">لا توجد عروض أو مسابقات حالياً</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filtered.map((item, idx) => {
              const participation = getParticipation(item.id);
              const taskInfo = TASK_LABELS[item.required_task] || TASK_LABELS.custom;
              const TaskIcon = taskInfo.icon;
              const isCompleted = participation?.status === "rewarded" || participation?.status === "completed";

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-card border border-border rounded-2xl overflow-hidden"
                >
                  {item.image_url && (
                    <div className="relative h-40 overflow-hidden">
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
                      <div className="absolute top-3 right-3">
                        <Badge variant={item.type === "offer" ? "default" : "secondary"} className="text-xs">
                          {item.type === "offer" ? "عرض" : "مسابقة"}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {!item.image_url && (
                          <Badge variant={item.type === "offer" ? "default" : "secondary"} className="text-xs mb-2">
                            {item.type === "offer" ? "عرض" : "مسابقة"}
                          </Badge>
                        )}
                        <h3 className="font-bold text-foreground text-lg">{item.title}</h3>
                        <p className="text-muted-foreground text-sm mt-1">{item.description}</p>
                      </div>
                      <div className="text-center bg-primary/10 rounded-xl px-3 py-2 min-w-[70px]">
                        <p className="text-xl font-black text-primary">{item.reward_amount}</p>
                        <p className="text-[10px] text-primary/70">
                          {item.reward_type === "points" ? "نقطة" : "ج.م"}
                        </p>
                      </div>
                    </div>

                    {/* Task info */}
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                      <TaskIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        المطلوب: {item.custom_task_description || taskInfo.label}
                      </span>
                    </div>

                    {/* Countdown */}
                    {countdowns[item.id] && (
                      <div className="flex items-center gap-1 text-amber-500 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>{countdowns[item.id] === "انتهى" ? "انتهى العرض" : `ينتهي خلال: ${countdowns[item.id]}`}</span>
                      </div>
                    )}

                    {/* Action */}
                    {isCompleted ? (
                      <div className="flex items-center gap-2 bg-accent/50 rounded-lg px-3 py-2 text-accent-foreground">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-semibold text-sm">تم الحصول على المكافأة ✓</span>
                      </div>
                    ) : participation?.status === "pending" ? (
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => executeTask(item)}
                      >
                        <TaskIcon className="w-4 h-4 ml-2" />
                        أكمل المهمة
                      </Button>
                    ) : countdowns[item.id] === "انتهى" ? (
                      <Button className="w-full" disabled>
                        انتهى العرض
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handleParticipate(item)}
                      >
                        <Gift className="w-4 h-4 ml-2" />
                        اشترك الآن
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

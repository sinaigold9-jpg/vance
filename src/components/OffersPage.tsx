import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Trophy, Share2, Users, MessageCircle, Clock, CheckCircle2, Star, ExternalLink, Zap, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "./BackButton";
import { PromotionBanner } from "./PromotionBanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  button_label: string | null;
  original_price: number;
  discount_percentage: number;
}

interface Participation {
  id: string;
  offer_id: string;
  status: string;
  points_earned: number;
  balance_earned: number;
}

const TASK_LABELS: Record<string, { label: string; icon: typeof Share2; btnLabel: string }> = {
  share_app: { label: "مشاركة التطبيق", icon: Share2, btnLabel: "شارك" },
  invite_friends: { label: "دعوة أصدقاء", icon: Users, btnLabel: "ادعُ" },
  share_facebook: { label: "مشاركة على فيسبوك", icon: ExternalLink, btnLabel: "شارك" },
  share_telegram: { label: "مشاركة على تيليجرام", icon: MessageCircle, btnLabel: "شارك" },
  share_whatsapp: { label: "مشاركة على واتساب", icon: MessageCircle, btnLabel: "شارك" },
  activate_offer: { label: "تفعيل العرض", icon: Zap, btnLabel: "فعّل العرض" },
  custom: { label: "مهمة مخصصة", icon: Star, btnLabel: "اشترك" },
};

export const OffersPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<OfferContest[]>([]);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "offers" | "contests">("all");
  const [loading, setLoading] = useState(true);
  const [countdowns, setCountdowns] = useState<Record<string, string>>({});
  const [activateDialog, setActivateDialog] = useState<OfferContest | null>(null);
  const [userBalance, setUserBalance] = useState(0);
  const [activating, setActivating] = useState(false);

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
      .neq("display_location", "archived")
      .order("display_order", { ascending: true });

    if (offersData) {
      // Auto-archive expired offers
      const now = Date.now();
      const expiredIds = (offersData as unknown as OfferContest[])
        .filter(o => o.ends_at && new Date(o.ends_at).getTime() < now && o.is_active)
        .map(o => o.id);
      
      if (expiredIds.length > 0) {
        await supabase
          .from("offers_contests")
          .update({ is_active: false, display_location: "archived" })
          .in("id", expiredIds);
      }

      setItems((offersData as unknown as OfferContest[]).filter(o => !expiredIds.includes(o.id)));
    }

    if (user) {
      const { data: partData } = await supabase
        .from("offer_participations")
        .select("*")
        .eq("user_id", user.id);
      if (partData) setParticipations(partData as unknown as Participation[]);

      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", user.id)
        .single();
      if (profile) setUserBalance(profile.balance || 0);
    }
    setLoading(false);
  };

  const getParticipation = (offerId: string) =>
    participations.find(p => p.offer_id === offerId);

  const isExpired = (item: OfferContest) => {
    if (!item.ends_at) return false;
    return new Date(item.ends_at).getTime() < Date.now();
  };

  const handleParticipate = async (item: OfferContest) => {
    if (!user) { toast.error("يجب تسجيل الدخول أولاً"); return; }
    if (isExpired(item)) { toast.error("هذا العرض قد انتهى"); return; }

    const existing = getParticipation(item.id);
    if (existing) { toast.info("أنت مشترك بالفعل"); return; }

    // For activate_offer type, show confirmation dialog
    if (item.required_task === "activate_offer") {
      setActivateDialog(item);
      return;
    }

    const { error } = await supabase
      .from("offer_participations")
      .insert({ offer_id: item.id, user_id: user.id, status: "pending" });
    if (error) { toast.error("حدث خطأ في الاشتراك"); return; }
    await executeTask(item);
  };

  const handleActivateOffer = async () => {
    if (!user || !activateDialog) return;
    setActivating(true);

    const cost = activateDialog.reward_amount; // The discount/cost amount
    if (userBalance < cost) {
      toast.error(`لا يوجد رصيد كافٍ لتفعيل العرض. المطلوب: ${cost} ج.م، رصيدك: ${userBalance} ج.م`);
      setActivating(false);
      return;
    }

    // Deduct balance
    const newBalance = userBalance - cost;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", user.id);

    if (updateError) {
      toast.error("حدث خطأ في تفعيل العرض");
      setActivating(false);
      return;
    }

    // Record participation
    await supabase
      .from("offer_participations")
      .insert({
        offer_id: activateDialog.id,
        user_id: user.id,
        status: "rewarded",
        completed_at: new Date().toISOString(),
        rewarded_at: new Date().toISOString(),
        balance_earned: cost,
      });

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: `تفعيل عرض: ${activateDialog.title}`,
      amount: -cost,
    });

    setUserBalance(newBalance);
    toast.success(`✅ تم تفعيل العرض بنجاح! تم خصم ${cost} ج.م من رصيدك`);
    setActivateDialog(null);
    setActivating(false);
    fetchData();
  };

  const handleShare = async (item: OfferContest) => {
    const appUrl = window.location.origin;
    const shareUrl = `${appUrl}/app/offers?id=${item.id}`;
    const shareText = `🎉 ${item.title}\n${item.description}\n\nجرب الآن: ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: shareText,
          url: shareUrl,
        });
        return true;
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("تم نسخ رابط المشاركة");
      return true;
    }
    return false;
  };

  const executeTask = async (item: OfferContest) => {
    const appUrl = window.location.origin;
    const shareText = `🎉 ${item.title} - جرب تطبيق Advance الآن! ${appUrl}`;

    switch (item.required_task) {
      case "share_app": {
        const shared = await handleShare(item);
        if (shared) await completeParticipation(item);
        break;
      }
      case "share_facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}&quote=${encodeURIComponent(shareText)}`, "_blank");
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

    if (item.reward_type === "balance") {
      const { data: profile } = await supabase.from("profiles").select("balance").eq("id", user.id).single();
      if (profile) {
        await supabase.from("profiles").update({ balance: profile.balance + item.reward_amount }).eq("id", user.id);
      }
    } else if (item.reward_type === "points") {
      const { data: profile } = await supabase.from("profiles").select("points").eq("id", user.id).single();
      if (profile) {
        await supabase.from("profiles").update({ points: (profile.points || 0) + item.reward_amount }).eq("id", user.id);
      }
    }

    await supabase
      .from("offer_participations")
      .update({ status: "rewarded", rewarded_at: new Date().toISOString() })
      .eq("offer_id", item.id)
      .eq("user_id", user.id);

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: item.type === "offer" ? "مكافأة عرض ترويجي" : "مكافأة مسابقة",
      amount: item.reward_amount,
    });

    toast.success(`🎉 تم الحصول على ${item.reward_amount} ${item.reward_type === "points" ? "نقطة" : "ج.م"}!`);
    fetchData();
  };

  const filtered = items.filter(item => {
    if (item.display_location === "archived") return false;
    if (!item.is_active && !isExpired(item)) return false;
    if (activeTab === "offers") return item.type === "offer";
    if (activeTab === "contests") return item.type === "contest";
    return true;
  });

  const getActionButton = (item: OfferContest) => {
    const participation = getParticipation(item.id);
    const taskInfo = TASK_LABELS[item.required_task] || TASK_LABELS.custom;
    const TaskIcon = taskInfo.icon;
    const isCompleted = participation?.status === "rewarded" || participation?.status === "completed";
    const expired = isExpired(item);

    if (isCompleted) {
      return (
        <div className="flex items-center gap-2 bg-accent/50 rounded-lg px-3 py-2 text-accent-foreground">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold text-sm">تم الحصول على المكافأة ✓</span>
        </div>
      );
    }

    if (expired) {
      return (
        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2.5">
          <AlertTriangle className="w-5 h-5 text-muted-foreground" />
          <span className="font-medium text-sm text-muted-foreground">انتهى هذا العرض ولم يعد متاحاً</span>
        </div>
      );
    }

    if (participation?.status === "pending") {
      return (
        <Button variant="secondary" className="w-full" onClick={() => executeTask(item)}>
          <TaskIcon className="w-4 h-4 ml-2" />
          أكمل المهمة
        </Button>
      );
    }

    // For share-type tasks, show share + subscribe buttons
    if (["share_app", "share_facebook", "share_telegram", "share_whatsapp"].includes(item.required_task)) {
      return (
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => handleParticipate(item)}>
            <Gift className="w-4 h-4 ml-2" />
            اشترك واكسب
          </Button>
          <Button variant="outline" onClick={() => handleShare(item)}>
            <Share2 className="w-4 h-4 ml-1" />
            شارك
          </Button>
        </div>
      );
    }

    // For activate_offer
    if (item.required_task === "activate_offer") {
      return (
        <Button className="w-full bg-gradient-to-r from-primary to-primary/80" onClick={() => handleParticipate(item)}>
          <Zap className="w-4 h-4 ml-2" />
          فعّل العرض
        </Button>
      );
    }

    return (
      <Button className="w-full" onClick={() => handleParticipate(item)}>
        <Gift className="w-4 h-4 ml-2" />
        {taskInfo.btnLabel || "اشترك الآن"}
      </Button>
    );
  };

  return (
    <div className="space-y-6">
      <BackButton />

      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-foreground mb-2">العروض والمسابقات</h2>
        <p className="text-muted-foreground text-sm">اشترك في العروض واربح مكافآت رائعة</p>
      </div>

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
              const taskInfo = TASK_LABELS[item.required_task] || TASK_LABELS.custom;
              const TaskIcon = taskInfo.icon;
              const expired = isExpired(item);

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`bg-card border rounded-2xl overflow-hidden ${expired ? "border-muted opacity-75" : "border-border"}`}
                >
                  {item.image_url && (
                    <div className="relative h-40 overflow-hidden">
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
                      <div className="absolute top-3 right-3 flex gap-1">
                        <Badge variant={item.type === "offer" ? "default" : "secondary"} className="text-xs">
                          {item.type === "offer" ? "عرض" : "مسابقة"}
                        </Badge>
                        {expired && (
                          <Badge variant="destructive" className="text-xs">منتهي</Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {!item.image_url && (
                          <div className="flex gap-1 mb-2">
                            <Badge variant={item.type === "offer" ? "default" : "secondary"} className="text-xs">
                              {item.type === "offer" ? "عرض" : "مسابقة"}
                            </Badge>
                            {expired && <Badge variant="destructive" className="text-xs">منتهي</Badge>}
                          </div>
                        )}
                        <h3 className="font-bold text-foreground text-lg">{item.title}</h3>
                        <p className="text-muted-foreground text-sm mt-1">{item.description}</p>
                      </div>
                      <div className="text-center bg-primary/10 rounded-xl px-3 py-2 min-w-[70px]">
                        {item.discount_percentage > 0 ? (
                          <>
                            <p className="text-xs line-through text-muted-foreground">{item.original_price} ج.م</p>
                            <p className="text-xl font-black text-primary">{item.discount_percentage}%</p>
                            <p className="text-[10px] text-primary/70">خصم</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xl font-black text-primary">{item.reward_amount}</p>
                            <p className="text-[10px] text-primary/70">
                              {item.reward_type === "points" ? "نقطة" : item.reward_type === "discount" || item.reward_type === "package_discount" ? "خصم ج.م" : "ج.م"}
                            </p>
                          </>
                        )}
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
                      <div className={`flex items-center gap-1 text-sm ${expired ? "text-destructive" : "text-amber-500"}`}>
                        <Clock className="w-4 h-4" />
                        <span>{expired ? "انتهى العرض" : `ينتهي خلال: ${countdowns[item.id]}`}</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    {getActionButton(item)}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Activate Offer Dialog */}
      <Dialog open={!!activateDialog} onOpenChange={() => setActivateDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">تفعيل العرض</DialogTitle>
            <DialogDescription className="text-center">
              {activateDialog && (
                <div className="space-y-3 mt-3">
                  <p className="font-medium text-foreground">{activateDialog.title}</p>
                  <p className="text-sm">{activateDialog.description}</p>
                  <div className="bg-muted rounded-lg p-3 space-y-1">
                    <p className="text-sm">سيتم خصم <strong className="text-primary">{activateDialog.reward_amount} ج.م</strong> من رصيدك</p>
                    <p className="text-xs text-muted-foreground">رصيدك الحالي: {userBalance} ج.م</p>
                  </div>
                  {userBalance < (activateDialog?.reward_amount || 0) && (
                    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2">
                      <p className="text-xs text-destructive font-medium">⚠️ لا يوجد رصيد كافٍ لتفعيل هذا العرض</p>
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button
              className="flex-1"
              onClick={handleActivateOffer}
              disabled={activating || userBalance < (activateDialog?.reward_amount || 0)}
            >
              <Zap className="w-4 h-4 ml-2" />
              {activating ? "جاري التفعيل..." : "فعّل الآن"}
            </Button>
            <Button variant="outline" onClick={() => setActivateDialog(null)}>إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

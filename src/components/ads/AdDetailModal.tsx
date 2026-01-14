import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCategoryLabel, getCategoryIcon } from "./AdCategories";
import { 
  X, Star, MessageSquare, ExternalLink, Eye, BarChart3, 
  Send, ChevronLeft, ChevronRight, Trash2, Edit
} from "lucide-react";

interface Advertisement {
  id: string;
  title: string;
  short_description: string;
  full_description: string | null;
  external_link: string | null;
  category: string;
  ad_type: string;
  status: string;
  images: string[];
  views_count: number;
  clicks_count: number;
  created_at: string;
  user_id: string;
}

interface Interaction {
  id: string;
  user_id: string;
  rating: number | null;
  comment: string | null;
  created_at: string;
  profiles?: { full_name: string };
  replies?: { id: string; reply_text: string; created_at: string }[];
}

interface AdDetailModalProps {
  ad: Advertisement;
  isOwner: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export const AdDetailModal = ({ ad, isOwner, onClose, onRefresh }: AdDetailModalProps) => {
  const { user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userInteraction, setUserInteraction] = useState<Interaction | null>(null);

  useEffect(() => {
    if (isOwner) {
      fetchInteractions();
    }
    if (user && !isOwner) {
      fetchUserInteraction();
    }
  }, [ad.id, isOwner, user]);

  const fetchInteractions = async () => {
    const { data } = await supabase
      .from("ad_interactions")
      .select(`
        *,
        profiles:user_id (full_name),
        replies:ad_interaction_replies (id, reply_text, created_at)
      `)
      .eq("ad_id", ad.id)
      .order("created_at", { ascending: false });
    
    if (data) setInteractions(data as any);
  };

  const fetchUserInteraction = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ad_interactions")
      .select("*")
      .eq("ad_id", ad.id)
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (data) {
      setUserInteraction(data);
      setRating(data.rating || 0);
      setComment(data.comment || "");
    }
  };

  const handleSubmitInteraction = async () => {
    if (!user || isOwner) return;
    if (rating === 0 && !comment) {
      toast.error("يرجى إضافة تقييم أو تعليق");
      return;
    }

    setIsSubmitting(true);

    try {
      const pointsEarned = (rating > 0 ? 0.5 : 0) + (comment ? 0.5 : 0);

      if (userInteraction) {
        await supabase
          .from("ad_interactions")
          .update({ rating, comment })
          .eq("id", userInteraction.id);
      } else {
        await supabase.from("ad_interactions").insert({
          ad_id: ad.id,
          user_id: user.id,
          rating: rating || null,
          comment: comment || null,
          points_earned: pointsEarned
        });

        // Award points
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          action: "نقاط التفاعل مع إعلان",
          amount: pointsEarned
        });
      }

      // Send notification to advertiser
      await supabase.from("notifications").insert({
        user_id: ad.user_id,
        title: "تفاعل جديد على إعلانك",
        message: `قام مستخدم ${rating ? `بتقييم إعلانك "${ad.title}" بـ ${rating} نجوم` : `بالتعليق على إعلانك "${ad.title}"`}`,
        type: "ad_interaction",
        related_id: ad.id
      });

      toast.success("تم إرسال تفاعلك بنجاح!");
      fetchUserInteraction();
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (interactionId: string) => {
    if (!user || !replyText.trim()) return;

    try {
      await supabase.from("ad_interaction_replies").insert({
        interaction_id: interactionId,
        user_id: user.id,
        reply_text: replyText
      });

      toast.success("تم إرسال الرد");
      setReplyText("");
      setReplyingTo(null);
      fetchInteractions();
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ");
    }
  };

  const handleDeleteAd = async () => {
    if (!confirm("هل أنت متأكد من حذف هذا الإعلان؟")) return;

    try {
      await supabase.from("advertisements").delete().eq("id", ad.id);
      toast.success("تم حذف الإعلان");
      onClose();
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ");
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % ad.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + ad.images.length) % ad.images.length);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Image Gallery */}
        {ad.images?.length > 0 && (
          <div className="relative h-64 bg-secondary">
            <img
              src={ad.images[currentImageIndex]}
              alt={ad.title}
              className="w-full h-full object-cover"
            />
            {ad.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {ad.images.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${i === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        )}

        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold mb-2">{ad.title}</h2>
              <Badge variant="outline" className="gap-1">
                {getCategoryIcon(ad.category)} {getCategoryLabel(ad.category)}
              </Badge>
            </div>
            {ad.ad_type === "paid" && (
              <Badge className="bg-gradient-gold text-primary-foreground">
                إعلان مميز
              </Badge>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <p className="text-muted-foreground">{ad.short_description}</p>
            {ad.full_description && (
              <div className="bg-secondary/50 rounded-xl p-4">
                <p className="text-sm whitespace-pre-wrap">{ad.full_description}</p>
              </div>
            )}
          </div>

          {/* External Link */}
          {ad.external_link && (
            <Button
              onClick={() => window.open(ad.external_link!, "_blank")}
              className="w-full gap-2 bg-gradient-gold text-primary-foreground"
            >
              <ExternalLink className="w-4 h-4" />
              زيارة الرابط
            </Button>
          )}

          {/* Stats (Owner View) */}
          {isOwner && (
            <div className="grid grid-cols-2 gap-4 bg-secondary/30 rounded-xl p-4">
              <div className="text-center">
                <Eye className="w-6 h-6 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{ad.views_count}</p>
                <p className="text-xs text-muted-foreground">مشاهدة</p>
              </div>
              <div className="text-center">
                <BarChart3 className="w-6 h-6 mx-auto mb-1 text-accent" />
                <p className="text-2xl font-bold">{ad.clicks_count}</p>
                <p className="text-xs text-muted-foreground">نقرة</p>
              </div>
            </div>
          )}

          {/* User Interaction (Non-Owner) */}
          {!isOwner && user && (
            <div className="bg-secondary/30 rounded-xl p-4 space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                قيّم هذا الإعلان
              </h3>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${star <= rating ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
                    />
                  </button>
                ))}
              </div>
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="اكتب تعليقك هنا..."
                rows={2}
              />
              <Button
                onClick={handleSubmitInteraction}
                disabled={isSubmitting || (rating === 0 && !comment)}
                className="w-full gap-2"
              >
                <Send className="w-4 h-4" />
                {userInteraction ? "تحديث التفاعل" : "إرسال التفاعل"}
              </Button>
            </div>
          )}

          {/* Comments (Owner View) */}
          {isOwner && interactions.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                التعليقات والتقييمات ({interactions.length})
              </h3>
              <div className="space-y-3 max-h-60 overflow-auto">
                {interactions.map((interaction) => (
                  <div key={interaction.id} className="bg-secondary/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{interaction.profiles?.full_name}</span>
                      {interaction.rating && (
                        <div className="flex items-center gap-1">
                          {[...Array(interaction.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                          ))}
                        </div>
                      )}
                    </div>
                    {interaction.comment && (
                      <p className="text-sm text-muted-foreground mb-2">{interaction.comment}</p>
                    )}
                    
                    {/* Replies */}
                    {interaction.replies?.map((reply) => (
                      <div key={reply.id} className="bg-background/50 rounded-lg p-3 mt-2 mr-4">
                        <p className="text-sm">{reply.reply_text}</p>
                      </div>
                    ))}

                    {/* Reply Form */}
                    {replyingTo === interaction.id ? (
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="اكتب ردك..."
                          className="flex-1"
                        />
                        <Button size="sm" onClick={() => handleReply(interaction.id)}>
                          رد
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>
                          إلغاء
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReplyingTo(interaction.id)}
                        className="mt-2"
                      >
                        رد
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Owner Actions */}
          {isOwner && (
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button variant="outline" className="flex-1 gap-2">
                <Edit className="w-4 h-4" />
                تعديل
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAd}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                حذف
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

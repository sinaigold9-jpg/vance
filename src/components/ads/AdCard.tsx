import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, ExternalLink, Star, MessageSquare, BarChart3 } from "lucide-react";
import { getCategoryLabel, getCategoryIcon } from "./AdCategories";
import { AdDetailModal } from "./AdDetailModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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

interface AdCardProps {
  ad: Advertisement;
  isOwner?: boolean;
  onRefresh?: () => void;
}

export const AdCard = ({ ad, isOwner = false, onRefresh }: AdCardProps) => {
  const { user } = useAuth();
  const [showDetail, setShowDetail] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  const trackView = async () => {
    if (!user || isTracking) return;
    setIsTracking(true);
    
    try {
      // Track view
      await supabase.from("ad_views").insert({
        ad_id: ad.id,
        user_id: user.id
      });

      // Update view count
      await supabase.from("advertisements").update({
        views_count: ad.views_count + 1
      }).eq("id", ad.id);

      // Award points for viewing
      if (!isOwner) {

        await supabase.from("activity_logs").insert({
          user_id: user.id,
          action: "نقاط مشاهدة إعلان",
          amount: 0.5
        });
      }
    } catch (error) {
      console.error("Error tracking view:", error);
    }
    
    setShowDetail(true);
  };

  const handleExternalClick = async () => {
    if (!user || !ad.external_link) return;

    try {
      // Track click
      await supabase.from("ad_clicks").insert({
        ad_id: ad.id,
        user_id: user.id,
        points_earned: 1
      });

      // Update click count
      await supabase.from("advertisements").update({
        clicks_count: ad.clicks_count + 1
      }).eq("id", ad.id);

      // Award points for clicking
      if (!isOwner) {
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          action: "نقاط النقر على إعلان",
          amount: 1
        });

        toast.success("حصلت على 1 جنيه من النقر على الإعلان!");
      }

      // Send notification to advertiser
      await supabase.from("notifications").insert({
        user_id: ad.user_id,
        title: "نقرة جديدة على إعلانك",
        message: `قام مستخدم بالنقر على إعلان "${ad.title}"`,
        type: "ad_click",
        related_id: ad.id
      });

      window.open(ad.external_link, "_blank");
    } catch (error) {
      console.error("Error tracking click:", error);
      window.open(ad.external_link, "_blank");
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        className="cursor-pointer"
        onClick={trackView}
      >
        <Card className="overflow-hidden border-border/50 bg-card/80 hover:border-primary/30 transition-all">
          {ad.images?.[0] && (
            <div className="relative h-40 overflow-hidden">
              <img
                src={ad.images[0]}
                alt={ad.title}
                className="w-full h-full object-cover"
              />
              {ad.ad_type === "paid" && (
                <Badge className="absolute top-2 right-2 bg-gradient-gold text-primary-foreground">
                  إعلان مميز
                </Badge>
              )}
              <div className="absolute bottom-2 left-2 flex gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Eye className="w-3 h-3" />
                  {ad.views_count}
                </Badge>
              </div>
            </div>
          )}
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-bold text-foreground line-clamp-1">{ad.title}</h3>
              <span className="text-lg">{getCategoryIcon(ad.category)}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {ad.short_description}
            </p>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {getCategoryLabel(ad.category)}
              </Badge>
              {ad.external_link && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExternalClick();
                  }}
                  className="gap-1 text-primary"
                >
                  <ExternalLink className="w-4 h-4" />
                  زيارة
                </Button>
              )}
            </div>

            {isOwner && (
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {ad.views_count} مشاهدة
                </span>
                <span className="flex items-center gap-1">
                  <BarChart3 className="w-4 h-4" />
                  {ad.clicks_count} نقرة
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {showDetail && (
        <AdDetailModal
          ad={ad}
          isOwner={isOwner}
          onClose={() => {
            setShowDetail(false);
            setIsTracking(false);
          }}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
};

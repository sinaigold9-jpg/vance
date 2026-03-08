import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface OfferPreview {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  type: string;
  reward_amount: number;
  reward_type: string;
  ends_at: string | null;
  is_active: boolean;
}

interface HomeOffersPreviewProps {
  onViewAll: () => void;
}

export const HomeOffersPreview = ({ onViewAll }: HomeOffersPreviewProps) => {
  const [offers, setOffers] = useState<OfferPreview[]>([]);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    const { data } = await supabase
      .from("offers_contests")
      .select("id, title, description, image_url, type, reward_amount, reward_type, ends_at, is_active")
      .eq("is_active", true)
      .neq("display_location", "archived")
      .order("display_order", { ascending: true })
      .limit(3);
    if (data) setOffers(data as OfferPreview[]);
  };

  if (offers.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          العروض والمسابقات
        </h3>
        <Button variant="ghost" size="sm" onClick={onViewAll} className="text-primary text-xs">
          عرض الكل
          <ArrowLeft className="w-4 h-4 mr-1" />
        </Button>
      </div>
      <div className="space-y-3">
        {offers.map((offer, idx) => (
          <motion.div
            key={offer.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={onViewAll}
            className="flex items-center gap-3 bg-card/60 border border-border/30 rounded-xl p-3 cursor-pointer card-hover"
          >
            {offer.image_url ? (
              <img src={offer.image_url} alt={offer.title} className="w-14 h-14 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Gift className="w-6 h-6 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="font-bold text-sm text-foreground truncate">{offer.title}</p>
                <Badge variant={offer.type === "offer" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                  {offer.type === "offer" ? "عرض" : "مسابقة"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{offer.description}</p>
              {offer.ends_at && (
                <p className="text-[10px] text-amber-500 flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  متاح لفترة محدودة
                </p>
              )}
            </div>
            <div className="text-center bg-primary/10 rounded-lg px-2 py-1.5 shrink-0">
              <p className="text-sm font-black text-primary">{offer.reward_amount}</p>
              <p className="text-[9px] text-primary/70">{offer.reward_type === "points" ? "نقطة" : "ج.م"}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

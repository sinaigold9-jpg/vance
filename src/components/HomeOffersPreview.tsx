import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Gift, ArrowLeft, Clock, ChevronLeft, ChevronRight } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    const { data } = await supabase
      .from("offers_contests")
      .select("id, title, description, image_url, type, reward_amount, reward_type, ends_at, is_active")
      .eq("is_active", true)
      .in("display_location", ["home_only", "both"])
      .order("display_order", { ascending: true });
    if (data) setOffers(data as OfferPreview[]);
  };

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    // RTL: scrollLeft is negative in RTL
    const sl = Math.abs(el.scrollLeft);
    setCanScrollRight(sl > 1);
    setCanScrollLeft(sl + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      return () => el.removeEventListener("scroll", checkScroll);
    }
  }, [offers]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = 220;
    // In RTL, scrolling "left" visually means positive scrollLeft change
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
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

      <div className="relative">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-card/90 border border-border/50 shadow-lg flex items-center justify-center text-foreground hover:bg-primary/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-card/90 border border-border/50 shadow-lg flex items-center justify-center text-foreground hover:bg-primary/10 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 px-1 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {offers.map((offer, idx) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.04 }}
              onClick={onViewAll}
              className="flex-shrink-0 w-[200px] bg-card/60 border border-border/30 rounded-xl overflow-hidden cursor-pointer card-hover snap-start"
            >
              {/* Image or placeholder */}
              {offer.image_url ? (
                <div className="relative h-24 overflow-hidden">
                  <img src={offer.image_url} alt={offer.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                  <Badge
                    variant={offer.type === "offer" ? "default" : "secondary"}
                    className="absolute top-2 right-2 text-[10px] px-1.5 py-0"
                  >
                    {offer.type === "offer" ? "عرض" : "مسابقة"}
                  </Badge>
                </div>
              ) : (
                <div className="relative h-24 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <Gift className="w-10 h-10 text-primary/40" />
                  <Badge
                    variant={offer.type === "offer" ? "default" : "secondary"}
                    className="absolute top-2 right-2 text-[10px] px-1.5 py-0"
                  >
                    {offer.type === "offer" ? "عرض" : "مسابقة"}
                  </Badge>
                </div>
              )}

              <div className="p-3 space-y-2">
                <p className="font-bold text-sm text-foreground truncate">{offer.title}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{offer.description}</p>

                <div className="flex items-center justify-between">
                  <div className="bg-primary/10 rounded-lg px-2 py-1">
                    <span className="text-xs font-black text-primary">{offer.reward_amount}</span>
                    <span className="text-[9px] text-primary/70 mr-1">
                      {offer.reward_type === "points" ? "نقطة" : "ج.م"}
                    </span>
                  </div>
                  {offer.ends_at && (
                    <p className="text-[10px] text-amber-500 flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      محدود
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

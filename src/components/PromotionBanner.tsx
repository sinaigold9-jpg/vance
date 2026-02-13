import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PromotionButton {
  label: string;
}

interface Promotion {
  id: string;
  title: string;
  content: string;
  content_style: Record<string, unknown>;
  image_url: string | null;
  link_url: string | null;
  link_type: string;
  offer_type: string;
  buttons: PromotionButton[];
  ends_at: string | null;
  display_location: string;
}

interface PromotionBannerProps {
  location?: "home" | "offers";
}

export const PromotionBanner = ({ location = "home" }: PromotionBannerProps) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdowns, setCountdowns] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchPromotions();
    
    const channel = supabase
      .channel(`promotions-realtime-${location}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "promotions" }, () => {
        fetchPromotions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [location]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const newCountdowns: Record<string, string> = {};
      promotions.forEach(p => {
        if (p.ends_at) {
          const diff = new Date(p.ends_at).getTime() - Date.now();
          if (diff > 0) {
            const days = Math.floor(diff / 86400000);
            const hours = Math.floor((diff % 86400000) / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            newCountdowns[p.id] = days > 0 
              ? `${days}ي ${hours}س ${mins}د`
              : `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
          } else {
            newCountdowns[p.id] = "انتهى";
          }
        }
      });
      setCountdowns(newCountdowns);
    }, 1000);
    return () => clearInterval(interval);
  }, [promotions]);

  useEffect(() => {
    if (promotions.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promotions.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [promotions.length]);

  const fetchPromotions = async () => {
    const { data } = await supabase
      .from("promotions")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (data) {
      const filtered = data
        .map(p => ({
          ...p,
          content_style: (p.content_style || {}) as Record<string, unknown>,
          offer_type: (p as any).offer_type || "personal",
          buttons: Array.isArray((p as any).buttons) ? (p as any).buttons : [],
          display_location: (p as any).display_location || "home_only",
        }))
        .filter(p => {
          if (location === "home") return p.display_location === "home_only" || p.display_location === "both";
          if (location === "offers") return p.display_location === "offers_only" || p.display_location === "both";
          return true;
        });
      setPromotions(filtered);
    }
  };

  const handleClick = (promo: Promotion) => {
    if (!promo.link_url) return;
    if (promo.link_type === "external") {
      window.open(promo.link_url, "_blank");
    } else {
      navigate(promo.link_url);
    }
  };

  const goNext = () => setCurrentIndex((prev) => (prev + 1) % promotions.length);
  const goPrev = () => setCurrentIndex((prev) => (prev - 1 + promotions.length) % promotions.length);

  if (promotions.length === 0) return null;

  const currentPromo = promotions[currentIndex];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-card border border-border/50">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPromo.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="relative cursor-pointer"
          onClick={() => handleClick(currentPromo)}
        >
          {currentPromo.image_url ? (
            <div className="relative">
              <img src={currentPromo.image_url} alt={currentPromo.title} className="w-full h-40 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-bold text-foreground text-lg">{currentPromo.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">{currentPromo.content}</p>
                {countdowns[currentPromo.id] && (
                  <div className="flex items-center gap-1 text-amber-400 text-xs mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{countdowns[currentPromo.id]}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <h3 className="font-bold text-foreground text-lg mb-2">{currentPromo.title}</h3>
              <p className="text-muted-foreground" style={currentPromo.content_style as React.CSSProperties}>
                {currentPromo.content}
              </p>
              {countdowns[currentPromo.id] && (
                <div className="flex items-center gap-1 text-amber-400 text-sm mt-2">
                  <Clock className="w-4 h-4" />
                  <span>{countdowns[currentPromo.id]}</span>
                </div>
              )}
              {currentPromo.link_url && (
                <div className="flex items-center gap-1 text-primary text-sm mt-2">
                  <span>المزيد</span>
                  {currentPromo.link_type === "external" && <ExternalLink className="w-3 h-3" />}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {currentPromo.buttons?.length > 0 && (
        <div className="flex gap-2 px-4 pb-3 flex-wrap">
          {currentPromo.buttons.map((btn, i) => (
            <Button
              key={i}
              size="sm"
              variant="outline"
              className="text-xs flex-1 min-w-[60px]"
              onClick={(e) => { e.stopPropagation(); handleClick(currentPromo); }}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      )}

      {promotions.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {promotions.map((_, idx) => (
              <button key={idx} onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                className={`w-2 h-2 rounded-full transition-colors ${idx === currentIndex ? "bg-primary" : "bg-muted-foreground/30"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
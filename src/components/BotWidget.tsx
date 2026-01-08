import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const BotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [botCode, setBotCode] = useState("");
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    fetchBotSettings();

    const channel = supabase
      .channel("app_settings_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        () => fetchBotSettings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBotSettings = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("*")
      .eq("key", "bot_code")
      .maybeSingle();
    
    if (data) {
      setBotCode(data.value || "");
      setIsActive(data.is_active || false);
    }
  };

  if (!isActive || !botCode) return null;

  return (
    <>
      {/* Bot Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-24 right-4 z-50"
      >
        <Button
          size="icon"
          className="w-14 h-14 rounded-full bg-gradient-gold shadow-gold"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <MessageCircle className="w-6 h-6" />
          )}
        </Button>
      </motion.div>

      {/* Bot Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-40 right-4 left-4 max-w-sm mx-auto z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
            style={{ height: "400px" }}
          >
            <div className="bg-primary p-3 flex items-center justify-between">
              <h3 className="text-primary-foreground font-bold">المساعد الآلي</h3>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-white/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div 
              className="w-full h-[calc(100%-52px)]"
              dangerouslySetInnerHTML={{ __html: botCode }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
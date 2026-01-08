import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Power, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const AppToggle = () => {
  const [isAppEnabled, setIsAppEnabled] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchAppStatus();

    const channel = supabase
      .channel("app_status_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        () => fetchAppStatus()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAppStatus = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("*")
      .eq("key", "app_enabled")
      .maybeSingle();

    if (data) {
      setIsAppEnabled(data.is_active);
    }
  };

  const toggleApp = async () => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({
          key: "app_enabled",
          value: "",
          is_active: !isAppEnabled,
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" });

      if (error) throw error;
      
      setIsAppEnabled(!isAppEnabled);
      toast.success(isAppEnabled ? "تم إيقاف التطبيق" : "تم تفعيل التطبيق");
    } catch (error) {
      console.error("Error toggling app:", error);
      toast.error("حدث خطأ");
    }
  };

  if (!isAdmin) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed top-4 left-4 z-50"
    >
      <Button
        variant={isAppEnabled ? "default" : "destructive"}
        size="icon"
        onClick={toggleApp}
        className="rounded-full shadow-lg"
        title={isAppEnabled ? "إيقاف التطبيق" : "تفعيل التطبيق"}
      >
        {isAppEnabled ? (
          <Power className="w-5 h-5" />
        ) : (
          <Lock className="w-5 h-5" />
        )}
      </Button>
    </motion.div>
  );
};
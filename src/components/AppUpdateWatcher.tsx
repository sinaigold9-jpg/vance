import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { performAppUpdate } from "@/lib/appVersion";

const APPLIED_KEY = "advance_applied_version_code";

/**
 * Keeps the installed PWA in sync with the live web build.
 * When the admin publishes a newer version, any stale cached copy is
 * cleared and reloaded so the installed app matches the preview/web app.
 */
export const AppUpdateWatcher = () => {
  const [pending, setPending] = useState<{ version: string; code: number } | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let stop = false;

    const check = async () => {
      const { data } = await supabase
        .from("app_versions")
        .select("version, version_code")
        .eq("is_active", true)
        .eq("status", "published")
        .order("version_code", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data || stop) return;
      const applied = Number(localStorage.getItem(APPLIED_KEY) || 0);
      if (!applied) {
        localStorage.setItem(APPLIED_KEY, String(data.version_code));
        return;
      }
      if (data.version_code > applied) {
        setPending({ version: data.version, code: data.version_code });
      }
    };

    check();
    const interval = window.setInterval(check, 5 * 60 * 1000);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);

    const ch = supabase
      .channel("app_update_watcher")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_versions" }, () => check())
      .subscribe();

    return () => {
      stop = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(ch);
    };
  }, []);

  const apply = async () => {
    if (!pending) return;
    setApplying(true);
    localStorage.setItem(APPLIED_KEY, String(pending.code));
    await performAppUpdate();
  };

  return (
    <AnimatePresence>
      {pending && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-20 inset-x-3 z-[60] rounded-2xl border border-primary/40 bg-card/95 backdrop-blur-lg shadow-lg p-3 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/15 grid place-items-center shrink-0">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">يتوفر إصدار جديد v{pending.version}</p>
            <p className="text-xs text-muted-foreground">حدّث الآن ليتطابق التطبيق المثبّت مع أحدث نسخة.</p>
          </div>
          <Button size="sm" onClick={apply} disabled={applying} className="gap-1 shrink-0">
            <RefreshCw className={`w-4 h-4 ${applying ? "animate-spin" : ""}`} /> تحديث
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppUpdateWatcher;

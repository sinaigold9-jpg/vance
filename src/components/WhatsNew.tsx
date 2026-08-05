import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Wrench, X, PartyPopper, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLatestVersion } from "@/hooks/useLatestVersion";

const LS_KEY = "advance_whatsnew_version_code";

/**
 * Shown exactly once per newly published version, after the app has loaded.
 * Presents the title, version, release date, features, and fixes of the
 * latest published version. Never reappears once the current version_code
 * has been recorded in localStorage.
 */
export const WhatsNew = () => {
  const latest = useLatestVersion();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (latest.loading) return;
    if (!latest.versionCode) return;
    const seen = Number(localStorage.getItem(LS_KEY) || 0);
    const hasContent = (latest.features?.length || 0) > 0 || (latest.fixes?.length || 0) > 0 || !!latest.description;
    if (latest.versionCode > seen && hasContent) {
      setOpen(true);
    }
  }, [latest.loading, latest.versionCode, latest.features, latest.fixes, latest.description]);

  const close = () => {
    localStorage.setItem(LS_KEY, String(latest.versionCode));
    setOpen(false);
  };

  const releaseDate = latest.releaseDate
    ? new Date(latest.releaseDate).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          dir="rtl"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl border border-primary/30 bg-card shadow-2xl"
          >
            <button
              onClick={close}
              className="absolute top-3 left-3 w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 pb-4 text-center border-b border-border">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold">
                <PartyPopper className="w-7 h-7 text-primary-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">✨ ما الجديد في التطبيق</p>
              <h2 className="text-xl font-extrabold">{latest.title || `الإصدار ${latest.version}`}</h2>
              <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="font-mono">v{latest.version}</Badge>
                {releaseDate && (
                  <Badge variant="outline" className="gap-1">
                    <Calendar className="w-3 h-3" /> {releaseDate}
                  </Badge>
                )}
              </div>
            </div>

            <div className="p-6 space-y-4">
              {latest.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{latest.description}</p>
              )}

              {latest.features.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> الميزات الجديدة
                  </h3>
                  <div className="space-y-2">
                    {latest.features.map((f, i) => (
                      <div key={i} className="text-sm bg-muted/40 border border-border rounded-xl p-3">
                        <span className="font-semibold">{f.label}</span>
                        {f.description && <p className="text-xs text-muted-foreground mt-1">{f.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {latest.fixes.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-blue-500" /> الإصلاحات
                  </h3>
                  <div className="space-y-1.5">
                    {latest.fixes.map((fx, i) => (
                      <div key={i} className="text-xs text-muted-foreground bg-muted/30 border border-border rounded-lg p-2.5">
                        {fx}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 pt-2 sticky bottom-0 bg-card border-t border-border">
              <Button onClick={close} className="w-full bg-gradient-gold text-primary-foreground hover:shadow-gold">
                رائع، فهمت
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WhatsNew;

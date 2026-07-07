import { Suspense, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gamepad2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { GAMES } from "@/components/games/registry";

interface Props {
  onBack: () => void;
}

export const GamesCenter = ({ onBack }: Props) => {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const keys = GAMES.map(g => g.settingsKey);
      const { data } = await supabase
        .from("app_settings")
        .select("key, is_active")
        .in("key", keys);
      const map: Record<string, boolean> = {};
      GAMES.forEach(g => {
        const row = data?.find(r => r.key === g.settingsKey);
        map[g.id] = row ? row.is_active : g.defaultEnabled;
      });
      setEnabled(map);
    })();
  }, []);

  const active = GAMES.find(g => g.id === activeGameId) || null;

  if (active) {
    const Game = active.component;
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader title={active.title} subtitle={active.description} onBack={() => setActiveGameId(null)} />
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
          <Game onExit={() => setActiveGameId(null)} />
        </Suspense>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <PageHeader title="مركز الألعاب" subtitle="العب واستمتع بالفعاليات الجديدة" onBack={onBack} />

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {GAMES.map((g, i) => {
          const isEnabled = enabled[g.id] !== false;
          return (
            <motion.button
              key={g.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 200 }}
              whileHover={{ scale: isEnabled ? 1.04 : 1, y: isEnabled ? -3 : 0 }}
              whileTap={{ scale: isEnabled ? 0.96 : 1 }}
              disabled={!isEnabled}
              onClick={() => isEnabled && setActiveGameId(g.id)}
              className={`relative flex flex-col items-center justify-center p-4 md:p-6 rounded-3xl border transition-all duration-300 ${
                isEnabled
                  ? "bg-card/60 border-border/30 hover:border-primary/30 hover:bg-card/80"
                  : "bg-muted/40 border-border opacity-60 cursor-not-allowed"
              }`}
            >
              <div
                className={`relative w-14 h-14 md:w-16 md:h-16 rounded-full mb-2 md:mb-3 flex items-center justify-center bg-gradient-to-br ${g.gradient} shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)] ring-2 ring-white/25 ring-offset-2 ring-offset-background/40 overflow-hidden`}
              >
                <div className="pointer-events-none absolute inset-0 rounded-full border border-white/30" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/35 to-transparent" />
                <span className="text-3xl md:text-4xl">{g.emoji}</span>
              </div>
              <span className="text-sm md:text-base font-bold mb-1 text-foreground">{g.title}</span>
              <span className="text-[10px] md:text-xs text-muted-foreground text-center hidden md:block">
                {g.description}
              </span>
              {!isEnabled && (
                <span className="text-[10px] text-amber-500 mt-1">⏸ متوقفة</span>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-muted-foreground mt-4">
        <Gamepad2 className="w-8 h-8 mx-auto mb-2 opacity-60" />
        <p className="text-sm">المزيد من الألعاب قريبًا 🎮</p>
      </div>
    </motion.div>
  );
};

export default GamesCenter;
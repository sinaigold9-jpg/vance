import { Suspense, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gamepad2, Loader2, ArrowRight } from "lucide-react";
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

      <div className="grid gap-4">
        {GAMES.map((g, i) => {
          const isEnabled = enabled[g.id] !== false;
          return (
            <motion.button
              key={g.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: isEnabled ? 1.02 : 1 }}
              whileTap={{ scale: isEnabled ? 0.98 : 1 }}
              disabled={!isEnabled}
              onClick={() => isEnabled && setActiveGameId(g.id)}
              className={`relative overflow-hidden text-right rounded-3xl border p-5 flex items-center gap-4 transition-all ${
                isEnabled
                  ? `bg-gradient-to-br ${g.gradient} border-white/10 shadow-xl hover:shadow-2xl`
                  : "bg-muted/40 border-border opacity-60 cursor-not-allowed"
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur border-2 border-white/25 flex items-center justify-center text-4xl shrink-0">
                {g.emoji}
              </div>
              <div className="flex-1 text-white">
                <h3 className="text-xl font-black">{g.title}</h3>
                <p className="text-sm text-white/80 mt-1">{g.description}</p>
                {!isEnabled && <p className="text-xs text-yellow-200 mt-2">⏸ متوقفة مؤقتًا</p>}
              </div>
              {isEnabled && <ArrowRight className="w-6 h-6 text-white/70" />}
            </motion.button>
          );
        })}

        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-muted-foreground">
          <Gamepad2 className="w-8 h-8 mx-auto mb-2 opacity-60" />
          <p className="text-sm">المزيد من الألعاب قريبًا 🎮</p>
        </div>
      </div>
    </motion.div>
  );
};

export default GamesCenter;
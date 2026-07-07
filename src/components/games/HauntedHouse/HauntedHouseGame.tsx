import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ghost, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import bg from "@/assets/haunted-house-bg.jpg";
import ghostImg from "@/assets/ghost.png";
import { GHOST_SPOTS } from "./ghostSpots";
import { Tutorial } from "./Tutorial";
import { WinScreen } from "./WinScreen";
import { LoseScreen } from "./LoseScreen";
import type { GameProps } from "../registry";
import { DEFAULT_HAUNTED_CONFIG, type HauntedHouseConfig } from "../registry";

interface ActiveGhost {
  id: number;
  spotIdx: number;
  isFake: boolean;
  bornAt: number;
  lifespan: number;
}

const TUTORIAL_FLAG = "haunted_house_tutorial_seen_v1";
const REAL_GHOST_LIFESPAN_MS = 1100; // real ghost visible for 1.1s
const FAKE_GHOST_LIFESPAN_MS = 700;  // fake ghost slightly shorter

// Shuffled copy of spots so each round has different placement
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const HauntedHouseGame = ({ onExit, onWin, onLose }: GameProps) => {
  const [config, setConfig] = useState<HauntedHouseConfig>(DEFAULT_HAUNTED_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [status, setStatus] = useState<"idle" | "playing" | "win" | "lose">("idle");
  const [timeLeft, setTimeLeft] = useState(90);
  const [caught, setCaught] = useState(0);
  const [ghosts, setGhosts] = useState<ActiveGhost[]>([]);
  const [spots, setSpots] = useState(() => shuffle(GHOST_SPOTS));
  const idRef = useRef(0);
  const spawnTimerRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const startTsRef = useRef(0);

  // Load admin config
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value, is_active")
        .eq("key", "game_haunted_house")
        .maybeSingle();
      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value);
          setConfig({ ...DEFAULT_HAUNTED_CONFIG, ...parsed, enabled: data.is_active !== false });
        } catch {
          setConfig({ ...DEFAULT_HAUNTED_CONFIG, enabled: data.is_active !== false });
        }
      }
      setConfigLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!configLoaded) return;
    setTimeLeft(config.duration_seconds);
    const seen = typeof window !== "undefined" && window.localStorage.getItem(TUTORIAL_FLAG) === "1";
    if (config.tutorial_enabled && !seen) setShowTutorial(true);
    else setStatus("playing");
  }, [configLoaded, config]);

  const startGame = useCallback(() => {
    setShowTutorial(false);
    try { window.localStorage.setItem(TUTORIAL_FLAG, "1"); } catch { /* ignore */ }
    setStatus("playing");
  }, []);

  const retry = useCallback(() => {
    setCaught(0);
    setGhosts([]);
    setTimeLeft(config.duration_seconds);
    setSpots(shuffle(GHOST_SPOTS));
    setStatus("playing");
  }, [config.duration_seconds]);

  // Timer + spawn loop
  useEffect(() => {
    if (status !== "playing") return;
    startTsRef.current = Date.now();

    tickRef.current = window.setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (tickRef.current) window.clearInterval(tickRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    const scheduleNext = () => {
      const elapsed = (Date.now() - startTsRef.current) / 1000;
      const progress = Math.min(1, elapsed / Math.max(1, config.duration_seconds));
      // Spawn interval decreases from 1400ms → 450ms as game progresses
      const base = 1400 - progress * 950;
      const interval = Math.max(300, base / Math.max(0.5, config.spawn_speed_multiplier));
      spawnTimerRef.current = window.setTimeout(() => {
        spawn(progress);
        scheduleNext();
      }, interval + Math.random() * 200);
    };

    const spawn = (progress: number) => {
      const spawnCount = progress > 0.5 && Math.random() < 0.35 && config.fake_ghosts_enabled ? 2 : 1;
      const chosen = new Set<number>();
      const newOnes: ActiveGhost[] = [];
      for (let i = 0; i < spawnCount; i++) {
        let idx = Math.floor(Math.random() * spots.length);
        let guard = 0;
        while (chosen.has(idx) && guard++ < 10) idx = Math.floor(Math.random() * spots.length);
        chosen.add(idx);
        const isFake = config.fake_ghosts_enabled && spawnCount === 2 && i === 1;
        // Fixed lifespan: real = 1.1s, fake = 0.7s (per product spec)
        const lifespan = isFake ? FAKE_GHOST_LIFESPAN_MS : REAL_GHOST_LIFESPAN_MS;
        newOnes.push({
          id: ++idRef.current,
          spotIdx: idx,
          isFake,
          bornAt: Date.now(),
          lifespan,
        });
      }
      setGhosts(g => [...g, ...newOnes]);
      newOnes.forEach(ng => {
        window.setTimeout(() => {
          setGhosts(gs => gs.filter(x => x.id !== ng.id));
        }, ng.lifespan);
      });
    };

    scheduleNext();

    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (spawnTimerRef.current) window.clearTimeout(spawnTimerRef.current);
    };
  }, [status, config]);

  // Win / lose check
  useEffect(() => {
    if (status !== "playing") return;
    if (caught >= config.target_ghosts) {
      const used = config.duration_seconds - timeLeft;
      setStatus("win");
      onWin?.({ caught, timeUsed: used });
      return;
    }
    if (timeLeft <= 0) {
      setStatus("lose");
      onLose?.({ caught });
    }
  }, [caught, timeLeft, status, config, onWin, onLose]);

  const catchGhost = (g: ActiveGhost) => {
    if (status !== "playing") return;
    setGhosts(gs => gs.filter(x => x.id !== g.id));
    if (!g.isFake) setCaught(c => c + 1);
  };

  const timerPct = useMemo(
    () => (timeLeft / Math.max(1, config.duration_seconds)) * 100,
    [timeLeft, config.duration_seconds]
  );

  if (!config.enabled) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
        <div>
          <Ghost className="w-16 h-16 mx-auto text-muted-foreground mb-3" />
          <p className="text-lg font-bold mb-3">اللعبة متوقفة حاليًا</p>
          <Button onClick={onExit} variant="outline">رجوع</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-md mx-auto aspect-[3/5] rounded-3xl overflow-hidden shadow-2xl border border-purple-900/50 select-none">
      <img
        src={bg}
        alt="بيت الأشباح"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50" />

      {/* HUD */}
      <div className="absolute top-0 inset-x-0 z-20 p-3 flex items-center justify-between gap-2">
        <button
          onClick={onExit}
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center text-white"
          aria-label="خروج"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 mx-2">
          <div className="h-2 rounded-full bg-white/15 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500"
              animate={{ width: `${timerPct}%` }}
              transition={{ ease: "linear", duration: 0.4 }}
            />
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px] font-bold text-white/90 drop-shadow">
            <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {timeLeft}s</span>
            <span className="flex items-center gap-1"><Ghost className="w-3 h-3" /> {caught}/{config.target_ghosts}</span>
          </div>
        </div>
      </div>

      {/* Ghosts */}
      <AnimatePresence>
        {status === "playing" && ghosts.map(g => {
          const spot = spots[g.spotIdx];
          return (
            <motion.button
              key={g.id}
              initial={{ opacity: 0, scale: 0.4, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.2, y: -20 }}
              transition={{ duration: 0.18 }}
              onClick={() => catchGhost(g)}
              onTouchStart={() => catchGhost(g)}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 w-14 h-14 md:w-16 md:h-16 rounded-full"
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              aria-label={g.isFake ? "شبح وهمي" : "شبح"}
            >
              <img
                src={ghostImg}
                alt=""
                draggable={false}
                className="w-full h-full object-contain drop-shadow-[0_0_18px_rgba(139,92,246,0.9)]"
                style={{ filter: g.isFake ? "hue-rotate(310deg) saturate(1.8) brightness(0.9)" : "none" }}
              />
            </motion.button>
          );
        })}
      </AnimatePresence>

      <AnimatePresence>
        {showTutorial && (
          <Tutorial
            targetGhosts={config.target_ghosts}
            duration={config.duration_seconds}
            fakeGhostsEnabled={config.fake_ghosts_enabled}
            onStart={startGame}
          />
        )}
        {status === "win" && (
          <WinScreen caught={caught} target={config.target_ghosts} timeUsed={config.duration_seconds - timeLeft} onRetry={retry} onExit={onExit} />
        )}
        {status === "lose" && (
          <LoseScreen caught={caught} target={config.target_ghosts} onRetry={retry} onExit={onExit} />
        )}
      </AnimatePresence>
    </div>
  );
};
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Clock, ArrowRight, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useContestData, ensureProgress } from "@/hooks/useContest";
import { LevelMap } from "@/components/contest/LevelMap";
import { ContestLevel } from "@/components/contest/ContestLevel";
import { SurpriseBox } from "@/components/contest/SurpriseBox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formatRemaining = (endsAt: string) => {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "انتهت";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (d > 0) return `${d}ي ${h}س ${m}د`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export default function ContestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { contest, questions, rewards, progress, loading, refresh, setProgress } = useContestData(id);
  const [playingLevel, setPlayingLevel] = useState<number | null>(null);
  const [surpriseLevel, setSurpriseLevel] = useState<number | null>(null);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("account_type").eq("id", user.id).maybeSingle()
      .then(({ data }) => setAccountType(data?.account_type ?? null));
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const rewardLevels = useMemo(() => rewards.map((r) => r.at_level), [rewards]);
  const surpriseReward = useMemo(
    () => rewards.find((r) => r.at_level === surpriseLevel) || null,
    [rewards, surpriseLevel]
  );

  const ended = contest ? new Date(contest.ends_at).getTime() <= Date.now() : false;

  const isAllowed = useMemo(() => {
    if (!contest || !accountType) return false;
    if (contest.target_audience === "all_vip") return ["vip1", "vip2", "vip3"].includes(accountType);
    return contest.target_audience === accountType;
  }, [contest, accountType]);

  const handleSelectLevel = async (lvl: number) => {
    if (!contest || !user) return;
    if (ended) { toast.error("انتهت المسابقة"); return; }
    const p = await ensureProgress(contest.id, user.id, progress);
    if (!progress) setProgress(p);

    const isCompleted = p.completed_levels.includes(lvl);
    const isReward = rewardLevels.includes(lvl) || lvl % contest.surprise_every === 0;

    if (isReward) {
      // Allowed if previous level is completed (or it's level 1)
      if (lvl > 1 && !p.completed_levels.includes(lvl - 1)) {
        toast.error("أكمل المستوى السابق أولاً");
        return;
      }
      // Auto-mark surprise level as completed (no questions for it)
      if (!isCompleted) {
        const newCompleted = Array.from(new Set([...p.completed_levels, lvl])).sort((a, b) => a - b);
        const nextLevel = Math.max(p.current_level, lvl + 1);
        await supabase.from("contest_progress" as any).update({
          completed_levels: newCompleted,
          current_level: nextLevel,
        } as any).eq("contest_id", contest.id).eq("user_id", user.id);
        refresh();
      }
      setSurpriseLevel(lvl);
      return;
    }

    if (lvl > p.current_level && !isCompleted) {
      toast.error("هذا المستوى مغلق");
      return;
    }
    setPlayingLevel(lvl);
  };

  const handleLevelComplete = async (lvl: number) => {
    await refresh();
    setPlayingLevel(null);
    if (!contest) return;
    const next = lvl + 1;
    // If next is a reward level, automatically open surprise
    const isNextReward = rewardLevels.includes(next) || (next <= contest.total_levels && next % contest.surprise_every === 0);
    if (isNextReward && next <= contest.total_levels) {
      setTimeout(() => handleSelectLevel(next), 600);
    } else {
      toast.success(`أحسنت! تم فتح المستوى ${next}`);
    }
  };

  if (loading || authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">جاري التحميل...</div>;
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-background p-6 text-center">
        <p className="text-muted-foreground">المسابقة غير متاحة</p>
        <Button variant="outline" onClick={() => navigate("/app/offers")} className="mt-4">رجوع</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0518] via-background to-background pb-12" dir="rtl">
      {/* Hero */}
      <div className="relative">
        {contest.banner_url ? (
          <img src={contest.banner_url} alt={contest.title} className="w-full h-56 object-cover" />
        ) : (
          <div className="h-40 bg-gradient-to-br from-amber-500/30 via-purple-700/30 to-rose-700/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="absolute bottom-3 right-4 left-4">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">{contest.title}</h1>
          {contest.subtitle && <p className="text-amber-200 text-sm">{contest.subtitle}</p>}
        </div>
      </div>

      <div className="px-4 -mt-2 space-y-4">
        {/* Status bar */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[120px] rounded-xl border border-amber-400/30 bg-card/60 backdrop-blur p-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-300" />
            <div>
              <div className="text-[10px] text-muted-foreground">المتبقي</div>
              <div className="text-sm font-bold text-amber-300">{formatRemaining(contest.ends_at)}</div>
            </div>
          </div>
          <div className="flex-1 min-w-[120px] rounded-xl border border-emerald-400/30 bg-card/60 backdrop-blur p-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-emerald-300" />
            <div>
              <div className="text-[10px] text-muted-foreground">تقدمك</div>
              <div className="text-sm font-bold text-emerald-300">
                {progress?.completed_levels.length || 0} / {contest.total_levels}
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-card overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((progress?.completed_levels.length || 0) / contest.total_levels) * 100}%` }}
            className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600"
          />
        </div>

        {contest.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{contest.description}</p>
        )}

        {!isAllowed && (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-rose-400 mt-0.5" />
            <div>
              <p className="font-bold text-rose-200">هذه المسابقة حصرية لمستخدمي VIP</p>
              <p className="text-xs text-rose-200/80 mt-1">قم بترقية باقتك للمشاركة</p>
              <Button size="sm" onClick={() => navigate("/app/packages")} className="mt-2 bg-rose-500 hover:bg-rose-600">
                ترقية الباقة
              </Button>
            </div>
          </div>
        )}

        {ended && (
          <div className="rounded-xl border border-muted bg-muted/30 p-3 text-center text-sm text-muted-foreground">
            انتهت هذه المسابقة
          </div>
        )}

        {/* Body */}
        {isAllowed && !ended && playingLevel === null && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-300">
              <Sparkles className="w-4 h-4" />
              <h2 className="font-bold">المستويات</h2>
              <span className="text-[10px] text-muted-foreground">(كل {contest.surprise_every} مستويات صندوق مفاجأة)</span>
            </div>
            <LevelMap
              totalLevels={contest.total_levels}
              currentLevel={progress?.current_level || 1}
              completedLevels={progress?.completed_levels || []}
              surpriseEvery={contest.surprise_every}
              claimedRewards={progress?.claimed_rewards || []}
              rewardLevels={rewardLevels}
              onSelect={handleSelectLevel}
            />
            <Button
              onClick={() => handleSelectLevel(progress?.current_level || 1)}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold h-12"
            >
              {progress ? `تابع المستوى ${progress.current_level}` : "ابدأ المسابقة"}
            </Button>
          </div>
        )}

        {isAllowed && !ended && playingLevel !== null && progress && user && (
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-4">
            <ContestLevel
              contestId={contest.id}
              userId={user.id}
              level={playingLevel}
              questions={questions}
              progress={progress}
              onLevelComplete={handleLevelComplete}
              onExit={() => { setPlayingLevel(null); refresh(); }}
            />
          </div>
        )}
      </div>

      <SurpriseBox
        open={surpriseLevel !== null}
        onClose={() => { setSurpriseLevel(null); refresh(); }}
        contestId={contest.id}
        level={surpriseLevel || 0}
        reward={surpriseReward}
        onClaimed={() => { refresh(); }}
      />
    </div>
  );
}
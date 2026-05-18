import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Contest {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  banner_url: string | null;
  starts_at: string;
  ends_at: string;
  target_audience: string;
  total_levels: number;
  questions_per_level: number;
  surprise_every: number;
  is_active: boolean;
  show_on_home: boolean;
  show_on_offers: boolean;
}

export interface ContestQuestion {
  id: string;
  contest_id: string;
  level_number: number;
  order_in_level: number;
  category: string;
  question_text: string;
  correct_answer: string;
  wrong_answers: string[];
}

export interface ContestReward {
  id: string;
  contest_id: string;
  at_level: number;
  reward_type: "balance" | "points" | "discount_percent" | "vip_upgrade_temp" | string;
  reward_value: Record<string, any>;
  title: string;
  icon: string | null;
}

export interface ContestProgress {
  id?: string;
  contest_id: string;
  user_id: string;
  current_level: number;
  completed_levels: number[];
  current_question_index: number;
  correct_count: number;
  wrong_count: number;
  claimed_rewards: number[];
  finished_at: string | null;
}

const isVipAudience = (target: string, accountType: string | null | undefined) => {
  if (!accountType) return false;
  if (target === "all_vip") return ["vip1", "vip2", "vip3"].includes(accountType);
  return target === accountType;
};

export const useActiveContest = (location: "home" | "offers") => {
  const { user } = useAuth();
  const [contest, setContest] = useState<Contest | null>(null);
  const [accountType, setAccountType] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("id", user.id)
      .maybeSingle();
    setAccountType(profile?.account_type ?? null);

    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from("contests" as any)
      .select("*")
      .eq("is_active", true)
      .lte("starts_at", nowIso)
      .gt("ends_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1);

    const list = ((data || []) as unknown as Contest[]).filter((c) =>
      location === "home" ? c.show_on_home : c.show_on_offers
    );
    const first = list[0];
    if (first && isVipAudience(first.target_audience, profile?.account_type)) {
      setContest(first);
    } else {
      setContest(null);
    }
  }, [user, location]);

  useEffect(() => {
    fetchData();
    const ch = supabase
      .channel(`contests-${location}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contests" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData, location]);

  return { contest, accountType };
};

export const useContestData = (contestId: string | undefined) => {
  const { user } = useAuth();
  const [contest, setContest] = useState<Contest | null>(null);
  const [questions, setQuestions] = useState<ContestQuestion[]>([]);
  const [rewards, setRewards] = useState<ContestReward[]>([]);
  const [progress, setProgress] = useState<ContestProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!contestId || !user) return;
    setLoading(true);
    const [{ data: c }, { data: q }, { data: r }, { data: p }] = await Promise.all([
      supabase.from("contests" as any).select("*").eq("id", contestId).maybeSingle(),
      supabase.from("contest_questions" as any).select("*").eq("contest_id", contestId).order("level_number").order("order_in_level"),
      supabase.from("contest_rewards" as any).select("*").eq("contest_id", contestId).order("at_level"),
      supabase.from("contest_progress" as any).select("*").eq("contest_id", contestId).eq("user_id", user.id).maybeSingle(),
    ]);
    setContest((c as any) ?? null);
    setQuestions(((q as any) ?? []).map((x: any) => ({
      ...x,
      wrong_answers: Array.isArray(x.wrong_answers) ? x.wrong_answers : [],
    })));
    setRewards((r as any) ?? []);
    setProgress((p as any) ?? null);
    setLoading(false);
  }, [contestId, user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { contest, questions, rewards, progress, loading, refresh, setProgress };
};

export const ensureProgress = async (
  contestId: string,
  userId: string,
  existing: ContestProgress | null
): Promise<ContestProgress> => {
  if (existing) return existing;
  const { data, error } = await supabase
    .from("contest_progress" as any)
    .insert({ contest_id: contestId, user_id: userId } as any)
    .select("*")
    .single();
  if (error) throw error;
  return data as any as ContestProgress;
};

// Deterministic shuffle keyed by question id so order stays consistent per question
// but is different across questions (prevents memorizing positions across the quiz).
export const shuffleAnswers = (q: ContestQuestion): { text: string; isCorrect: boolean }[] => {
  const items = [
    { text: q.correct_answer, isCorrect: true },
    ...q.wrong_answers.slice(0, 3).map((w) => ({ text: w, isCorrect: false })),
  ];
  // seed from question id chars
  let seed = 0;
  for (let i = 0; i < q.id.length; i++) seed = (seed * 31 + q.id.charCodeAt(i)) >>> 0;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};
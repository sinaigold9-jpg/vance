import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { shuffleAnswers, type ContestQuestion, type ContestProgress } from "@/hooks/useContest";

interface Props {
  contestId: string;
  userId: string;
  level: number;
  questions: ContestQuestion[];
  progress: ContestProgress;
  onLevelComplete: (level: number) => void;
  onExit: () => void;
}

export const ContestLevel = ({
  contestId, userId, level, questions, progress, onLevelComplete, onExit,
}: Props) => {
  const levelQuestions = useMemo(
    () => questions.filter((q) => q.level_number === level).sort((a, b) => a.order_in_level - b.order_in_level),
    [questions, level]
  );

  const initialIdx = level === progress.current_level ? progress.current_question_index : 0;
  const [qIndex, setQIndex] = useState(Math.min(initialIdx, Math.max(levelQuestions.length - 1, 0)));
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [wrongHere, setWrongHere] = useState(false);

  if (levelQuestions.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        لا توجد أسئلة لهذا المستوى بعد.
        <Button variant="outline" onClick={onExit} className="mt-4 block mx-auto">رجوع</Button>
      </div>
    );
  }

  const current = levelQuestions[qIndex];
  const answers = useMemo(() => shuffleAnswers(current), [current]);

  const handleSelect = async (idx: number) => {
    if (locked) return;
    setLocked(true);
    setSelected(idx);
    const isCorrect = answers[idx].isCorrect;

    await supabase.from("contest_answers" as any).insert({
      contest_id: contestId,
      user_id: userId,
      question_id: current.id,
      selected_index: idx,
      is_correct: isCorrect,
    } as any);

    if (!isCorrect) {
      setWrongHere(true);
      await supabase.from("contest_progress" as any).update({
        wrong_count: progress.wrong_count + 1,
        last_played_at: new Date().toISOString(),
      } as any).eq("contest_id", contestId).eq("user_id", userId);
      setTimeout(async () => {
        toast.error("إجابة خاطئة، تابع للسؤال التالي");
        const nextIdx = qIndex + 1;
        if (nextIdx >= levelQuestions.length) {
          const newCompleted = Array.from(new Set([...progress.completed_levels, level])).sort((a, b) => a - b);
          const nextLevel = Math.max(progress.current_level, level + 1);
          await supabase.from("contest_progress" as any).update({
            completed_levels: newCompleted,
            current_level: nextLevel,
            current_question_index: 0,
            last_played_at: new Date().toISOString(),
          } as any).eq("contest_id", contestId).eq("user_id", userId);
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
          onLevelComplete(level);
        } else {
          await supabase.from("contest_progress" as any).update({
            current_question_index: nextIdx,
            last_played_at: new Date().toISOString(),
          } as any).eq("contest_id", contestId).eq("user_id", userId);
          setQIndex(nextIdx);
          setSelected(null);
          setLocked(false);
          setWrongHere(false);
        }
      }, 1200);
      return;
    }

    setTimeout(async () => {
      const nextIdx = qIndex + 1;
      if (nextIdx >= levelQuestions.length) {
        // level completed
        const newCompleted = Array.from(new Set([...progress.completed_levels, level])).sort((a, b) => a - b);
        const nextLevel = Math.max(progress.current_level, level + 1);
        await supabase.from("contest_progress" as any).update({
          completed_levels: newCompleted,
          current_level: nextLevel,
          current_question_index: 0,
          correct_count: progress.correct_count + 1,
          last_played_at: new Date().toISOString(),
        } as any).eq("contest_id", contestId).eq("user_id", userId);
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        onLevelComplete(level);
      } else {
        await supabase.from("contest_progress" as any).update({
          current_question_index: nextIdx,
          correct_count: progress.correct_count + 1,
          last_played_at: new Date().toISOString(),
        } as any).eq("contest_id", contestId).eq("user_id", userId);
        setQIndex(nextIdx);
        setSelected(null);
        setLocked(false);
      }
    }, 700);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <button onClick={onExit} className="hover:text-amber-300 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> خروج
        </button>
        <span>سؤال {qIndex + 1} من {levelQuestions.length}</span>
        <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold">مستوى {level}</span>
      </div>

      <div className="h-1.5 bg-card rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
          style={{ width: `${((qIndex) / levelQuestions.length) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0, ...(wrongHere ? { x: [0, -10, 10, -10, 10, 0] } : {}) }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="text-[10px] inline-block px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
            {current.category}
          </div>
          <h3 className="text-lg font-bold text-foreground leading-relaxed">{current.question_text}</h3>

          <div className="grid gap-2.5">
            {answers.map((a, idx) => {
              const isSelected = selected === idx;
              const showResult = locked && isSelected;
              const showCorrect = locked && wrongHere && a.isCorrect;
              return (
                <motion.button
                  key={idx}
                  whileTap={{ scale: locked ? 1 : 0.98 }}
                  disabled={locked}
                  onClick={() => handleSelect(idx)}
                  className={`relative text-right px-4 py-3.5 rounded-xl border-2 font-medium transition-all ${
                    showResult
                      ? a.isCorrect
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-100"
                        : "bg-rose-500/20 border-rose-400 text-rose-100"
                      : showCorrect
                      ? "bg-emerald-500/10 border-emerald-400/60 text-emerald-100"
                      : "bg-card border-border hover:border-amber-400 hover:bg-amber-500/10"
                  }`}
                >
                  <span className="inline-block w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold leading-6 ml-2">
                    {["أ", "ب", "ج", "د"][idx]}
                  </span>
                  {a.text}
                  {showResult && (
                    a.isCorrect
                      ? <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                      : <XCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-400" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
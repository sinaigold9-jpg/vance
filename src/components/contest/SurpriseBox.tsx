import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { HelpCircle, Sparkles, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ContestReward } from "@/hooks/useContest";

interface Props {
  open: boolean;
  onClose: () => void;
  contestId: string;
  level: number;
  reward: ContestReward | null;
  onClaimed: () => void;
}

const describe = (r: ContestReward) => {
  switch (r.reward_type) {
    case "balance": return `+${r.reward_value.amount || 0} ج.م رصيد`;
    case "points": return `+${r.reward_value.points || 0} نقطة`;
    case "discount_percent":
      return `خصم ${r.reward_value.percent || 0}% على ترقية الباقة لمدة ${r.reward_value.days || 7} يوم`;
    case "vip_upgrade_temp":
      return `ترقية مؤقتة إلى ${(r.reward_value.to || "").toUpperCase()} لمدة ${r.reward_value.days || 7} يوم`;
    default: return r.title;
  }
};

export const SurpriseBox = ({ open, onClose, contestId, level, reward, onClaimed }: Props) => {
  const [opened, setOpened] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const handleOpen = async () => {
    if (!reward || claiming) return;
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_contest_reward" as any, {
      _contest_id: contestId,
      _level: level,
    });
    setClaiming(false);
    if (error) {
      toast.error("تعذّر استلام المكافأة: " + error.message);
      return;
    }
    setOpened(true);
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 }, colors: ["#fbbf24", "#a78bfa", "#f472b6", "#34d399"] });
    try {
      const a = new Audio("/task-complete.wav");
      a.volume = 0.5;
      a.play().catch(() => {});
    } catch {}
    onClaimed();
  };

  const close = () => {
    setOpened(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-sm bg-gradient-to-br from-[#1a0f2e] via-[#2a1a4d] to-[#1a0f2e] border-amber-400/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-center text-amber-300 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" />
            صندوق المفاجأة - مستوى {level}
            <Sparkles className="w-5 h-5" />
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-6">
          <AnimatePresence mode="wait">
            {!opened ? (
              <motion.button
                key="closed"
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleOpen}
                disabled={claiming}
                className="w-36 h-36 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center shadow-[0_0_60px_rgba(251,191,36,0.5)] disabled:opacity-50"
              >
                <HelpCircle className="w-16 h-16 text-black/80 animate-pulse" />
              </motion.button>
            ) : reward && (
              <motion.div
                key="opened"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-36 h-36 rounded-3xl bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center shadow-[0_0_80px_rgba(251,191,36,0.8)]">
                  <Gift className="w-16 h-16 text-black" />
                </div>
                <p className="text-xl font-bold text-amber-300">{reward.title}</p>
                <p className="text-center text-white/90">{describe(reward)}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {!opened && (
            <p className="text-center text-amber-100/80 text-sm mt-4">انقر على الصندوق لفتحه واستلام المكافأة</p>
          )}

          {opened && (
            <Button onClick={close} className="mt-6 bg-amber-500 hover:bg-amber-600 text-black font-bold">
              متابعة
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
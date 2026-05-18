import { motion } from "framer-motion";
import { Check, Lock, HelpCircle, Star } from "lucide-react";

interface Props {
  totalLevels: number;
  currentLevel: number;
  completedLevels: number[];
  surpriseEvery: number;
  claimedRewards: number[];
  rewardLevels: number[];
  onSelect: (level: number) => void;
}

export const LevelMap = ({
  totalLevels, currentLevel, completedLevels, surpriseEvery,
  claimedRewards, rewardLevels, onSelect,
}: Props) => {
  return (
    <div className="grid grid-cols-5 gap-2.5">
      {Array.from({ length: totalLevels }, (_, i) => {
        const lvl = i + 1;
        const isCompleted = completedLevels.includes(lvl);
        const isCurrent = lvl === currentLevel && !isCompleted;
        const isLocked = lvl > currentLevel && !isCompleted;
        const isSurprise = rewardLevels.includes(lvl) || lvl % surpriseEvery === 0;
        const isClaimed = claimedRewards.includes(lvl);

        return (
          <motion.button
            key={lvl}
            whileTap={{ scale: 0.92 }}
            disabled={isLocked}
            onClick={() => onSelect(lvl)}
            className={`relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center text-xs font-bold transition-all ${
              isSurprise
                ? isClaimed
                  ? "bg-gradient-to-br from-amber-500 to-amber-700 border-amber-300 text-black"
                  : "bg-gradient-to-br from-purple-700 to-purple-900 border-amber-400 text-amber-300 animate-pulse"
                : isCompleted
                ? "bg-gradient-to-br from-emerald-600 to-emerald-800 border-emerald-400 text-white"
                : isCurrent
                ? "bg-gradient-to-br from-amber-500 to-amber-700 border-amber-300 text-black shadow-lg shadow-amber-500/40"
                : "bg-card border-border text-muted-foreground opacity-60"
            }`}
          >
            {isSurprise ? (
              isClaimed ? <Star className="w-4 h-4" /> : <HelpCircle className="w-5 h-5" />
            ) : isCompleted ? (
              <Check className="w-4 h-4" />
            ) : isLocked ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <span>{lvl}</span>
            )}
            <span className="text-[9px] mt-0.5 opacity-80">م{lvl}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
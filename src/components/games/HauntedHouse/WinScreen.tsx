import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

export const WinScreen = ({ caught, target, timeUsed, onRetry, onExit }: {
  caught: number; target: number; timeUsed: number; onRetry: () => void; onExit: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="absolute inset-0 z-30 bg-background/95 backdrop-blur-md flex items-center justify-center p-6"
  >
    <div className="max-w-sm w-full bg-card border border-primary/40 rounded-3xl p-6 text-center shadow-2xl">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", delay: 0.1 }}
        className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center mb-4 shadow-lg"
      >
        <Trophy className="w-12 h-12 text-white" />
      </motion.div>
      <h2 className="text-3xl font-black text-gradient-gold mb-2">مبروك! فزت 🎉</h2>
      <p className="text-muted-foreground mb-4">
        أمسكت {caught} من أصل {target} في {timeUsed} ثانية
      </p>
      <div className="flex gap-2">
        <Button onClick={onRetry} className="flex-1 bg-gradient-gold text-primary-foreground font-bold">
          العب مرة أخرى
        </Button>
        <Button onClick={onExit} variant="outline" className="flex-1">خروج</Button>
      </div>
    </div>
  </motion.div>
);
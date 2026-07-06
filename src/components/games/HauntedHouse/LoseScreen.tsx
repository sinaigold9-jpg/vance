import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Ghost } from "lucide-react";

export const LoseScreen = ({ caught, target, onRetry, onExit }: {
  caught: number; target: number; onRetry: () => void; onExit: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="absolute inset-0 z-30 bg-background/95 backdrop-blur-md flex items-center justify-center p-6"
  >
    <div className="max-w-sm w-full bg-card border border-destructive/40 rounded-3xl p-6 text-center shadow-2xl">
      <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center mb-4 shadow-lg">
        <Ghost className="w-12 h-12 text-white" />
      </div>
      <h2 className="text-2xl font-black text-destructive mb-2">انتهى الوقت! 😱</h2>
      <p className="text-muted-foreground mb-4">
        أمسكت {caught} فقط من {target} — حاول مرة أخرى
      </p>
      <div className="flex gap-2">
        <Button onClick={onRetry} className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-bold">
          إعادة المحاولة
        </Button>
        <Button onClick={onExit} variant="outline" className="flex-1">خروج</Button>
      </div>
    </div>
  </motion.div>
);
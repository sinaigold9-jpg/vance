import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Ghost, Timer, Target, Zap } from "lucide-react";

interface Props {
  targetGhosts: number;
  duration: number;
  fakeGhostsEnabled: boolean;
  onStart: () => void;
}

export const Tutorial = ({ targetGhosts, duration, fakeGhostsEnabled, onStart }: Props) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute inset-0 z-30 bg-background/95 backdrop-blur-md flex items-center justify-center p-6"
    >
      <div className="max-w-sm w-full bg-card border border-primary/30 rounded-3xl p-6 shadow-2xl">
        <div className="text-center mb-5">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-600 to-indigo-800 flex items-center justify-center mb-3 shadow-lg">
            <Ghost className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black">بيت الأشباح 👻</h2>
          <p className="text-sm text-muted-foreground mt-1">طريقة اللعب</p>
        </div>

        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <Target className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <span>أمسك <b>{targetGhosts} أشباح</b> للفوز — يظهر الشبح في أماكن عشوائية ويختفي بسرعة!</span>
          </li>
          <li className="flex items-start gap-3">
            <Timer className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <span>لديك <b>{duration} ثانية</b> فقط لإكمال المهمة.</span>
          </li>
          <li className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <span>سرعة ظهور الأشباح تزداد تدريجيًا مع مرور الوقت.</span>
          </li>
          {fakeGhostsEnabled && (
            <li className="flex items-start gap-3">
              <Ghost className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>احذر <b>الأشباح الوهمية</b> ذات اللون الأحمر — لا تُحتسب!</span>
            </li>
          )}
        </ul>

        <Button onClick={onStart} className="w-full mt-6 h-12 bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-bold">
          ابدأ اللعبة
        </Button>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          سيتم عرض هذه الشاشة مرة واحدة فقط
        </p>
      </div>
    </motion.div>
  );
};
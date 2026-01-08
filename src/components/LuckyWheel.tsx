import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Gift, Lock, Package, HelpCircle, RotateCcw, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface LuckyWheelProps {
  prizes: number[];
  canSpin: boolean;
  onSpin: (prize: number) => void;
  accountType?: string;
  luckyWheelUsed?: boolean;
  trialExpired?: boolean;
}

type PrizeType = {
  label: string;
  value: number;
  type: "cash" | "retry" | "box";
  color: string;
};

const wheelPrizes: PrizeType[] = [
  { label: "3 جنيه", value: 3, type: "cash", color: "from-red-500 to-red-600" },
  { label: "إعادة", value: 0, type: "retry", color: "from-yellow-400 to-yellow-500" },
  { label: "5 جنيه", value: 5, type: "cash", color: "from-green-500 to-green-600" },
  { label: "1 جنيه", value: 1, type: "cash", color: "from-pink-500 to-pink-600" },
  { label: "10 جنيه", value: 10, type: "cash", color: "from-purple-500 to-purple-600" },
  { label: "صندوق", value: 0, type: "box", color: "from-amber-500 to-amber-600" },
];

type BoxPrize = "extra_spin" | "cash_5" | "nothing";

export const LuckyWheel = ({ 
  canSpin, 
  onSpin, 
  accountType = "beginner", 
  luckyWheelUsed = false,
  trialExpired = false 
}: LuckyWheelProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showPrize, setShowPrize] = useState(false);
  const [wonPrize, setWonPrize] = useState<PrizeType | null>(null);
  const [showBox, setShowBox] = useState(false);
  const [boxChoice, setBoxChoice] = useState<BoxPrize | null>(null);
  const [extraSpin, setExtraSpin] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  const isBeginnerLocked = accountType === "beginner" && luckyWheelUsed;
  const isTrialLocked = trialExpired && accountType === "beginner";

  const handleSpin = () => {
    if (!canSpin || isSpinning || isBeginnerLocked || isTrialLocked) return;

    setIsSpinning(true);
    setShowPrize(false);
    setShowBox(false);
    setBoxChoice(null);

    const prizeIndex = Math.floor(Math.random() * wheelPrizes.length);
    const segmentAngle = 360 / wheelPrizes.length;
    
    const spins = 5 + Math.random() * 3;
    const targetAngle = 360 - (prizeIndex * segmentAngle + segmentAngle / 2);
    const finalRotation = rotation + spins * 360 + targetAngle;

    setRotation(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      const prize = wheelPrizes[prizeIndex];
      setWonPrize(prize);

      if (prize.type === "retry") {
        toast({
          title: "🔄 حاول مرة أخرى!",
          description: "لم تربح هذه المرة، جرب حظك مجدداً!",
        });
        setExtraSpin(true);
      } else if (prize.type === "box") {
        setShowBox(true);
      } else {
        setShowPrize(true);
        onSpin(prize.value);
        toast({
          title: "🎊 مبروك!",
          description: `لقد ربحت ${prize.value} جنيه من عجلة الحظ!`,
        });
      }
    }, 4000);
  };

  const handleBoxChoice = (choice: BoxPrize) => {
    setBoxChoice(choice);
    setShowBox(false);
    
    if (choice === "extra_spin") {
      toast({
        title: "🎰 دورة إضافية!",
        description: "حصلت على دورة إضافية مجانية!",
      });
      setExtraSpin(true);
    } else if (choice === "cash_5") {
      toast({
        title: "🎊 مبروك!",
        description: "لقد ربحت 5 جنيه!",
      });
      onSpin(5);
      setWonPrize({ label: "5 جنيه", value: 5, type: "cash", color: "from-emerald-500 to-emerald-600" });
      setShowPrize(true);
    } else {
      toast({
        title: "❓ لا شيء هذه المرة",
        description: "حظاً أوفر في المرة القادمة!",
      });
      onSpin(0);
    }
  };

  const handleExtraSpin = () => {
    setExtraSpin(false);
    handleSpin();
  };

  const getButtonText = () => {
    if (isSpinning) return "جاري الدوران...";
    if (isTrialLocked) return "انتهت الفترة التجريبية";
    if (isBeginnerLocked) return "استخدمت فرصتك الوحيدة";
    if (extraSpin) return "🎰 دورة إضافية مجانية!";
    if (!canSpin && accountType !== "beginner") return "انتظر للغد";
    if (!canSpin) return "غير متاح";
    return "🎰 دوّر العجلة";
  };

  const getSubtitle = () => {
    if (isTrialLocked) return "قم بترقية باقتك للوصول لعجلة الحظ";
    if (isBeginnerLocked) return "المبتدئون يحصلون على فرصة واحدة فقط. قم بالترقية لـ VIP للحصول على دورة يومية!";
    if (accountType === "beginner") return "لديك فرصة واحدة فقط! استخدمها بحكمة";
    return canSpin ? "جرب حظك الآن!" : "عُد غداً للمحاولة";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-card rounded-2xl shadow-card border border-border/50 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center shadow-gold animate-pulse-glow">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">عجلة الحظ</h2>
            <p className="text-muted-foreground text-sm">{getSubtitle()}</p>
          </div>
        </div>

        <div className="relative flex flex-col items-center">
          <div className="absolute top-0 z-10 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-primary" />

          <div className="relative w-72 h-72 my-4">
            {(isBeginnerLocked || isTrialLocked) && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-sm rounded-full z-20 flex items-center justify-center">
                <div className="text-center">
                  <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isTrialLocked ? "انتهت التجربة" : "تم استخدام الفرصة"}
                  </p>
                </div>
              </div>
            )}
            
            <motion.div
              ref={wheelRef}
              className="w-full h-full rounded-full border-4 border-primary shadow-gold overflow-hidden"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
              }}
            >
              {wheelPrizes.map((prize, index) => {
                const segmentAngle = 360 / wheelPrizes.length;
                const startAngle = index * segmentAngle;
                const midAngle = startAngle + segmentAngle / 2;

                return (
                  <div
                    key={index}
                    className="absolute w-full h-full"
                    style={{
                      clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((startAngle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((startAngle - 90) * Math.PI / 180)}%, ${50 + 50 * Math.cos((startAngle + segmentAngle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((startAngle + segmentAngle - 90) * Math.PI / 180)}%)`,
                    }}
                  >
                    <div className={`w-full h-full bg-gradient-to-br ${prize.color}`}>
                      <div
                        className="absolute text-white font-bold text-xs whitespace-nowrap"
                        style={{
                          top: "30%",
                          left: "50%",
                          transform: `rotate(${midAngle}deg) translateX(-50%)`,
                          transformOrigin: "center center",
                          textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                        }}
                      >
                        {prize.type === "box" ? "📦" : prize.type === "retry" ? "🔄" : prize.label}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-gold shadow-lg flex items-center justify-center">
                <Gift className="w-8 h-8 text-primary-foreground" />
              </div>
            </motion.div>
          </div>

          <Button
            onClick={extraSpin ? handleExtraSpin : handleSpin}
            disabled={(!canSpin && !extraSpin) || isSpinning || isBeginnerLocked || isTrialLocked}
            className="w-full h-14 text-xl font-bold rounded-xl bg-gradient-gold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {getButtonText()}
          </Button>

          <AnimatePresence>
            {showPrize && wonPrize && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-2xl"
              >
                <div className="text-center">
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                    <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
                  </motion.div>
                  <p className="text-2xl font-bold text-foreground mb-2">مبروك! 🎉</p>
                  <p className="text-4xl font-black text-gradient-gold">{wonPrize.value} جنيه</p>
                  <Button onClick={() => setShowPrize(false)} variant="outline" className="mt-4">إغلاق</Button>
                </div>
              </motion.div>
            )}

            {showBox && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center rounded-2xl"
              >
                <div className="text-center p-4">
                  <Package className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                  <p className="text-xl font-bold text-foreground mb-4">🎁 صندوق الحظ!</p>
                  <p className="text-sm text-muted-foreground mb-4">اختر واحداً من الخيارات</p>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      className="flex flex-col items-center p-4 h-auto"
                      onClick={() => handleBoxChoice("extra_spin")}
                    >
                      <RotateCcw className="w-8 h-8 text-primary mb-2" />
                      <span className="text-xs">دورة إضافية</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex flex-col items-center p-4 h-auto"
                      onClick={() => handleBoxChoice("cash_5")}
                    >
                      <Coins className="w-8 h-8 text-emerald mb-2" />
                      <span className="text-xs">5 جنيه</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex flex-col items-center p-4 h-auto"
                      onClick={() => handleBoxChoice("nothing")}
                    >
                      <HelpCircle className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-xs">؟</span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
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
  bgColor: string;
  icon: string;
};

const wheelPrizes: PrizeType[] = [
  { label: "3 جنيه", value: 3, type: "cash", color: "#FFFFFF", bgColor: "#1a1a2e", icon: "💰" },
  { label: "إعادة", value: 0, type: "retry", color: "#FFFFFF", bgColor: "#dc2626", icon: "🔄" },
  { label: "5 جنيه", value: 5, type: "cash", color: "#FFFFFF", bgColor: "#ec4899", icon: "💵" },
  { label: "1 جنيه", value: 1, type: "cash", color: "#FFFFFF", bgColor: "#78350f", icon: "🪙" },
  { label: "10 جنيه", value: 10, type: "cash", color: "#1a1a2e", bgColor: "#fbbf24", icon: "💎" },
  { label: "صندوق", value: 0, type: "box", color: "#FFFFFF", bgColor: "#16a34a", icon: "🎁" },
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

  // Beginners can use the wheel during the 7-day trial period (once only)
  const isBeginnerLocked = accountType === "beginner" && luckyWheelUsed;
  // Lock after trial expires
  const isTrialLocked = trialExpired && accountType === "beginner";

  const handleSpin = () => {
    if (!canSpin || isSpinning || isBeginnerLocked || isTrialLocked) return;

    setIsSpinning(true);
    setShowPrize(false);
    setShowBox(false);
    setBoxChoice(null);

    const prizeIndex = Math.floor(Math.random() * wheelPrizes.length);
    const segmentAngle = 360 / wheelPrizes.length;
    
    // Calculate target angle so the pointer (at top) lands on the correct segment
    const targetAngle = 360 - (prizeIndex * segmentAngle + segmentAngle / 2);
    // Ensure final rotation modulo 360 equals targetAngle exactly
    const fullSpins = Math.floor(rotation / 360) + 5 + Math.floor(Math.random() * 3);
    const finalRotation = fullSpins * 360 + targetAngle;

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
      setWonPrize({ label: "5 جنيه", value: 5, type: "cash", color: "#FFFFFF", bgColor: "#16a34a", icon: "💵" });
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
    if (isBeginnerLocked) return "استخدمت فرصتك الوحيدة خلال الفترة التجريبية. قم بالترقية لـ VIP للحصول على دورة يومية!";
    if (accountType === "beginner") return "لديك فرصة واحدة فقط خلال الـ 7 أيام التجريبية! استخدمها بحكمة";
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
          {/* Wheel Pointer */}
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
            
            {/* Wheel */}
            <motion.div
              ref={wheelRef}
              className="w-full h-full rounded-full border-4 border-primary shadow-gold overflow-hidden relative"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
              }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {wheelPrizes.map((prize, index) => {
                  const segmentAngle = 360 / wheelPrizes.length;
                  const startAngle = index * segmentAngle - 90;
                  const endAngle = startAngle + segmentAngle;
                  const midAngle = startAngle + segmentAngle / 2;
                  
                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;
                  const midRad = (midAngle * Math.PI) / 180;
                  
                  const x1 = 100 + 100 * Math.cos(startRad);
                  const y1 = 100 + 100 * Math.sin(startRad);
                  const x2 = 100 + 100 * Math.cos(endRad);
                  const y2 = 100 + 100 * Math.sin(endRad);
                  
                  const largeArc = segmentAngle > 180 ? 1 : 0;
                  
                  const textX = 100 + 55 * Math.cos(midRad);
                  const textY = 100 + 55 * Math.sin(midRad);
                  
                  const iconX = 100 + 75 * Math.cos(midRad);
                  const iconY = 100 + 75 * Math.sin(midRad);

                  return (
                    <g key={index}>
                      <path
                        d={`M 100 100 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={prize.bgColor}
                        stroke="#fff"
                        strokeWidth="1"
                      />
                      <text
                        x={iconX}
                        y={iconY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="20"
                        transform={`rotate(${midAngle + 90}, ${iconX}, ${iconY})`}
                      >
                        {prize.icon}
                      </text>
                      <text
                        x={textX}
                        y={textY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={prize.color}
                        fontSize="10"
                        fontWeight="bold"
                        transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                      >
                        {prize.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
              
              {/* Center Hub */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-gold shadow-lg flex items-center justify-center z-10">
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
                      className="flex flex-col items-center p-4 h-auto border-2 border-primary/30 hover:border-primary"
                      onClick={() => handleBoxChoice("extra_spin")}
                    >
                      <RotateCcw className="w-8 h-8 text-primary mb-2" />
                      <span className="text-xs">دورة إضافية</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex flex-col items-center p-4 h-auto border-2 border-emerald/30 hover:border-emerald"
                      onClick={() => handleBoxChoice("cash_5")}
                    >
                      <Coins className="w-8 h-8 text-emerald mb-2" />
                      <span className="text-xs">5 جنيه</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex flex-col items-center p-4 h-auto border-2 border-muted-foreground/30 hover:border-muted-foreground"
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
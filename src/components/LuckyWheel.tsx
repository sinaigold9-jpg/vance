import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Gift, Lock, Package, HelpCircle, RotateCcw, Coins, Crown } from "lucide-react";
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

// Real casino-style palette — alternating red / black / gold like classic lottery wheels
const wheelPrizes: PrizeType[] = [
  { label: "3 جنيه", value: 3, type: "cash", color: "#FFFFFF", bgColor: "#b91c1c", icon: "💰" },
  { label: "إعادة", value: 0, type: "retry", color: "#fbbf24", bgColor: "#0f172a", icon: "🔄" },
  { label: "5 جنيه", value: 5, type: "cash", color: "#0f172a", bgColor: "#fbbf24", icon: "💵" },
  { label: "1 جنيه", value: 1, type: "cash", color: "#FFFFFF", bgColor: "#b91c1c", icon: "🪙" },
  { label: "10 جنيه", value: 10, type: "cash", color: "#FFFFFF", bgColor: "#0f172a", icon: "💎" },
  { label: "صندوق", value: 0, type: "box", color: "#0f172a", bgColor: "#fbbf24", icon: "🎁" },
];

type BoxPrize = "extra_spin" | "cash_5" | "nothing";

export const LuckyWheel = ({
  canSpin,
  onSpin,
  accountType = "beginner",
  luckyWheelUsed = false,
  trialExpired = false,
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

  const handleSpin = useCallback(() => {
    if (!canSpin || isSpinning || isBeginnerLocked || isTrialLocked) return;
    setIsSpinning(true);
    setShowPrize(false);
    setShowBox(false);
    setBoxChoice(null);

    const prizeIndex = Math.floor(Math.random() * wheelPrizes.length);
    const segmentAngle = 360 / wheelPrizes.length;
    const targetAngle = 360 - (prizeIndex * segmentAngle + segmentAngle / 2);
    const fullSpins = Math.floor(rotation / 360) + 5 + Math.floor(Math.random() * 3);
    const finalRotation = fullSpins * 360 + targetAngle;

    setRotation(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      const prize = wheelPrizes[prizeIndex];
      setWonPrize(prize);

      if (prize.type === "retry") {
        toast({ title: "🔄 حاول مرة أخرى!", description: "لم تربح هذه المرة، جرب حظك مجدداً!" });
        setExtraSpin(true);
      } else if (prize.type === "box") {
        setShowBox(true);
      } else {
        setShowPrize(true);
        onSpin(prize.value);
        toast({ title: "🎊 مبروك!", description: `لقد ربحت ${prize.value} جنيه من عجلة الحظ!` });
      }
    }, 4500);
  }, [canSpin, isSpinning, isBeginnerLocked, isTrialLocked, rotation, onSpin]);

  const handleBoxChoice = (choice: BoxPrize) => {
    setBoxChoice(choice);
    setShowBox(false);
    if (choice === "extra_spin") {
      toast({ title: "🎰 دورة إضافية!", description: "حصلت على دورة إضافية مجانية!" });
      setExtraSpin(true);
    } else if (choice === "cash_5") {
      toast({ title: "🎊 مبروك!", description: "لقد ربحت 5 جنيه!" });
      onSpin(5);
      setWonPrize({ label: "5 جنيه", value: 5, type: "cash", color: "#FFFFFF", bgColor: "#10b981", icon: "💵" });
      setShowPrize(true);
    } else {
      toast({ title: "❓ لا شيء هذه المرة", description: "حظاً أوفر في المرة القادمة!" });
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
    if (isBeginnerLocked) return "قم بالترقية لـ VIP للحصول على دورة يومية!";
    if (accountType === "beginner") return "لديك فرصة واحدة خلال الـ 7 أيام التجريبية!";
    return canSpin ? "جرب حظك الآن!" : "عُد غداً للمحاولة";
  };

  const segmentAngle = 360 / wheelPrizes.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* Premium header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-5 py-2 mb-3">
          <Crown className="w-5 h-5 text-primary" />
          <span className="font-bold text-primary text-sm">عجلة الحظ الذهبية</span>
        </div>
        <p className="text-muted-foreground text-sm">{getSubtitle()}</p>
      </div>

      <div className="relative flex flex-col items-center">
        {/* Outer glow ring */}
        <div className="absolute w-[320px] h-[320px] rounded-full opacity-50"
          style={{
            background: "radial-gradient(circle, hsl(45 93% 47% / 0.15) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            marginTop: "-20px",
          }}
        />

        {/* Pointer - Premium triangle */}
        <div className="relative z-20 mb-[-14px]">
          <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[28px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
        </div>

        {/* Wheel container with decorative ring */}
        <div className="relative w-[290px] h-[290px]">
          {(isBeginnerLocked || isTrialLocked) && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm rounded-full z-20 flex items-center justify-center">
              <div className="text-center">
                <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-bold">
                  {isTrialLocked ? "انتهت التجربة" : "تم استخدام الفرصة"}
                </p>
              </div>
            </div>
          )}

          {/* Decorative outer ring with dots */}
          <div className="absolute inset-0 rounded-full border-[6px] border-primary/40 z-10" />
          <div className="absolute inset-[-3px] rounded-full z-10">
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i * 15) * Math.PI / 180;
              const x = 50 + 50 * Math.cos(angle);
              const y = 50 + 50 * Math.sin(angle);
              return (
                <div
                  key={i}
                  className={`absolute w-2 h-2 rounded-full ${i % 2 === 0 ? "bg-primary" : "bg-primary/40"}`}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: "translate(-50%, -50%)",
                    animation: isSpinning ? `pulse 0.5s ease-in-out ${i * 0.05}s infinite` : undefined,
                  }}
                />
              );
            })}
          </div>

          {/* SVG Wheel */}
          <motion.div
            ref={wheelRef}
            className="w-full h-full rounded-full overflow-hidden relative shadow-2xl"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? "transform 4.5s cubic-bezier(0.15, 0.6, 0.15, 1)" : "none",
            }}
          >
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <defs>
                {wheelPrizes.map((prize, index) => (
                  <radialGradient key={`grad-${index}`} id={`grad-${index}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={prize.bgColor} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={prize.bgColor} />
                  </radialGradient>
                ))}
                <filter id="inner-shadow">
                  <feDropShadow dx="0" dy="0" stdDeviation="2" floodOpacity="0.3" />
                </filter>
              </defs>
              {wheelPrizes.map((prize, index) => {
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
                const textX = 100 + 52 * Math.cos(midRad);
                const textY = 100 + 52 * Math.sin(midRad);
                const iconX = 100 + 72 * Math.cos(midRad);
                const iconY = 100 + 72 * Math.sin(midRad);

                return (
                  <g key={index}>
                    <path
                      d={`M 100 100 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={`url(#grad-${index})`}
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="1.5"
                      filter="url(#inner-shadow)"
                    />
                    {/* Divider line highlight */}
                    <line
                      x1="100" y1="100"
                      x2={x1} y2={y1}
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="2"
                    />
                    <text
                      x={iconX} y={iconY}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize="22"
                      transform={`rotate(${midAngle + 90}, ${iconX}, ${iconY})`}
                    >
                      {prize.icon}
                    </text>
                    <text
                      x={textX} y={textY}
                      textAnchor="middle" dominantBaseline="middle"
                      fill={prize.color}
                      fontSize="11" fontWeight="bold"
                      transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                      style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
                    >
                      {prize.label}
                    </text>
                  </g>
                );
              })}
              {/* Center shadow ring */}
              <circle cx="100" cy="100" r="22" fill="rgba(0,0,0,0.2)" />
            </svg>

            {/* Center Hub - Premium */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[52px] h-[52px] rounded-full bg-gradient-gold shadow-gold flex items-center justify-center z-10 border-2 border-white/30">
              <Gift className="w-6 h-6 text-primary-foreground" />
            </div>
          </motion.div>
        </div>

        {/* Spin Button - Premium */}
        <motion.div className="w-full mt-6" whileTap={{ scale: 0.97 }}>
          <Button
            onClick={extraSpin ? handleExtraSpin : handleSpin}
            disabled={(!canSpin && !extraSpin) || isSpinning || isBeginnerLocked || isTrialLocked}
            className={`w-full h-14 text-lg font-black rounded-2xl transition-all duration-300 ${
              isSpinning
                ? "bg-muted text-muted-foreground"
                : extraSpin
                  ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30"
                  : "bg-gradient-gold hover:opacity-90 shadow-gold text-primary-foreground"
            }`}
          >
            {isSpinning && (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="inline-block ml-2"
              >
                ⏳
              </motion.span>
            )}
            {getButtonText()}
          </Button>
        </motion.div>

        {/* Prize Overlays */}
        <AnimatePresence>
          {showPrize && wonPrize && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 bg-background/85 backdrop-blur-md flex items-center justify-center rounded-2xl z-30"
            >
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
                </motion.div>
                <p className="text-2xl font-black text-foreground mb-2">🎉 مبروك!</p>
                <p className="text-5xl font-black text-gradient-gold mb-1">{wonPrize.value}</p>
                <p className="text-lg text-muted-foreground">جنيه مصري</p>
                <Button onClick={() => setShowPrize(false)} variant="outline" className="mt-4 rounded-xl">
                  إغلاق
                </Button>
              </div>
            </motion.div>
          )}

          {showBox && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center rounded-2xl z-30"
            >
              <div className="text-center p-4">
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                  <Package className="w-16 h-16 text-primary mx-auto mb-4" />
                </motion.div>
                <p className="text-xl font-black text-foreground mb-4">🎁 صندوق الحظ!</p>
                <p className="text-sm text-muted-foreground mb-4">اختر واحداً من الخيارات</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { choice: "extra_spin" as BoxPrize, icon: RotateCcw, label: "دورة إضافية", color: "text-primary border-primary/40 hover:bg-primary/10" },
                    { choice: "cash_5" as BoxPrize, icon: Coins, label: "5 جنيه", color: "text-emerald border-emerald/40 hover:bg-emerald/10" },
                    { choice: "nothing" as BoxPrize, icon: HelpCircle, label: "؟", color: "text-muted-foreground border-muted hover:bg-muted/30" },
                  ].map(({ choice, icon: Icon, label, color }) => (
                    <Button
                      key={choice}
                      variant="outline"
                      className={`flex flex-col items-center p-4 h-auto border-2 rounded-xl ${color}`}
                      onClick={() => handleBoxChoice(choice)}
                    >
                      <Icon className="w-8 h-8 mb-2" />
                      <span className="text-xs font-bold">{label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

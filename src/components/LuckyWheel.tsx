import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Gift, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface LuckyWheelProps {
  prizes: number[];
  canSpin: boolean;
  onSpin: (prize: number) => void;
  accountType?: string;
  luckyWheelUsed?: boolean;
}

export const LuckyWheel = ({ prizes, canSpin, onSpin, accountType = "beginner", luckyWheelUsed = false }: LuckyWheelProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showPrize, setShowPrize] = useState(false);
  const [wonPrize, setWonPrize] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const colors = [
    "from-gray-900 to-black",
    "from-red-600 to-red-700",
    "from-pink-400 to-pink-500",
    "from-amber-700 to-amber-800",
    "from-yellow-500 to-amber-500",
    "from-yellow-400 to-yellow-500",
    "from-green-500 to-green-600",
    "from-orange-500 to-orange-600",
  ];

  // Check if beginner already used their one-time spin
  const isBeginnerLocked = accountType === "beginner" && luckyWheelUsed;

  const handleSpin = () => {
    if (!canSpin || isSpinning || isBeginnerLocked) return;

    setIsSpinning(true);
    setShowPrize(false);

    // Random prize index
    const prizeIndex = Math.floor(Math.random() * prizes.length);
    const segmentAngle = 360 / prizes.length;
    
    // Calculate final rotation (multiple full spins + landing on prize)
    const spins = 5 + Math.random() * 3; // 5-8 full spins
    const targetAngle = 360 - (prizeIndex * segmentAngle + segmentAngle / 2);
    const finalRotation = rotation + spins * 360 + targetAngle;

    setRotation(finalRotation);

    // Show prize after spin completes
    setTimeout(() => {
      setIsSpinning(false);
      setWonPrize(prizes[prizeIndex]);
      setShowPrize(true);
      onSpin(prizes[prizeIndex]);
      toast({
        title: "🎊 مبروك!",
        description: `لقد ربحت ${prizes[prizeIndex]} جنيه من عجلة الحظ!`,
      });
    }, 4000);
  };

  const getButtonText = () => {
    if (isSpinning) return "جاري الدوران...";
    if (isBeginnerLocked) return "استخدمت فرصتك الوحيدة";
    if (!canSpin && accountType !== "beginner") return "انتظر للغد";
    if (!canSpin) return "غير متاح";
    return "🎰 دوّر العجلة";
  };

  const getSubtitle = () => {
    if (isBeginnerLocked) {
      return "المبتدئون يحصلون على فرصة واحدة فقط. قم بالترقية لـ VIP للحصول على دورة يومية!";
    }
    if (accountType === "beginner") {
      return "لديك فرصة واحدة فقط! استخدمها بحكمة";
    }
    return canSpin ? "جرب حظك الآن!" : "عُد غداً للمحاولة";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-card rounded-2xl shadow-card border border-border/50 overflow-hidden"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center shadow-gold animate-pulse-glow">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">عجلة الحظ</h2>
            <p className="text-muted-foreground text-sm">
              {getSubtitle()}
            </p>
          </div>
        </div>

        {/* Wheel Container */}
        <div className="relative flex flex-col items-center">
          {/* Pointer */}
          <div className="absolute top-0 z-10 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-primary" />

          {/* Wheel */}
          <div className="relative w-72 h-72 my-4">
            {isBeginnerLocked && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-sm rounded-full z-20 flex items-center justify-center">
                <div className="text-center">
                  <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">تم استخدام الفرصة</p>
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
              {prizes.map((prize, index) => {
                const segmentAngle = 360 / prizes.length;
                const startAngle = index * segmentAngle;

                return (
                  <div
                    key={index}
                    className={`absolute w-full h-full`}
                    style={{
                      clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((startAngle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((startAngle - 90) * Math.PI / 180)}%, ${50 + 50 * Math.cos((startAngle + segmentAngle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((startAngle + segmentAngle - 90) * Math.PI / 180)}%)`,
                    }}
                  >
                    <div className={`w-full h-full bg-gradient-to-br ${colors[index % colors.length]}`}>
                      <div
                        className="absolute text-white font-bold text-sm"
                        style={{
                          top: "25%",
                          left: "50%",
                          transform: `rotate(${startAngle + segmentAngle / 2}deg) translateY(-10px)`,
                          transformOrigin: "center center",
                        }}
                      >
                        {prize}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Center Circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-gold shadow-lg flex items-center justify-center">
                <Gift className="w-8 h-8 text-primary-foreground" />
              </div>
            </motion.div>
          </div>

          {/* Spin Button */}
          <Button
            onClick={handleSpin}
            disabled={!canSpin || isSpinning || isBeginnerLocked}
            className="w-full h-14 text-xl font-bold rounded-xl bg-gradient-gold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {getButtonText()}
          </Button>

          {/* Prize Popup */}
          <AnimatePresence>
            {showPrize && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-2xl"
              >
                <div className="text-center">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
                  </motion.div>
                  <p className="text-2xl font-bold text-foreground mb-2">مبروك! 🎉</p>
                  <p className="text-4xl font-black text-gradient-gold">{wonPrize} جنيه</p>
                  <Button
                    onClick={() => setShowPrize(false)}
                    variant="outline"
                    className="mt-4"
                  >
                    إغلاق
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

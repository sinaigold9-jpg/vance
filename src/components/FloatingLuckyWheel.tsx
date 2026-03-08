import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export const FloatingLuckyWheel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPulse, setShowPulse] = useState(true);

  const shouldHide = !location.pathname.startsWith("/app") || location.pathname === "/app/wheel";

  useEffect(() => {
    if (shouldHide) return;
    const interval = setInterval(() => {
      setShowPulse(true);
      setTimeout(() => setShowPulse(false), 2000);
    }, 5000);
    return () => clearInterval(interval);
  }, [shouldHide]);

  if (shouldHide) return null;

  return (
    <motion.div
      className="fixed top-20 left-4 z-40"
      onHoverStart={() => setIsExpanded(true)}
      onHoverEnd={() => setIsExpanded(false)}
    >
      {/* Outer glow pulse */}
      <AnimatePresence>
        {showPulse && (
          <motion.div
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle, hsl(45 93% 47% / 0.4), transparent)" }}
          />
        )}
      </AnimatePresence>

      <motion.button
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => navigate("/app/wheel")}
        className="relative w-14 h-14 rounded-full shadow-elevated flex items-center justify-center overflow-hidden border-2 border-primary/40"
        style={{
          background: "linear-gradient(135deg, hsl(45 93% 47%) 0%, hsl(35 90% 40%) 100%)",
        }}
      >
        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
        <div className="relative w-10 h-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="w-full h-full"
          >
            <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-lg">
              {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                <path
                  key={i}
                  d={`M20,20 L20,4 A16,16 0 0,1 ${20 + 16 * Math.sin(((angle + 60) * Math.PI) / 180)},${20 - 16 * Math.cos(((angle + 60) * Math.PI) / 180)} Z`}
                  fill={i % 2 === 0 ? "#fef3c7" : "#fbbf24"}
                  stroke="rgba(245,158,11,0.5)"
                  strokeWidth="0.3"
                  transform={`rotate(${angle}, 20, 20)`}
                />
              ))}
              <circle cx="20" cy="20" r="5" fill="hsl(222 47% 8%)" stroke="hsl(45 93% 47%)" strokeWidth="1" />
              <circle cx="20" cy="20" r="2" fill="#fef3c7" />
            </svg>
          </motion.div>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2">
            <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[9px] border-l-transparent border-r-transparent border-t-destructive drop-shadow-md" />
          </div>
        </div>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.9 }}
            className="absolute top-1/2 left-16 -translate-y-1/2 glass-strong rounded-xl px-3 py-1.5 shadow-elevated whitespace-nowrap"
          >
            <p className="text-sm font-bold text-foreground">عجلة الحظ 🎁</p>
            <p className="text-[10px] text-muted-foreground">اضغط لتجرب حظك</p>
          </motion.div>
        )}
      </AnimatePresence>

      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-primary"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            x: [0, (i - 1) * 20],
            y: [0, -15 - i * 5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.3,
            repeatDelay: 2,
          }}
          style={{ left: "50%", top: "50%" }}
        />
      ))}
    </motion.div>
  );
};

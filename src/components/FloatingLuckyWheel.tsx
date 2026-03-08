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
      {/* Pulse ring */}
      <AnimatePresence>
        {showPulse && (
          <motion.div
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 1.8, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
          />
        )}
      </AnimatePresence>

      {/* Main button */}
      <motion.button
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate("/app/wheel")}
        className="relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #dc2626 100%)",
          boxShadow: "0 4px 20px rgba(245, 158, 11, 0.4), inset 0 2px 4px rgba(255,255,255,0.3)",
        }}
      >
        {/* Inner glow */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-amber-300/40 to-transparent" />
        
        {/* Wheel icon with segments */}
        <div className="relative w-10 h-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="w-full h-full"
          >
            <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-lg">
              {/* Wheel segments */}
              {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                <path
                  key={i}
                  d={`M20,20 L20,4 A16,16 0 0,1 ${20 + 16 * Math.sin((angle + 60) * Math.PI / 180)},${20 - 16 * Math.cos((angle + 60) * Math.PI / 180)} Z`}
                  fill={i % 2 === 0 ? "#fef3c7" : "#fbbf24"}
                  stroke="#f59e0b"
                  strokeWidth="0.5"
                  transform={`rotate(${angle}, 20, 20)`}
                />
              ))}
              {/* Center circle */}
              <circle cx="20" cy="20" r="5" fill="#dc2626" stroke="#b91c1c" strokeWidth="1" />
              <circle cx="20" cy="20" r="2.5" fill="#fef3c7" />
            </svg>
          </motion.div>
          
          {/* Pointer */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2">
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[10px] border-l-transparent border-r-transparent border-t-red-600 drop-shadow-md" />
          </div>
        </div>
      </motion.button>

      {/* Expanded label */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.9 }}
            className="absolute top-1/2 left-16 -translate-y-1/2 bg-card border border-border rounded-lg px-3 py-1.5 shadow-lg whitespace-nowrap"
          >
            <p className="text-sm font-bold text-foreground">عجلة الحظ 🎁</p>
            <p className="text-[10px] text-muted-foreground">اضغط لتجرب حظك</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sparkles */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-amber-300"
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

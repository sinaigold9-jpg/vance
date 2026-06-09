import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

// Casino-style lottery wheel button — alternating red/gold segments,
// blinking lights ring, ticker arm, glowing hub. Looks like the real thing.
const SEGMENTS = 8;
const SEG_COLORS = ["#dc2626", "#fbbf24", "#0f172a", "#fbbf24", "#dc2626", "#fbbf24", "#0f172a", "#fbbf24"];

export const FloatingLuckyWheel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  if (location.pathname !== "/app") return null;

  const segAngle = 360 / SEGMENTS;

  return (
    <motion.div
      initial={{ scale: 0, y: 40 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      className="fixed bottom-20 left-4 z-40"
    >
      {/* Outer pulsing glow */}
      <motion.div
        className="absolute inset-0 rounded-full -m-2"
        animate={{ boxShadow: [
          "0 0 0 0 hsl(45 93% 47% / 0.6)",
          "0 0 0 14px hsl(45 93% 47% / 0)",
        ]}}
        transition={{ duration: 1.8, repeat: Infinity }}
      />

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => navigate("/app/wheel")}
        aria-label="عجلة الحظ"
        className="relative w-16 h-16 rounded-full overflow-visible"
        style={{
          filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.6)) drop-shadow(0 0 12px hsl(45 93% 47% / 0.5))",
        }}
      >
        {/* Outer brass bezel */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "conic-gradient(from 0deg, #fde68a, #b45309, #fde68a, #92400e, #fde68a, #b45309, #fde68a)",
          }}
        />

        {/* Blinking light bulbs around bezel */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          const r = 30;
          return (
            <motion.span
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                left: `calc(50% + ${r * Math.cos(a)}px - 3px)`,
                top: `calc(50% + ${r * Math.sin(a)}px - 3px)`,
                background: i % 2 ? "#fff7ed" : "#fbbf24",
                boxShadow: "0 0 6px #fde047",
              }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.08 }}
            />
          );
        })}

        {/* Spinning wheel face */}
        <motion.div
          className="absolute inset-[5px] rounded-full overflow-hidden border-2 border-amber-900/60"
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {Array.from({ length: SEGMENTS }).map((_, i) => {
              const start = i * segAngle - 90;
              const end = start + segAngle;
              const s = (start * Math.PI) / 180;
              const e = (end * Math.PI) / 180;
              const x1 = 50 + 50 * Math.cos(s);
              const y1 = 50 + 50 * Math.sin(s);
              const x2 = 50 + 50 * Math.cos(e);
              const y2 = 50 + 50 * Math.sin(e);
              return (
                <path
                  key={i}
                  d={`M50,50 L${x1},${y1} A50,50 0 0,1 ${x2},${y2} Z`}
                  fill={SEG_COLORS[i]}
                  stroke="#fde68a"
                  strokeWidth="0.8"
                />
              );
            })}
            {/* Center hub */}
            <circle cx="50" cy="50" r="10" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
            <circle cx="50" cy="50" r="4" fill="#fbbf24" />
          </svg>
        </motion.div>

        {/* Fixed ticker arm pointing down (like real wheels) */}
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 z-10"
          style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.7))" }}
        >
          <div className="w-0 h-0 border-l-[7px] border-r-[7px] border-t-[12px] border-l-transparent border-r-transparent border-t-red-600" />
        </div>
      </motion.button>
    </motion.div>
  );
};

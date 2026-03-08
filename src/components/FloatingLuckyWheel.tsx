import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export const FloatingLuckyWheel = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Only show on /app routes, not on tasks page (where wheel already exists)
  if (!location.pathname.startsWith("/app") || location.pathname === "/app/tasks") return null;

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => navigate("/app/tasks")}
      className="fixed top-20 left-4 z-30 w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 shadow-lg flex items-center justify-center border-2 border-amber-300/50"
      title="عجلة الحظ"
    >
      <span className="text-xl animate-spin" style={{ animationDuration: "3s" }}>🎡</span>
    </motion.button>
  );
};

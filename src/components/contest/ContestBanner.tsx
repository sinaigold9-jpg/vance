import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Clock, ChevronLeft } from "lucide-react";
import { useActiveContest } from "@/hooks/useContest";

interface Props { location: "home" | "offers"; }

const formatRemaining = (endsAt: string) => {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "انتهت";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (d > 0) return `${d}ي ${h}س ${m}د`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const ContestBanner = ({ location }: Props) => {
  const { contest } = useActiveContest(location);
  const navigate = useNavigate();
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!contest) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [contest]);

  if (!contest) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/app/contest/${contest.id}`)}
      className="relative overflow-hidden rounded-2xl cursor-pointer border border-amber-400/30 bg-gradient-to-br from-[#1a1030] via-[#2a1a4d] to-[#3a1d1d] shadow-[0_10px_40px_-10px_rgba(201,168,76,0.4)] hover:shadow-[0_15px_50px_-10px_rgba(201,168,76,0.6)] transition-shadow"
    >
      {contest.banner_url ? (
        <div className="relative">
          <img src={contest.banner_url} alt={contest.title} className="w-full h-44 object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        </div>
      ) : (
        <div className="h-32 bg-gradient-to-br from-amber-500/20 via-purple-700/20 to-rose-700/20" />
      )}

      <div className="absolute inset-0 p-4 flex flex-col justify-end">
        <div className="flex items-center gap-2 mb-2">
          <div className="px-2 py-1 rounded-full bg-amber-400/90 text-black text-[10px] font-bold flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            مسابقة حصرية
          </div>
          <div className="px-2 py-1 rounded-full bg-black/60 backdrop-blur text-amber-300 text-[10px] font-bold flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRemaining(contest.ends_at)}
          </div>
        </div>
        <h3 className="font-bold text-white text-lg drop-shadow-lg">{contest.title}</h3>
        {contest.subtitle && (
          <p className="text-sm text-amber-100/90 line-clamp-1">{contest.subtitle}</p>
        )}
        <div className="flex items-center gap-1 text-amber-300 text-xs mt-2 font-medium">
          <span>ابدأ التحدي</span>
          <ChevronLeft className="w-3 h-3" />
        </div>
      </div>
    </motion.div>
  );
};
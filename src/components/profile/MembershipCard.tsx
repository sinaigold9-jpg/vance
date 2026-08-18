import { motion } from "framer-motion";
import { Crown, Star } from "lucide-react";
const appIcon = "/placeholder.svg";
import { sanitizeEmoji } from "@/lib/emojis";

interface MembershipCardProps {
  fullName: string;
  membershipId: string;
  accountType: string;
  avatarUrl?: string | null;
  badge?: { name: string; icon: string; color: string } | null;
  joinedAt?: string | null;
}

const packageLabel = (t: string) => {
  switch (t) {
    case "vip3":
      return "VIP 3";
    case "vip2":
      return "VIP 2";
    case "vip1":
      return "VIP 1";
    default:
      return "الباقة المجانية";
  }
};

export const MembershipCard = ({
  fullName,
  membershipId,
  accountType,
  avatarUrl,
  badge,
  joinedAt,
}: MembershipCardProps) => {
  const joined = joinedAt
    ? new Date(joinedAt).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
      })
    : "—";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl p-5 text-white shadow-2xl"
      style={{
        background:
          "linear-gradient(135deg, hsl(43 96% 40%) 0%, hsl(38 92% 55%) 50%, hsl(28 84% 45%) 100%)",
      }}
    >
      <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-black/20 blur-3xl" />

      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-black tracking-tight">A Pro</div>
          <span className="text-[10px] uppercase tracking-widest bg-black/25 rounded-full px-2 py-0.5">
            Membership
          </span>
        </div>
        <Crown className="w-6 h-6 opacity-90" />
      </div>

      <div className="relative flex items-center gap-4 mb-5">
        <div className="w-16 h-16 rounded-full ring-2 ring-white/60 overflow-hidden bg-white/20 backdrop-blur shrink-0">
          <img
            src={avatarUrl || appIcon}
            alt={fullName}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-widest opacity-80">
            Card Holder
          </p>
          <p className="text-lg font-bold truncate">{fullName}</p>

          {badge && (
            <div
              className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{ backgroundColor: "rgba(0,0,0,0.28)", color: "#fff" }}
            >
              <span>{sanitizeEmoji(badge.icon)}</span>
              <span>{badge.name}</span>
            </div>
          )}
        </div>
      </div>

      <div
        className="relative font-mono text-xl tracking-[0.3em] font-bold drop-shadow mb-4"
        dir="ltr"
      >
        {membershipId.replace(/(\d{3})(?=\d)/g, "$1 ")}
      </div>

      <div className="relative flex items-end justify-between text-xs">
        <div>
          <p className="opacity-80 text-[10px] uppercase tracking-widest">
            Member Since
          </p>
          <p className="font-bold">{joined}</p>
        </div>

        <div className="text-left">
          <p className="opacity-80 text-[10px] uppercase tracking-widest">
            Plan
          </p>
          <p className="font-bold flex items-center gap-1 justify-end">
            <Star className="w-3 h-3" />
            {packageLabel(accountType)}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

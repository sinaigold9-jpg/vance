import { motion } from "framer-motion";
import {
  Home,
  Package,
  Gift,
  Users,
  Wallet,
  Calculator,
  HeadphonesIcon,
  Megaphone,
  User,
  Trophy,
  Tag,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import type { FC, SVGProps } from "react";

interface HomeGridProps {
  onTabChange: (tab: string) => void;
  activeTab: string;
}

interface GridItem {
  id: string;
  icon: FC<SVGProps<SVGSVGElement>>;
  label: string;
  description: string;
  gradient: string;
}

const gridItems: GridItem[] = [
  { id: "home", icon: Home, label: "الرئيسية", description: "عرض الرصيد والأرباح", gradient: "from-blue-500 to-blue-600" },
  { id: "tasks", icon: Gift, label: "المهام", description: "أكمل المهام واربح", gradient: "from-purple-500 to-violet-500" },
  { id: "offers", icon: Trophy, label: "العروض", description: "العروض والمسابقات", gradient: "from-amber-500 to-yellow-500" },
  { id: "packages", icon: Package, label: "الباقات", description: "اختر باقتك المناسبة", gradient: "from-amber-500 to-orange-500" },
  { id: "earnings", icon: Calculator, label: "الأرباح", description: "حاسبة أرباح الباقات", gradient: "from-emerald-500 to-green-500" },
  { id: "ads", icon: Megaphone, label: "الإعلانات", description: "تصفح وأنشئ إعلانات", gradient: "from-rose-500 to-pink-500" },
  { id: "wallet", icon: Wallet, label: "المحفظة", description: "إيداع وسحب الأموال", gradient: "from-pink-500 to-rose-500" },
  { id: "team", icon: Users, label: "الفريق", description: "ادعُ أصدقاءك واربح", gradient: "from-cyan-500 to-teal-500" },
  { id: "profile", icon: User, label: "الملف الشخصي", description: "إعدادات حسابك", gradient: "from-violet-500 to-purple-500" },
  { id: "sponsor", icon: Tag, label: "ممول", description: "إنشاء صفحة ممول", gradient: "from-orange-500 to-amber-500" },
  { id: "support", icon: HeadphonesIcon, label: "الدعم", description: "تواصل معنا للمساعدة", gradient: "from-indigo-500 to-blue-600" },
  { id: "faq", icon: HelpCircle, label: "الأسئلة الشائعة", description: "دليل استخدام التطبيق", gradient: "from-teal-500 to-cyan-500" },
  { id: "updates", icon: Sparkles, label: "الجديد", description: "آخر التحديثات والمزايا", gradient: "from-fuchsia-500 to-pink-500" },
];

export const HomeGrid = ({ onTabChange, activeTab }: HomeGridProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {gridItems.map((item, index) => {
          const isActive = activeTab === item.id;
          const IconComponent = item.icon;
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.04, y: -3 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onTabChange(item.id)}
              className={`
                relative flex flex-col items-center justify-center p-4 md:p-6
                rounded-2xl border transition-all duration-300 card-hover
                ${isActive
                  ? "bg-primary/10 border-primary/50 shadow-lg shadow-primary/15"
                  : "bg-card/60 border-border/30 hover:border-primary/20 hover:bg-card/80"
                }
              `}
            >
              {/* Subtle glow for active */}
              {isActive && (
                <div className="absolute inset-0 rounded-2xl bg-primary/5 blur-sm" />
              )}
              <div
                className={`
                  relative w-14 h-14 md:w-16 md:h-16 rounded-2xl mb-2 md:mb-3
                  flex items-center justify-center
                  bg-gradient-to-br ${item.gradient}
                  shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)]
                  ring-2 ring-white/25
                  ring-offset-2 ring-offset-background/40
                  overflow-hidden
                `}
              >
                {/* Inner border highlight */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/30" />
                {/* Glossy top shine */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/35 to-transparent" />
                {/* Sparkle */}
                <motion.span
                  className="pointer-events-none absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.9)]"
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.6, 1.1, 0.6] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.15 }}
                />
                <IconComponent className="w-6 h-6 md:w-7 md:h-7 text-white" />
              </div>
              <span className={`relative text-sm md:text-base font-bold mb-1 ${isActive ? "text-primary" : "text-foreground"}`}>
                {item.label}
              </span>
              <span className="relative text-[10px] md:text-xs text-muted-foreground text-center hidden md:block">
                {item.description}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeGridIndicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

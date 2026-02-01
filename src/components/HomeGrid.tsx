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
  Trophy
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
  { 
    id: "home", 
    icon: Home, 
    label: "الرئيسية", 
    description: "عرض الرصيد والأرباح",
    gradient: "from-blue-500 to-blue-600"
  },
  { 
    id: "packages", 
    icon: Package, 
    label: "الباقات", 
    description: "اختر باقتك المناسبة",
    gradient: "from-amber-500 to-orange-500"
  },
  { 
    id: "earnings", 
    icon: Calculator, 
    label: "الأرباح", 
    description: "حاسبة أرباح الباقات",
    gradient: "from-emerald-500 to-green-500"
  },
  { 
    id: "tasks", 
    icon: Gift, 
    label: "المهام", 
    description: "أكمل المهام واربح",
    gradient: "from-purple-500 to-violet-500"
  },
  { 
    id: "ads", 
    icon: Megaphone, 
    label: "الإعلانات", 
    description: "تصفح وأنشئ إعلانات",
    gradient: "from-rose-500 to-pink-500"
  },
  { 
    id: "wallet", 
    icon: Wallet, 
    label: "المحفظة", 
    description: "إيداع وسحب الأموال",
    gradient: "from-pink-500 to-rose-500"
  },
  { 
    id: "team", 
    icon: Users, 
    label: "الفريق", 
    description: "ادعُ أصدقاءك واربح",
    gradient: "from-cyan-500 to-teal-500"
  },
  { 
    id: "profile", 
    icon: User, 
    label: "الملف الشخصي", 
    description: "إعدادات حسابك",
    gradient: "from-violet-500 to-purple-500"
  },
  { 
    id: "offers", 
    icon: Trophy, 
    label: "العروض", 
    description: "العروض والمسابقات",
    gradient: "from-amber-500 to-yellow-500"
  },
  { 
    id: "support", 
    icon: HeadphonesIcon, 
    label: "الدعم", 
    description: "تواصل معنا للمساعدة",
    gradient: "from-indigo-500 to-blue-600"
  },
];

export const HomeGrid = ({ onTabChange, activeTab }: HomeGridProps) => {
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4">
      {gridItems.map((item, index) => {
        const isActive = activeTab === item.id;
        const IconComponent = item.icon;
        return (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onTabChange(item.id)}
            className={`
              relative flex flex-col items-center justify-center p-4 md:p-6 
              rounded-2xl border transition-all duration-300
              ${isActive 
                ? "bg-primary/10 border-primary shadow-lg shadow-primary/20" 
                : "bg-card/80 border-border/50 hover:border-primary/30 hover:bg-card"
              }
            `}
          >
            <div className={`
              w-12 h-12 md:w-14 md:h-14 rounded-xl mb-2 md:mb-3
              flex items-center justify-center
              bg-gradient-to-br ${item.gradient}
              shadow-lg
            `}>
              <IconComponent className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <span className={`
              text-sm md:text-base font-bold mb-1
              ${isActive ? "text-primary" : "text-foreground"}
            `}>
              {item.label}
            </span>
            <span className="text-[10px] md:text-xs text-muted-foreground text-center hidden md:block">
              {item.description}
            </span>
            {isActive && (
              <motion.div
                layoutId="activeIndicator"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

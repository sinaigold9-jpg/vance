import { motion } from "framer-motion";
import { Home, Package, Gift, Users, Wallet, Calculator, HeadphonesIcon, Sparkles } from "lucide-react";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "home", icon: Home, label: "الرئيسية" },
  { id: "packages", icon: Package, label: "الباقات" },
  { id: "earnings", icon: Calculator, label: "الأرباح" },
  { id: "updates", icon: Sparkles, label: "الجديد" },
  { id: "tasks", icon: Gift, label: "المهام" },
  { id: "wallet", icon: Wallet, label: "المحفظة" },
  { id: "team", icon: Users, label: "الفريق" },
  { id: "support", icon: HeadphonesIcon, label: "الدعم" },
];

export const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 glass-strong z-50 border-t border-border/30"
    >
      <div className="max-w-lg mx-auto px-2 py-1.5">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="navActive"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <motion.div
                  animate={isActive ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="relative z-10"
                >
                  <tab.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                </motion.div>
                <span className={`text-[10px] mt-1 relative z-10 transition-all ${isActive ? "font-black" : "font-medium"}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
};

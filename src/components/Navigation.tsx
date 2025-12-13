import { motion } from "framer-motion";
import { Home, Package, Gift, Users, Wallet, Calculator } from "lucide-react";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "home", icon: Home, label: "الرئيسية" },
  { id: "packages", icon: Package, label: "الباقات" },
  { id: "earnings", icon: Calculator, label: "الأرباح" },
  { id: "tasks", icon: Gift, label: "المهام" },
  { id: "team", icon: Users, label: "الفريق" },
  { id: "wallet", icon: Wallet, label: "المحفظة" },
];

export const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border/50 z-50"
    >
      <div className="max-w-lg mx-auto px-2">
        <div className="flex justify-around items-center h-16">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center w-14 h-full transition-all duration-200 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <motion.div
                  animate={isActive ? { scale: 1.2, y: -4 } : { scale: 1, y: 0 }}
                  className="relative"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -inset-3 bg-primary/20 rounded-xl"
                    />
                  )}
                  <tab.icon className="w-5 h-5 relative z-10" />
                </motion.div>
                <span className={`text-[10px] mt-1 ${isActive ? "font-bold" : ""}`}>
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

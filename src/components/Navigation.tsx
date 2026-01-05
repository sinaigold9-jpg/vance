import { motion } from "framer-motion";
import { Home, Package, Gift, Users, Wallet, Calculator, HeadphonesIcon } from "lucide-react";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "home", icon: Home, label: "الرئيسية" },
  { id: "packages", icon: Package, label: "الباقات" },
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
      className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border/50 z-50"
    >
      <div className="max-w-lg mx-auto px-2 py-2">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <motion.div
                  animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                  className="relative"
                >
                  <tab.icon className="w-5 h-5" />
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

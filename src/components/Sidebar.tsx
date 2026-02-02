import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Menu, X, Home, Package, Gift, Users, Wallet, 
  Settings, LogOut, Shield, ChevronLeft 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: "home", icon: Home, label: "الرئيسية" },
  { id: "packages", icon: Package, label: "الباقات" },
  { id: "tasks", icon: Gift, label: "المهام" },
  { id: "team", icon: Users, label: "الفريق" },
  { id: "wallet", icon: Wallet, label: "المحفظة" },
];

export const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <>
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-50 bg-card/80 backdrop-blur-lg shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-72 bg-card border-l border-border z-50 shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
              <h2 className="text-lg font-bold">القائمة</h2>
            </div>

            {/* Menu Items */}
            <div className="p-4 space-y-2">
              {menuItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                    {isActive && <ChevronLeft className="w-4 h-4 mr-auto" />}
                  </button>
                );
              })}
            </div>

            {/* Admin Link removed - moved to Profile Section */}

            {/* Logout */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5 ml-2" />
                تسجيل الخروج
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

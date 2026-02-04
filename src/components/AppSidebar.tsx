import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AppSidebar = ({ activeTab, onTabChange }: AppSidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    setIsOpen(false);
    navigate("/");
  };

  return (
    <>
      {/* Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="rounded-full"
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
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-72 bg-card border-l border-border z-50 shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold">القائمة</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Footer with Logout only */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
              {user && (
                <Button
                  variant="destructive"
                  className="w-full justify-start gap-2"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  تسجيل الخروج
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

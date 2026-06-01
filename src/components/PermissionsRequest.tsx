import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Image as ImageIcon, FileText, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const LS_KEY = "advance_permissions_asked_v1";

/**
 * One-time prompt asking the user to grant the app access to:
 * - Geolocation
 * - Photos (via file input with capture)
 * - Documents (via file input)
 *
 * The actual native pickers are triggered via hidden <input type="file"> elements.
 * For geolocation we use the browser API.
 */
export const PermissionsRequest = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(LS_KEY)) {
        const t = setTimeout(() => setOpen(true), 1500);
        return () => clearTimeout(t);
      }
    } catch {
      // ignore
    }
  }, []);

  const finish = () => {
    try {
      localStorage.setItem(LS_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  };

  const askLocation = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      () => {},
      () => {},
      { timeout: 10000 }
    );
  };

  const askPhotos = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.style.display = "none";
    document.body.appendChild(input);
    input.click();
    setTimeout(() => input.remove(), 1000);
  };

  const askFiles = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx,.txt,.xls,.xlsx,application/*";
    input.multiple = true;
    input.style.display = "none";
    document.body.appendChild(input);
    input.click();
    setTimeout(() => input.remove(), 1000);
  };

  const grantAll = async () => {
    askLocation();
    finish();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="bg-card border border-border rounded-2xl w-full max-w-md p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-gold flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">أذونات التطبيق</h3>
                  <p className="text-xs text-muted-foreground">لتجربة استخدام أفضل وأسرع</p>
                </div>
              </div>
              <button onClick={finish} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={askLocation}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition text-right"
              >
                <MapPin className="w-5 h-5 text-emerald-400" />
                <div className="flex-1">
                  <p className="font-bold text-sm">الموقع الجغرافي</p>
                  <p className="text-xs text-muted-foreground">لتحسين الخدمات حسب منطقتك</p>
                </div>
              </button>

              <button
                onClick={askPhotos}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition text-right"
              >
                <ImageIcon className="w-5 h-5 text-amber-400" />
                <div className="flex-1">
                  <p className="font-bold text-sm">الصور</p>
                  <p className="text-xs text-muted-foreground">لرفع إيصالات الدفع وصور الإعلانات</p>
                </div>
              </button>

              <button
                onClick={askFiles}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition text-right"
              >
                <FileText className="w-5 h-5 text-blue-400" />
                <div className="flex-1">
                  <p className="font-bold text-sm">المستندات والملفات</p>
                  <p className="text-xs text-muted-foreground">لرفع المستندات عند الحاجة</p>
                </div>
              </button>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={grantAll} className="flex-1 bg-gradient-gold text-primary-foreground">
                السماح
              </Button>
              <Button onClick={finish} variant="outline" className="flex-1">
                لاحقاً
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-3">
              يمكنك تغيير هذه الأذونات في أي وقت من إعدادات المتصفح أو الجهاز
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
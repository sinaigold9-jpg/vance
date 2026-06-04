import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Image as ImageIcon, FileText, X, Shield, Camera, Check, Bell, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { registerPushNotifications } from "@/lib/pushNotifications";
import { toast } from "sonner";

const LS_KEY = "advance_permissions_asked_v2";

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
  const [granted, setGranted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      if (!localStorage.getItem(LS_KEY)) {
        const t = setTimeout(() => setOpen(true), 2000);
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
      (pos) => {
        setGranted((g) => ({ ...g, location: true }));
        // store last known location so the app can use it
        try {
          localStorage.setItem(
            "advance_last_location",
            JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude, ts: Date.now() })
          );
        } catch {}
        toast.success("تم منح إذن الموقع");
      },
      () => {
        setGranted((g) => ({ ...g, location: false }));
        toast.error("تم رفض إذن الموقع");
      },
      { timeout: 10000 }
    );
  };

  const askNotifications = async () => {
    if (!("Notification" in window)) {
      toast.error("الإشعارات غير مدعومة على هذا الجهاز");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setGranted((g) => ({ ...g, notifications: false }));
        toast.error("تم رفض إذن الإشعارات");
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (data.user?.id) {
        const ok = await registerPushNotifications(data.user.id);
        setGranted((g) => ({ ...g, notifications: ok }));
        if (ok) {
          // immediate test notification so user sees a real OS notification
          try {
            const reg = await navigator.serviceWorker.getRegistration("/sw-push.js");
            await reg?.showNotification("Advance", {
              body: "تم تفعيل الإشعارات بنجاح ✅",
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              vibrate: [200, 100, 200],
              tag: "advance-welcome",
            } as any);
          } catch {}
          toast.success("تم تفعيل الإشعارات");
        }
      } else {
        setGranted((g) => ({ ...g, notifications: true }));
        toast.success("تم تفعيل الإشعارات");
      }
    } catch {
      toast.error("فشل تفعيل الإشعارات");
    }
  };

  const askCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      s.getTracks().forEach((t) => t.stop());
      setGranted((g) => ({ ...g, camera: true }));
      toast.success("تم منح إذن الكاميرا");
    } catch {
      setGranted((g) => ({ ...g, camera: false }));
      toast.error("تم رفض إذن الكاميرا");
    }
  };

  const askPhotos = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.style.display = "none";
    document.body.appendChild(input);
    input.click();
    setGranted((g) => ({ ...g, photos: true }));
    setTimeout(() => input.remove(), 1000);
  };

  const askVideos = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.multiple = true;
    input.style.display = "none";
    document.body.appendChild(input);
    input.click();
    setGranted((g) => ({ ...g, videos: true }));
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
    setGranted((g) => ({ ...g, files: true }));
    setTimeout(() => input.remove(), 1000);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="fixed bottom-20 inset-x-0 z-[60] px-3 pointer-events-none"
        >
          <div className="mx-auto max-w-md pointer-events-auto rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 p-3 border-b border-border/50">
              <div className="w-9 h-9 rounded-xl bg-gradient-gold flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">السماح للتطبيق بالوصول</p>
                <p className="text-[11px] text-muted-foreground">اضغط على الأذونات التي تريد تفعيلها</p>
              </div>
              <button onClick={finish} className="p-1 text-muted-foreground hover:text-foreground" aria-label="إغلاق">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-6 gap-1 p-2">
              {[
                { key: "notifications", icon: Bell, label: "الإشعارات", color: "text-fuchsia-400", fn: askNotifications },
                { key: "location", icon: MapPin, label: "الموقع", color: "text-emerald-400", fn: askLocation },
                { key: "camera", icon: Camera, label: "الكاميرا", color: "text-rose-400", fn: askCamera },
                { key: "photos", icon: ImageIcon, label: "الصور", color: "text-amber-400", fn: askPhotos },
                { key: "videos", icon: Video, label: "الفيديو", color: "text-cyan-400", fn: askVideos },
                { key: "files", icon: FileText, label: "الملفات", color: "text-blue-400", fn: askFiles },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={p.fn}
                  className="relative flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-secondary/60 active:scale-95 transition"
                >
                  <p.icon className={`w-5 h-5 ${p.color}`} />
                  <span className="text-[10px] font-medium text-foreground">{p.label}</span>
                  {granted[p.key] && (
                    <span className="absolute top-1 left-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 px-3 pb-3">
              <button onClick={finish} className="text-[11px] text-muted-foreground hover:text-foreground">
                ليس الآن
              </button>
              <Button size="sm" onClick={finish} className="h-8 px-4 bg-gradient-gold text-primary-foreground text-xs">
                تم
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
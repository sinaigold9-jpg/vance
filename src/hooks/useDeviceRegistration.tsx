import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { collectDeviceInfo } from "@/lib/deviceInfo";

/**
 * Registers the current device on the server the first time a user signs in
 * from it, and refreshes last_active_at afterwards.
 * Extensible: extra security signals can be added to `metadata` without
 * changing the table structure.
 */
export const useDeviceRegistration = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const info = await collectDeviceInfo();
        if (cancelled) return;

        const { data: existing } = await supabase
          .from("user_devices")
          .select("id, is_trusted")
          .eq("user_id", user.id)
          .eq("device_id", info.device_id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("user_devices")
            .update({
              last_active_at: new Date().toISOString(),
              app_version: info.app_version,
              os_version: info.os_version,
              browser_version: info.browser_version,
              is_trusted: true,
              revoked_at: null,
              metadata: info.metadata as never,
            })
            .eq("id", existing.id);

          // Device was revoked before → treat this sign-in as a new device again
          if (!existing.is_trusted) await notifyNewDevice(user.id, info.device_name);
          return;
        }

        const { error } = await supabase.from("user_devices").insert({
          user_id: user.id,
          device_id: info.device_id,
          device_name: info.device_name,
          device_type: info.device_type,
          os: info.os,
          os_version: info.os_version,
          browser: info.browser,
          browser_version: info.browser_version,
          app_version: info.app_version,
          metadata: info.metadata as never,
        });
        if (!error) await notifyNewDevice(user.id, info.device_name);
      } catch {
        /* device registration must never block the app */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);
};

const notifyNewDevice = async (userId: string, deviceName: string) => {
  const { data: profile } = await supabase
    .from("profiles")
    .select("new_device_notifications")
    .eq("id", userId)
    .maybeSingle();

  if (profile && profile.new_device_notifications === false) return;

  await supabase.from("notifications").insert({
    user_id: userId,
    title: "تسجيل دخول من جهاز جديد",
    message: `تم تسجيل الدخول إلى حسابك من جهاز جديد: ${deviceName}. إذا لم تكن أنت، أزل الجهاز من الأجهزة الموثوقة فوراً.`,
    type: "security",
    link: "/settings/devices",
  });
};

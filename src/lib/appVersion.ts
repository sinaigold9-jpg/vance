// النسخة الحالية من التطبيق - يجب تحديث هذا الرقم مع كل إصدار جديد
// version_code يجب أن يساوي أو يكون أقل من أعلى إصدار في قاعدة البيانات
export const CURRENT_VERSION = "1.0.0";
export const CURRENT_VERSION_CODE = 100;

const LS_KEY = "advance_seen_version_code";

export const getSeenVersionCode = (): number => {
  try {
    const v = localStorage.getItem(LS_KEY);
    return v ? parseInt(v, 10) : CURRENT_VERSION_CODE;
  } catch {
    return CURRENT_VERSION_CODE;
  }
};

export const setSeenVersionCode = (code: number) => {
  try {
    localStorage.setItem(LS_KEY, String(code));
  } catch {
    // ignore
  }
};

export const performAppUpdate = async () => {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch (e) {
    console.error("update cleanup failed", e);
  }
  // إعادة تحميل مع تجاوز الكاش
  const url = new URL(window.location.href);
  url.searchParams.set("_v", String(Date.now()));
  window.location.replace(url.toString());
};
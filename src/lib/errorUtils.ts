import { toast } from "sonner";

export function reportError(err: unknown, ctx?: string) {
  // Developer-facing logging only
  if (ctx) console.error(`${ctx} error:`, err);
  else console.error("Error:", err);
}

export function getFriendlyMessage(err: unknown, defaultMsg = "حدث خطأ. يرجى المحاولة مرة أخرى.") {
  if (!err) return defaultMsg;
  const message = typeof err === "string" ? err : err instanceof Error ? err.message : String(err ?? "");
  const m = message.toLowerCase();

  if (m.includes("invalid") && (m.includes("login") || m.includes("credentials"))) {
    return "بيانات الدخول غير صحيحة";
  }
  if (m.includes("phone") && (m.includes("not found") || m.includes("not_found") || m.includes("phone_lookup"))) {
    return "رقم الهاتف أو كلمة المرور غير صحيحة";
  }
  if (m.includes("telegram_not_linked")) return "يرجى ربط حساب تليجرام أولاً من إعدادات الحساب";
  if (m.includes("rate_limited") || m.includes("rate limit")) return "تم الوصول للحد الأقصى من المحاولات، حاول لاحقًا";
  if (m.includes("not found") || m.includes("invalid path") || m.includes("404")) return "الخدمة غير متاحة حاليًا، يرجى المحاولة لاحقًا";
  if (m.includes("timeout") || m.includes("network") || m.includes("failed to fetch")) return "تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.";

  // If message looks short and user-friendly (Arabic or English common phrases), allow it
  if (message.length > 0 && message.length < 160 && !/[\n\r\t]/.test(message) && !message.includes("http") && !message.includes("/")) {
    return message;
  }

  return defaultMsg;
}

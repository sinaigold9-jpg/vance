import { supabase } from "@/integrations/supabase/client";

type ErrorSource = "client" | "backend" | "security" | "notification";
type ErrorSeverity = "info" | "warning" | "error" | "critical";

type ReportInput = {
  source?: ErrorSource;
  severity?: ErrorSeverity;
  title: string;
  message: string;
  stack?: string | null;
  metadata?: Record<string, unknown>;
};

const recentReports = new Set<string>();

export async function reportClientError(input: ReportInput) {
  const key = `${input.title}:${input.message}`.slice(0, 220);
  if (recentReports.has(key)) return;
  recentReports.add(key);
  window.setTimeout(() => recentReports.delete(key), 60_000);

  try {
    await supabase.functions.invoke("log-client-error", {
      body: {
        source: input.source || "client",
        severity: input.severity || "error",
        title: input.title,
        message: input.message,
        stack: input.stack || null,
        url: window.location.href,
        user_agent: navigator.userAgent,
        metadata: input.metadata || {},
      },
    });
  } catch {
    // Reporting must never break the app or create an error loop.
  }
}

export function setupGlobalErrorReporting() {
  window.addEventListener("error", (event) => {
    reportClientError({
      source: "client",
      severity: "error",
      title: "خطأ JavaScript في الواجهة",
      message: event.message || "Unknown client error",
      stack: event.error?.stack || null,
      metadata: { filename: event.filename, lineno: event.lineno, colno: event.colno },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    reportClientError({
      source: "client",
      severity: "error",
      title: "Promise مرفوضة بدون معالجة",
      message: reason?.message || String(reason || "Unhandled rejection"),
      stack: reason?.stack || null,
    });
  });
}
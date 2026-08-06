/**
 * Real device information collected from what the browser / OS exposes.
 * No fabricated or randomised attributes are used for the reported fields.
 * The device id is a stable per-installation identifier stored locally.
 */
import { CURRENT_VERSION } from "@/lib/appVersion";

const DEVICE_ID_KEY = "advance_device_id";

export interface DeviceInfo {
  device_id: string;
  device_name: string;
  device_type: "mobile" | "tablet" | "desktop" | "unknown";
  os: string | null;
  os_version: string | null;
  browser: string | null;
  browser_version: string | null;
  app_version: string;
  metadata: Record<string, unknown>;
}

export const getDeviceId = (): string => {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return "unknown-device";
  }
};

const match = (ua: string, re: RegExp): string | null => {
  const m = ua.match(re);
  return m ? m[1] : null;
};

const detectOS = (ua: string): { os: string | null; version: string | null } => {
  if (/Windows NT/.test(ua)) return { os: "Windows", version: match(ua, /Windows NT ([\d.]+)/) };
  if (/Android/.test(ua)) return { os: "Android", version: match(ua, /Android ([\d.]+)/) };
  if (/iPhone|iPad|iPod/.test(ua)) return { os: "iOS", version: (match(ua, /OS ([\d_]+)/) || "").replace(/_/g, ".") || null };
  if (/Mac OS X/.test(ua)) return { os: "macOS", version: (match(ua, /Mac OS X ([\d_.]+)/) || "").replace(/_/g, ".") || null };
  if (/CrOS/.test(ua)) return { os: "ChromeOS", version: match(ua, /CrOS \S+ ([\d.]+)/) };
  if (/Linux/.test(ua)) return { os: "Linux", version: null };
  return { os: null, version: null };
};

const detectBrowser = (ua: string): { browser: string | null; version: string | null } => {
  if (/Edg\//.test(ua)) return { browser: "Edge", version: match(ua, /Edg\/([\d.]+)/) };
  if (/OPR\//.test(ua)) return { browser: "Opera", version: match(ua, /OPR\/([\d.]+)/) };
  if (/SamsungBrowser/.test(ua)) return { browser: "Samsung Internet", version: match(ua, /SamsungBrowser\/([\d.]+)/) };
  if (/Firefox\//.test(ua)) return { browser: "Firefox", version: match(ua, /Firefox\/([\d.]+)/) };
  if (/Chrome\//.test(ua)) return { browser: "Chrome", version: match(ua, /Chrome\/([\d.]+)/) };
  if (/Safari\//.test(ua)) return { browser: "Safari", version: match(ua, /Version\/([\d.]+)/) };
  return { browser: null, version: null };
};

const detectType = (ua: string): DeviceInfo["device_type"] => {
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  if (/Windows|Mac OS X|Linux|CrOS/.test(ua)) return "desktop";
  return "unknown";
};

/** Real model name when the platform exposes it (Android UA / UA-Client-Hints). */
const detectModel = (ua: string): string | null => {
  const android = ua.match(/Android [\d.]+;\s?([^;)]+?)(?:\sBuild|\)|;)/);
  if (android) return android[1].trim();
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  return null;
};

export const collectDeviceInfo = async (): Promise<DeviceInfo> => {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const { os, version: osVersion } = detectOS(ua);
  const { browser, version: browserVersion } = detectBrowser(ua);
  let model = detectModel(ua);
  let platformVersion = osVersion;

  // High-entropy UA Client Hints (Chromium) give the real model / platform version.
  const uaData = (navigator as unknown as { userAgentData?: { getHighEntropyValues?: (h: string[]) => Promise<Record<string, string>> } }).userAgentData;
  if (uaData?.getHighEntropyValues) {
    try {
      const hints = await uaData.getHighEntropyValues(["model", "platformVersion", "platform"]);
      if (hints.model) model = hints.model;
      if (hints.platformVersion) platformVersion = hints.platformVersion;
    } catch {
      /* hints unavailable — keep UA-derived values */
    }
  }

  const standalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true);

  const nameParts = [model, os && !model ? os : null, browser].filter(Boolean);

  return {
    device_id: getDeviceId(),
    device_name: nameParts.length ? nameParts.join(" · ") : "جهاز غير معروف",
    device_type: detectType(ua),
    os,
    os_version: platformVersion,
    browser,
    browser_version: browserVersion,
    app_version: CURRENT_VERSION,
    metadata: {
      language: typeof navigator !== "undefined" ? navigator.language : null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
      screen: typeof window !== "undefined" ? `${window.screen.width}x${window.screen.height}` : null,
      installed_pwa: !!standalone,
      user_agent: ua,
    },
  };
};

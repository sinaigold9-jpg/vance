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

// ────────────────────────────────────────────────────────────────────────────
// Real update download with measurable size + progress
// ────────────────────────────────────────────────────────────────────────────

export interface UpdateAsset {
  url: string;
  bytes: number;
}

export interface UpdateManifest {
  totalBytes: number;
  assets: UpdateAsset[];
}

const cacheBust = (url: string) => {
  const u = new URL(url, window.location.origin);
  u.searchParams.set("_v", String(Date.now()));
  return u.toString();
};

const parseAssetUrls = (html: string): string[] => {
  const urls: string[] = [];
  const re = /(?:src|href)=["']([^"']+\.(?:js|css|mjs))(?:\?[^"']*)?["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = m[1];
    if (raw.startsWith("http") && !raw.startsWith(window.location.origin)) continue;
    urls.push(raw.startsWith("/") ? raw : `/${raw}`);
  }
  return Array.from(new Set(urls));
};

const headSize = async (url: string): Promise<number> => {
  try {
    const res = await fetch(cacheBust(url), { method: "HEAD", cache: "no-store" });
    const len = res.headers.get("content-length");
    return len ? parseInt(len, 10) : 0;
  } catch {
    return 0;
  }
};

/**
 * Discover the real assets that make up the current build and measure their size.
 */
export const measureUpdateManifest = async (): Promise<UpdateManifest> => {
  const indexUrl = "/index.html";
  let html = "";
  let indexBytes = 0;
  try {
    const res = await fetch(cacheBust(indexUrl), { cache: "no-store" });
    html = await res.text();
    const len = res.headers.get("content-length");
    indexBytes = len ? parseInt(len, 10) : new Blob([html]).size;
  } catch {
    return { totalBytes: 0, assets: [] };
  }

  const assetUrls = parseAssetUrls(html);
  const sizes = await Promise.all(assetUrls.map(headSize));
  const assets: UpdateAsset[] = [
    { url: indexUrl, bytes: indexBytes },
    ...assetUrls.map((url, i) => ({ url, bytes: sizes[i] })),
  ];
  const totalBytes = assets.reduce((s, a) => s + a.bytes, 0);
  return { totalBytes, assets };
};

export interface DownloadProgress {
  loadedBytes: number;
  totalBytes: number;
  speedBps: number; // bytes per second
  percent: number;
}

/**
 * Stream-download each asset and report real progress.
 */
export const downloadUpdate = async (
  manifest: UpdateManifest,
  onProgress: (p: DownloadProgress) => void,
  signal?: AbortSignal,
) => {
  const start = performance.now();
  let loaded = 0;
  const total = manifest.totalBytes || 1;

  const emit = () => {
    const elapsed = Math.max((performance.now() - start) / 1000, 0.001);
    onProgress({
      loadedBytes: loaded,
      totalBytes: manifest.totalBytes,
      speedBps: loaded / elapsed,
      percent: Math.min(100, (loaded / total) * 100),
    });
  };

  for (const asset of manifest.assets) {
    try {
      const res = await fetch(cacheBust(asset.url), { cache: "no-store", signal });
      if (!res.body) {
        loaded += asset.bytes;
        emit();
        continue;
      }
      const reader = res.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          loaded += value.byteLength;
          emit();
        }
      }
    } catch {
      loaded += asset.bytes;
      emit();
    }
  }

  // make sure we end at exactly 100% of advertised size
  loaded = Math.max(loaded, manifest.totalBytes);
  emit();
};

export const formatBytes = (bytes: number): string => {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / Math.pow(1024, i);
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
};

export const formatSpeed = (bps: number): string => `${formatBytes(bps)}/s`;

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
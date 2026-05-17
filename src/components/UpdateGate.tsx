import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, Wrench, Crown, Download, X, ChevronLeft, ChevronRight, CheckCircle2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAppVersion, type AppVersion, type VersionFeature } from "@/hooks/useAppVersion";
import {
  performAppUpdate,
  CURRENT_VERSION,
  measureUpdateManifest,
  downloadUpdate,
  formatBytes,
  formatSpeed,
  type UpdateManifest,
  type DownloadProgress,
} from "@/lib/appVersion";
import { cn } from "@/lib/utils";

// Unified premium dark / gold theme (no more fixed season themes)
const theme = {
  bg: "from-slate-950 via-slate-900 to-slate-950",
  accent: "from-amber-400 via-yellow-500 to-amber-600",
  ring: "ring-amber-400/40",
};

const badgeStyles: Record<string, { label: string; cls: string; Icon: typeof Sparkles }> = {
  new: { label: "جديد", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40", Icon: Sparkles },
  feature: { label: "ميزة قوية", cls: "bg-amber-500/20 text-amber-300 border-amber-400/40", Icon: Zap },
  fix: { label: "إصلاح", cls: "bg-blue-500/20 text-blue-300 border-blue-400/40", Icon: Wrench },
  vip: { label: "حصري VIP", cls: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/40", Icon: Crown },
};

const FeatureRow = ({ f }: { f: VersionFeature }) => {
  const badge = f.badge ? badgeStyles[f.badge] : null;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
    >
      <div className="shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-sm font-bold text-white">{f.label}</h4>
          {badge && (
            <Badge className={cn("text-[10px] gap-1 border", badge.cls)}>
              <badge.Icon className="w-3 h-3" />
              {badge.label}
            </Badge>
          )}
        </div>
        {f.description && (
          <p className="text-xs text-white/70 mt-1 leading-relaxed">{f.description}</p>
        )}
      </div>
    </motion.div>
  );
};

const ImageSlider = ({ images }: { images: string[] }) => {
  const [idx, setIdx] = useState(0);
  if (images.length === 0) return null;
  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/30">
      <AnimatePresence mode="wait">
        <motion.img
          key={idx}
          src={images[idx]}
          alt={`feature-${idx}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>
      {images.length > 1 && (
        <>
          <button
            onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIdx((i) => (i + 1) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === idx ? "w-6 bg-white" : "w-1.5 bg-white/50"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const UpdateScreen = ({ version, onLater }: { version: AppVersion; onLater?: () => void }) => {
  const [updating, setUpdating] = useState(false);
  const [manifest, setManifest] = useState<UpdateManifest | null>(null);
  const [progress, setProgress] = useState<DownloadProgress>({
    loadedBytes: 0,
    totalBytes: 0,
    speedBps: 0,
    percent: 0,
  });

  // Measure real update size when the screen opens
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const m = await measureUpdateManifest();
      if (!cancelled) setManifest(m);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpdate = async () => {
    if (!manifest || updating) return;
    setUpdating(true);
    await downloadUpdate(manifest, (p) => setProgress(p));
    await new Promise((r) => setTimeout(r, 250));
    await performAppUpdate();
  };

  const sizeLabel = manifest && manifest.totalBytes > 0
    ? formatBytes(manifest.totalBytes)
    : "جاري حساب الحجم...";

  const headerLabel = (version.update_label && version.update_label.trim())
    || "يوجد إصدار جديد متوفر";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gradient-to-br",
        theme.bg
      )}
      dir="rtl"
    >
      {/* glow background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn("absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-30 bg-gradient-to-br", theme.accent)} />
        <div className={cn("absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-20 bg-gradient-to-br", theme.accent)} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={cn(
          "relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-white/10 bg-black/50 backdrop-blur-2xl shadow-2xl ring-2 ring-offset-2 ring-offset-transparent",
          theme.ring
        )}
      >
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-2xl shadow-lg", theme.accent)}>
              <Rocket className="w-7 h-7 text-black" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-white/60">✨ {headerLabel}</div>
              <h2 className="text-lg font-extrabold text-white">{version.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="px-2 py-1 rounded-md bg-white/10 text-white/70 font-mono">v{CURRENT_VERSION}</span>
            <span className="text-white/40">←</span>
            <span className={cn("px-2 py-1 rounded-md font-mono font-bold text-black bg-gradient-to-r", theme.accent)}>
              v{version.version}
            </span>
            <span className="px-2 py-1 rounded-md bg-white/10 text-white/80 flex items-center gap-1">
              <Download className="w-3 h-3" />
              {sizeLabel}
            </span>
            {version.is_mandatory && (
              <Badge className="ms-auto bg-red-500/20 text-red-300 border border-red-400/40 text-[10px]">
                إجباري
              </Badge>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {version.description && (
            <p className="text-sm text-white/80 leading-relaxed">{version.description}</p>
          )}

          {version.images.length > 0 && <ImageSlider images={version.images} />}

          {version.features.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                ما الجديد
              </h3>
              <div className="space-y-2">
                {version.features.map((f, i) => (
                  <FeatureRow key={i} f={f} />
                ))}
              </div>
            </div>
          )}

          {updating && (
            <div className="space-y-2 pt-2">
              <Progress value={progress.percent} className="h-2" />
              <div className="flex items-center justify-between text-xs text-white/70 font-mono">
                <span>
                  {formatBytes(progress.loadedBytes)} / {formatBytes(progress.totalBytes)}
                </span>
                <span>{formatSpeed(progress.speedBps)}</span>
                <span>{progress.percent.toFixed(1)}%</span>
              </div>
              <p className="text-xs text-center text-white/60">
                جاري تحميل ملفات التحديث...
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 space-y-2 border-t border-white/10 sticky bottom-0 bg-black/60 backdrop-blur-xl">
          <Button
            onClick={handleUpdate}
            disabled={updating || !manifest}
            className={cn(
              "w-full h-12 text-base font-bold text-black bg-gradient-to-r hover:opacity-90 transition gap-2 shadow-lg",
              theme.accent
            )}
          >
            <Download className="w-5 h-5" />
            {updating
              ? `جاري التحديث... ${progress.percent.toFixed(0)}%`
              : manifest
                ? `تحديث الآن (${sizeLabel})`
                : "جاري التحضير..."}
          </Button>
          {!version.is_mandatory && onLater && !updating && (
            <Button
              onClick={onLater}
              variant="ghost"
              className="w-full text-white/70 hover:text-white hover:bg-white/10 gap-2"
            >
              <X className="w-4 h-4" />
              لاحقاً
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export const UpdateGate = ({ children }: { children: React.ReactNode }) => {
  const { current, hasUpdate, acknowledgeCurrent } = useAppVersion();

  return (
    <>
      {children}
      <AnimatePresence>
        {hasUpdate && current && (
          <UpdateScreen
            key={current.id}
            version={current}
            onLater={current.is_mandatory ? undefined : acknowledgeCurrent}
          />
        )}
      </AnimatePresence>
    </>
  );
};
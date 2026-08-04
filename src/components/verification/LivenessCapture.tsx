import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertTriangle, Camera, RotateCcw } from "lucide-react";
import {
  analyzeFrame, frameDiff, qualityScore, faceSignature, detectFaces, captureJpeg,
  type FrameStats,
} from "@/lib/faceLiveness";

export interface LivenessResult {
  blob: Blob;
  quality: number;
  liveness: number;
  signature: string;
}

type StepId = "forward" | "right" | "left" | "blink";

const STEPS: { id: StepId; label: string; hint: string }[] = [
  { id: "forward", label: "انظر إلى الأمام مباشرة", hint: "ثبّت وجهك داخل الإطار مع إضاءة جيدة" },
  { id: "right", label: "أدر رأسك إلى اليمين ببطء", hint: "حركة بسيطة ثم عد للأمام" },
  { id: "left", label: "أدر رأسك إلى اليسار ببطء", hint: "حركة بسيطة ثم عد للأمام" },
  { id: "blink", label: "ارمش بعينيك مرتين", hint: "أغلق عينيك وافتحهما بوضوح" },
];

interface Props {
  onDone: (r: LivenessResult) => void;
  onCancel: () => void;
}

export const LivenessCapture = ({ onDone, onCancel }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>();
  const prevRef = useRef<FrameStats | null>(null);
  const baselineRef = useRef<{ ratio: number } | null>(null);
  const holdRef = useRef(0);
  const scoresRef = useRef<number[]>([]);
  const bestRef = useRef<{ q: number; sig: string } | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [quality, setQuality] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const stepRef = useRef(0);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const finish = useCallback(async () => {
    const video = videoRef.current;
    if (!video || capturing) return;
    setCapturing(true);
    const faces = await detectFaces(video);
    if (faces.supported && faces.count !== 1) {
      setWarning(faces.count === 0 ? "لم يتم العثور على وجه واضح" : "تم رصد أكثر من شخص أمام الكاميرا");
      setCapturing(false);
      return;
    }
    const blob = await captureJpeg(video);
    if (!blob) { setWarning("تعذّر التقاط الصورة، حاول مجدداً"); setCapturing(false); return; }
    const scores = scoresRef.current;
    const avgQ = Math.round(scores.reduce((a, b) => a + b, 0) / Math.max(scores.length, 1));
    stop();
    onDone({
      blob,
      quality: Math.max(avgQ, bestRef.current?.q ?? 0),
      liveness: 100,
      signature: bestRef.current?.sig || "",
    });
  }, [capturing, onDone, stop]);

  const loop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const stats = analyzeFrame(video, canvas);
    if (stats) {
      const prev = prevRef.current;
      const motion = prev ? frameDiff(prev.data, stats.data) : 0;
      const q = qualityScore(stats, motion);
      setQuality(q);
      scoresRef.current.push(q);
      if (scoresRef.current.length > 240) scoresRef.current.shift();
      if (!bestRef.current || q > bestRef.current.q) {
        bestRef.current = { q, sig: faceSignature(stats.data) };
      }

      const ratio = stats.leftLuma / Math.max(stats.rightLuma, 1);
      if (!baselineRef.current && stats.brightness > 45) baselineRef.current = { ratio };

      const step = STEPS[stepRef.current];
      if (step) {
        let passed = false;
        if (step.id === "forward") {
          if (q >= 55 && motion < 9) { holdRef.current += 1; } else { holdRef.current = 0; }
          if (stats.brightness < 45) setWarning("الإضاءة ضعيفة جداً");
          else if (stats.brightness > 225) setWarning("الإضاءة قوية جداً");
          else if (q < 45) setWarning("الصورة غير واضحة، قرّب وجهك وثبّت الكاميرا");
          else setWarning(null);
          passed = holdRef.current > 35;
        } else if (step.id === "right" || step.id === "left") {
          const base = baselineRef.current?.ratio ?? ratio;
          const delta = ratio - base;
          const moved = step.id === "right" ? delta > 0.07 : delta < -0.07;
          if (moved || motion > 16) holdRef.current += 1; else holdRef.current = Math.max(0, holdRef.current - 1);
          setWarning(null);
          passed = holdRef.current > 6;
        } else {
          // blink: short-lived change concentrated in the upper (eyes) half
          if (prev) {
            const upperShift = Math.abs(prev.upperLuma - stats.upperLuma);
            if (upperShift > 1.6 && motion < 26) holdRef.current += 1;
          }
          setWarning(null);
          passed = holdRef.current > 3;
        }

        if (passed) {
          holdRef.current = 0;
          baselineRef.current = { ratio };
          const next = stepRef.current + 1;
          stepRef.current = next;
          setStepIndex(next);
          if (next >= STEPS.length) { finish(); return; }
        }
      }
      prevRef.current = stats;
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [finish]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
        rafRef.current = requestAnimationFrame(loop);
      } catch {
        setError("تعذّر فتح الكاميرا. تأكد من منح إذن الكاميرا للتطبيق من إعدادات المتصفح/الهاتف.");
      }
    })();
    return () => { cancelled = true; stop(); };
  }, [loop, stop]);

  const restart = () => {
    stepRef.current = 0;
    setStepIndex(0);
    holdRef.current = 0;
    baselineRef.current = null;
    scoresRef.current = [];
    bestRef.current = null;
    setWarning(null);
    setCapturing(false);
  };

  const step = STEPS[Math.min(stepIndex, STEPS.length - 1)];

  return (
    <div className="space-y-4">
      <div className="relative mx-auto w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden bg-black border border-border">
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 2.4 }}
            className={`w-[68%] h-[58%] rounded-[50%] border-4 ${
              quality >= 60 ? "border-emerald-400/80" : "border-primary/70"
            }`}
          />
        </div>
        {!ready && !error && (
          <div className="absolute inset-0 grid place-items-center bg-black/70 text-white gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">جاري تشغيل الكاميرا...</span>
          </div>
        )}
        {capturing && (
          <div className="absolute inset-0 grid place-items-center bg-black/70 text-white gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">جاري التقاط الصورة...</span>
          </div>
        )}
      </div>

      {error ? (
        <div className="rounded-xl bg-destructive/10 text-destructive p-3 text-sm flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>جودة الصورة</span>
              <span className={quality >= 60 ? "text-emerald-500 font-bold" : ""}>{quality}%</span>
            </div>
            <Progress value={quality} className="h-2" />
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 text-center space-y-1">
            <p className="text-xs text-muted-foreground">
              الخطوة {Math.min(stepIndex + 1, STEPS.length)} من {STEPS.length}
            </p>
            <p className="font-bold text-lg">{step.label}</p>
            <p className="text-xs text-muted-foreground">{step.hint}</p>
          </div>

          <div className="flex justify-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className={`h-1.5 w-12 rounded-full ${i < stepIndex ? "bg-emerald-500" : i === stepIndex ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          {warning && (
            <div className="rounded-xl bg-amber-500/10 text-amber-500 p-3 text-sm flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {warning}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <Camera className="w-3 h-3" /> لا يُسمح برفع صور من المعرض — الكاميرا المباشرة فقط.
          </p>
        </>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => { stop(); onCancel(); }}>إلغاء</Button>
        {!error && (
          <Button variant="secondary" className="flex-1 gap-2" onClick={restart}>
            <RotateCcw className="w-4 h-4" /> إعادة البدء
          </Button>
        )}
      </div>
      {stepIndex >= STEPS.length && !capturing && (
        <p className="text-center text-emerald-500 text-sm flex items-center justify-center gap-1">
          <CheckCircle2 className="w-4 h-4" /> اكتمل التحقق من الحيوية
        </p>
      )}
    </div>
  );
};

export default LivenessCapture;

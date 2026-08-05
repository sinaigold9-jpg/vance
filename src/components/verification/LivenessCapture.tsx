import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Loader2, CheckCircle2, AlertTriangle, Camera, RotateCcw,
  ArrowRight, ArrowLeft, ScanFace,
} from "lucide-react";
import {
  analyzeFrame, frameDiff, qualityScore, faceSignature, detectFaces, captureJpeg,
  inspectFace, type FrameStats,
} from "@/lib/faceLiveness";

export interface LivenessResult {
  blob: Blob;
  quality: number;
  liveness: number;
  signature: string;
}

type StepId = "forward" | "right" | "left";

const STEPS: { id: StepId; label: string; hint: string; target: number }[] = [
  { id: "forward", label: "انظر إلى الأمام مباشرة", hint: "ضع وجهك بالكامل داخل الدائرة وثبّته", target: 40 },
  { id: "right", label: "أدر رأسك إلى اليمين ببطء", hint: "حركة بسيطة وثابتة ثم عد للأمام", target: 14 },
  { id: "left", label: "أدر رأسك إلى اليسار ببطء", hint: "حركة بسيطة وثابتة ثم عد للأمام", target: 14 },
];

const StepIcon = ({ id, className }: { id: StepId; className?: string }) =>
  id === "right" ? <ArrowRight className={className} />
    : id === "left" ? <ArrowLeft className={className} />
      : <ScanFace className={className} />;

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
  const stepRef = useRef(0);
  const doneRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);   // 0..100 ring fill
  const [quality, setQuality] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [completed, setCompleted] = useState(false);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const finish = useCallback(async () => {
    const video = videoRef.current;
    if (!video || doneRef.current) return;
    doneRef.current = true;
    setCapturing(true);
    const faces = await detectFaces(video);
    if (faces.supported && faces.count !== 1) {
      setWarning(faces.count === 0 ? "لم يتم العثور على وجه واضح" : "تم رصد أكثر من شخص أمام الكاميرا");
      setCapturing(false);
      doneRef.current = false;
      return;
    }
    const blob = await captureJpeg(video);
    if (!blob) {
      setWarning("تعذّر التقاط الصورة، حاول مجدداً");
      setCapturing(false);
      doneRef.current = false;
      return;
    }
    const scores = scoresRef.current;
    const avgQ = Math.round(scores.reduce((a, b) => a + b, 0) / Math.max(scores.length, 1));
    setCompleted(true);
    setProgress(100);
    stop();
    onDone({
      blob,
      quality: Math.max(avgQ, bestRef.current?.q ?? 0),
      liveness: 100,
      signature: bestRef.current?.sig || "",
    });
  }, [onDone, stop]);

  const loop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || doneRef.current) return;
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

      const issue = prev ? inspectFace(stats, motion) : null;
      const ratio = stats.leftLuma / Math.max(stats.rightLuma, 1);
      if (!baselineRef.current && stats.brightness > 45) baselineRef.current = { ratio };

      const idx = stepRef.current;
      const step = STEPS[idx];
      if (step) {
        if (issue) {
          // spoofing / occlusion / bad conditions block the ring from filling
          setWarning(issue.message);
          holdRef.current = Math.max(0, holdRef.current - 2);
        } else {
          setWarning(null);
          if (step.id === "forward") {
            if (q >= 50 && motion < 9) holdRef.current += 1;
            else holdRef.current = Math.max(0, holdRef.current - 1);
          } else {
            const base = baselineRef.current?.ratio ?? ratio;
            const delta = ratio - base;
            const moved = step.id === "right" ? delta > 0.07 : delta < -0.07;
            if (moved || motion > 16) holdRef.current += 1;
            else holdRef.current = Math.max(0, holdRef.current - 1);
          }
        }

        const stepFraction = Math.min(1, holdRef.current / step.target);
        setProgress(Math.round(((idx + stepFraction) / STEPS.length) * 100));

        if (stepFraction >= 1) {
          holdRef.current = 0;
          baselineRef.current = { ratio };
          const next = idx + 1;
          stepRef.current = next;
          setStepIndex(next);
          setProgress(Math.round((next / STEPS.length) * 100));
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
    doneRef.current = false;
    setStepIndex(0);
    setProgress(0);
    holdRef.current = 0;
    baselineRef.current = null;
    scoresRef.current = [];
    bestRef.current = null;
    setWarning(null);
    setCapturing(false);
    setCompleted(false);
  };

  const step = STEPS[Math.min(stepIndex, STEPS.length - 1)];
  const R = 46;
  const C = 2 * Math.PI * R;
  const done = progress >= 100;

  return (
    <div className="space-y-5">
      {/* Circular camera + progress ring */}
      <div className="relative mx-auto w-full max-w-[320px] aspect-square">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90 z-10 pointer-events-none">
          <circle cx="50" cy="50" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="3.5" />
          <circle
            cx="50" cy="50" r={R} fill="none"
            stroke={done ? "hsl(var(--emerald))" : "hsl(var(--gold))"}
            strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - Math.min(progress, 100) / 100)}
            style={{ transition: "stroke-dashoffset 160ms linear, stroke 300ms" }}
          />
        </svg>

        <div className="absolute inset-[9%] rounded-full overflow-hidden bg-black border border-border">
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          {!ready && !error && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 text-white gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">جاري تشغيل الكاميرا...</span>
            </div>
          )}
          {capturing && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 text-white gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">جاري التقاط الصورة...</span>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* percentage badge */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-20">
          <motion.div
            animate={{ scale: done ? [1, 1.08, 1] : 1 }}
            className={`px-3 py-1 rounded-full text-xs font-extrabold border shadow-sm ${
              done
                ? "bg-emerald-500 text-white border-emerald-400"
                : "bg-card text-foreground border-border"
            }`}
          >
            {Math.min(progress, 100)}%
          </motion.div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-destructive/10 text-destructive p-3 text-sm flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-4 text-center space-y-1">
            {completed ? (
              <p className="font-bold text-lg text-emerald-500 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> اكتمل التحقق بنجاح
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  الخطوة {Math.min(stepIndex + 1, STEPS.length)} من {STEPS.length}
                </p>
                <p className="font-bold text-lg flex items-center justify-center gap-2">
                  <StepIcon id={step.id} className="w-5 h-5 text-primary" />
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.hint}</p>
              </>
            )}
          </div>

          <div className="flex justify-center gap-2">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={`h-1.5 w-14 rounded-full transition-colors ${
                  i < stepIndex ? "bg-emerald-500" : i === stepIndex ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>جودة الصورة</span>
            <span className={quality >= 60 ? "text-emerald-500 font-bold" : ""}>{quality}%</span>
          </div>

          {warning && (
            <div className="rounded-xl bg-amber-500/10 text-amber-500 p-3 text-sm flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {warning}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <Camera className="w-3 h-3" /> الكاميرا المباشرة فقط — لا يُسمح بالصور المطبوعة أو صور الشاشة.
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
    </div>
  );
};

export default LivenessCapture;

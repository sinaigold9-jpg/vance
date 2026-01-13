import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Briefcase, Loader2, AlertCircle, CheckCircle2, Clock, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DailyTasksProps {
  userId: string;
  accountType: "beginner" | "vip1" | "vip2" | "vip3";
  onBalanceUpdate: (newBalance: number, earnings: number) => void;
}

// Get Cairo date string, reset at 1 AM Cairo time
const getCairoDateString = () => {
  const now = new Date();
  const cairoOffset = 2 * 60; // Cairo is UTC+2
  const localOffset = now.getTimezoneOffset();
  const cairoTime = new Date(now.getTime() + (cairoOffset + localOffset) * 60000);
  
  // If current hour is before 1 AM, use previous day's date for task reset
  if (cairoTime.getHours() < 1) {
    cairoTime.setDate(cairoTime.getDate() - 1);
  }
  
  return cairoTime.toISOString().split('T')[0];
};

const TASK_DURATION_SECONDS = 300;
const MAX_DAILY_TASKS = 3;

const motivationalMessages = [
  "ابق هنا، لا تغلق الجهاز 📱",
  "المهمة قيد التنفيذ... 🚀",
  "المهمة تحت المراجعة ✅",
  "أنت رائع! فقط أكمل 💪",
  "لا توقف قبل نهاية المهمة ⏳",
  "كل ثانية قريبة من المكافأة 💰",
  "العد التنازلي مفعل، كن صبوراً ⌛",
  "المهمة تحت التنفيذ الآن 🔄",
  "أنت بطل المهمة اليوم 🏆",
  "رائع! فقط تابع حتى النهاية 🎯",
];

export const DailyTasks = ({ userId, accountType, onBalanceUpdate }: DailyTasksProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [taskReward, setTaskReward] = useState(0);
  const [isTaskActive, setIsTaskActive] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [canCollect, setCanCollect] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");

  useEffect(() => {
    if (userId) {
      initializeUserData();
    }
  }, [userId]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isTaskActive && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setCanCollect(true);
            setIsTaskActive(false);
            return 0;
          }
          return prev - 1;
        });
        // Change motivational message every 30 seconds
        if (remainingSeconds % 30 === 0) {
          setCurrentMessage(motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTaskActive, remainingSeconds]);

  const initializeUserData = async () => {
    setIsLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("daily_attempts_count, last_attempt_date")
        .eq("id", userId)
        .maybeSingle();

      const todayCairo = getCairoDateString();
      let tasks = profile?.daily_attempts_count || 0;
      const lastDate = profile?.last_attempt_date;

      if (lastDate !== todayCairo) {
        tasks = 0;
        await supabase
          .from("profiles")
          .update({ daily_attempts_count: 0, last_attempt_date: todayCairo })
          .eq("id", userId);
      }

      setCompletedTasks(tasks);

      const { data: packageData } = await supabase
        .from("packages")
        .select("task_reward")
        .eq("account_type", accountType)
        .eq("is_active", true)
        .maybeSingle();

      if (packageData) {
        setTaskReward(packageData.task_reward);
      } else {
        const fallbackRewards: Record<string, number> = { beginner: 3, vip1: 15, vip2: 25, vip3: 35 };
        setTaskReward(fallbackRewards[accountType] || 3);
      }
    } catch (err) {
      console.error("Error initializing:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartWork = () => {
    if (completedTasks >= MAX_DAILY_TASKS) return;
    setIsTaskActive(true);
    setRemainingSeconds(TASK_DURATION_SECONDS);
    setCanCollect(false);
    setCurrentMessage(motivationalMessages[0]);
    toast({ title: "🚀 بدأت المهمة", description: "انتظر حتى انتهاء العد التنازلي" });
  };

  const playCompletionSound = () => {
    const audio = new Audio('/sounds/task-complete.wav');
    audio.volume = 0.5;
    audio.play().catch(console.error);
  };

  const handleCollectReward = async () => {
    if (!canCollect || isCollecting) return;
    setIsCollecting(true);
    
    try {
      const todayCairo = getCairoDateString();
      const newCompletedTasks = completedTasks + 1;

      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("balance, total_earnings")
        .eq("id", userId)
        .maybeSingle();

      const newBalance = (currentProfile?.balance || 0) + taskReward;
      const newEarnings = (currentProfile?.total_earnings || 0) + taskReward;

      await supabase
        .from("profiles")
        .update({ balance: newBalance, total_earnings: newEarnings, daily_attempts_count: newCompletedTasks, last_attempt_date: todayCairo })
        .eq("id", userId);

      await supabase.from("activity_logs").insert({ user_id: userId, action: "أرباح المهام اليومية", amount: taskReward });

      setCompletedTasks(newCompletedTasks);
      setCanCollect(false);
      onBalanceUpdate(newBalance, taskReward);
      
      // Play completion sound
      playCompletionSound();
      
      toast({ title: "🎉 مبروك!", description: `تم إضافة ${taskReward} جنيه` });
    } catch (err) {
      toast({ title: "❌ خطأ", description: "حاول مرة أخرى", variant: "destructive" });
    } finally {
      setIsCollecting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isDayComplete = completedTasks >= MAX_DAILY_TASKS;

  if (isLoading) {
    return (
      <div className="bg-gradient-card rounded-2xl shadow-card border border-border/50 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">المهام اليومية</h2>
              <p className="text-muted-foreground text-sm">أكمل مهامك للحصول على أرباحك</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-2xl font-black text-gradient-gold">{completedTasks}/{MAX_DAILY_TASKS}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="bg-primary/10 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">مكافأة كل مهمة</p>
          <p className="text-2xl font-bold text-primary">+{taskReward} جنيه</p>
        </div>

        {isDayComplete ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="w-6 h-6" />
              <div>
                <p className="font-bold">أكملت جميع مهام اليوم</p>
                <p className="text-sm">عد غداً للعمل مجدداً</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-emerald/10 border border-emerald/30 rounded-xl p-4">
            <div className="flex items-center gap-3 text-emerald">
              <CheckCircle2 className="w-6 h-6" />
              <p className="font-bold">لديك {MAX_DAILY_TASKS - completedTasks} مهام متبقية</p>
            </div>
          </div>
        )}

        {isTaskActive && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border-2 border-primary/50 rounded-2xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-primary animate-pulse" />
              <span className="text-sm text-muted-foreground">المهمة رقم {completedTasks + 1}</span>
            </div>
            <p className="text-5xl font-black text-gradient-gold tabular-nums">{formatTime(remainingSeconds)}</p>
            <motion.p key={currentMessage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-primary mt-3 font-medium">{currentMessage}</motion.p>
            <div className="mt-4 bg-muted rounded-full h-2 overflow-hidden">
              <motion.div className="h-full bg-gradient-gold" animate={{ width: `${(remainingSeconds / TASK_DURATION_SECONDS) * 100}%` }} />
            </div>
          </motion.div>
        )}

        {canCollect && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="bg-emerald/20 border border-emerald/50 rounded-xl p-4 text-center">
              <Coins className="w-8 h-8 text-emerald mx-auto mb-2" />
              <p className="font-bold text-emerald">المهمة مكتملة!</p>
            </div>
            <Button onClick={handleCollectReward} disabled={isCollecting} className="w-full bg-gradient-gold text-primary-foreground font-bold h-14 text-lg">
              {isCollecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>استلام {taskReward} جنيه</>}
            </Button>
          </motion.div>
        )}

        {!isTaskActive && !canCollect && !isDayComplete && (
          <Button onClick={handleStartWork} className="w-full bg-gradient-gold text-primary-foreground font-bold h-14 text-lg">
            <Briefcase className="w-5 h-5 ml-2" />
            بدء العمل
          </Button>
        )}
      </div>
    </motion.div>
  );
};
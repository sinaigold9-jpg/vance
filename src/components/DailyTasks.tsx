import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DailyTasksProps {
  userId: string;
  accountType: "beginner" | "vip1" | "vip2" | "vip3";
  onBalanceUpdate: (newBalance: number, earnings: number) => void;
}

// Get Cairo timezone date string (YYYY-MM-DD)
const getCairoDateString = () => {
  const now = new Date();
  const cairoOffset = 2 * 60; // Cairo is UTC+2
  const localOffset = now.getTimezoneOffset();
  const cairoTime = new Date(now.getTime() + (cairoOffset + localOffset) * 60000);
  return cairoTime.toISOString().split('T')[0];
};

export const DailyTasks = ({ userId, accountType, onBalanceUpdate }: DailyTasksProps) => {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dailyAttemptsCount, setDailyAttemptsCount] = useState(0);
  const [lastAttemptDate, setLastAttemptDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [taskReward, setTaskReward] = useState(0);

  const MAX_DAILY_ATTEMPTS = 3;

  useEffect(() => {
    if (userId) {
      initializeUserData();
    }
  }, [userId]);

  const initializeUserData = async () => {
    setIsLoading(true);
    try {
      // Fetch user profile with attempts data
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("daily_attempts_count, last_attempt_date")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        setIsLoading(false);
        return;
      }

      const todayCairo = getCairoDateString();
      let attempts = profile?.daily_attempts_count || 0;
      const lastDate = profile?.last_attempt_date;

      // Reset attempts if it's a new day (Cairo time)
      if (lastDate !== todayCairo) {
        attempts = 0;
        // Update database with reset
        await supabase
          .from("profiles")
          .update({
            daily_attempts_count: 0,
            last_attempt_date: todayCairo,
          })
          .eq("id", userId);
      }

      setDailyAttemptsCount(attempts);
      setLastAttemptDate(todayCairo);

      // Fetch task reward from packages table
      const { data: packageData } = await supabase
        .from("packages")
        .select("task_reward")
        .eq("account_type", accountType)
        .eq("is_active", true)
        .maybeSingle();

      if (packageData) {
        setTaskReward(packageData.task_reward);
      } else {
        // Fallback rewards
        const fallbackRewards: Record<string, number> = {
          beginner: 3,
          vip1: 15,
          vip2: 25,
          vip3: 35,
        };
        setTaskReward(fallbackRewards[accountType] || 3);
      }
    } catch (err) {
      console.error("Error initializing:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Check attempts before anything
    if (dailyAttemptsCount >= MAX_DAILY_ATTEMPTS) {
      return;
    }

    const enteredCode = code.trim();
    if (!enteredCode) {
      toast({
        title: "⚠️ أدخل الكود",
        description: "يرجى إدخال كود المهمة",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Search for code in daily_codes
      const { data: codeData, error: codeError } = await supabase
        .from("daily_codes")
        .select("code, is_active")
        .eq("code", enteredCode)
        .maybeSingle();

      if (codeError) {
        console.error("Error validating code:", codeError);
        toast({
          title: "❌ خطأ",
          description: "حدث خطأ أثناء التحقق من الكود، حاول مرة أخرى",
          variant: "destructive",
        });
        // Still count as attempt
        await incrementAttempt();
        return;
      }

      const todayCairo = getCairoDateString();
      const newAttemptsCount = dailyAttemptsCount + 1;

      // Check if code is valid and active
      if (codeData && codeData.is_active) {
        // SUCCESS: Add balance
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("balance, total_earnings")
          .eq("id", userId)
          .maybeSingle();

        const currentBalance = currentProfile?.balance || 0;
        const currentEarnings = currentProfile?.total_earnings || 0;
        const newBalance = currentBalance + taskReward;
        const newEarnings = currentEarnings + taskReward;

        // Update profile with new balance and increment attempts
        await supabase
          .from("profiles")
          .update({
            balance: newBalance,
            total_earnings: newEarnings,
            daily_attempts_count: newAttemptsCount,
            last_attempt_date: todayCairo,
          })
          .eq("id", userId);

        // Log activity
        await supabase.from("activity_logs").insert({
          user_id: userId,
          action: "أرباح المهام اليومية",
          amount: taskReward,
          details: { code: enteredCode, attempt: newAttemptsCount },
        });

        setDailyAttemptsCount(newAttemptsCount);
        setCode("");
        
        onBalanceUpdate(newBalance, taskReward);

        toast({
          title: "🎉 مبروك!",
          description: `لقد ربحت ${taskReward} جنيه`,
        });
      } else {
        // FAILURE: Code not found or inactive
        await supabase
          .from("profiles")
          .update({
            daily_attempts_count: newAttemptsCount,
            last_attempt_date: todayCairo,
          })
          .eq("id", userId);

        // Log failed attempt
        await supabase.from("activity_logs").insert({
          user_id: userId,
          action: "محاولة مهمة فاشلة",
          amount: 0,
          details: { code: enteredCode, attempt: newAttemptsCount, reason: "invalid_or_inactive" },
        });

        setDailyAttemptsCount(newAttemptsCount);
        setCode("");

        toast({
          title: "❌ كود غير صالح",
          description: "الكود غير صالح أو غير مفعل، يرجى التواصل مع خدمة العملاء أو إدخال كود آخر",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({
        title: "❌ خطأ",
        description: "حدث خطأ غير متوقع، حاول مرة أخرى",
        variant: "destructive",
      });
      await incrementAttempt();
    } finally {
      setIsSubmitting(false);
    }
  };

  const incrementAttempt = async () => {
    const todayCairo = getCairoDateString();
    const newCount = dailyAttemptsCount + 1;
    await supabase
      .from("profiles")
      .update({
        daily_attempts_count: newCount,
        last_attempt_date: todayCairo,
      })
      .eq("id", userId);
    setDailyAttemptsCount(newCount);
  };

  const isDisabled = dailyAttemptsCount >= MAX_DAILY_ATTEMPTS;
  const remainingAttempts = MAX_DAILY_ATTEMPTS - dailyAttemptsCount;

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-card rounded-2xl shadow-card border border-border/50 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Gift className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">المهام اليومية</h2>
              <p className="text-muted-foreground text-sm">أدخل الكود للحصول على مكافأتك</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-2xl font-black text-gradient-gold">{dailyAttemptsCount}/{MAX_DAILY_ATTEMPTS}</p>
            <p className="text-muted-foreground text-xs">محاولات اليوم</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Reward Info */}
        <div className="bg-primary/10 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">مكافأة كل مهمة ناجحة</p>
          <p className="text-2xl font-bold text-primary">+{taskReward} جنيه</p>
        </div>

        {/* Status Message */}
        {isDisabled ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-bold">لقد استهلكت عدد المحاولات اليومية</p>
                <p className="text-sm">عد غداً بعد منتصف الليل للمحاولة مجدداً</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-emerald/10 border border-emerald/30 rounded-xl p-4">
            <div className="flex items-center gap-3 text-emerald">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-bold">لديك {remainingAttempts} محاولات متبقية</p>
                <p className="text-sm">أدخل الكود الصحيح للفوز بالمكافأة</p>
              </div>
            </div>
          </div>
        )}

        {/* Code Input */}
        <div className="space-y-3">
          <Input
            placeholder="أدخل الكود هنا..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={isDisabled || isSubmitting}
            className="bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground text-center text-lg h-14"
          />
          <Button
            onClick={handleSubmit}
            disabled={isDisabled || isSubmitting || !code.trim()}
            className="w-full bg-gradient-gold text-primary-foreground font-bold hover:opacity-90 h-14 text-lg"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "تأكيد المهمة"
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

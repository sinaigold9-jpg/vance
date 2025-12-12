import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Lock, Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface Task {
  id: number;
  completed: boolean;
  reward: number;
}

interface DailyTasksProps {
  tasks: Task[];
  rewardPerTask: number;
  onCompleteTask: (taskId: number, code: string) => boolean;
  dailyCode: string;
}

export const DailyTasks = ({ tasks, rewardPerTask, onCompleteTask, dailyCode }: DailyTasksProps) => {
  const [codes, setCodes] = useState<{ [key: number]: string }>({});
  const [completedAnimation, setCompletedAnimation] = useState<number | null>(null);

  const handleSubmit = (taskId: number) => {
    const code = codes[taskId] || "";
    if (code === dailyCode) {
      const success = onCompleteTask(taskId, code);
      if (success) {
        setCompletedAnimation(taskId);
        toast({
          title: "🎉 مبروك!",
          description: `لقد ربحت ${rewardPerTask} جنيه`,
        });
        setTimeout(() => setCompletedAnimation(null), 1000);
      }
    } else {
      toast({
        title: "❌ كود خاطئ",
        description: "يرجى إدخال الكود الصحيح",
        variant: "destructive",
      });
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;

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
              <p className="text-muted-foreground text-sm">أكمل المهام لتربح المكافآت</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-2xl font-black text-gradient-gold">{completedCount}/{tasks.length}</p>
            <p className="text-muted-foreground text-xs">مهام مكتملة</p>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="p-6 space-y-4">
        {tasks.map((task, index) => {
          const isLocked = index > 0 && !tasks[index - 1].completed;
          
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-4 rounded-xl border transition-all duration-300 ${
                task.completed
                  ? "bg-emerald/10 border-emerald/30"
                  : isLocked
                  ? "bg-secondary/30 border-border/30 opacity-50"
                  : "bg-secondary/50 border-border/50"
              }`}
            >
              <AnimatePresence>
                {completedAnimation === task.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute inset-0 bg-emerald/20 rounded-xl flex items-center justify-center"
                  >
                    <Sparkles className="w-12 h-12 text-emerald animate-pulse" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    task.completed
                      ? "bg-emerald text-primary-foreground"
                      : isLocked
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/20 text-primary"
                  }`}>
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isLocked ? (
                      <Lock className="w-5 h-5" />
                    ) : (
                      <span className="font-bold">{task.id}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">المهمة {task.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.completed ? "مكتملة ✓" : isLocked ? "مقفلة" : "أدخل كود اليوم"}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p className={`text-lg font-bold ${task.completed ? "text-emerald" : "text-primary"}`}>
                    +{rewardPerTask} جنيه
                  </p>
                </div>
              </div>

              {!task.completed && !isLocked && (
                <div className="flex gap-2">
                  <Input
                    placeholder="أدخل كود اليوم"
                    value={codes[task.id] || ""}
                    onChange={(e) => setCodes({ ...codes, [task.id]: e.target.value })}
                    className="bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground"
                  />
                  <Button
                    onClick={() => handleSubmit(task.id)}
                    className="bg-gradient-gold text-primary-foreground font-bold hover:opacity-90 px-6"
                  >
                    تأكيد
                  </Button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

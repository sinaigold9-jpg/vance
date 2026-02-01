import { motion } from "framer-motion";
import { Gift, Clock, Trophy, Star, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const OffersPage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-gold flex items-center justify-center"
        >
          <Gift className="w-10 h-10 text-primary-foreground" />
        </motion.div>
        <h2 className="text-2xl font-bold text-foreground mb-2">العروض والمسابقات</h2>
        <Badge variant="secondary" className="gap-1">
          <Clock className="w-3 h-3" />
          قريباً
        </Badge>
      </div>

      {/* Coming Soon Cards */}
      <div className="grid gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-dashed border-border/50 rounded-2xl p-6 text-center"
        >
          <Trophy className="w-12 h-12 mx-auto text-amber-500 mb-3" />
          <h3 className="font-bold text-lg mb-2">المسابقات الأسبوعية</h3>
          <p className="text-muted-foreground text-sm">
            تنافس مع الآخرين واربح جوائز كبيرة كل أسبوع
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-dashed border-border/50 rounded-2xl p-6 text-center"
        >
          <Star className="w-12 h-12 mx-auto text-purple-500 mb-3" />
          <h3 className="font-bold text-lg mb-2">العروض الحصرية</h3>
          <p className="text-muted-foreground text-sm">
            خصومات وعروض خاصة لأعضاء VIP
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-dashed border-border/50 rounded-2xl p-6 text-center"
        >
          <Sparkles className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
          <h3 className="font-bold text-lg mb-2">المكافآت اليومية</h3>
          <p className="text-muted-foreground text-sm">
            مفاجآت ومكافآت إضافية كل يوم
          </p>
        </motion.div>
      </div>

      {/* Status Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center"
      >
        <p className="text-primary font-medium">
          نعمل على تجهيز هذا القسم... ترقبوا التحديثات! 🚀
        </p>
      </motion.div>
    </div>
  );
};

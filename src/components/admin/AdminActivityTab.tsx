import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, User, DollarSign, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Json } from "@/integrations/supabase/types";

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  details: Json;
  amount: number | null;
  created_at: string;
  user_name?: string;
}

export const AdminActivityTab = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching activities:", error);
      toast.error("حدث خطأ في تحميل النشاطات");
    } else {
      const userIds = [...new Set((data || []).map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      
      setActivities((data || []).map(a => ({
        ...a,
        user_name: profilesMap.get(a.user_id) || "مستخدم"
      })));
    }
    setLoading(false);
  };

  const formatTime = (dateStr: string) => format(new Date(dateStr), "d MMMM yyyy - hh:mm a", { locale: ar });

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin text-4xl">⏳</div></div>;

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => (
        <motion.div key={activity.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }} className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold">{activity.action}</span>
                {activity.amount && <span className="flex items-center gap-1 text-sm text-emerald"><DollarSign className="w-3 h-3" />{activity.amount} ج</span>}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <User className="w-3 h-3" /><span>{activity.user_name}</span><span>•</span><Clock className="w-3 h-3" /><span>{formatTime(activity.created_at)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
      {activities.length === 0 && <div className="text-center py-12 text-muted-foreground">لا يوجد نشاطات</div>}
    </div>
  );
};

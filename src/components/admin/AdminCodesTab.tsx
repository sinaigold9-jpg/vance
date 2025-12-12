import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Key, Plus, Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface DailyCode {
  id: string;
  code: string;
  valid_date: string;
  created_at: string;
}

export const AdminCodesTab = () => {
  const [codes, setCodes] = useState<DailyCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { user } = useAuth();

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("daily_codes")
      .select("*")
      .order("valid_date", { ascending: false });

    if (error) {
      console.error("Error fetching codes:", error);
      toast.error("حدث خطأ في تحميل الأكواد");
    } else {
      setCodes(data || []);
    }
    setLoading(false);
  };

  const handleAddCode = async () => {
    if (!newCode.trim()) {
      toast.error("يرجى إدخال الكود");
      return;
    }

    const { error } = await supabase.from("daily_codes").insert({
      code: newCode.trim(),
      valid_date: newDate,
      created_by: user?.id,
    });

    if (error) {
      if (error.message.includes("unique")) {
        toast.error("يوجد كود لهذا اليوم بالفعل");
      } else {
        toast.error("حدث خطأ في إضافة الكود");
      }
    } else {
      toast.success("تم إضافة الكود بنجاح");
      setNewCode("");
      fetchCodes();
    }
  };

  const handleDeleteCode = async (id: string) => {
    const { error } = await supabase.from("daily_codes").delete().eq("id", id);

    if (error) {
      toast.error("حدث خطأ في حذف الكود");
    } else {
      toast.success("تم حذف الكود");
      fetchCodes();
    }
  };

  const isToday = (dateStr: string) => {
    return format(new Date(), "yyyy-MM-dd") === dateStr;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Code */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          إضافة كود جديد
        </h3>
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="الكود اليومي"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            className="flex-1 min-w-[150px]"
          />
          <Input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-[160px]"
          />
          <Button onClick={handleAddCode}>
            <Plus className="w-4 h-4 ml-1" />
            إضافة
          </Button>
        </div>
      </div>

      {/* Codes List */}
      <div className="space-y-3">
        {codes.map((code, index) => (
          <motion.div
            key={code.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`bg-card border rounded-xl p-4 ${
              isToday(code.valid_date) ? "border-primary" : "border-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isToday(code.valid_date) ? "bg-primary/10" : "bg-muted"
                }`}>
                  <Key className={`w-5 h-5 ${isToday(code.valid_date) ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg font-mono">{code.code}</span>
                    {isToday(code.valid_date) && (
                      <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                        اليوم
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(code.valid_date), "EEEE، d MMMM yyyy", { locale: ar })}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDeleteCode(code.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}

        {codes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            لا يوجد أكواد
          </div>
        )}
      </div>
    </div>
  );
};

import { useState, useEffect, forwardRef } from "react";
import { motion } from "framer-motion";
import { Key, Plus, Trash2, Copy, Power, PowerOff } from "lucide-react";
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
  is_active: boolean;
}

export const AdminCodesTab = forwardRef<HTMLDivElement>((_, ref) => {
  const [codes, setCodes] = useState<DailyCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
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

    // Generate a unique date that won't conflict
    const uniqueDate = new Date();
    uniqueDate.setFullYear(uniqueDate.getFullYear() + Math.floor(Math.random() * 10) + 1);
    const validDate = uniqueDate.toISOString().split('T')[0];

    const { error } = await supabase.from("daily_codes").insert({
      code: newCode.trim(),
      valid_date: validDate,
      created_by: user?.id,
      is_active: true,
    });

    if (error) {
      console.error("Error adding code:", error);
      toast.error("حدث خطأ في إضافة الكود");
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

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("daily_codes")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("حدث خطأ في تغيير حالة الكود");
    } else {
      toast.success(currentStatus ? "تم إيقاف الكود" : "تم تفعيل الكود");
      fetchCodes();
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("تم نسخ الكود");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div ref={ref} className="space-y-6">
      {/* Add New Code */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          إضافة كود جديد
        </h3>
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="الكود الجديد"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          <Button onClick={handleAddCode}>
            <Plus className="w-4 h-4 ml-1" />
            إضافة
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          التحكم في صلاحية الكود يكون يدوياً عبر زر التفعيل/الإيقاف
        </p>
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
              code.is_active ? "border-emerald-500/50" : "border-border opacity-60"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  code.is_active ? "bg-emerald-500/10" : "bg-destructive/10"
                }`}>
                  <Key className={`w-5 h-5 ${
                    code.is_active ? "text-emerald-500" : "text-destructive"
                  }`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-lg font-mono">{code.code}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      code.is_active 
                        ? "bg-emerald-500/20 text-emerald-600" 
                        : "bg-destructive/20 text-destructive"
                    }`}>
                      {code.is_active ? "مفعل" : "موقف"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    تمت الإضافة: {format(new Date(code.created_at), "d MMM yyyy", { locale: ar })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => handleCopyCode(code.code)}
                  title="نسخ الكود"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={code.is_active 
                    ? "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10" 
                    : "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                  }
                  onClick={() => handleToggleActive(code.id, code.is_active)}
                  title={code.is_active ? "إيقاف الكود" : "تفعيل الكود"}
                >
                  {code.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteCode(code.id)}
                  title="حذف الكود"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
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
});

AdminCodesTab.displayName = "AdminCodesTab";

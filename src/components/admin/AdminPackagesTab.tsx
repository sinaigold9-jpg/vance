import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Package, Edit, DollarSign, Gift, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Database } from "@/integrations/supabase/types";

type AccountType = Database["public"]["Enums"]["account_type"];

interface PackageData {
  id: string;
  name: string;
  price: number;
  account_type: AccountType;
  task_reward: number;
  daily_tasks: number;
  daily_earnings: number;
  min_withdrawal: number;
  has_daily_wheel: boolean;
  is_active: boolean;
}

export const AdminPackagesTab = () => {
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(null);
  const [editedPackage, setEditedPackage] = useState<PackageData | null>(null);

  useEffect(() => { fetchPackages(); }, []);

  const fetchPackages = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("packages").select("*").order("price", { ascending: true });
    if (error) toast.error("حدث خطأ في تحميل الباقات");
    else setPackages(data || []);
    setLoading(false);
  };

  const handleSavePackage = async () => {
    if (!selectedPackage || !editedPackage) return;
    const { error } = await supabase.from("packages").update({
      name: editedPackage.name,
      price: editedPackage.price,
      task_reward: editedPackage.task_reward,
      daily_tasks: editedPackage.daily_tasks,
      daily_earnings: editedPackage.daily_earnings,
      min_withdrawal: editedPackage.min_withdrawal,
      has_daily_wheel: editedPackage.has_daily_wheel,
      is_active: editedPackage.is_active
    }).eq("id", selectedPackage.id);
    if (error) toast.error("حدث خطأ في تحديث الباقة");
    else { toast.success("تم تحديث الباقة بنجاح"); fetchPackages(); setSelectedPackage(null); }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) { case "beginner": return "مبتدئ"; case "vip1": return "VIP 1"; case "vip2": return "VIP 2"; case "vip3": return "VIP 3"; default: return type; }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin text-4xl">⏳</div></div>;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {packages.map((pkg, index) => (
          <motion.div key={pkg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className={`bg-card border rounded-xl p-4 ${pkg.is_active ? "border-primary/50" : "border-border opacity-60"}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center"><Package className="w-6 h-6 text-primary-foreground" /></div>
                <div><h3 className="font-bold text-lg">{pkg.name}</h3><p className="text-sm text-muted-foreground">{getAccountTypeLabel(pkg.account_type)}</p></div>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setSelectedPackage(pkg); setEditedPackage(pkg); }}><Edit className="w-4 h-4" /></Button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /><span>السعر: {pkg.price} ج</span></div>
              <div className="flex items-center gap-2"><Gift className="w-4 h-4 text-emerald" /><span>ربح المهمة: {pkg.task_reward} ج</span></div>
              <div className="flex items-center gap-2"><Crown className="w-4 h-4 text-vip-gold" /><span>الربح اليومي: {pkg.daily_earnings} ج</span></div>
              <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-muted-foreground" /><span>أقل سحب: {pkg.min_withdrawal} ج</span></div>
            </div>
          </motion.div>
        ))}
      </div>

      <Dialog open={!!selectedPackage} onOpenChange={() => setSelectedPackage(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تعديل الباقة</DialogTitle></DialogHeader>
          {editedPackage && (
            <div className="space-y-4">
              <div className="space-y-2"><label className="text-sm font-medium">اسم الباقة</label><Input value={editedPackage.name} onChange={(e) => setEditedPackage({ ...editedPackage, name: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">السعر (جنيه)</label><Input type="number" value={editedPackage.price} onChange={(e) => setEditedPackage({ ...editedPackage, price: Number(e.target.value) })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">ربح المهمة (جنيه)</label><Input type="number" value={editedPackage.task_reward} onChange={(e) => setEditedPackage({ ...editedPackage, task_reward: Number(e.target.value) })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">الربح اليومي (جنيه)</label><Input type="number" value={editedPackage.daily_earnings} onChange={(e) => setEditedPackage({ ...editedPackage, daily_earnings: Number(e.target.value) })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">الحد الأدنى للسحب (جنيه)</label><Input type="number" value={editedPackage.min_withdrawal} onChange={(e) => setEditedPackage({ ...editedPackage, min_withdrawal: Number(e.target.value) })} /></div>
              <div className="flex items-center justify-between"><label className="text-sm font-medium">عجلة الحظ اليومية</label><Switch checked={editedPackage.has_daily_wheel} onCheckedChange={(checked) => setEditedPackage({ ...editedPackage, has_daily_wheel: checked })} /></div>
              <div className="flex items-center justify-between"><label className="text-sm font-medium">تفعيل الباقة</label><Switch checked={editedPackage.is_active} onCheckedChange={(checked) => setEditedPackage({ ...editedPackage, is_active: checked })} /></div>
              <Button className="w-full" onClick={handleSavePackage}>حفظ التغييرات</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

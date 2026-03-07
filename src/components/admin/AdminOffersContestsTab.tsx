import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Trophy, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OfferContest {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  type: string;
  reward_type: string;
  reward_amount: number;
  required_task: string;
  custom_task_description: string | null;
  display_location: string;
  is_active: boolean;
  max_participants: number | null;
  ends_at: string | null;
  display_order: number;
  created_at: string;
}

const DISPLAY_LOCATIONS: Record<string, string> = {
  home_only: "الصفحة الرئيسية فقط",
  offers_only: "صفحة العروض فقط",
  both: "الرئيسية + العروض",
  contest_points: "مسابقة نقاط",
  offers_contests_page: "صفحة العروض والمسابقات",
};

const TASK_TYPES: Record<string, string> = {
  share_app: "مشاركة التطبيق",
  invite_friends: "دعوة أصدقاء",
  share_facebook: "مشاركة فيسبوك",
  share_telegram: "مشاركة تيليجرام",
  share_whatsapp: "مشاركة واتساب",
  custom: "مهمة مخصصة",
};

export const AdminOffersContestsTab = () => {
  const [items, setItems] = useState<OfferContest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("offer");
  const [rewardType, setRewardType] = useState("balance");
  const [rewardAmount, setRewardAmount] = useState("0");
  const [requiredTask, setRequiredTask] = useState("share_app");
  const [customTaskDesc, setCustomTaskDesc] = useState("");
  const [displayLocation, setDisplayLocation] = useState("offers_only");
  const [imageUrl, setImageUrl] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    const { data } = await supabase
      .from("offers_contests")
      .select("*")
      .order("display_order", { ascending: true });
    if (data) setItems(data as unknown as OfferContest[]);
  };

  const resetForm = () => {
    setTitle(""); setDescription(""); setType("offer"); setRewardType("balance");
    setRewardAmount("0"); setRequiredTask("share_app"); setCustomTaskDesc("");
    setDisplayLocation("offers_only"); setImageUrl(""); setEndsAt("");
    setMaxParticipants(""); setDisplayOrder("0"); setEditingId(null); setShowForm(false);
  };

  const handleEdit = (item: OfferContest) => {
    setTitle(item.title); setDescription(item.description); setType(item.type);
    setRewardType(item.reward_type); setRewardAmount(String(item.reward_amount));
    setRequiredTask(item.required_task); setCustomTaskDesc(item.custom_task_description || "");
    setDisplayLocation(item.display_location); setImageUrl(item.image_url || "");
    setEndsAt(item.ends_at ? item.ends_at.slice(0, 16) : "");
    setMaxParticipants(item.max_participants ? String(item.max_participants) : "");
    setDisplayOrder(String(item.display_order)); setEditingId(item.id); setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `offers/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("ad-images").upload(path, file);
    if (error) { toast.error("فشل رفع الصورة"); return; }
    const { data: urlData } = supabase.storage.from("ad-images").getPublicUrl(path);
    setImageUrl(urlData.publicUrl);
    toast.success("تم رفع الصورة");
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("العنوان والوصف مطلوبان");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      type,
      reward_type: rewardType,
      reward_amount: Number(rewardAmount),
      required_task: requiredTask,
      custom_task_description: customTaskDesc.trim() || null,
      display_location: displayLocation,
      image_url: imageUrl || null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      max_participants: maxParticipants ? Number(maxParticipants) : null,
      display_order: Number(displayOrder),
    };

    if (editingId) {
      const { error } = await supabase.from("offers_contests").update(payload).eq("id", editingId);
      if (error) { toast.error("فشل التحديث"); return; }
      toast.success("تم التحديث بنجاح");
    } else {
      const { error } = await supabase.from("offers_contests").insert(payload);
      if (error) { toast.error("فشل الإنشاء"); return; }
      toast.success("تم الإنشاء بنجاح");
    }
    resetForm();
    fetchItems();
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await supabase.from("offers_contests").update({ is_active: !isActive }).eq("id", id);
    toast.success(isActive ? "تم إيقاف النشاط" : "تم تفعيل النشاط");
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    await supabase.from("offers_contests").delete().eq("id", id);
    toast.success("تم الحذف");
    fetchItems();
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{items.length}</p>
          <p className="text-xs text-muted-foreground">الإجمالي</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-500">{items.filter(i => i.is_active).length}</p>
          <p className="text-xs text-muted-foreground">نشط</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-500">{items.filter(i => i.type === "contest").length}</p>
          <p className="text-xs text-muted-foreground">مسابقات</p>
        </div>
      </div>

      <Button onClick={() => { resetForm(); setShowForm(true); }} className="w-full">
        <Plus className="w-4 h-4 ml-2" />
        إنشاء عرض / مسابقة جديدة
      </Button>

      {/* Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-card border border-border rounded-xl p-4 space-y-4"
        >
          <h3 className="font-bold">{editingId ? "تعديل" : "إنشاء جديد"}</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">النوع</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="offer">عرض ترويجي</SelectItem>
                  <SelectItem value="contest">مسابقة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">نوع المكافأة</label>
              <Select value={rewardType} onValueChange={setRewardType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="balance">رصيد (ج.م)</SelectItem>
                  <SelectItem value="points">نقاط</SelectItem>
                  <SelectItem value="feature">ميزة خاصة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Input placeholder="العنوان" value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea placeholder="الوصف" value={description} onChange={e => setDescription(e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">قيمة المكافأة</label>
              <Input type="number" value={rewardAmount} onChange={e => setRewardAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">المهمة المطلوبة</label>
              <Select value={requiredTask} onValueChange={setRequiredTask}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {requiredTask === "custom" && (
            <Input placeholder="وصف المهمة المخصصة" value={customTaskDesc} onChange={e => setCustomTaskDesc(e.target.value)} />
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">مكان الظهور</label>
            <Select value={displayLocation} onValueChange={setDisplayLocation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(DISPLAY_LOCATIONS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">صورة توضيحية</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm" />
            {imageUrl && <img src={imageUrl} alt="preview" className="h-20 rounded-lg mt-2 object-cover" />}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">تاريخ الانتهاء</label>
              <Input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">حد المشاركين</label>
              <Input type="number" value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} placeholder="بدون حد" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">ترتيب العرض</label>
              <Input type="number" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              {editingId ? "تحديث" : "إنشاء"}
            </Button>
            <Button variant="outline" onClick={resetForm}>إلغاء</Button>
          </div>
        </motion.div>
      )}

      {/* List */}
      <div className="space-y-3">
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {item.type === "offer" ? <Gift className="w-4 h-4 text-primary" /> : <Trophy className="w-4 h-4 text-amber-500" />}
                  <span className="font-bold text-sm">{item.title}</span>
                  <Badge variant={item.is_active ? "default" : "secondary"} className="text-[10px]">
                    {item.is_active ? "نشط" : "متوقف"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                <div className="flex gap-2 mt-2 text-[10px] text-muted-foreground">
                  <span>المكافأة: {item.reward_amount} {item.reward_type === "points" ? "نقطة" : "ج.م"}</span>
                  <span>•</span>
                  <span>{DISPLAY_LOCATIONS[item.display_location] || item.display_location}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => handleEdit(item)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => handleToggle(item.id, item.is_active)}>
                  {item.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

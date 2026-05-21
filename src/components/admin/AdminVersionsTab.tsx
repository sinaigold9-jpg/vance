import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Image as ImageIcon, X, Loader2, Radar, Send, EyeOff } from "lucide-react";

interface Feature {
  label: string;
  description?: string;
  badge?: "new" | "feature" | "fix" | "vip";
}

interface VersionRow {
  id: string;
  version: string;
  version_code: number;
  title: string;
  description: string | null;
  features: Feature[];
  images: string[];
  is_mandatory: boolean;
  target_audience: string;
  update_label: string | null;
  is_active: boolean;
  release_date: string;
  status?: string;
  size_bytes?: number;
  auto_generated?: boolean;
  build_hash?: string | null;
  published_at?: string | null;
}

const empty: Omit<VersionRow, "id" | "release_date"> = {
  version: "",
  version_code: 0,
  title: "",
  description: "",
  features: [],
  images: [],
  is_mandatory: true,
  target_audience: "all",
  update_label: "",
  is_active: true,
};

export const AdminVersionsTab = () => {
  const [rows, setRows] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VersionRow | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [uploading, setUploading] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_versions")
      .select("*")
      .order("version_code", { ascending: false });
    if (error) toast.error("فشل جلب الإصدارات");
    else
      setRows(
        (data || []).map((r: any) => ({
          ...r,
          update_label: r.update_label ?? "",
          features: Array.isArray(r.features) ? r.features : [],
          images: Array.isArray(r.images) ? r.images : [],
        }))
      );
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  };

  const openEdit = (r: VersionRow) => {
    setEditing(r);
    setForm({
      version: r.version,
      version_code: r.version_code,
      title: r.title,
      description: r.description || "",
      features: r.features,
      images: r.images,
      is_mandatory: r.is_mandatory,
      target_audience: r.target_audience,
      update_label: r.update_label || "",
      is_active: r.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.version || !form.version_code || !form.title) {
      toast.error("اكمل الحقول الأساسية");
      return;
    }
    const payload = {
      version: form.version,
      version_code: form.version_code,
      title: form.title,
      description: form.description || null,
      features: form.features as any,
      images: form.images,
      is_mandatory: form.is_mandatory,
      target_audience: form.target_audience,
      update_label: form.update_label?.trim() || null,
      is_active: form.is_active,
    };
    const op = editing
      ? supabase.from("app_versions").update(payload).eq("id", editing.id)
      : supabase.from("app_versions").insert(payload);
    const { error } = await op;
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editing ? "تم التحديث" : "تم إنشاء الإصدار");
      setOpen(false);
      fetchRows();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا الإصدار؟")) return;
    const { error } = await supabase.from("app_versions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("تم الحذف");
      fetchRows();
    }
  };

  const detectNewVersion = async () => {
    setDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("detect-app-version", { body: {} });
      if (error) { toast.error(error.message); return; }
      if (data?.changed) {
        toast.success(data.message || "تم إنشاء مسودة جديدة");
        fetchRows();
      } else {
        toast.info(data?.message || "لا توجد نسخة جديدة");
      }
    } catch (e: any) {
      toast.error(e?.message || "فشل الكشف");
    } finally {
      setDetecting(false);
    }
  };

  const publishVersion = async (r: VersionRow) => {
    const { error } = await supabase.from("app_versions")
      .update({ status: "published", published_at: new Date().toISOString() } as any)
      .eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success("تم النشر للمستخدمين"); fetchRows(); }
  };

  const unpublishVersion = async (r: VersionRow) => {
    const { error } = await supabase.from("app_versions")
      .update({ status: "draft" } as any)
      .eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success("تم سحب النشر"); fetchRows(); }
  };

  const formatBytes = (b?: number) => {
    if (!b || b <= 0) return "—";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(units.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
    const v = b / Math.pow(1024, i);
    return `${v.toFixed(v >= 100 || i === 0 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
  };

  const addFeature = () =>
    setForm({ ...form, features: [...form.features, { label: "", description: "", badge: "new" }] });

  const updateFeature = (i: number, patch: Partial<Feature>) => {
    const next = [...form.features];
    next[i] = { ...next[i], ...patch };
    setForm({ ...form, features: next });
  };

  const removeFeature = (i: number) =>
    setForm({ ...form, features: form.features.filter((_, idx) => idx !== i) });

  const uploadImage = async (file: File) => {
    setUploading(true);
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage.from("version-images").upload(path, file);
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("version-images").getPublicUrl(path);
    setForm((f) => ({ ...f, images: [...f.images, data.publicUrl] }));
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">إدارة الإصدارات</h2>
          <p className="text-sm text-muted-foreground">المسودات لا تظهر للمستخدمين. اضغط "نشر" عند الجاهزية.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={detectNewVersion} variant="outline" disabled={detecting} className="gap-2">
            {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
            كشف نسخة جديدة
          </Button>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" /> إصدار جديد
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold font-mono">v{r.version}</span>
                  <Badge variant="outline">#{r.version_code}</Badge>
                  {r.status === "draft" ? (
                    <Badge className="bg-amber-500/20 text-amber-600 border-amber-400/40">مسودة</Badge>
                  ) : (
                    <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-400/40">منشور</Badge>
                  )}
                  {r.is_mandatory && <Badge className="bg-red-500/20 text-red-600 border-red-400/40">إجباري</Badge>}
                  {!r.is_active && <Badge variant="secondary">معطل</Badge>}
                  <Badge variant="outline">{r.target_audience}</Badge>
                  <Badge variant="outline">{formatBytes(r.size_bytes)}</Badge>
                  {r.auto_generated && <Badge variant="outline">تم الكشف تلقائياً</Badge>}
                  {r.update_label && <Badge variant="outline">{r.update_label}</Badge>}
                </div>
                <div className="text-sm mt-1">{r.title}</div>
                <div className="text-xs text-muted-foreground">{r.features.length} ميزات · {r.images.length} صور</div>
              </div>
              {r.status === "draft" ? (
                <Button variant="outline" size="sm" onClick={() => publishVersion(r)} className="gap-1">
                  <Send className="w-3 h-3" /> نشر
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => unpublishVersion(r)} className="gap-1">
                  <EyeOff className="w-3 h-3" /> سحب
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </Card>
          ))}
          {rows.length === 0 && <p className="text-center text-muted-foreground p-8">لا توجد إصدارات</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل إصدار" : "إصدار جديد"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>رقم الإصدار (مثل 1.2.0)</Label>
              <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
            </div>
            <div>
              <Label>كود الإصدار (رقم تسلسلي)</Label>
              <Input
                type="number"
                value={form.version_code}
                onChange={(e) => setForm({ ...form, version_code: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <Label>عنوان التحديث</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          <div>
            <Label>الوصف</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>الجمهور المستهدف</Label>
              <Select value={form.target_audience} onValueChange={(v) => setForm({ ...form, target_audience: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="beginner">مبتدئ</SelectItem>
                  <SelectItem value="vip1">VIP 1</SelectItem>
                  <SelectItem value="vip2">VIP 2</SelectItem>
                  <SelectItem value="vip3">VIP 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>اسم التحديث (اختياري)</Label>
              <Input
                value={form.update_label || ""}
                onChange={(e) => setForm({ ...form, update_label: e.target.value })}
                placeholder="مثال: تحديث الصيف، تحديث الأداء..."
              />
            </div>
            <div className="space-y-2 pt-6">
              <div className="flex items-center justify-between">
                <Label>إجباري</Label>
                <Switch checked={form.is_mandatory} onCheckedChange={(v) => setForm({ ...form, is_mandatory: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>مفعل</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
            </div>
          </div>

          {/* Features editor */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <Label>الميزات الجديدة</Label>
              <Button size="sm" variant="outline" onClick={addFeature} className="gap-1">
                <Plus className="w-3 h-3" /> إضافة ميزة
              </Button>
            </div>
            {form.features.map((f, i) => (
              <Card key={i} className="p-2 space-y-2">
                <div className="grid grid-cols-12 gap-2">
                  <Input
                    className="col-span-5"
                    placeholder="عنوان الميزة"
                    value={f.label}
                    onChange={(e) => updateFeature(i, { label: e.target.value })}
                  />
                  <Select value={f.badge || "new"} onValueChange={(v) => updateFeature(i, { badge: v as any })}>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">جديد</SelectItem>
                      <SelectItem value="feature">ميزة قوية</SelectItem>
                      <SelectItem value="fix">إصلاح</SelectItem>
                      <SelectItem value="vip">حصري VIP</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="col-span-3"
                    placeholder="وصف قصير"
                    value={f.description || ""}
                    onChange={(e) => updateFeature(i, { description: e.target.value })}
                  />
                  <Button variant="ghost" size="icon" className="col-span-1" onClick={() => removeFeature(i)}>
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Images */}
          <div className="space-y-2 border-t pt-3">
            <Label>الصور التوضيحية</Label>
            <div className="flex gap-2 flex-wrap">
              {form.images.map((url, i) => (
                <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                  <img src={url} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setForm({ ...form, images: form.images.filter((_, idx) => idx !== i) })}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="w-24 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                <span className="text-xs mt-1">رفع صورة</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
                />
              </label>
            </div>
          </div>

          <Button onClick={save} className="w-full">حفظ</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVersionsTab;
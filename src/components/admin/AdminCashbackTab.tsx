import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Copy, Power, Loader2, Percent, Tag, Sparkles, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ICON_OPTIONS = ["star", "crown", "flame", "award", "zap", "check", "rocket", "heart", "diamond", "gift"];

interface Badge { id: string; name: string; color: string; icon: string }
interface Tier {
  id: string; title: string; description: string | null; min_amount: number;
  max_amount: number | null; percentage: number; badge_id: string | null; is_active: boolean;
}
interface Offer {
  id: string; title: string; description: string | null; image_url: string | null; color: string;
  percentage: number; min_amount: number; max_amount: number | null;
  starts_at: string; ends_at: string; display_order: number; is_active: boolean;
}
interface LedgerRow {
  id: string; user_id: string; kind: string; amount: number; base_amount: number;
  percentage: number; title: string | null; created_at: string;
}

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const AdminCashbackTab = () => {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    const [t, b, o, l] = await Promise.all([
      supabase.from("cashback_tiers").select("*").order("min_amount", { ascending: true }),
      supabase.from("cashback_badges").select("*").order("created_at", { ascending: true }),
      supabase.from("cashback_offers").select("*").order("display_order", { ascending: true }),
      supabase.from("cashback_transactions").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setTiers((t.data as Tier[]) || []);
    setBadges((b.data as Badge[]) || []);
    setOffers((o.data as Offer[]) || []);
    const rows = (l.data as LedgerRow[]) || [];
    setLedger(rows);
    const ids = [...new Set(rows.map((r) => r.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      setNames(Object.fromEntries((profs || []).map((p) => [p.id, p.full_name])));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const patchTier = (id: string, patch: Partial<Tier>) =>
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const patchOffer = (id: string, patch: Partial<Offer>) =>
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const patchBadge = (id: string, patch: Partial<Badge>) =>
    setBadges((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  // ---- Tiers ----
  const addTier = async () => {
    const { error } = await supabase.from("cashback_tiers").insert({ title: "شريحة جديدة", min_amount: 0, max_amount: 100, percentage: 5 });
    if (error) return toast.error("تعذر إضافة الشريحة");
    toast.success("تمت الإضافة"); load();
  };
  const saveTier = async (t: Tier) => {
    setSaving(t.id);
    const { error } = await supabase.from("cashback_tiers").update({
      title: t.title, description: t.description, min_amount: Number(t.min_amount),
      max_amount: t.max_amount === null || String(t.max_amount) === "" ? null : Number(t.max_amount),
      percentage: Number(t.percentage), badge_id: t.badge_id, is_active: t.is_active,
    }).eq("id", t.id);
    setSaving(null);
    if (error) return toast.error("تعذر الحفظ");
    toast.success("تم الحفظ"); load();
  };
  const deleteTier = async (id: string) => {
    if (!confirm("حذف هذه الشريحة؟")) return;
    await supabase.from("cashback_tiers").delete().eq("id", id);
    toast.success("تم الحذف"); load();
  };

  // ---- Badges ----
  const addBadge = async () => {
    const { error } = await supabase.from("cashback_badges").insert({ name: "شارة جديدة", color: "#D4AF37", icon: "star" });
    if (error) return toast.error("تعذر إضافة الشارة");
    load();
  };
  const saveBadge = async (b: Badge) => {
    const { error } = await supabase.from("cashback_badges").update({ name: b.name, color: b.color, icon: b.icon }).eq("id", b.id);
    if (error) return toast.error("تعذر الحفظ");
    toast.success("تم الحفظ"); load();
  };
  const deleteBadge = async (id: string) => {
    if (!confirm("حذف الشارة؟ ستُزال من كل الشرائح.")) return;
    await supabase.from("cashback_badges").delete().eq("id", id);
    load();
  };

  // ---- Offers ----
  const addOffer = async () => {
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 86400000);
    const { error } = await supabase.from("cashback_offers").insert({
      title: "عرض خاص جديد", percentage: 20, min_amount: 100, max_amount: null,
      starts_at: now.toISOString(), ends_at: end.toISOString(),
      display_order: offers.length, color: "#D4AF37",
    });
    if (error) return toast.error("تعذر إضافة العرض");
    load();
  };
  const saveOffer = async (o: Offer) => {
    setSaving(o.id);
    const { error } = await supabase.from("cashback_offers").update({
      title: o.title, description: o.description, image_url: o.image_url, color: o.color,
      percentage: Number(o.percentage), min_amount: Number(o.min_amount),
      max_amount: o.max_amount === null || String(o.max_amount) === "" ? null : Number(o.max_amount),
      starts_at: new Date(o.starts_at).toISOString(), ends_at: new Date(o.ends_at).toISOString(),
      display_order: Number(o.display_order), is_active: o.is_active,
    }).eq("id", o.id);
    setSaving(null);
    if (error) return toast.error("تعذر الحفظ");
    toast.success("تم الحفظ"); load();
  };
  const duplicateOffer = async (o: Offer) => {
    const now = new Date();
    await supabase.from("cashback_offers").insert({
      title: `${o.title} (نسخة)`, description: o.description, image_url: o.image_url, color: o.color,
      percentage: o.percentage, min_amount: o.min_amount, max_amount: o.max_amount,
      starts_at: now.toISOString(), ends_at: new Date(now.getTime() + 7 * 86400000).toISOString(),
      display_order: offers.length, is_active: false,
    });
    toast.success("تم النسخ"); load();
  };
  const deleteOffer = async (id: string) => {
    if (!confirm("حذف العرض نهائياً؟")) return;
    await supabase.from("cashback_offers").delete().eq("id", id);
    load();
  };
  const restartOffer = async (o: Offer) => {
    const now = new Date();
    await supabase.from("cashback_offers").update({
      starts_at: now.toISOString(), ends_at: new Date(now.getTime() + 7 * 86400000).toISOString(), is_active: true,
    }).eq("id", o.id);
    toast.success("تم إعادة تشغيل العرض لمدة 7 أيام"); load();
  };

  if (loading) return <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <Tabs defaultValue="tiers" className="space-y-4" dir="rtl">
      <TabsList className="flex-wrap h-auto gap-2">
        <TabsTrigger value="tiers"><Percent className="w-4 h-4 ml-1" />الشرائح</TabsTrigger>
        <TabsTrigger value="badges"><Tag className="w-4 h-4 ml-1" />الشارات</TabsTrigger>
        <TabsTrigger value="offers"><Sparkles className="w-4 h-4 ml-1" />العروض الخاصة</TabsTrigger>
        <TabsTrigger value="ledger"><History className="w-4 h-4 ml-1" />سجل العمليات</TabsTrigger>
      </TabsList>

      {/* TIERS */}
      <TabsContent value="tiers" className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">الترتيب ثابت دائماً حسب قيمة الشحن (من الأقل للأعلى).</p>
          <Button onClick={addTier} size="sm"><Plus className="w-4 h-4 ml-1" />شريحة جديدة</Button>
        </div>
        {tiers.map((t) => (
          <div key={t.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">العنوان</label><Input value={t.title} onChange={(e) => patchTier(t.id, { title: e.target.value })} /></div>
              <div>
                <label className="text-xs text-muted-foreground">الشارة</label>
                <Select value={t.badge_id ?? "none"} onValueChange={(v) => patchTier(t.id, { badge_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون شارة</SelectItem>
                    {badges.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><label className="text-xs text-muted-foreground">الوصف</label><Textarea rows={2} value={t.description || ""} onChange={(e) => patchTier(t.id, { description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs text-muted-foreground">الحد الأدنى</label><Input type="number" value={t.min_amount} onChange={(e) => patchTier(t.id, { min_amount: Number(e.target.value) })} /></div>
              <div><label className="text-xs text-muted-foreground">الحد الأقصى (فارغ = بلا حد)</label><Input type="number" value={t.max_amount ?? ""} onChange={(e) => patchTier(t.id, { max_amount: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              <div><label className="text-xs text-muted-foreground">نسبة الكاش باك %</label><Input type="number" value={t.percentage} onChange={(e) => patchTier(t.id, { percentage: Number(e.target.value) })} /></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Switch checked={t.is_active} onCheckedChange={(v) => patchTier(t.id, { is_active: v })} /><span className="text-sm">{t.is_active ? "مفعّلة" : "متوقفة"}</span></div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveTier(t)} disabled={saving === t.id}>{saving === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}حفظ</Button>
                <Button size="sm" variant="destructive" onClick={() => deleteTier(t.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
        ))}
      </TabsContent>

      {/* BADGES */}
      <TabsContent value="badges" className="space-y-3">
        <div className="flex justify-end"><Button onClick={addBadge} size="sm"><Plus className="w-4 h-4 ml-1" />شارة جديدة</Button></div>
        {badges.map((b) => (
          <div key={b.id} className="bg-card border border-border rounded-xl p-4 grid md:grid-cols-4 gap-3 items-end">
            <div><label className="text-xs text-muted-foreground">الاسم</label><Input value={b.name} onChange={(e) => patchBadge(b.id, { name: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">اللون</label><Input type="color" value={b.color} onChange={(e) => patchBadge(b.id, { color: e.target.value })} className="h-10 p-1" /></div>
            <div>
              <label className="text-xs text-muted-foreground">الأيقونة</label>
              <Select value={b.icon} onValueChange={(v) => patchBadge(b.id, { icon: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ICON_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => saveBadge(b)}><Save className="w-4 h-4 ml-1" />حفظ</Button>
              <Button size="sm" variant="destructive" onClick={() => deleteBadge(b.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
        {badges.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">لا توجد شارات بعد</p>}
      </TabsContent>

      {/* OFFERS */}
      <TabsContent value="offers" className="space-y-3">
        <div className="flex justify-end"><Button onClick={addOffer} size="sm"><Plus className="w-4 h-4 ml-1" />عرض خاص جديد</Button></div>
        {offers.map((o) => (
          <div key={o.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">العنوان</label><Input value={o.title} onChange={(e) => patchOffer(o.id, { title: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground">رابط الصورة / البانر</label><Input value={o.image_url || ""} onChange={(e) => patchOffer(o.id, { image_url: e.target.value })} /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">الوصف</label><Textarea rows={2} value={o.description || ""} onChange={(e) => patchOffer(o.id, { description: e.target.value })} /></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="text-xs text-muted-foreground">النسبة %</label><Input type="number" value={o.percentage} onChange={(e) => patchOffer(o.id, { percentage: Number(e.target.value) })} /></div>
              <div><label className="text-xs text-muted-foreground">حد أدنى</label><Input type="number" value={o.min_amount} onChange={(e) => patchOffer(o.id, { min_amount: Number(e.target.value) })} /></div>
              <div><label className="text-xs text-muted-foreground">حد أقصى</label><Input type="number" value={o.max_amount ?? ""} onChange={(e) => patchOffer(o.id, { max_amount: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              <div><label className="text-xs text-muted-foreground">اللون</label><Input type="color" value={o.color} onChange={(e) => patchOffer(o.id, { color: e.target.value })} className="h-10 p-1" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><label className="text-xs text-muted-foreground">البداية</label><Input type="datetime-local" value={toLocalInput(o.starts_at)} onChange={(e) => patchOffer(o.id, { starts_at: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground">النهاية</label><Input type="datetime-local" value={toLocalInput(o.ends_at)} onChange={(e) => patchOffer(o.id, { ends_at: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground">ترتيب الظهور</label><Input type="number" value={o.display_order} onChange={(e) => patchOffer(o.id, { display_order: Number(e.target.value) })} /></div>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2"><Switch checked={o.is_active} onCheckedChange={(v) => patchOffer(o.id, { is_active: v })} /><span className="text-sm">{o.is_active ? "مفعّل" : "متوقف"}</span></div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveOffer(o)} disabled={saving === o.id}>{saving === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}حفظ</Button>
                <Button size="sm" variant="outline" onClick={() => restartOffer(o)}><Power className="w-4 h-4 ml-1" />إعادة تشغيل</Button>
                <Button size="sm" variant="outline" onClick={() => duplicateOffer(o)}><Copy className="w-4 h-4 ml-1" />نسخ</Button>
                <Button size="sm" variant="destructive" onClick={() => deleteOffer(o.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
        ))}
        {offers.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">لا توجد عروض خاصة</p>}
      </TabsContent>

      {/* LEDGER */}
      <TabsContent value="ledger" className="space-y-2">
        {ledger.map((r) => (
          <div key={r.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{names[r.user_id] || "مستخدم"}</p>
              <p className="text-[11px] text-muted-foreground">
                {r.title || (r.kind === "spend" ? "استخدام كاش باك" : "كاش باك")} • {new Date(r.created_at).toLocaleString("ar-EG", { hour12: true })}
                {r.kind === "earn" && ` • ${Number(r.percentage)}% من ${Number(r.base_amount)} ج`}
              </p>
            </div>
            <span className={`font-bold ${Number(r.amount) < 0 ? "text-destructive" : "text-emerald"}`}>{Number(r.amount) > 0 ? "+" : ""}{Number(r.amount)} ج</span>
          </div>
        ))}
        {ledger.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">لا توجد عمليات</p>}
      </TabsContent>
    </Tabs>
  );
};

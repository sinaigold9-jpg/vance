import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Plus, Trash2, Edit2, Eye, EyeOff, 
  Link, Image, ArrowUpDown, Save, Upload, Loader2, Clock
} from "lucide-react";

interface Promotion {
  id: string;
  title: string;
  content: string;
  content_style: Record<string, unknown>;
  image_url: string | null;
  link_url: string | null;
  link_type: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  offer_type: string;
  buttons: { label: string }[];
  ends_at: string | null;
  display_location: string;
}

const OFFER_TYPES: Record<string, { label: string; defaultButtons: string[] }> = {
  personal: { label: "عرض شخصي", defaultButtons: ["اربح", "استلم", "فعّل", "تفاصيل"] },
  marketing: { label: "عرض تسويقي", defaultButtons: ["شارك", "ادعُ", "سوّق", "احصل"] },
  discount: { label: "عرض خصم", defaultButtons: ["احجز", "استخدم", "فعّل الآن", "اعرف أكثر"] },
  limited: { label: "عرض محدود الوقت", defaultButtons: ["اضغط الآن", "استغل العرض", "ابدأ", "تفاصيل"] },
};

const DISPLAY_LOCATIONS: Record<string, string> = {
  home_only: "الصفحة الرئيسية فقط",
  offers_only: "صفحة العروض والمسابقات فقط",
  both: "الصفحة الرئيسية + صفحة العروض",
};

export const AdminPromotionsTab = () => {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkType, setLinkType] = useState("internal");
  const [isBold, setIsBold] = useState(false);
  const [textColor, setTextColor] = useState("#ffffff");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [offerType, setOfferType] = useState("personal");
  const [buttons, setButtons] = useState<string[]>(OFFER_TYPES.personal.defaultButtons);
  const [endsAt, setEndsAt] = useState("");
  const [displayLocation, setDisplayLocation] = useState("home_only");

  useEffect(() => { fetchPromotions(); }, []);

  const fetchPromotions = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("promotions")
      .select("*")
      .order("display_order", { ascending: true });

    if (data) setPromotions(data.map(p => ({
      ...p,
      content_style: (p.content_style || {}) as Record<string, unknown>,
      offer_type: (p as any).offer_type || "personal",
      buttons: Array.isArray((p as any).buttons) ? (p as any).buttons : [],
      display_location: (p as any).display_location || "home_only",
    })));
    setIsLoading(false);
  };

  const resetForm = () => {
    setTitle(""); setContent(""); setImageUrl(""); setLinkUrl("");
    setLinkType("internal"); setIsBold(false); setTextColor("#ffffff");
    setDisplayOrder(0); setEditingId(null);
    setOfferType("personal"); setButtons(OFFER_TYPES.personal.defaultButtons);
    setEndsAt(""); setDisplayLocation("home_only");
  };

  const handleEdit = (promo: Promotion) => {
    setEditingId(promo.id);
    setTitle(promo.title); setContent(promo.content);
    setImageUrl(promo.image_url || ""); setLinkUrl(promo.link_url || "");
    setLinkType(promo.link_type); setDisplayOrder(promo.display_order);
    const style = promo.content_style || {};
    setIsBold((style as any).fontWeight === "bold");
    setTextColor((style as any).color || "#ffffff");
    setOfferType(promo.offer_type || "personal");
    setButtons(promo.buttons?.map(b => b.label) || OFFER_TYPES[promo.offer_type || "personal"]?.defaultButtons || []);
    setEndsAt(promo.ends_at || "");
    setDisplayLocation(promo.display_location || "home_only");
  };

  const handleOfferTypeChange = (type: string) => {
    setOfferType(type);
    setButtons(OFFER_TYPES[type]?.defaultButtons || []);
  };

  const handleButtonLabelChange = (index: number, value: string) => {
    const newButtons = [...buttons];
    newButtons[index] = value;
    setButtons(newButtons);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error("يرجى اختيار ملف صورة"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("حجم الصورة يجب أن يكون أقل من 5 ميغابايت"); return; }
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `promo_${Date.now()}.${fileExt}`;
      const filePath = `promotions/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('ad-images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('ad-images').getPublicUrl(filePath);
      setImageUrl(publicUrl);
      toast.success("تم رفع الصورة بنجاح");
    } catch { toast.error("فشل في رفع الصورة"); }
    finally { setIsUploading(false); }
  };

  const handleSave = async () => {
    if (!title || !content) { toast.error("يرجى ملء العنوان والمحتوى"); return; }
    setIsSaving(true);
    const promoData = {
      title, content,
      content_style: { fontWeight: isBold ? "bold" : "normal", color: textColor },
      image_url: imageUrl || null,
      link_url: linkUrl || null,
      link_type: linkType,
      display_order: displayOrder,
      created_by: user?.id,
      offer_type: offerType,
      buttons: buttons.map(label => ({ label })),
      ends_at: endsAt || null,
      display_location: displayLocation,
    };
    try {
      if (editingId) {
        const { error } = await supabase.from("promotions").update(promoData).eq("id", editingId);
        if (error) throw error;
        toast.success("تم تحديث العرض");
      } else {
        const { error } = await supabase.from("promotions").insert(promoData);
        if (error) throw error;
        toast.success("تم إضافة العرض");
      }
      resetForm(); fetchPromotions();
    } catch (error: any) { toast.error(error.message || "حدث خطأ"); }
    finally { setIsSaving(false); }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase.from("promotions").update({ is_active: !isActive }).eq("id", id);
    if (error) toast.error("حدث خطأ");
    else { toast.success(isActive ? "تم إيقاف العرض" : "تم تفعيل العرض"); fetchPromotions(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا العرض؟")) return;
    const { error } = await supabase.from("promotions").delete().eq("id", id);
    if (error) toast.error("حدث خطأ");
    else { toast.success("تم حذف العرض"); fetchPromotions(); }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{promotions.length}</p><p className="text-xs text-muted-foreground">إجمالي العروض</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-accent">{promotions.filter(p => p.is_active).length}</p><p className="text-xs text-muted-foreground">نشط</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-muted-foreground">{promotions.filter(p => !p.is_active).length}</p><p className="text-xs text-muted-foreground">متوقف</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {editingId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingId ? "تعديل العرض" : "إضافة عرض جديد"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><Label>العنوان</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان العرض" /></div>
            <div><Label>المحتوى</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="نص العرض" rows={3} /></div>

            <div>
              <Label>نوع العرض</Label>
              <Select value={offerType} onValueChange={handleOfferTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(OFFER_TYPES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time for limited offers */}
            {offerType === "limited" && (
              <div>
                <Label className="flex items-center gap-1"><Clock className="w-4 h-4" />وقت انتهاء العرض</Label>
                <Input type="datetime-local" value={endsAt ? endsAt.slice(0, 16) : ""} onChange={(e) => setEndsAt(e.target.value ? new Date(e.target.value).toISOString() : "")} />
              </div>
            )}

            {/* Display Location */}
            <div>
              <Label>مكان ظهور العرض</Label>
              <RadioGroup value={displayLocation} onValueChange={setDisplayLocation} className="mt-2 space-y-2">
                {Object.entries(DISPLAY_LOCATIONS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <RadioGroupItem value={key} id={`loc-${key}`} />
                    <Label htmlFor={`loc-${key}`} className="cursor-pointer text-sm">{label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label>أزرار العرض (يمكنك تعديل الأسماء)</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {buttons.map((btn, i) => (
                  <Input key={i} value={btn} onChange={(e) => handleButtonLabelChange(i, e.target.value)} className="text-center text-sm" />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Switch checked={isBold} onCheckedChange={setIsBold} /><Label>خط عريض</Label></div>
              <div className="flex items-center gap-2"><Label>اللون</Label><input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" /></div>
            </div>

            <div>
              <Label className="flex items-center gap-1"><Image className="w-4 h-4" />صورة العرض</Label>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              <div className="space-y-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full gap-2">
                  {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" />جارٍ الرفع...</> : <><Upload className="w-4 h-4" />رفع صورة من الجهاز</>}
                </Button>
                {imageUrl && (
                  <div className="relative">
                    <img src={imageUrl} alt="Preview" className="w-full h-24 object-cover rounded-lg" />
                    <Button size="sm" variant="destructive" className="absolute top-1 right-1 h-6 w-6 p-0" onClick={() => setImageUrl("")}>×</Button>
                  </div>
                )}
              </div>
            </div>

            <div><Label className="flex items-center gap-1"><Link className="w-4 h-4" />الرابط</Label><Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/app/wallet أو https://..." /></div>
            <div>
              <Label>نوع الرابط</Label>
              <Select value={linkType} onValueChange={setLinkType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="internal">داخلي</SelectItem><SelectItem value="external">خارجي</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="flex items-center gap-1"><ArrowUpDown className="w-4 h-4" />ترتيب العرض</Label><Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)} /></div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving} className="flex-1 gap-2 bg-gradient-gold text-primary-foreground">
                <Save className="w-4 h-4" />{editingId ? "تحديث" : "إضافة"}
              </Button>
              {editingId && <Button variant="outline" onClick={resetForm}>إلغاء</Button>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">قائمة العروض</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-secondary/30 rounded-xl animate-pulse" />)}</div>
            ) : promotions.length > 0 ? (
              <div className="space-y-4">
                {promotions.map(promo => (
                  <motion.div key={promo.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`p-4 rounded-xl border ${promo.is_active ? 'bg-primary/5 border-primary/20' : 'bg-secondary/20 border-border/50'}`}
                  >
                    <div className="flex items-start gap-4">
                      {promo.image_url && <img src={promo.image_url} alt={promo.title} className="w-20 h-20 rounded-lg object-cover" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold">{promo.title}</h3>
                          {promo.is_active ? <Badge className="bg-accent">نشط</Badge> : <Badge variant="secondary">متوقف</Badge>}
                          <Badge variant="outline" className="text-xs">{OFFER_TYPES[promo.offer_type]?.label || promo.offer_type}</Badge>
                          <Badge variant="outline" className="text-xs">{DISPLAY_LOCATIONS[promo.display_location] || promo.display_location}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{promo.content}</p>
                        {promo.ends_at && (
                          <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            ينتهي: {new Date(promo.ends_at).toLocaleString("ar-EG")}
                          </p>
                        )}
                        {promo.buttons?.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {promo.buttons.map((btn, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{btn.label}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleToggleActive(promo.id, promo.is_active)}>
                          {promo.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(promo)}><Edit2 className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(promo.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">لا توجد عروض</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tag, Plus, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface DiscountCode {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  applies_to_package: string | null;
  is_active: boolean;
  created_at: string;
}

export const AdminDiscountCodesTab = () => {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [pkg, setPkg] = useState<string>("any");

  const fetchCodes = async () => {
    setLoading(true);
    const { data } = await supabase.from("discount_codes").select("*").order("created_at", { ascending: false });
    if (data) setCodes(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const handleCreate = async () => {
    if (!code.trim() || !value || Number(value) <= 0) {
      toast.error("يرجى إدخال الكود وقيمة الخصم");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("discount_codes").insert({
        code: code.trim().toUpperCase(),
        discount_type: type,
        discount_value: Number(value),
        max_uses: maxUses ? Number(maxUses) : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        applies_to_package: pkg === "any" ? null : pkg,
        is_active: true,
      });
      if (error) throw error;
      toast.success("تم إنشاء الكود بنجاح");
      setCode(""); setValue(""); setMaxUses(""); setExpiresAt(""); setPkg("any");
      fetchCodes();
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("discount_codes").update({ is_active: active }).eq("id", id);
    fetchCodes();
  };

  const deleteCode = async (id: string) => {
    if (!confirm("حذف الكود نهائياً؟")) return;
    await supabase.from("discount_codes").delete().eq("id", id);
    fetchCodes();
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="w-5 h-5" />
            إنشاء كود خصم جديد
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>الكود</Label>
            <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="WELCOME10" className="font-mono" />
          </div>
          <div>
            <Label>نوع الخصم</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">نسبة مئوية %</SelectItem>
                <SelectItem value="fixed">مبلغ ثابت (جنيه)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>قيمة الخصم {type === "percent" ? "(%)" : "(جنيه)"}</Label>
            <Input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder={type === "percent" ? "10" : "50"} />
          </div>
          <div>
            <Label>الحد الأقصى للاستخدام</Label>
            <Input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="بدون حد" />
          </div>
          <div>
            <Label>تاريخ الانتهاء</Label>
            <Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </div>
          <div>
            <Label>الباقة المستهدفة</Label>
            <Select value={pkg} onValueChange={setPkg}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">جميع الباقات</SelectItem>
                <SelectItem value="vip1">VIP1</SelectItem>
                <SelectItem value="vip2">VIP2</SelectItem>
                <SelectItem value="vip3">VIP3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Button onClick={handleCreate} disabled={saving} className="w-full gap-2 bg-gradient-gold text-primary-foreground">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              إنشاء الكود
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tag className="w-5 h-5" />
            الأكواد ({codes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : codes.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">لا توجد أكواد بعد</p>
          ) : (
            <div className="space-y-2">
              {codes.map(c => {
                const expired = c.expires_at && new Date(c.expires_at) < new Date();
                const exhausted = c.max_uses != null && c.used_count >= c.max_uses;
                return (
                  <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold">{c.code}</span>
                        <Badge variant="outline" className="text-xs">
                          {c.discount_type === "percent" ? `${c.discount_value}%` : `${c.discount_value} ج`}
                        </Badge>
                        {c.applies_to_package && <Badge variant="secondary" className="text-xs">{c.applies_to_package}</Badge>}
                        {expired && <Badge variant="destructive" className="text-xs">منتهي</Badge>}
                        {exhausted && <Badge variant="destructive" className="text-xs">مستنفذ</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        الاستخدامات: {c.used_count}{c.max_uses != null ? ` / ${c.max_uses}` : ""}
                        {c.expires_at ? ` • ينتهي ${format(new Date(c.expires_at), "yyyy-MM-dd HH:mm")}` : ""}
                      </p>
                    </div>
                    <Switch checked={c.is_active} onCheckedChange={(v) => toggleActive(c.id, v)} />
                    <Button size="icon" variant="ghost" onClick={() => deleteCode(c.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
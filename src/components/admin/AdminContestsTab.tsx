import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Pencil, Trophy, Gift, ListChecks, ImageIcon, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["تاريخ", "جغرافيا", "أدب", "فنون", "أفلام", "مسلسلات", "تكنولوجيا", "علوم", "رياضة", "دين", "عام"];
const AUDIENCES = [
  { value: "all_vip", label: "كل VIP (1-2-3)" },
  { value: "vip1", label: "VIP1 فقط" },
  { value: "vip2", label: "VIP2 فقط" },
  { value: "vip3", label: "VIP3 فقط" },
];
const REWARD_TYPES = [
  { value: "points", label: "نقاط" },
  { value: "balance", label: "رصيد" },
  { value: "discount_percent", label: "خصم على ترقية الباقة" },
  { value: "vip_upgrade_temp", label: "ترقية مؤقتة" },
];

const emptyContest = {
  title: "",
  subtitle: "",
  description: "",
  banner_url: "",
  starts_at: new Date().toISOString().slice(0, 16),
  ends_at: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
  target_audience: "all_vip",
  total_levels: 20,
  questions_per_level: 5,
  surprise_every: 5,
  is_active: true,
  show_on_home: true,
  show_on_offers: true,
};

export const AdminContestsTab = () => {
  const [contests, setContests] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [manageId, setManageId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("contests" as any).select("*").order("created_at", { ascending: false });
    setContests((data as any[]) || []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.title) { toast.error("أدخل عنوان المسابقة"); return; }
    const payload = {
      ...editing,
      starts_at: new Date(editing.starts_at).toISOString(),
      ends_at: new Date(editing.ends_at).toISOString(),
      total_levels: Number(editing.total_levels),
      questions_per_level: Number(editing.questions_per_level),
      surprise_every: Number(editing.surprise_every),
    };
    delete payload.id;
    if (editing.id) {
      const { error } = await supabase.from("contests" as any).update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("contests" as any).insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success("تم الحفظ");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذه المسابقة وكل بياناتها؟")) return;
    const { error } = await supabase.from("contests" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    load();
  };

  const uploadBanner = async (file: File) => {
    const path = `contest-banners/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("version-images").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("version-images").getPublicUrl(path);
    setEditing((e: any) => ({ ...e, banner_url: data.publicUrl }));
  };

  if (manageId) {
    return <ManageContest contestId={manageId} onBack={() => setManageId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400" /> المسابقات</h2>
        <Button onClick={() => setEditing({ ...emptyContest })} size="sm"><Plus className="w-4 h-4 ml-1" /> مسابقة جديدة</Button>
      </div>

      <div className="grid gap-3">
        {contests.map((c) => (
          <Card key={c.id} className="p-4 flex items-center gap-3">
            {c.banner_url && <img src={c.banner_url} alt="" className="w-16 h-16 rounded object-cover" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold">{c.title}</h3>
                <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "نشطة" : "متوقفة"}</Badge>
                <Badge variant="outline">{c.target_audience}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {c.total_levels} مستويات • {c.questions_per_level} أسئلة/مستوى • تنتهي {new Date(c.ends_at).toLocaleDateString("ar-EG")}
              </p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => setManageId(c.id)}><ListChecks className="w-4 h-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => setEditing({ ...c, starts_at: c.starts_at.slice(0, 16), ends_at: c.ends_at.slice(0, 16) })}><Pencil className="w-4 h-4" /></Button>
              <Button size="sm" variant="destructive" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </Card>
        ))}
        {contests.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد مسابقات بعد</p>}
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "تعديل مسابقة" : "مسابقة جديدة"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>عنوان المسابقة</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="مثال: مسابقة العيد" />
              </div>
              <div>
                <Label>عنوان فرعي</Label>
                <Input value={editing.subtitle || ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
              </div>
              <div>
                <Label>الوصف</Label>
                <Textarea rows={3} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div>
                <Label className="flex items-center gap-1"><ImageIcon className="w-4 h-4" /> البانر</Label>
                <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadBanner(e.target.files[0])} />
                {editing.banner_url && <img src={editing.banner_url} alt="" className="mt-2 w-full h-32 object-cover rounded" />}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>تاريخ البداية</Label>
                  <Input type="datetime-local" value={editing.starts_at} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value })} />
                </div>
                <div>
                  <Label>تاريخ النهاية</Label>
                  <Input type="datetime-local" value={editing.ends_at} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>الفئة المستهدفة</Label>
                <Select value={editing.target_audience} onValueChange={(v) => setEditing({ ...editing, target_audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AUDIENCES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>عدد المستويات</Label>
                  <Input type="number" value={editing.total_levels} onChange={(e) => setEditing({ ...editing, total_levels: e.target.value })} />
                </div>
                <div>
                  <Label>أسئلة/مستوى</Label>
                  <Input type="number" value={editing.questions_per_level} onChange={(e) => setEditing({ ...editing, questions_per_level: e.target.value })} />
                </div>
                <div>
                  <Label>مفاجأة كل</Label>
                  <Input type="number" value={editing.surprise_every} onChange={(e) => setEditing({ ...editing, surprise_every: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /> نشطة</label>
                <label className="flex items-center gap-2"><Switch checked={editing.show_on_home} onCheckedChange={(v) => setEditing({ ...editing, show_on_home: v })} /> الصفحة الرئيسية</label>
                <label className="flex items-center gap-2"><Switch checked={editing.show_on_offers} onCheckedChange={(v) => setEditing({ ...editing, show_on_offers: v })} /> صفحة المسابقات</label>
              </div>
              <Button onClick={save} className="w-full">حفظ</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ---------- Manage questions + rewards for a contest ----------
const ManageContest = ({ contestId, onBack }: { contestId: string; onBack: () => void }) => {
  const [contest, setContest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [qDialog, setQDialog] = useState<any | null>(null);
  const [rDialog, setRDialog] = useState<any | null>(null);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    const [{ data: c }, { data: q }, { data: r }] = await Promise.all([
      supabase.from("contests" as any).select("*").eq("id", contestId).maybeSingle(),
      supabase.from("contest_questions" as any).select("*").eq("contest_id", contestId).order("level_number").order("order_in_level"),
      supabase.from("contest_rewards" as any).select("*").eq("contest_id", contestId).order("at_level"),
    ]);
    setContest(c);
    setQuestions((q as any[]) || []);
    setRewards((r as any[]) || []);
  };
  useEffect(() => { load(); }, [contestId]);

  const autoGenerate = async () => {
    if (!confirm("سيقوم النظام بتوليد أسئلة احترافية تلقائياً عبر الذكاء الاصطناعي وملء المستويات الناقصة. هل تريد المتابعة؟")) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-contest-questions", {
        body: { contest_id: contestId },
      });
      if (error) { toast.error(error.message); return; }
      toast.success(`تم توليد ${data?.generated ?? 0} سؤال جديد`);
      load();
    } catch (e: any) {
      toast.error(e?.message || "فشل التوليد");
    } finally {
      setGenerating(false);
    }
  };

  const saveQuestion = async () => {
    const w = (qDialog.wrong_answers || []).filter((x: string) => x.trim()).slice(0, 3);
    if (!qDialog.question_text || !qDialog.correct_answer || w.length !== 3) {
      toast.error("أدخل السؤال + 4 إجابات (1 صحيحة + 3 خاطئة)");
      return;
    }
    const payload = {
      contest_id: contestId,
      level_number: Number(qDialog.level_number),
      order_in_level: Number(qDialog.order_in_level || 0),
      category: qDialog.category || "عام",
      question_text: qDialog.question_text,
      correct_answer: qDialog.correct_answer,
      wrong_answers: w,
      difficulty: qDialog.difficulty || "medium",
    };
    if (qDialog.id) {
      await supabase.from("contest_questions" as any).update(payload).eq("id", qDialog.id);
    } else {
      await supabase.from("contest_questions" as any).insert(payload);
    }
    setQDialog(null);
    load();
  };

  const delQuestion = async (id: string) => {
    await supabase.from("contest_questions" as any).delete().eq("id", id);
    load();
  };

  const saveReward = async () => {
    if (!rDialog.title || !rDialog.at_level || !rDialog.reward_type) { toast.error("املأ الحقول"); return; }
    let val: any = {};
    if (rDialog.reward_type === "balance") val = { amount: Number(rDialog.amount || 0) };
    if (rDialog.reward_type === "points") val = { points: Number(rDialog.points || 0) };
    if (rDialog.reward_type === "discount_percent") val = { percent: Number(rDialog.percent || 3), days: Number(rDialog.days || 7) };
    if (rDialog.reward_type === "vip_upgrade_temp") val = { to: rDialog.to || "vip2", days: Number(rDialog.days || 7) };
    const payload = {
      contest_id: contestId,
      at_level: Number(rDialog.at_level),
      reward_type: rDialog.reward_type,
      reward_value: val,
      title: rDialog.title,
      icon: rDialog.icon || null,
    };
    if (rDialog.id) {
      await supabase.from("contest_rewards" as any).update(payload).eq("id", rDialog.id);
    } else {
      await supabase.from("contest_rewards" as any).insert(payload);
    }
    setRDialog(null);
    load();
  };

  const delReward = async (id: string) => {
    await supabase.from("contest_rewards" as any).delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack}>← رجوع</Button>
        <h2 className="font-bold">{contest?.title}</h2>
      </div>

      {/* Questions */}
      <Card className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold flex items-center gap-2"><ListChecks className="w-4 h-4" /> الأسئلة ({questions.length})</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={autoGenerate} disabled={generating} className="gap-1">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              توليد تلقائي
            </Button>
            <Button size="sm" onClick={() => setQDialog({ level_number: 1, order_in_level: 0, category: "عام", wrong_answers: ["", "", ""], difficulty: "medium" })}><Plus className="w-4 h-4" /></Button>
          </div>
        </div>
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {questions.map((q) => (
            <div key={q.id} className="flex items-center gap-2 text-sm p-2 border rounded">
              <Badge variant="outline" className="text-[10px]">م{q.level_number}</Badge>
              <Badge variant="secondary" className="text-[10px]">{q.category}</Badge>
              <span className="flex-1 truncate">{q.question_text}</span>
              <Button size="sm" variant="outline" onClick={() => setQDialog({ ...q })}><Pencil className="w-3 h-3" /></Button>
              <Button size="sm" variant="destructive" onClick={() => delQuestion(q.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Rewards */}
      <Card className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold flex items-center gap-2"><Gift className="w-4 h-4" /> مكافآت المفاجأة ({rewards.length})</h3>
          <Button size="sm" onClick={() => setRDialog({ at_level: contest?.surprise_every || 5, reward_type: "points", title: "صندوق مفاجأة" })}><Plus className="w-4 h-4" /></Button>
        </div>
        <div className="space-y-1.5">
          {rewards.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-sm p-2 border rounded">
              <Badge>مستوى {r.at_level}</Badge>
              <Badge variant="outline">{r.reward_type}</Badge>
              <span className="flex-1 truncate">{r.title}</span>
              <Button size="sm" variant="outline" onClick={() => setRDialog({ ...r, ...r.reward_value })}><Pencil className="w-3 h-3" /></Button>
              <Button size="sm" variant="destructive" onClick={() => delReward(r.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Question Dialog */}
      <Dialog open={!!qDialog} onOpenChange={(v) => !v && setQDialog(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{qDialog?.id ? "تعديل سؤال" : "سؤال جديد"}</DialogTitle></DialogHeader>
          {qDialog && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div><Label>المستوى</Label><Input type="number" value={qDialog.level_number} onChange={(e) => setQDialog({ ...qDialog, level_number: e.target.value })} /></div>
                <div><Label>الترتيب</Label><Input type="number" value={qDialog.order_in_level} onChange={(e) => setQDialog({ ...qDialog, order_in_level: e.target.value })} /></div>
                <div>
                  <Label>الفئة</Label>
                  <Select value={qDialog.category} onValueChange={(v) => setQDialog({ ...qDialog, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>نص السؤال</Label><Textarea rows={2} value={qDialog.question_text || ""} onChange={(e) => setQDialog({ ...qDialog, question_text: e.target.value })} /></div>
              <div><Label>الإجابة الصحيحة</Label><Input value={qDialog.correct_answer || ""} onChange={(e) => setQDialog({ ...qDialog, correct_answer: e.target.value })} /></div>
              {[0, 1, 2].map((i) => (
                <div key={i}><Label>إجابة خاطئة {i + 1}</Label>
                  <Input value={(qDialog.wrong_answers || ["", "", ""])[i] || ""} onChange={(e) => {
                    const w = [...(qDialog.wrong_answers || ["", "", ""])]; w[i] = e.target.value;
                    setQDialog({ ...qDialog, wrong_answers: w });
                  }} />
                </div>
              ))}
              <Button onClick={saveQuestion} className="w-full">حفظ</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reward Dialog */}
      <Dialog open={!!rDialog} onOpenChange={(v) => !v && setRDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{rDialog?.id ? "تعديل مكافأة" : "مكافأة جديدة"}</DialogTitle></DialogHeader>
          {rDialog && (
            <div className="space-y-3">
              <div><Label>العنوان</Label><Input value={rDialog.title || ""} onChange={(e) => setRDialog({ ...rDialog, title: e.target.value })} /></div>
              <div><Label>عند مستوى</Label><Input type="number" value={rDialog.at_level} onChange={(e) => setRDialog({ ...rDialog, at_level: e.target.value })} /></div>
              <div>
                <Label>نوع المكافأة</Label>
                <Select value={rDialog.reward_type} onValueChange={(v) => setRDialog({ ...rDialog, reward_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REWARD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {rDialog.reward_type === "balance" && <div><Label>المبلغ (ج.م)</Label><Input type="number" value={rDialog.amount || ""} onChange={(e) => setRDialog({ ...rDialog, amount: e.target.value })} /></div>}
              {rDialog.reward_type === "points" && <div><Label>عدد النقاط</Label><Input type="number" value={rDialog.points || ""} onChange={(e) => setRDialog({ ...rDialog, points: e.target.value })} /></div>}
              {rDialog.reward_type === "discount_percent" && (<>
                <div><Label>نسبة الخصم %</Label><Input type="number" value={rDialog.percent || 3} onChange={(e) => setRDialog({ ...rDialog, percent: e.target.value })} /></div>
                <div><Label>صلاحية (أيام)</Label><Input type="number" value={rDialog.days || 7} onChange={(e) => setRDialog({ ...rDialog, days: e.target.value })} /></div>
              </>)}
              {rDialog.reward_type === "vip_upgrade_temp" && (<>
                <div>
                  <Label>ترقية إلى</Label>
                  <Select value={rDialog.to || "vip2"} onValueChange={(v) => setRDialog({ ...rDialog, to: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vip1">VIP1</SelectItem>
                      <SelectItem value="vip2">VIP2</SelectItem>
                      <SelectItem value="vip3">VIP3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>صلاحية (أيام)</Label><Input type="number" value={rDialog.days || 7} onChange={(e) => setRDialog({ ...rDialog, days: e.target.value })} /></div>
              </>)}
              <Button onClick={saveReward} className="w-full">حفظ</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
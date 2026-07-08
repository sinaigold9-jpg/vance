import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Info, Loader2, Sparkles, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AdminAboutUsTab = () => {
  const [content, setContent] = useState("");
  const [aiPrompt, setAiPrompt] = useState("اكتب وصفًا احترافيًا عن التطبيق يوضح المزايا الرئيسية بطريقة تسويقية.");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "about_us")
        .maybeSingle();
      setContent(data?.value || "");
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key: "about_us", value: content, is_active: true },
        { onConflict: "key" }
      );
    setSaving(false);
    if (error) toast.error("تعذّر الحفظ: " + error.message);
    else toast.success("تم حفظ صفحة عنا");
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-about-us", {
        body: { prompt: aiPrompt },
      });
      if (error) throw error;
      const text = (data as { text?: string })?.text;
      if (text) {
        setContent(text);
        toast.success("تم توليد نص جديد — يمكنك تعديله قبل الحفظ");
      } else {
        toast.error("لم يتم توليد نص");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطأ";
      toast.error("تعذّر التوليد: " + msg);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> مساعد الكتابة بالذكاء الاصطناعي</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="مثال: اكتب وصفًا رسميًا عن التطبيق يبرز الأمان والباقات..."
          />
          <Button onClick={handleGenerate} disabled={generating || !aiPrompt.trim()} className="w-full">
            {generating ? (
              <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري التوليد...</>
            ) : (
              <><Sparkles className="w-4 h-4 ml-2" /> توليد اقتراح</>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            سيتم عرض النص المقترح في محرر "عنا" بالأسفل. يمكنك تعديله ثم الضغط على "حفظ".
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Info className="w-4 h-4 text-primary" /> محتوى صفحة "عنا"</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            placeholder="اكتب هنا وصف التطبيق..."
            className="text-sm leading-relaxed"
          />
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري الحفظ...</>
            ) : (
              <><Save className="w-4 h-4 ml-2" /> حفظ</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
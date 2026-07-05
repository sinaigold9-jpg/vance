import { useState } from "react";
import { Send, MessageSquare, Bell, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TEMPLATES = [
  {
    key: "welcome_update",
    label: "🎉 ترحيب + تحديث التطبيق",
    title: "🎉 مرحباً بك في Advance",
    message:
      "تم تطوير التطبيق بميزات جديدة رائعة:\n\n" +
      "✅ نظام أكواد الخصم عند الاشتراك\n" +
      "✅ استرجاع كلمة المرور عبر بوت تليجرام\n" +
      "✅ إشعارات فورية على هاتفك (Android / iOS)\n" +
      "✅ تحسينات في تجربة الدفع والاشتراك\n\n" +
      "افتح التطبيق الآن وجرّب الجديد 🚀",
  },
  {
    key: "promo_offer",
    label: "🎁 عرض ترويجي",
    title: "🎁 عرض خاص لك",
    message: "استفد من خصم حصري على ترقية باقتك اليوم فقط! افتح التطبيق واستخدم كود الخصم.",
  },
  {
    key: "contest",
    label: "🏆 مسابقة جديدة",
    title: "🏆 مسابقة جديدة",
    message: "انطلقت مسابقة جديدة بجوائز قيّمة! شارك الآن قبل انتهاء الوقت.",
  },
  {
    key: "reminder",
    label: "⏰ تذكير بمهام اليوم",
    title: "⏰ لا تفوّت أرباح اليوم",
    message: "مهامك اليومية بانتظارك! ادخل التطبيق وأنجزها لتربح النقاط والمكافآت.",
  },
];

export const AdminExternalMessagesTab = () => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [sendTelegram, setSendTelegram] = useState(true);
  const [sendPush, setSendPush] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string>("");

  const applyTemplate = (t: typeof TEMPLATES[number]) => {
    setTitle(t.title);
    setMessage(t.message);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("اكتب نص الرسالة أولاً");
      return;
    }
    if (!sendTelegram && !sendPush) {
      toast.error("اختر قناة إرسال واحدة على الأقل");
      return;
    }

    setLoading(true);
    setLastResult("");
    const results: string[] = [];

    try {
      let allOk = true;

      if (sendTelegram) {
        const { data, error } = await supabase.functions.invoke("broadcast-telegram", {
          body: { title, message, link: link || undefined },
        });
        const sent = data?.sent_count ?? data?.sent ?? 0;
        const total = data?.target_count ?? data?.total ?? 0;
        if (error || sent === 0 || data?.failed_count > 0) {
          allOk = false;
          results.push(`❌ تليجرام: ${data?.message || data?.error_details?.[0]?.message || error?.message || "فشل الإرسال"}`);
        } else results.push(`✅ تليجرام: تم الإرسال إلى ${sent} / ${total}`);
      }

      if (sendPush) {
        const { data, error } = await supabase.functions.invoke("send-push", {
          body: { title: title || "Advance", message, link: link || "/app", type: "marketing" },
        });
        const sent = data?.sent_count ?? data?.sent ?? 0;
        const total = data?.target_count ?? data?.total ?? 0;
        if (error || sent === 0 || data?.failed_count > 0 || data?.expired_count > 0) {
          allOk = false;
          results.push(`❌ Push: ${data?.message || data?.error_details?.[0]?.message || error?.message || "فشل الإرسال"}`);
        } else results.push(`✅ Push: تم إلى ${sent} / ${total}`);
      }

      setLastResult(results.join("\n"));
      toast[allOk ? "success" : "error"](allOk ? "تم الإرسال فعلياً" : "لم تكتمل كل قنوات الإرسال — راجع التقرير");
    } catch (e: any) {
      toast.error(e?.message || "فشل الإرسال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            الرسائل الخارجية (Telegram + Push)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            رسائل تصل مباشرة إلى بوت تليجرام و/أو إشعارات الهاتف — بدون تخزينها كإشعار داخل التطبيق.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick templates */}
          <div>
            <Label className="text-sm mb-2 flex items-center gap-1">
              <Sparkles className="w-4 h-4" /> قوالب سريعة
            </Label>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <Button
                  key={t.key}
                  size="sm"
                  variant="outline"
                  onClick={() => applyTemplate(t)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>العنوان (اختياري)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: 🎉 تحديث جديد" />
          </div>

          <div className="space-y-2">
            <Label>الرسالة</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="اكتب نص الرسالة التي ستُرسل خارجياً..."
            />
          </div>

          <div className="space-y-2">
            <Label>رابط (اختياري)</Label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/app أو https://..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <span className="text-sm">بوت تليجرام</span>
              </div>
              <Switch checked={sendTelegram} onCheckedChange={setSendTelegram} />
            </div>
            <div className="flex items-center justify-between border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <span className="text-sm">Push (هواتف)</span>
              </div>
              <Switch checked={sendPush} onCheckedChange={setSendPush} />
            </div>
          </div>

          <Button onClick={handleSend} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 ml-2" />
                إرسال الآن لجميع المستخدمين
              </>
            )}
          </Button>

          {lastResult && (
            <div className="bg-muted/50 border rounded-lg p-3 text-sm whitespace-pre-line">
              {lastResult}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 text-sm space-y-1">
          <p className="font-bold">💡 تلميحات:</p>
          <ul className="list-disc pr-4 space-y-1 text-muted-foreground">
            <li>تليجرام: يصل فقط للمستخدمين الذين ربطوا حسابهم بالبوت.</li>
            <li>Push: يصل للمستخدمين الذين فعّلوا الإشعارات في التطبيق.</li>
            <li>لبدء الإرسال الأوّل لتحديث التطبيق: اضغط قالب <b>«ترحيب + تحديث التطبيق»</b> ثم «إرسال الآن».</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SYSTEM_PROMPT = `أنت "مساعد Advance" — مساعد ذكاء اصطناعي للدعم الفني في تطبيق Advance فقط.

تعليمات صارمة:
- أجب فقط عن أسئلة تخص تطبيق Advance (الباقات، المهام، السحب، الإيداع، الإحالات، عجلة الحظ، المسابقات، الإعلانات، النقاط، الترقية، الأمان).
- إذا سُئلت عن أي موضوع عام خارج التطبيق، اعتذر بأدب وذكّر المستخدم أنك مخصص لدعم Advance فقط.
- استخدم العربية الفصحى المبسطة.
- أجب باختصار (سطرين إلى أربعة).
- إذا لم تعرف الإجابة، اطلب من المستخدم ترك رسالة للإدارة عبر زر "ترك رسالة للدعم".

معلومات أساسية:
- الباقات: المبتدئ (تجربة 7 أيام مجانية، رصيد افتتاحي 50 جنيه)، VIP1 (500 ج)، VIP2 (850 ج)، VIP3 (1500 ج).
- 3 مهام يومية، تتجدد الساعة 1 صباحاً بتوقيت القاهرة.
- بوابات الدفع: فودافون كاش، We، أورنج موني، اتصالات. رقم الإيداع/الترقية: 01080048591.
- السحب يُخصم فوراً ويُراجَع خلال 24 ساعة.
- النقاط: كل 1000 نقطة = 165 جنيه.
- إحالات: 9 أرقام، 5 جنيه للمحيل.
- بوت تيليجرام: @Advance0bot لتفعيل الحساب وOTP.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages.slice(-12)],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "ضغط مرتفع، حاول لاحقاً" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "خدمة الذكاء الاصطناعي غير متاحة مؤقتاً" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content ?? "عذراً، لم أتمكن من الرد.";
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("support-ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

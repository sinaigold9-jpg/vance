import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, features, fixes, raw } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let system = "";
    let userPrompt = "";

    if (mode === "future_notes") {
      system = `أنت كاتب محتوى تقني محترف لتطبيق "Advance" (اختصاره A Pro)، منصة مصرية للأرباح اليومية.
مهمتك صياغة فقرة قصيرة واحترافية باللغة العربية الفصحى المبسطة تصف خطط وتحديثات مستقبلية للتطبيق، بأسلوب راقٍ ومحفّز دون وعود مبالغ فيها، بين 40 و120 كلمة.`;
      userPrompt = `حوّل الملاحظات التالية إلى فقرة احترافية عن التحديثات المستقبلية:\n${raw || ""}`;
    } else {
      system = `أنت كاتب محتوى تسويقي محترف لتطبيق "Advance" (اختصاره A Pro).
التطبيق منصة مصرية للأرباح اليومية عبر مهام يومية، باقات VIP، إحالات، عجلة حظ، مسابقات، وألعاب مثل "بيت الأشباح".
مهمتك تحويل نقاط (ميزات وإصلاحات) خام إلى وصف تحديث احترافي باللغة العربية الفصحى المبسطة، بأسلوب راقٍ ومباشر بدون مبالغات، بين 60 و160 كلمة، بدون سرد كل نقطة كقائمة بل كفقرة أو فقرتين متماسكتين.`;
      const featuresText = (Array.isArray(features) ? features : []).filter(Boolean).join("\n- ");
      const fixesText = (Array.isArray(fixes) ? fixes : []).filter(Boolean).join("\n- ");
      userPrompt = `الميزات الجديدة:\n- ${featuresText || "لا يوجد"}\n\nالإصلاحات:\n- ${fixesText || "لا يوجد"}\n\nاكتب وصف تحديث احترافي بناءً على ما سبق.`;
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "الطلبات كثيرة حالياً، حاول مرة أخرى بعد قليل" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "رصيد الذكاء الاصطناعي غير كافٍ، يرجى الشحن" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const t = await res.text();
      console.error("gateway error", res.status, t);
      return new Response(JSON.stringify({ error: "حدث خطأ في خدمة الذكاء الاصطناعي" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير معروف" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

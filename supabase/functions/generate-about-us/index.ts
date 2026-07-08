import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const system = `أنت كاتب محتوى تسويقي محترف لتطبيق "Advance" (اختصاره A Pro).
التطبيق منصة مصرية للأرباح اليومية عبر مهام يومية، باقات VIP، إحالات، عجلة حظ، مسابقات، وألعاب مثل "بيت الأشباح".
اكتب باللغة العربية الفصحى المبسطة، بأسلوب راقٍ واحترافي، مباشر، بدون مبالغات، بين 80 و 180 كلمة.
لا تذكر روابط أو أسعار محددة إلا إذا طُلب ذلك صراحة.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt || "اكتب وصفًا احترافيًا للتطبيق." },
        ],
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "ضغط مرتفع، حاول لاحقاً" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "الرصيد نفد" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const t = await res.text();
      console.error("gateway error", res.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
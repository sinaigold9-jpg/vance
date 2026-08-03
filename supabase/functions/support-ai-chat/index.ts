import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// Build a live snapshot of the app so the AI stays in sync with new content/features.
const buildAppContext = async () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key);

  const [pkgsR, versionR, settingsR, gamesR, offersR, aboutR, tiersR, cbOffersR, updatesR, contestsR] = await Promise.all([
    admin.from("packages").select("name, price, task_reward, daily_tasks, daily_earnings, min_withdrawal, has_daily_wheel, account_type, is_active").eq("is_active", true).order("price"),
    admin.from("app_versions").select("version, title, description, features").eq("is_active", true).eq("status", "published").order("version_code", { ascending: false }).limit(1).maybeSingle(),
    admin.from("app_settings").select("key, value, is_active"),
    admin.from("app_settings").select("key, value, is_active").like("key", "game_%"),
    admin.from("offers_contests").select("title, description, is_active").eq("is_active", true).limit(5),
    admin.from("app_settings").select("value").eq("key", "about_us").maybeSingle(),
    admin.from("cashback_tiers").select("title, min_amount, max_amount, percentage").eq("is_active", true).order("min_amount"),
    admin.from("cashback_offers").select("title, percentage, min_amount, max_amount, ends_at").eq("is_active", true),
    admin.from("update_posts").select("title, content").eq("is_active", true).order("display_order").limit(5),
    admin.from("contests").select("title, subtitle, ends_at").eq("is_active", true).limit(5),
  ]);

  const packages = (pkgsR.data || []).map((p) =>
    `• ${p.name} (${p.account_type}) — سعر: ${p.price} ج، مكافأة المهمة: ${p.task_reward} ج، عدد المهام: ${p.daily_tasks}، أرباح يومية: ${p.daily_earnings} ج، حد السحب: ${p.min_withdrawal} ج، عجلة حظ: ${p.has_daily_wheel ? "نعم" : "لا"}`
  ).join("\n");

  const latestVersion = versionR.data
    ? `آخر إصدار: v${versionR.data.version} — ${versionR.data.title}\n${versionR.data.description || ""}`
    : "";

  const settingsMap: Record<string, { active: boolean; value: string }> = {};
  (settingsR.data || []).forEach((s: { key: string; is_active: boolean | null; value: string | null }) => {
    settingsMap[s.key] = { active: s.is_active !== false, value: s.value || "" };
  });

  const featureFlags = [
    ["tasks_enabled", "المهام"],
    ["lucky_wheel_enabled", "عجلة الحظ"],
    ["referral_enabled", "الإحالات"],
    ["team_enabled", "الفريق"],
    ["wallet_enabled", "المحفظة"],
    ["ads_enabled", "الإعلانات"],
    ["offers_enabled", "العروض"],
    ["chat_enabled", "الدردشة"],
    ["deposits_enabled", "الإيداعات"],
    ["withdrawals_enabled", "السحوبات"],
  ].map(([k, label]) => `${label}: ${settingsMap[k]?.active === false ? "متوقفة حالياً" : "مفعّلة"}`).join("، ");

  const hiddenIcons = (() => {
    try {
      const v = settingsMap["hidden_home_icons"]?.value;
      if (!v) return [];
      const parsed = JSON.parse(v);
      return Array.isArray(parsed?.ids) ? parsed.ids : [];
    } catch { return []; }
  })();

  const games: string[] = [];
  (gamesR.data || []).forEach((s: { key: string; value: string | null; is_active: boolean | null }) => {
    if (s.is_active === false) return;
    if (s.key === "game_haunted_house") {
      let dur = 60;
      try { dur = JSON.parse(s.value || "{}").duration_seconds || 60; } catch { /* ignore */ }
      games.push(`بيت الأشباح — أمسك الأشباح خلال ${dur} ثانية`);
    }
  });

  const offers = (offersR.data || []).map((o) => `• ${o.title}${o.description ? ` — ${o.description}` : ""}`).join("\n");

  const cashbackTiers = (tiersR.data || []).map((t) =>
    `• ${t.title}: شحن ${t.min_amount}${t.max_amount ? ` - ${t.max_amount}` : " فأكثر"} جنيه → كاش باك ${t.percentage}%`
  ).join("\n");

  const now = Date.now();
  const cashbackOffers = (cbOffersR.data || [])
    .filter((o) => new Date(o.ends_at).getTime() > now)
    .map((o) => `• ${o.title} — ${o.percentage}% على شحن من ${o.min_amount}${o.max_amount ? ` إلى ${o.max_amount}` : " فأكثر"} جنيه (ينتهي ${new Date(o.ends_at).toLocaleString("ar-EG")})`)
    .join("\n");

  const updates = (updatesR.data || []).map((u) => `• ${u.title}: ${String(u.content || "").slice(0, 160)}`).join("\n");
  const contests = (contestsR.data || []).map((c) => `• ${c.title}${c.subtitle ? ` — ${c.subtitle}` : ""}`).join("\n");

  const aboutText = (aboutR.data as { value?: string } | null)?.value || "";

  return `
📱 معلومات التطبيق الحية (تُقرأ من قاعدة البيانات لحظياً):

الاسم الرسمي: Advance (اختصار: A Pro).
${aboutText ? `\nنبذة: ${aboutText}\n` : ""}

الباقات المتاحة الآن:
${packages || "(لا يوجد)"}

الميزات: ${featureFlags}
الأيقونات المخفية حالياً من الشاشة الرئيسية: ${hiddenIcons.length ? hiddenIcons.join(", ") : "لا شيء"}

مركز الألعاب — الألعاب المتاحة:
${games.length ? games.map((g) => `• ${g}`).join("\n") : "لا توجد ألعاب مفعّلة الآن"}

العروض والمسابقات النشطة:
${offers || "(لا يوجد نشط)"}
${contests ? `\nالمسابقات الحالية:\n${contests}` : ""}

نظام الكاش باك (موجود ومفعّل في التطبيق — داخل المحفظة → زر الكاش باك، أو /app/cashback):
- يُحسب الكاش باك تلقائياً بعد اعتماد الإدارة لطلب الشحن (الإيداع) فقط، ولا يُحتسب للطلبات المرفوضة أو أكثر من مرة.
- رصيد الكاش باك يُستخدم لشراء الباقات فقط، ولا يمكن سحبه نقداً أو تحويله.
شرائح الكاش باك الحالية:
${cashbackTiers || "(لا توجد شرائح مفعّلة)"}
${cashbackOffers ? `عروض كاش باك خاصة سارية:\n${cashbackOffers}` : ""}

آخر التحديثات المنشورة في قسم "الجديد":
${updates || "(لا يوجد)"}

${latestVersion}

معلومات ثابتة مساندة:
- بوابات الدفع: فودافون كاش، We، أورنج موني، اتصالات. رقم الإيداع/الترقية: 01080048591.
- 3 مهام يومية تتجدد الساعة 1 صباحاً بتوقيت القاهرة.
- السحب يُخصم فوراً ويُراجَع خلال 24 ساعة.
- كل 1000 نقطة = 165 جنيه.
- الإحالات: 9 أرقام، 5 جنيه للمحيل.
- بوت تيليجرام: @Advance0bot لتفعيل الحساب وOTP.
`.trim();
};

const SYSTEM_PROMPT_BASE = `أنت "مساعد Advance" — مساعد ذكاء اصطناعي للدعم الفني في تطبيق Advance.

تعليمات:
- أجب فقط عن أسئلة تخص التطبيق. اعتذر بأدب لأي موضوع خارجي.
- استخدم العربية الفصحى المبسطة، أجوبة قصيرة (2-4 أسطر).
- استفد من قسم "معلومات التطبيق الحية" أدناه في كل إجابة. إذا سأل المستخدم عن ميزة أو لعبة موجودة فيه، أكّد أنها متوفرة واشرحها.
- إذا كانت الميزة/اللعبة/العرض غير مذكور في المعلومات الحية، قل بوضوح إنه غير متوفر حالياً.
- بعد ردك النصي، أعد أيضاً حقلًا اسمه \`suggestions\` كمصفوفة JSON تحتوي 2-4 عناصر { "label": "...", "action": "..." } تناسب سياق سؤال المستخدم فقط.

قيم action المسموحة:
- navigate:/app/packages | navigate:/app/games | navigate:/app/wallet | navigate:/app/cashback | navigate:/app/tasks | navigate:/app/team | navigate:/app/offers | navigate:/app/profile | navigate:/app/support | navigate:/settings | navigate:/about
- ask: (يليها نص سؤال جاهز لإرساله للمساعد)
- ticket (فتح نموذج ترك رسالة للإدارة)

صيغة الرد النهائية: JSON صالح فقط بهذا الشكل:
{ "reply": "نص الرد", "suggestions": [ { "label": "...", "action": "..." } ] }
لا تكتب أي شيء خارج هذا الـ JSON.`;

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

    const appContext = await buildAppContext().catch((e) => {
      console.error("context build failed:", e);
      return "";
    });
    const systemContent = `${SYSTEM_PROMPT_BASE}\n\n${appContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: systemContent }, ...messages.slice(-12)],
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
    const raw = data?.choices?.[0]?.message?.content ?? "";
    let reply = "عذراً، لم أتمكن من الرد.";
    let suggestions: Array<{ label: string; action: string }> = [];
    try {
      const parsed = JSON.parse(raw);
      reply = typeof parsed?.reply === "string" ? parsed.reply : raw;
      if (Array.isArray(parsed?.suggestions)) {
        suggestions = parsed.suggestions
          .filter((s: unknown): s is { label: string; action: string } =>
            !!s && typeof (s as { label?: unknown }).label === "string" &&
            typeof (s as { action?: unknown }).action === "string"
          )
          .slice(0, 4);
      }
    } catch {
      reply = raw || reply;
    }
    return new Response(JSON.stringify({ reply, suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("support-ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

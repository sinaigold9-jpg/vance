import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

interface ReqBody {
  contest_id: string;
  total_levels?: number;
  questions_per_level?: number;
  categories?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as ReqBody;
    if (!body.contest_id) {
      return new Response(JSON.stringify({ error: "contest_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load contest config
    const { data: contest } = await admin.from("contests").select("*").eq("id", body.contest_id).maybeSingle();
    if (!contest) {
      return new Response(JSON.stringify({ error: "Contest not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalLevels = body.total_levels ?? contest.total_levels ?? 20;
    const perLevel = body.questions_per_level ?? contest.questions_per_level ?? 5;
    const categories = body.categories?.length ? body.categories : [
      "تاريخ", "جغرافيا", "أدب", "فنون", "أفلام", "مسلسلات", "تكنولوجيا", "علوم", "رياضة", "ثقافة عامة"
    ];

    // Existing questions to avoid duplicates
    const { data: existing } = await admin.from("contest_questions").select("question_text").eq("contest_id", body.contest_id);
    const existingSet = new Set((existing || []).map((r: any) => (r.question_text || "").trim()));

    // Find which levels are missing questions
    const { data: levelCounts } = await admin
      .from("contest_questions")
      .select("level_number")
      .eq("contest_id", body.contest_id);
    const counts: Record<number, number> = {};
    (levelCounts || []).forEach((r: any) => { counts[r.level_number] = (counts[r.level_number] || 0) + 1; });

    const levelsToFill: { level: number; need: number }[] = [];
    for (let lvl = 1; lvl <= totalLevels; lvl++) {
      const have = counts[lvl] || 0;
      if (have < perLevel) levelsToFill.push({ level: lvl, need: perLevel - have });
    }

    if (levelsToFill.length === 0) {
      return new Response(JSON.stringify({ ok: true, generated: 0, message: "All levels are full" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate in batches of 5 levels to keep prompts manageable
    let totalGenerated = 0;
    for (let i = 0; i < levelsToFill.length; i += 5) {
      const batch = levelsToFill.slice(i, i + 5);
      const needed = batch.reduce((s, b) => s + b.need, 0);
      const sampleExisting = Array.from(existingSet).slice(-30);

      const sysPrompt = `أنت مولّد أسئلة ثقافية احترافية باللغة العربية. ولّد أسئلة اختيار من متعدد (MCQ) لمسابقة.
- كل سؤال 4 إجابات: 1 صحيحة + 3 خاطئة معقولة.
- صعوبة متدرجة: المستويات الأولى أسهل والأخيرة أصعب.
- لا تكرر أي سؤال من القائمة المرفقة.
- استخدم فئات متنوعة من: ${categories.join("، ")}.
- الأسئلة يجب أن تكون واقعية ودقيقة معرفياً.`;

      const userPrompt = `ولّد ${needed} سؤالاً موزعة على المستويات التالية:
${batch.map(b => `- المستوى ${b.level}: ${b.need} سؤال`).join("\n")}

أمثلة لأسئلة موجودة (لا تكررها):
${sampleExisting.slice(0, 15).map(q => `- ${q}`).join("\n") || "(لا يوجد)"}
`;

      const aiRes = await fetch(GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "save_questions",
              description: "حفظ الأسئلة المولّدة",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        level_number: { type: "integer" },
                        category: { type: "string" },
                        question_text: { type: "string" },
                        correct_answer: { type: "string" },
                        wrong_answers: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
                        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                      },
                      required: ["level_number", "category", "question_text", "correct_answer", "wrong_answers", "difficulty"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "save_questions" } },
        }),
      });

      if (!aiRes.ok) {
        if (aiRes.status === 429) {
          return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول لاحقاً" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiRes.status === 402) {
          return new Response(JSON.stringify({ error: "نفدت رصيد Lovable AI، يرجى الشحن" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await aiRes.text();
        console.error("AI error:", aiRes.status, t);
        continue;
      }

      const aiData = await aiRes.json();
      const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) continue;
      let parsed: any;
      try { parsed = JSON.parse(toolCall.function.arguments); } catch { continue; }
      const qs: any[] = parsed?.questions || [];

      // Order per level
      const orderByLevel: Record<number, number> = {};
      Object.keys(counts).forEach(k => { orderByLevel[Number(k)] = counts[Number(k)]; });

      const rows = qs
        .filter(q => q?.question_text && q?.correct_answer && Array.isArray(q?.wrong_answers) && q.wrong_answers.length === 3)
        .filter(q => !existingSet.has(q.question_text.trim()))
        .map((q: any) => {
          const lvl = Number(q.level_number);
          const order = (orderByLevel[lvl] = (orderByLevel[lvl] ?? 0) + 1);
          existingSet.add(q.question_text.trim());
          return {
            contest_id: body.contest_id,
            level_number: lvl,
            order_in_level: order - 1,
            category: q.category || "عام",
            question_text: q.question_text.trim(),
            correct_answer: q.correct_answer.trim(),
            wrong_answers: q.wrong_answers.map((w: string) => String(w).trim()),
            difficulty: q.difficulty || "medium",
          };
        });

      if (rows.length > 0) {
        const { error: insErr } = await admin.from("contest_questions").insert(rows);
        if (insErr) { console.error("insert error:", insErr); continue; }
        totalGenerated += rows.length;
      }
    }

    return new Response(JSON.stringify({ ok: true, generated: totalGenerated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-contest-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
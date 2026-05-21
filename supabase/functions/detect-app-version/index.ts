import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Try a few likely deployed origins for this app
const ORIGIN_CANDIDATES = [
  "https://vance.lovable.app",
  "https://advance.lovable.app",
];

async function pickOrigin(custom?: string): Promise<string> {
  if (custom) return custom.replace(/\/$/, "");
  for (const o of ORIGIN_CANDIDATES) {
    try {
      const r = await fetch(`${o}/index.html`, { method: "HEAD" });
      if (r.ok) return o;
    } catch { /* ignore */ }
  }
  return ORIGIN_CANDIDATES[0];
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function parseAssets(html: string): string[] {
  const urls = new Set<string>();
  const re = /(?:src|href)=["']([^"']+\.(?:js|mjs|css))(?:\?[^"']*)?["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    let u = m[1];
    if (u.startsWith("http")) {
      try { u = new URL(u).pathname; } catch { continue; }
    }
    if (!u.startsWith("/")) u = "/" + u;
    urls.add(u);
  }
  return [...urls];
}

async function headSize(origin: string, path: string): Promise<number> {
  try {
    const r = await fetch(origin + path, { method: "HEAD" });
    const len = r.headers.get("content-length");
    if (len) return parseInt(len, 10);
    // Fallback GET if HEAD doesn't return length
    const g = await fetch(origin + path);
    const buf = await g.arrayBuffer();
    return buf.byteLength;
  } catch { return 0; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    let payload: any = {};
    try { payload = await req.json(); } catch { payload = {}; }
    const origin = await pickOrigin(payload?.origin);

    // Fetch index.html and parse assets
    const indexRes = await fetch(`${origin}/index.html`, { headers: { "cache-control": "no-cache" } });
    if (!indexRes.ok) {
      return new Response(JSON.stringify({ error: `Cannot reach ${origin}/index.html (${indexRes.status})` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const html = await indexRes.text();
    const indexBytes = new Blob([html]).size;
    const assetPaths = parseAssets(html);
    const sizes = await Promise.all(assetPaths.map(p => headSize(origin, p)));
    const totalBytes = indexBytes + sizes.reduce((s, n) => s + n, 0);

    // Build hash = sorted list of asset paths (which contain content hashes in Vite builds)
    const hashInput = assetPaths.sort().join("|");
    const buildHash = await sha256Hex(hashInput);

    // Latest version in DB
    const { data: latest } = await admin
      .from("app_versions")
      .select("*")
      .order("version_code", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest?.build_hash === buildHash) {
      return new Response(JSON.stringify({
        ok: true, changed: false,
        message: "لا توجد نسخة جديدة. آخر إصدار مطابق للنسخة الحالية.",
        size_bytes: totalBytes,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create a new draft version
    const nextCode = (latest?.version_code ?? 100) + 1;
    const parts = (latest?.version ?? "1.0.0").split(".").map((n: string) => parseInt(n, 10) || 0);
    parts[2] = (parts[2] || 0) + 1;
    const nextVersion = parts.join(".");

    const features = [
      { label: "تحسينات في الأداء والاستقرار", badge: "fix" },
      { label: "إصلاح أخطاء بسيطة", badge: "fix" },
    ];

    const { data: created, error: insErr } = await admin.from("app_versions").insert({
      version: nextVersion,
      version_code: nextCode,
      title: `تحديث جديد ${nextVersion}`,
      description: "تم اكتشاف نسخة جديدة تلقائياً. عدّل التفاصيل ثم اضغط نشر.",
      features,
      images: [],
      is_mandatory: false,
      target_audience: "all",
      status: "draft",
      size_bytes: totalBytes,
      build_hash: buildHash,
      auto_generated: true,
      is_active: true,
    }).select("*").single();

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true, changed: true, version: created,
      message: "تم اكتشاف نسخة جديدة وإنشاء مسودة. راجعها ثم اضغط نشر.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("detect-app-version error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
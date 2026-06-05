import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const accessKey = url.searchParams.get("key");

    if (!accessKey) {
      return new Response(JSON.stringify({ error: "مفتاح الوصول مطلوب" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate the access key
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from("export_access_keys")
      .select("*")
      .eq("access_key", accessKey)
      .single();

    if (keyError || !keyData) {
      return new Response(JSON.stringify({ error: "مفتاح غير صالح" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (new Date(keyData.expires_at) < new Date()) {
      await supabaseAdmin.from("export_access_keys").update({ is_revoked: true, revoked_at: new Date().toISOString() }).eq("id", keyData.id);
      return new Response(JSON.stringify({ error: "انتهت صلاحية المفتاح" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already used or revoked
    if (keyData.is_used || keyData.is_revoked) {
      return new Response(JSON.stringify({ error: "المفتاح مستخدم أو ملغي" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Mark key as used
    await supabaseAdmin.from("export_access_keys").update({
      is_used: true,
      used_at: new Date().toISOString(),
      used_ip: clientIp,
    }).eq("id", keyData.id);

    // Export all tables
    const tables = [
      "profiles",
      "transactions",
      "packages",
      "daily_tasks",
      "activity_logs",
      "support_tickets",
      "chat_messages",
      "notifications",
      "advertisements",
      "ad_clicks",
      "ad_views",
      "ad_interactions",
      "ad_interaction_replies",
      "ad_images",
      "advertiser_profiles",
      "package_upgrade_requests",
      "daily_codes",
      "app_settings",
      "promotions",
      "user_roles",
      "download_counter",
      "push_subscriptions",
    ];

    // Columns to exclude per table (sensitive secrets/hashes)
    const sensitiveFields: Record<string, string[]> = {
      profiles: ["withdrawal_pin"],
    };

    const exportData: Record<string, unknown[]> = {};

    for (const table of tables) {
      const { data, error } = await supabaseAdmin.from(table).select("*");
      if (error) {
        exportData[table] = [];
        continue;
      }
      const excluded = sensitiveFields[table];
      if (excluded && data && data.length > 0) {
        exportData[table] = data.map((row: Record<string, unknown>) => {
          const safe: Record<string, unknown> = { ...row };
          for (const f of excluded) delete safe[f];
          return safe;
        });
      } else {
        exportData[table] = data || [];
      }
    }

    // Log the export
    await supabaseAdmin.from("export_logs").insert({
      key_id: keyData.id,
      action: "full_database_export",
      ip_address: clientIp,
      user_agent: userAgent,
      details: {
        tables_exported: Object.keys(exportData),
        total_records: Object.values(exportData).reduce((sum, arr) => sum + (arr as unknown[]).length, 0),
        exported_at: new Date().toISOString(),
      },
    });

    return new Response(JSON.stringify({
      export_date: new Date().toISOString(),
      tables: exportData,
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="database-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "حدث خطأ في التصدير" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

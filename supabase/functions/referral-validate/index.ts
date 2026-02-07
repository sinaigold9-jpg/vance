/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

type Body = {
  ref?: string;
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL is not configured");

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");

    const body = (await req.json().catch(() => ({}))) as Body;
    const ref = (body.ref ?? "").trim();

    if (!ref) {
      return new Response(JSON.stringify({ referredBy: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1) Direct user id referral (/auth?ref=<userId>)
    if (uuidRegex.test(ref)) {
      const { data } = await admin.from("profiles").select("id").eq("id", ref).maybeSingle();
      return new Response(JSON.stringify({ referredBy: data?.id ?? null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Membership ID (9 digits starting with 6)
    const membershipIdRegex = /^6\d{8}$/;
    if (membershipIdRegex.test(ref)) {
      const { data } = await admin.from("profiles").select("id").eq("membership_id", ref).maybeSingle();
      return new Response(JSON.stringify({ referredBy: data?.id ?? null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Referral code (8-hex) fallback
    const { data } = await admin.from("profiles").select("id").eq("referral_code", ref).maybeSingle();
    return new Response(JSON.stringify({ referredBy: data?.id ?? null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ referredBy: null, error: "SERVER_ERROR", message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

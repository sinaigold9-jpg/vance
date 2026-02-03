/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

type Body = {
  phone?: string;
  password?: string;
};

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  // Egypt common formats
  if (digits.startsWith("20") && digits.length > 11) {
    const rest = digits.slice(2);
    if (rest.length === 11 && rest.startsWith("0")) return rest;
    if (rest.length === 10 && rest.startsWith("1")) return `0${rest}`;
    return rest;
  }

  if (digits.length === 10 && digits.startsWith("1")) return `0${digits}`;
  return digits;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL is not configured");

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");

    const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!SUPABASE_PUBLISHABLE_KEY) throw new Error("SUPABASE_PUBLISHABLE_KEY is not configured");

    const body = (await req.json().catch(() => ({}))) as Body;
    const rawPhone = (body.phone ?? "").trim();
    const password = body.password ?? "";

    if (!rawPhone || !password) {
      return new Response(JSON.stringify({ error: "MISSING_FIELDS" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = normalizePhone(rawPhone) || rawPhone;
    const candidates = Array.from(
      new Set([
        rawPhone,
        phone,
        rawPhone.replace(/\s+/g, ""),
        phone.replace(/^0/, ""),
        `0${phone.replace(/^0/, "")}`,
      ].filter(Boolean)),
    );

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: profiles, error: profileErr } = await admin
      .from("profiles")
      .select("email, phone")
      .in("phone", candidates)
      .limit(5);

    if (profileErr) {
      throw new Error(`PHONE_LOOKUP_FAILED: ${profileErr.message}`);
    }

    const email = profiles?.find((p) => p.email)?.email ?? null;
    if (!email) {
      return new Response(JSON.stringify({ error: "PHONE_NOT_FOUND" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Exchange email+password for tokens (password grant)
    const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ email, password }),
    });

    const tokenJson = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok) {
      return new Response(JSON.stringify({ error: "INVALID_LOGIN", details: tokenJson }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        access_token: tokenJson.access_token,
        refresh_token: tokenJson.refresh_token,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: "SERVER_ERROR", message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const allowedSources = new Set(['client', 'backend', 'security', 'notification']);
const allowedSeverities = new Set(['info', 'warning', 'error', 'critical']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await admin.auth.getUser(token);
      userId = user?.id || null;
    }

    const source = allowedSources.has(body.source) ? body.source : 'client';
    const severity = allowedSeverities.has(body.severity) ? body.severity : 'error';
    const title = clean(body.title, 160) || 'خطأ في التطبيق';
    const message = clean(body.message, 2000) || 'No message';

    const { error } = await admin.from('app_error_reports').insert({
      source,
      severity,
      title,
      message,
      stack: clean(body.stack, 8000) || null,
      url: clean(body.url, 1000) || null,
      user_agent: clean(body.user_agent, 1000) || null,
      user_id: userId,
      metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
    });

    if (error) return json({ error: 'insert_failed', message: error.message }, 500);
    return json({ ok: true });
  } catch (e: any) {
    console.error('log-client-error', e);
    return json({ error: 'internal', message: e?.message || 'خطأ داخلي' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function clean(value: unknown, max: number) {
  if (typeof value !== 'string') return '';
  return value.slice(0, max);
}
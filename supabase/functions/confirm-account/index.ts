import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user has telegram linked
    const { data: profile } = await adminClient
      .from('profiles')
      .select('telegram_chat_id, is_verified')
      .eq('id', userId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (profile.is_verified) {
      return new Response(JSON.stringify({ success: true, message: 'الحساب مفعل بالفعل', already_verified: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!profile.telegram_chat_id) {
      return new Response(JSON.stringify({ error: 'telegram_not_linked', message: 'يرجى ربط حساب تليجرام أولاً' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the account
    await adminClient
      .from('profiles')
      .update({ is_verified: true })
      .eq('id', userId);

    return new Response(JSON.stringify({ success: true, message: 'تم تفعيل الحساب بنجاح' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('confirm-account error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

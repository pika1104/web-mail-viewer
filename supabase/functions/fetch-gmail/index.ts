import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { account_id } = await req.json()

    // Get account and refresh token
    const { data: account, error: accountError } = await supabaseClient
      .from('accounts')
      .select('*')
      .eq('id', account_id)
      .single()

    if (accountError || !account) {
      throw new Error('Account not found')
    }

    // Gmail API fetch logic would go here
    // For this example, we'll simulate fetching a new email
    // In a real implementation, you would use account.gmail_refresh_token to get an access token
    
    const mockEmail = {
      account_id: account.id,
      message_id: `msg_${Date.now()}`,
      from_address: 'sender@example.com',
      from_name: 'Example Sender',
      to_address: account.email,
      subject: 'New Email via Supabase Edge Function',
      body_text: 'This is a test email fetched by the Supabase Edge Function.',
      received_at: new Date().toISOString(),
      source: 'gmail'
    }

    const { data, error } = await supabaseClient
      .from('emails')
      .insert([mockEmail])
      .select()

    if (error) throw error

    return new Response(
      JSON.stringify({ message: 'Success', data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

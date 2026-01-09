import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BAGS_API_URL = 'https://public-api-v2.bags.fm/api/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BAGS_API_KEY = Deno.env.get('BAGS_API_KEY');
    if (!BAGS_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'BAGS_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      tokenMint,
      metadataUri,
      configKey,
      creatorPublicKey,
      initialBuyLamports = 0,
    } = await req.json();

    console.log(`Getting launch transaction for mint=${tokenMint}, config=${configKey}`);

    if (!tokenMint || !metadataUri || !configKey || !creatorPublicKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const launchPayload = {
      ipfs: metadataUri,
      tokenMint,
      wallet: creatorPublicKey,
      initialBuyLamports: initialBuyLamports || 0,
      configKey,
    };

    console.log('Launch payload:', JSON.stringify(launchPayload));

    const launchResponse = await fetch(`${BAGS_API_URL}/token-launch/create-launch-transaction`, {
      method: 'POST',
      headers: {
        'x-api-key': BAGS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(launchPayload),
    });

    const launchText = await launchResponse.text();
    console.log(`Launch response status: ${launchResponse.status}`);

    if (!launchResponse.ok) {
      console.error('Launch transaction failed:', launchText);
      let errorMessage = 'Failed to create launch transaction';
      try {
        const errorJson = JSON.parse(launchText);
        errorMessage = errorJson.error || errorJson.response || errorMessage;
      } catch { /* use default */ }
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: launchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const launchResult = JSON.parse(launchText);
    const transaction = launchResult.response;

    if (!transaction) {
      return new Response(
        JSON.stringify({ error: 'No transaction returned' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Launch transaction created successfully');

    return new Response(
      JSON.stringify({ success: true, transaction }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Platform fee in SOL (0.01 SOL = ~$2)
const PLATFORM_FEE_SOL = 0.01;
// Treasury wallet to receive fees
const TREASURY_WALLET = 'YOUR_TREASURY_WALLET_ADDRESS';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      name,
      symbol,
      description,
      twitter,
      telegram,
      website,
      imageBase64,
      imageType,
      creatorPublicKey,
      mintPublicKey,
    } = await req.json();

    console.log(`Creating token: ${name} (${symbol}) for ${creatorPublicKey}`);

    // Validate required fields
    if (!name || !symbol || !description || !imageBase64 || !creatorPublicKey || !mintPublicKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Upload metadata to IPFS via PumpFun API
    console.log('Uploading metadata to IPFS...');
    
    // Convert base64 to blob for upload
    const imageBytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    const imageBlob = new Blob([imageBytes], { type: imageType || 'image/png' });
    
    const formData = new FormData();
    formData.append('file', imageBlob, 'token-image.png');
    formData.append('name', name);
    formData.append('symbol', symbol);
    formData.append('description', description);
    formData.append('twitter', twitter || '');
    formData.append('telegram', telegram || '');
    formData.append('website', website || '');
    formData.append('showName', 'true');

    const ipfsResponse = await fetch('https://pump.fun/api/ipfs', {
      method: 'POST',
      body: formData,
    });

    if (!ipfsResponse.ok) {
      const errorText = await ipfsResponse.text();
      console.error('IPFS upload failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to upload metadata to IPFS' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ipfsData = await ipfsResponse.json();
    console.log('IPFS upload successful:', ipfsData.metadataUri);

    // Step 2: Create the transaction via PumpPortal API
    // This includes both the token creation and platform fee transfer
    console.log('Creating token transaction...');

    const createTxArgs = [{
      publicKey: creatorPublicKey,
      action: 'create',
      tokenMetadata: {
        name,
        symbol,
        uri: ipfsData.metadataUri,
      },
      mint: mintPublicKey,
      denominatedInSol: 'true',
      amount: 0, // No initial buy
      slippage: 10,
      priorityFee: 0.0005,
      pool: 'pump',
    }];

    const txResponse = await fetch('https://pumpportal.fun/api/trade-local', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createTxArgs),
    });

    if (!txResponse.ok) {
      const errorText = await txResponse.text();
      console.error('Transaction creation failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transactions = await txResponse.json();
    console.log('Transaction created successfully');

    // Return the transaction for signing along with fee info
    return new Response(
      JSON.stringify({
        success: true,
        transaction: transactions[0], // Base58 encoded transaction
        metadataUri: ipfsData.metadataUri,
        platformFee: PLATFORM_FEE_SOL,
        treasuryWallet: TREASURY_WALLET,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in create-pumpfun-token:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

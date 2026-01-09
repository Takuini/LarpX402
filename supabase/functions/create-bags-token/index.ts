import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BAGS_API_URL = 'https://api.bags.fm';

serve(async (req) => {
  // Handle CORS preflight
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
      name,
      symbol,
      description,
      twitter,
      telegram,
      website,
      imageBase64,
      imageType,
      creatorPublicKey,
    } = await req.json();

    console.log(`Creating Bags token: ${name} (${symbol}) for ${creatorPublicKey}`);

    // Validate required fields
    if (!name || !symbol || !description || !imageBase64 || !creatorPublicKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, symbol, description, image, and creatorPublicKey are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Upload image to get a URL
    console.log('Step 1: Uploading image...');
    
    // Convert base64 to blob for upload
    const imageBytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    const imageBlob = new Blob([imageBytes], { type: imageType || 'image/png' });
    
    const imageFormData = new FormData();
    imageFormData.append('file', imageBlob, 'token-image.png');

    const imageUploadResponse = await fetch(`${BAGS_API_URL}/v1/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BAGS_API_KEY}`,
      },
      body: imageFormData,
    });

    if (!imageUploadResponse.ok) {
      const errorText = await imageUploadResponse.text();
      console.error('Image upload failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to upload image to Bags' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageUploadResult = await imageUploadResponse.json();
    const imageUrl = imageUploadResult.url;
    console.log('Image uploaded successfully:', imageUrl);

    // Step 2: Create token metadata
    console.log('Step 2: Creating token metadata...');
    
    const metadataPayload = {
      imageUrl,
      name,
      symbol: symbol.toUpperCase().replace('$', ''),
      description,
      twitter: twitter || undefined,
      telegram: telegram || undefined,
      website: website || undefined,
    };

    const metadataResponse = await fetch(`${BAGS_API_URL}/v1/token-launch/metadata`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BAGS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadataPayload),
    });

    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text();
      console.error('Metadata creation failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create token metadata' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const metadataResult = await metadataResponse.json();
    console.log('Metadata created:', metadataResult);

    // Step 3: Create fee share config (all fees to creator)
    console.log('Step 3: Creating fee share config...');
    
    const configPayload = {
      tokenMint: metadataResult.tokenMint,
      creatorWallet: creatorPublicKey,
      feeClaimers: [
        { user: creatorPublicKey, userBps: 10000 } // 100% to creator
      ],
    };

    const configResponse = await fetch(`${BAGS_API_URL}/v1/token-launch/config`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BAGS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(configPayload),
    });

    if (!configResponse.ok) {
      const errorText = await configResponse.text();
      console.error('Config creation failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create fee share config' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const configResult = await configResponse.json();
    console.log('Config created:', configResult);

    // Step 4: Get launch transaction
    console.log('Step 4: Getting launch transaction...');
    
    const launchPayload = {
      metadataUrl: metadataResult.tokenMetadata,
      tokenMint: metadataResult.tokenMint,
      launchWallet: creatorPublicKey,
      initialBuyLamports: 0, // No initial buy
      configKey: configResult.configKey,
    };

    const launchResponse = await fetch(`${BAGS_API_URL}/v1/token-launch/transaction`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BAGS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(launchPayload),
    });

    if (!launchResponse.ok) {
      const errorText = await launchResponse.text();
      console.error('Launch transaction creation failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create launch transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const launchResult = await launchResponse.json();
    console.log('Launch transaction created successfully');

    // Return the transaction data for signing
    return new Response(
      JSON.stringify({
        success: true,
        transaction: launchResult.transaction,
        tokenMint: metadataResult.tokenMint,
        metadataUri: metadataResult.tokenMetadata,
        imageUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in create-bags-token:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BAGS_API_URL = 'https://public-api-v2.bags.fm/api/v1';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BAGS_API_KEY = Deno.env.get('BAGS_API_KEY');
    if (!BAGS_API_KEY) {
      console.error('BAGS_API_KEY is not configured');
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
      initialBuyLamports = 0,
    } = await req.json();

    console.log(`Creating Bags token: ${name} (${symbol}) for ${creatorPublicKey}`);
    console.log(`Initial buy: ${initialBuyLamports} lamports`);

    // Validate required fields
    if (!name || !symbol || !description || !imageBase64 || !creatorPublicKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, symbol, description, image, and creatorPublicKey are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input lengths
    if (name.length > 32 || symbol.length > 10 || description.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Invalid field lengths' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // STEP 1: Create Token Info and Metadata
    // ========================================
    console.log('Step 1: Creating token info and metadata...');

    // Convert base64 to blob for multipart upload
    const imageBytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    const mimeType = imageType || 'image/png';
    const imageBlob = new Blob([imageBytes], { type: mimeType });
    
    // Determine file extension from mime type
    const extMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    const ext = extMap[mimeType] || 'png';

    console.log(`Image size: ${imageBytes.length} bytes, type: ${mimeType}`);

    // Build multipart form data
    const formData = new FormData();
    formData.append('image', imageBlob, `token-image.${ext}`);
    formData.append('name', name);
    formData.append('symbol', symbol.toUpperCase().replace('$', ''));
    formData.append('description', description);
    if (twitter) formData.append('twitter', twitter);
    if (telegram) formData.append('telegram', telegram);
    if (website) formData.append('website', website);

    console.log('Sending multipart form to Bags API...');

    const tokenInfoResponse = await fetch(`${BAGS_API_URL}/token-launch/create-token-info`, {
      method: 'POST',
      headers: {
        'x-api-key': BAGS_API_KEY,
        // Don't set Content-Type - fetch will set it with boundary for FormData
      },
      body: formData,
    });

    const tokenInfoText = await tokenInfoResponse.text();
    console.log(`Token info response status: ${tokenInfoResponse.status}`);
    console.log(`Token info response: ${tokenInfoText.substring(0, 500)}`);
    
    if (!tokenInfoResponse.ok) {
      console.error('Token info creation failed:', tokenInfoText);
      let errorMessage = 'Failed to create token metadata';
      try {
        const errorJson = JSON.parse(tokenInfoText);
        errorMessage = errorJson.error || errorJson.message || errorJson.response || errorMessage;
      } catch { /* use default */ }
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: tokenInfoResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let tokenInfoResult;
    try {
      tokenInfoResult = JSON.parse(tokenInfoText);
    } catch {
      console.error('Failed to parse token info response:', tokenInfoText);
      return new Response(
        JSON.stringify({ error: 'Invalid response from Bags API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenMint = tokenInfoResult.response?.tokenMint;
    const tokenMetadata = tokenInfoResult.response?.tokenMetadata;
    const savedImageUrl = tokenInfoResult.response?.tokenLaunch?.image;

    if (!tokenMint || !tokenMetadata) {
      console.error('Missing tokenMint or tokenMetadata in response:', tokenInfoResult);
      return new Response(
        JSON.stringify({ error: 'Invalid token info response - missing required fields' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Token info created: mint=${tokenMint}, metadata=${tokenMetadata}`);

    // ========================================
    // STEP 2: Create Fee Share Config
    // ========================================
    console.log('Step 2: Creating fee share config...');

    // Creator gets 100% of fees (10000 bps)
    const feeSharePayload = {
      payer: creatorPublicKey,
      baseMint: tokenMint,
      claimersArray: [creatorPublicKey],
      basisPointsArray: [10000],
    };

    console.log('Fee share payload:', JSON.stringify(feeSharePayload));

    const feeShareResponse = await fetch(`${BAGS_API_URL}/fee-share/config`, {
      method: 'POST',
      headers: {
        'x-api-key': BAGS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feeSharePayload),
    });

    const feeShareText = await feeShareResponse.text();
    console.log(`Fee share response status: ${feeShareResponse.status}`);
    console.log(`Fee share response: ${feeShareText}`);

    if (!feeShareResponse.ok) {
      console.error('Fee share config creation failed:', feeShareText);
      let errorMessage = 'Failed to create fee share config';
      try {
        const errorJson = JSON.parse(feeShareText);
        errorMessage = errorJson.error || errorJson.response || errorMessage;
      } catch { /* use default */ }
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: feeShareResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let feeShareResult;
    try {
      feeShareResult = JSON.parse(feeShareText);
    } catch {
      console.error('Failed to parse fee share response:', feeShareText);
      return new Response(
        JSON.stringify({ error: 'Invalid fee share response from Bags API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const configKey = feeShareResult.response?.meteoraConfigKey;
    const needsCreation = feeShareResult.response?.needsCreation;
    const configTransactions = feeShareResult.response?.transactions || [];

    console.log(`Fee share config: configKey=${configKey}, needsCreation=${needsCreation}, txCount=${configTransactions.length}`);

    if (!configKey) {
      console.error('Missing configKey in fee share response:', feeShareResult);
      return new Response(
        JSON.stringify({ error: 'Failed to get fee share config key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // STEP 3: Create Launch Transaction
    // ========================================
    console.log('Step 3: Creating launch transaction...');

    const launchPayload = {
      ipfs: tokenMetadata,
      tokenMint: tokenMint,
      wallet: creatorPublicKey,
      initialBuyLamports: initialBuyLamports || 0,
      configKey: configKey,
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
    console.log(`Launch response length: ${launchText.length} chars`);

    if (!launchResponse.ok) {
      console.error('Launch transaction creation failed:', launchText);
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

    let launchResult;
    try {
      launchResult = JSON.parse(launchText);
    } catch {
      console.error('Failed to parse launch response:', launchText);
      return new Response(
        JSON.stringify({ error: 'Invalid launch response from Bags API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const launchTransaction = launchResult.response;

    if (!launchTransaction) {
      console.error('Missing transaction in launch response:', launchResult);
      return new Response(
        JSON.stringify({ error: 'No transaction returned from Bags API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Launch transaction created successfully');

    // Return all transaction data
    // If config needs creation, we need to send those transactions first
    return new Response(
      JSON.stringify({
        success: true,
        transaction: launchTransaction,
        configTransactions: needsCreation ? configTransactions : [],
        tokenMint,
        metadataUri: tokenMetadata,
        imageUrl: savedImageUrl,
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

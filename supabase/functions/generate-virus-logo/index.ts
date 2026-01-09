import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { threatName, threatType, severity } = await req.json();
    
    console.log('Generating virus logo for:', { threatName, threatType, severity });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Generate a menacing virus logo based on threat type with expanded malware types
    const colorScheme = severity === 'critical' ? 'blood red, crimson and black with neon glow' : 
                        severity === 'high' ? 'toxic orange, dark grey with electric highlights' : 
                        severity === 'medium' ? 'acid yellow, dark purple with digital distortion' : 
                        'toxic green, grey with subtle matrix code';
    
    const virusStyle = threatType === 'TROJAN' ? 'a mechanical trojan horse with glowing red eyes, made of corrupted code and circuit boards, steam coming from joints' :
                       threatType === 'RANSOMWARE' ? 'a menacing padlock wrapped in chains with a skull face, dripping with digital blood, encrypted symbols floating around' :
                       threatType === 'SPYWARE' ? 'a giant sinister eye made of cameras and circuit boards, with tentacle cables reaching out, surveillance aesthetic' :
                       threatType === 'PHISHING' ? 'a demonic anglerfish with a glowing email icon as lure, sharp digital teeth, swimming through data streams' :
                       threatType === 'MALWARE' ? 'a mutating virus skull with binary code dripping like venom, morphing between digital and organic forms' :
                       threatType === 'CRYPTOJACKER' ? 'a robotic vampire draining energy from a bitcoin, with mining rigs as fangs, electricity crackling' :
                       threatType === 'ADWARE' ? 'an aggressive monster made of popup windows and banner ads, with click cursors as weapons, overwhelming visual noise' :
                       threatType === 'EXPLOIT' ? 'a shattered digital shield being pierced by lightning bolts, cracks glowing with malicious code' :
                       threatType === 'WORM' ? 'a cybernetic worm with segmented metallic body, leaving a trail of corrupted data, multiple red sensor eyes' :
                       threatType === 'ROOTKIT' ? 'a shadowy figure emerging from computer roots/cables, partially invisible with glitch effects, deep in system core' :
                       threatType === 'BOTNET' ? 'an army of small robot zombies connected by red energy lines to a central hive mind controller' :
                       threatType === 'BACKDOOR' ? 'a sinister digital door floating in void, slightly ajar with malicious red light leaking through, keyhole shaped like skull' :
                       threatType === 'KEYLOGGER' ? 'a mechanical spider with keyboard keys as body segments, multiple eyes watching, recording every movement' :
                       threatType === 'RAT' ? 'a cybernetic rat with antenna ears, glowing red eyes, leaving digital footprints, remote control aesthetic' :
                       threatType === 'DROPPER' ? 'a dark parachute dropping malicious payload boxes, each box containing smaller threats, military stealth style' :
                       threatType === 'SCAREWARE' ? 'a ghost made of fake warning popups and error messages, trying to look frightening but glitchy' :
                       threatType === 'SCAM' ? 'a two-faced digital mask, one side friendly, one side demonic, money symbols corrupting around it' :
                       threatType === 'TRACKER' ? 'a swarm of tiny surveillance drones shaped like eyes, leaving data trails, connected to central database' :
                       threatType === 'SUSPICIOUS' ? 'a question mark made of corrupted pixels, shifting between safe and dangerous appearances, unstable energy' :
                       threatType === 'PUP' ? 'a seemingly cute digital puppy that reveals hidden malicious features, innocent exterior with dark interior' :
                       'a menacing digital virus particle with spikes and tendrils, pulsing with malicious energy, floating in cyberspace';

    const prompt = `Generate a sleek, modern logo icon for a malware/virus called "${threatName}". 
    Style: ${virusStyle}. 
    Color scheme: ${colorScheme}. 
    Make it look dangerous, digital, and cyberpunk. 
    Circular icon format, dark background, glowing neon accents.
    Professional quality, suitable for a crypto token logo.
    No text, just the icon.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error('No image in response:', JSON.stringify(data));
      throw new Error('No image generated');
    }

    return new Response(
      JSON.stringify({ 
        imageUrl,
        threatName,
        threatType 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating virus logo:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

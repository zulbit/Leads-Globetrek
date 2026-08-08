interface Env {
  ACCESS_PASSWORD?: string;
  DEEPSEEK_API_KEY?: string;
}

// Authorization check helper
async function isAuthorized(request: Request, env: Env): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  const masterPassword = env.ACCESS_PASSWORD || 'globetrek2026';
  
  const msgBuffer = new TextEncoder().encode(masterPassword);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const expectedToken = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return authHeader === `Bearer ${expectedToken}`;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  if (!await isAuthorized(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiKey = env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    return new Response(JSON.stringify({ 
      error: 'DEEPSEEK_API_KEY is not configured in Cloudflare environment settings. Please add it to your environment variables.' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { 
      leadTitle, 
      leadCity, 
      leadCategory, 
      leadWebsite, 
      leadWebsiteStatus, 
      leadRating, 
      leadReviewsCount,
      projectTag 
    } = await request.json() as any;

    if (!leadTitle || !leadCity) {
      return new Response(JSON.stringify({ error: 'Missing lead details' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isDreamstay = projectTag === 'Dreamstay';
    
    // Customize system context based on brand/niche
    const systemPrompt = isDreamstay
      ? `You are an expert B2B sales copywriter for "Dreamstay" (a direct booking engine and premium guest-house booking software in Pakistan).
You write highly urgent, polite, and persuasive pitch messages in Roman Urdu mixed with professional English (Hinglish) specifically designed for WhatsApp.
Your goal is to offer them a direct booking engine website (0% commission) so they stop paying high commissions to other websites.
Keep your response short, direct, under 85 words. Use line breaks for readability. Use 'AOA' and polite greetings like 'Aap'.`
      : `You are an expert B2B sales copywriter for "Globetrek" (Pakistan's largest tour operator marketplace).
You write highly persuasive, polite, and urgent WhatsApp pitches in Roman Urdu mixed with professional English (Hinglish).
Your goal is to invite local tour operators, travel agencies, and trekking clubs to list their packages on Globetrek and gain direct bookings in PKR.
Keep your response short, direct, under 85 words. Use line breaks for readability. Use 'AOA' and polite greetings like 'Aap'.`;

    // Construct the user instruction highlighting exact pain points (rating, broken website, etc.)
    let userPrompt = `Write a personalized pitch message for:
- Business Name: "${leadTitle}"
- Category: "${leadCategory || 'Business'}"
- Location: "${leadCity}, Pakistan"
- Current Google Maps Rating: ${leadRating !== undefined ? `${leadRating} ★ (${leadReviewsCount || 0} reviews)` : 'Not rated yet'}
- Website URL: "${leadWebsite || 'None'}"
- Website Status: "${leadWebsiteStatus || 'No Website'}"

CRITICAL INSTRUCTIONS:
1. Immediately address the lead by name: e.g. "AOA ${leadTitle}!" or "Greetings ${leadTitle}!".
2. Hook them with a specific local detail:
   - If they have NO website or a BROKEN website: Focus on how tourists searching for hotels/tours in "${leadCity}" can't book with them directly and they are losing 50%+ bookings. Offer to build a fast 1-click booking bio link in 24 hours.
   - If they have a website: Compliment their website/rating, but explain how they can gain more direct clients and listing on ${isDreamstay ? 'Dreamstay' : 'Globetrek'} boosts direct booking revenue in Pakistan.
3. Keep it strictly under 85 words. Double-check length!
4. End with a soft call-to-action: e.g. "Kya main aapse a 30-second preview share kar sakta hoon?" or "Can we connect on WhatsApp?"
5. Do NOT include placeholder tags, subject lines, quotes, or introduction labels (e.g. "Pitch:"). Start writing the WhatsApp message directly.`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.65,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API returned status ${response.status}: ${errorText}`);
    }

    const completion = await response.json() as any;
    const pitch = completion.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ pitch: pitch.trim() }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('DeepSeek generation failed:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

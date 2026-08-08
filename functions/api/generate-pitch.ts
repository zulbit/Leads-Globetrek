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
      ? `You are an expert sales representative for "Dreamstay" (a direct booking engine and guest-house software in Pakistan).
You write highly personalized, warm, and professional outreach messages in Roman Urdu (Hinglish) specifically formatted for WhatsApp.
Your goal is to get them to book a quick 5-minute call or demo to show how they can get direct bookings with 0% commission.
Keep the tone very polite, starting with a warm Pakistani greeting like "AOA" and "Umeed hai aap khairiyat se honge".
Use line breaks to make it highly readable on phone viewports. Under 90 words.`
      : `You are an expert partnership manager for "Globetrek" (Pakistan's largest tour operator marketplace).
You write highly personalized, warm, and professional outreach messages in Roman Urdu (Hinglish) specifically formatted for WhatsApp.
Your goal is to invite them to list their tour packages or services on Globetrek to tap into travel bookings in PKR.
Keep the tone very polite, starting with a warm Pakistani greeting like "AOA" and "Umeed hai aap khairiyat se honge".
Use line breaks to make it highly readable on phone viewports. Under 90 words.`;

    // Construct the user instruction highlighting exact pain points (rating, broken website, etc.)
    const userPrompt = `Write a personalized WhatsApp outreach message for this business:
- Business Name: "${leadTitle}"
- Category/Niche: "${leadCategory || 'Tourism & Hospitality'}"
- City: "${leadCity}"
- Website URL: "${leadWebsite || ''}"
- Website Status: "${leadWebsiteStatus || ''}"
- Rating: ${leadRating !== undefined ? `${leadRating} ★ (${leadReviewsCount || 0} reviews)` : 'Not rated yet'}

CRITICAL PERSONALIZATION INSTRUCTIONS (THE AI MAGIC):
1. **Salutation**: Start with "AOA [Business Name] team!" or "AOA [Business Name]! Umeed hai aap khairiyat se honge."
2. **Specific Website Hook**:
   - If they have a working website (e.g. status contains "Reachable", website is not empty): Mention that you visited "${leadWebsite}" and compliment their digital presence, but explain how listing on ${isDreamstay ? 'Dreamstay' : 'Globetrek'} will expand their direct guest reach in ${leadCity}.
   - If their website is broken (e.g. status contains "Broken", "Error", "404"): Say that you checked "${leadWebsite}" but noticed it seems down or returning an error, meaning they are losing direct bookings from tourists in ${leadCity}. Offer to build them a fast direct-booking landing page.
   - If they have NO website (e.g. website is empty or status contains "No Website"): Point out that they are listed on Google Maps in ${leadCity} with no direct website, meaning they are paying heavy commissions to online agents. Offer to set up a direct booking site.
3. **Rating Validation**: If they have a high rating (4.0+), compliment it: "Aapki Google profile par ${leadRating} star rating aur reviews dekh kar bohat khushi hui!"
4. **Call to Action**: End with a friendly question: "Kya main aapse iska 30-second mockup share kar sakta hoon?" or "Can we connect for a brief chat?"
5. **Format**: Deliver only the final Roman Urdu WhatsApp message. No subject lines, no intro text, no placeholders, no hashtags, no quotes. Use emojis naturally.`;

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
        temperature: 0.7,
        max_tokens: 250
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

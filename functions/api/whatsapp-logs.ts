interface Env {
  DB: D1Database;
  ACCESS_PASSWORD?: string;
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

function detectRealCity(address: string, title: string, existingCity: string): string {
  const combined = `${title || ''} ${address || ''}`.toLowerCase();
  
  // 1. Explicit City Names (Highest priority)
  if (combined.includes('karachi') || combined.includes('khi')) return 'Karachi';
  if (combined.includes('lahore') || combined.includes('lhr')) return 'Lahore';
  if (combined.includes('islamabad') || combined.includes('islambad') || combined.includes('capital territory')) return 'Islamabad';
  if (combined.includes('rawalpindi') || combined.includes('rwalpindi') || combined.includes('pindi')) return 'Rawalpindi';
  if (combined.includes('peshawar')) return 'Peshawar';
  if (combined.includes('abbottabad') || combined.includes('abbotabad')) return 'Abbottabad';
  if (combined.includes('multan')) return 'Multan';
  if (combined.includes('faisalabad')) return 'Faisalabad';
  if (combined.includes('quetta')) return 'Quetta';
  if (combined.includes('naran') || combined.includes('kaghan') || combined.includes('shogran') || combined.includes('babusar') || combined.includes('saif ul malook')) return 'Naran';
  if (combined.includes('murree') || combined.includes('bhurban') || combined.includes('patriata') || combined.includes('nathia gali') || combined.includes('ayubia')) return 'Murree';
  if (combined.includes('skardu') || combined.includes('shigar') || combined.includes('kachura')) return 'Skardu';
  if (combined.includes('hunza') || combined.includes('karimabad') || combined.includes('passu')) return 'Hunza';
  if (combined.includes('gilgit')) return 'Gilgit';
  if (combined.includes('swat') || combined.includes('mingora') || combined.includes('kalam') || combined.includes('malam jabba')) return 'Swat';
  if (combined.includes('gujranwala')) return 'Gujranwala';
  if (combined.includes('sialkot')) return 'Sialkot';

  // 2. City-Specific Neighborhoods / Landmarks (Second priority)
  if (
    combined.includes('clifton') || combined.includes('dha karachi') || combined.includes('defence karachi') || 
    combined.includes('gulshan-e-iqbal') || combined.includes('gulberg karachi') || combined.includes('saddar karachi') || 
    combined.includes('north nazimabad') || combined.includes('tariq road') || combined.includes('shahrah-e-faisal') || 
    combined.includes('korangi') || combined.includes('pechs') || combined.includes('p.e.c.h.s') || 
    combined.includes('i.i. chundrigar') || combined.includes('zamzama') || combined.includes('bahria town karachi') || combined.includes('malir')
  ) {
    return 'Karachi';
  }

  if (
    combined.includes('gulberg') || combined.includes('dha lahore') || combined.includes('johar town') || 
    combined.includes('model town') || combined.includes('mall road lahore') || combined.includes('faisal town') || 
    combined.includes('shadman') || combined.includes('defence lahore') || combined.includes('cavalry ground') || 
    combined.includes('allama iqbal town') || combined.includes('cantt lahore') || combined.includes('wapda town') || 
    combined.includes('garden town') || combined.includes('anarkali') || combined.includes('bahria town lahore') || 
    combined.includes('valencia') || combined.includes('lake city') || combined.includes('mm alam road') || combined.includes('jail road')
  ) {
    return 'Lahore';
  }

  if (
    combined.includes('blue area') || combined.includes('diplomatic enclave') || combined.includes('centaurus') ||
    combined.includes('bahria enclave') || combined.includes('soan gardens') ||
    /\b(sector\s+[e-i]-?\d{1,2}|[e-i]-?\d{1,2}\s+markaz)\b/i.test(combined)
  ) {
    return 'Islamabad';
  }

  if (
    combined.includes('saddar rawalpindi') || combined.includes('bahria town rawalpindi') ||
    combined.includes('satellite town') || combined.includes('murree road') ||
    combined.includes('westridge') || combined.includes('peshawar road') || combined.includes('chaklala') ||
    combined.includes('gulraiz') || combined.includes('ayub park')
  ) {
    return 'Rawalpindi';
  }

  return existingCity || 'Other';
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  if (!await isAuthorized(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { results } = await env.DB.prepare(`
      SELECT 
        l.id, l.leadId, l.phone, l.message, l.serverResponse, l.sentAt,
        b.title as businessName, b.projectTag as projectTag, b.city as city, b.address as address
      FROM whatsapp_logs l
      LEFT JOIN leads b ON l.leadId = b.id
      ORDER BY l.sentAt DESC
    `).all();

    const sanitizedResults = results.map((l: any) => {
      let city = detectRealCity(l.address || '', l.businessName || '', l.city || '');
      return { ...l, city };
    });

    return new Response(JSON.stringify(sanitizedResults), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  if (!await isAuthorized(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json() as any;
    const { leadId, phone, message, serverResponse } = body;

    if (!phone || !message) {
      return new Response(JSON.stringify({ error: 'Missing phone or message parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const id = `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const sentAt = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO whatsapp_logs (id, leadId, phone, message, serverResponse, sentAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      leadId || '',
      phone,
      message,
      serverResponse || 'SENT',
      sentAt
    ).run();

    return new Response(JSON.stringify({ success: true, id }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

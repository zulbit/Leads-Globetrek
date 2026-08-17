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
  
  // Islamabad (Check sectors and specific landmarks)
  if (
    combined.includes('islamabad') || combined.includes('islambad') || combined.includes('capital territory') ||
    combined.includes('blue area') || combined.includes('diplomatic enclave') || combined.includes('centaurus') ||
    combined.includes('bahria enclave') || combined.includes('soan gardens') ||
    /\b(i-[89]|i-10|i-11|f-[5678]|f-10|f-11|g-[56789]|g-10|g-11|g-13|g-14|g-15|e-7|e-11|h-[89]|h-10|h-11|h-12|d-12|c-12|b-17)\b/i.test(combined)
  ) {
    return 'Islamabad';
  }

  // Rawalpindi
  if (
    combined.includes('rawalpindi') || combined.includes('rwalpindi') || combined.includes('pindi') ||
    combined.includes('saddar rawalpindi') || combined.includes('bahria town rawalpindi') ||
    combined.includes('satellite town rawalpindi') || combined.includes('murree road') ||
    combined.includes('westridge') || combined.includes('peshawar road') || combined.includes('chaklala') ||
    combined.includes('gulraiz') || combined.includes('ayub park')
  ) {
    return 'Rawalpindi';
  }

  // Karachi
  if (
    combined.includes('karachi') || combined.includes('khi') || combined.includes('clifton') ||
    combined.includes('dha karachi') || combined.includes('defence karachi') || combined.includes('gulshan-e-iqbal') ||
    combined.includes('gulberg karachi') || combined.includes('saddar karachi') || combined.includes('north nazimabad') ||
    combined.includes('tariq road') || combined.includes('shahrah-e-faisal') || combined.includes('korangi') ||
    combined.includes('pechs') || combined.includes('i.i. chundrigar') || combined.includes('zamzama') ||
    combined.includes('bahria town karachi') || combined.includes('malir')
  ) {
    return 'Karachi';
  }

  // Lahore
  if (
    combined.includes('lahore') || combined.includes('lhr') || combined.includes('gulberg') ||
    combined.includes('dha lahore') || combined.includes('johar town') || combined.includes('model town') ||
    combined.includes('mall road') || combined.includes('faisal town') || combined.includes('shadman') ||
    combined.includes('defence lahore') || combined.includes('cavalry ground') || combined.includes('allama iqbal town') ||
    combined.includes('cantt lahore') || combined.includes('wapda town') || combined.includes('garden town') ||
    combined.includes('anarkali') || combined.includes('bahria town lahore') || combined.includes('valencia') ||
    combined.includes('lake city') || combined.includes('mm alam road') || combined.includes('jail road')
  ) {
    return 'Lahore';
  }

  // Abbottabad
  if (combined.includes('abbottabad') || combined.includes('abbotabad') || combined.includes('mandian') || combined.includes('supply abbottabad') || combined.includes('mansehra road') || combined.includes('kakul')) {
    return 'Abbottabad';
  }

  // Murree
  if (combined.includes('murree') || combined.includes('bhurban') || combined.includes('patriata') || combined.includes('galyat') || combined.includes('nathia gali') || combined.includes('ayubia')) {
    return 'Murree';
  }

  // Naran / Kaghan
  if (combined.includes('naran') || combined.includes('kaghan') || combined.includes('saif ul malook') || combined.includes('babusar') || combined.includes('shogran')) {
    return 'Naran';
  }

  // Peshawar
  if (combined.includes('peshawar') || combined.includes('hayatabad') || combined.includes('university road') || combined.includes('saddar peshawar') || combined.includes('cantt peshawar')) {
    return 'Peshawar';
  }

  // Quetta
  if (combined.includes('quetta') || combined.includes('cantt quetta') || combined.includes('zarghoon road') || combined.includes('jinnah road quetta')) {
    return 'Quetta';
  }

  // Multan
  if (combined.includes('multan') || combined.includes('bosan road') || combined.includes('cantt multan') || combined.includes('gulgasht') || combined.includes('abdali road')) {
    return 'Multan';
  }

  // Faisalabad
  if (combined.includes('faisalabad') || combined.includes('d ground') || combined.includes('satiana road') || combined.includes('peoples colony') || combined.includes('clock tower')) {
    return 'Faisalabad';
  }

  // Hunza
  if (combined.includes('hunza') || combined.includes('karimabad') || combined.includes('aliabad') || combined.includes('passu') || combined.includes('attabad')) {
    return 'Hunza';
  }

  // Skardu
  if (combined.includes('skardu') || combined.includes('shigar') || combined.includes('khaplu') || combined.includes('deosai') || combined.includes('kachura') || combined.includes('shangrila')) {
    return 'Skardu';
  }

  // Gilgit
  if (combined.includes('gilgit') || combined.includes('jutial') || combined.includes('danyore')) {
    return 'Gilgit';
  }

  // Swat
  if (combined.includes('swat') || combined.includes('mingora') || combined.includes('fizagat') || combined.includes('malam jabba') || combined.includes('kalam') || combined.includes('saidu sharif')) {
    return 'Swat';
  }

  // Gujranwala
  if (combined.includes('gujranwala') || combined.includes('gt road gujranwala')) {
    return 'Gujranwala';
  }

  // Sialkot
  if (combined.includes('sialkot') || combined.includes('paris road') || combined.includes('cantt sialkot') || combined.includes('daska')) {
    return 'Sialkot';
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

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
        b.title as businessName, b.projectTag as projectTag, b.city as city
      FROM whatsapp_logs l
      LEFT JOIN leads b ON l.leadId = b.id
      ORDER BY l.sentAt DESC
    `).all();

    return new Response(JSON.stringify(results), {
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

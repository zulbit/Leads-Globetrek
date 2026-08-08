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

interface LeadBody {
  id: string;
  title: string;
  contactPerson?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  websiteStatus?: string;
  address?: string;
  city: string;
  country?: string;
  category?: string;
  rating?: number;
  reviewsCount?: number;
  source: string;
  projectTag: string;
  outreachStatus?: string;
  apifyRunId?: string;
  createdAt?: string;
  lastContactedAt?: string;
  followUpDate?: string;
  followUpNotes?: string;
  groupTag?: string;
  notes?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  if (!await isAuthorized(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const projectTag = url.searchParams.get('projectTag');

  try {
    let query = "SELECT * FROM leads ORDER BY createdAt DESC";
    let params: any[] = [];

    if (projectTag && projectTag !== 'General') {
      query = "SELECT * FROM leads WHERE projectTag = ? ORDER BY createdAt DESC";
      params = [projectTag];
    }

    const { results } = await env.DB.prepare(query).bind(...params).all();
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
    const body = await request.json();
    const leads: LeadBody[] = Array.isArray(body) ? body : [body];

    if (leads.length === 0) {
      await env.DB.prepare("DELETE FROM leads").run();
      return new Response(JSON.stringify({ success: true, count: 0 }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete any leads from the DB that are NOT in the incoming request payload (keeps deletes in sync)
    const incomingIds = leads.map(l => l.id).filter(Boolean);
    if (incomingIds.length > 0) {
      const placeholders = incomingIds.map(() => '?').join(',');
      await env.DB.prepare(`DELETE FROM leads WHERE id NOT IN (${placeholders})`).bind(...incomingIds).run();
    } else {
      // If we posted an empty array, it means all leads were deleted
      await env.DB.prepare("DELETE FROM leads").run();
    }

    // Prepare upsert statement
    const sql = `
      INSERT INTO leads (
        id, title, contactPerson, phone, whatsapp, email, website, websiteStatus, 
        address, city, country, category, rating, reviewsCount, source, projectTag, 
        outreachStatus, apifyRunId, createdAt, lastContactedAt, followUpDate, 
        followUpNotes, groupTag, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        contactPerson = excluded.contactPerson,
        phone = excluded.phone,
        whatsapp = excluded.whatsapp,
        email = excluded.email,
        website = excluded.website,
        websiteStatus = excluded.websiteStatus,
        address = excluded.address,
        city = excluded.city,
        country = excluded.country,
        category = excluded.category,
        rating = excluded.rating,
        reviewsCount = excluded.reviewsCount,
        source = excluded.source,
        projectTag = excluded.projectTag,
        outreachStatus = excluded.outreachStatus,
        apifyRunId = excluded.apifyRunId,
        lastContactedAt = excluded.lastContactedAt,
        followUpDate = excluded.followUpDate,
        followUpNotes = excluded.followUpNotes,
        groupTag = excluded.groupTag,
        notes = excluded.notes
    `;

    const stmt = env.DB.prepare(sql);
    const statements = leads.map(l => 
      stmt.bind(
        l.id,
        l.title,
        l.contactPerson || '',
        l.phone,
        l.whatsapp || '',
        l.email || '',
        l.website || '',
        l.websiteStatus || 'Reachable (status unverified)',
        l.address || '',
        l.city,
        l.country || 'Pakistan',
        l.category || '',
        l.rating !== undefined ? l.rating : null,
        l.reviewsCount !== undefined ? l.reviewsCount : null,
        l.source,
        l.projectTag,
        l.outreachStatus || 'New',
        l.apifyRunId || '',
        l.createdAt || new Date().toISOString(),
        l.lastContactedAt || '',
        l.followUpDate || '',
        l.followUpNotes || '',
        l.groupTag || '',
        l.notes || ''
      )
    );

    await env.DB.batch(statements);

    return new Response(JSON.stringify({ success: true, count: leads.length }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  if (!await isAuthorized(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const clearDemo = url.searchParams.get('clearDemo');

  try {
    if (clearDemo === 'true') {
      // Clear all demo leads (id starting with "demo_")
      const info = await env.DB.prepare("DELETE FROM leads WHERE id LIKE 'demo_%'").run();
      return new Response(JSON.stringify({ success: true, deleted: info.meta.changes }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing ID parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await env.DB.prepare("DELETE FROM leads WHERE id = ?").bind(id).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

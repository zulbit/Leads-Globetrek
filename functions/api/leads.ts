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
    
    // Sanitize wa.me and whatsapp.com links out of the website field and auto-correct city from address
    const sanitizedResults = results.map((l: any) => {
      let website = l.website || '';
      let websiteStatus = l.websiteStatus || 'No Website';
      if (website.includes('wa.me') || website.includes('whatsapp.com') || website.includes('api.whatsapp.com')) {
        website = '';
        websiteStatus = 'No Website';
      }
      let city = detectRealCity(l.address || '', l.title || '', l.city || '');
      return { ...l, website, websiteStatus, city };
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
    const body = await request.json();
    const incomingLeads: LeadBody[] = Array.isArray(body) ? body : [body];

    if (incomingLeads.length === 0) {
      await env.DB.prepare("DELETE FROM leads").run();
      return new Response(JSON.stringify({ success: true, count: 0 }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Sanitize incoming leads and auto-correct city
    const leads = incomingLeads.map(l => {
      let website = l.website || '';
      let websiteStatus = l.websiteStatus || 'No Website';
      if (website.includes('wa.me') || website.includes('whatsapp.com') || website.includes('api.whatsapp.com')) {
        website = '';
        websiteStatus = 'No Website';
      }
      let city = detectRealCity(l.address || '', l.title || '', l.city || '');
      return { ...l, website, websiteStatus, city };
    });

    // Delete any leads from the DB that are NOT in the incoming request payload (keeps deletes in sync)
    const incomingIds = leads.map(l => l.id).filter(Boolean);
    if (incomingIds.length > 0) {
      const existingIdsObj = await env.DB.prepare("SELECT id FROM leads").all();
      const existingIds = existingIdsObj.results.map(r => r.id as string);
      const incomingSet = new Set(incomingIds);
      const idsToDelete = existingIds.filter(id => !incomingSet.has(id));
      
      if (idsToDelete.length > 0) {
        const deleteStatements = idsToDelete.map(id => env.DB.prepare("DELETE FROM leads WHERE id = ?").bind(id));
        for (let i = 0; i < deleteStatements.length; i += 50) {
          await env.DB.batch(deleteStatements.slice(i, i + 50));
        }
      }
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

    // Chunk statements to avoid D1 batch limits
    const CHUNK_SIZE = 50;
    for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
      const chunk = statements.slice(i, i + CHUNK_SIZE);
      await env.DB.batch(chunk);
    }

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

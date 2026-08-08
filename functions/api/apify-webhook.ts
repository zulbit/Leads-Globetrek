interface Env {
  DB: D1Database;
  ACCESS_PASSWORD?: string;
}

// Check validation secret helper
async function isValidSecret(secret: string, env: Env): Promise<boolean> {
  const masterPassword = env.ACCESS_PASSWORD || 'globetrek2026';
  
  const msgBuffer = new TextEncoder().encode(masterPassword);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const expectedToken = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return secret === expectedToken;
}

function formatPakistanPhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('03')) {
    cleaned = '+92' + cleaned.substring(1);
  } else if (cleaned.startsWith('3')) {
    cleaned = '+92' + cleaned;
  } else if (cleaned.startsWith('923')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

function generateDeterministicId(title: string, city: string): string {
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanCity = city.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `apify_${cleanTitle}_${cleanCity}`;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');

  if (!secret || !await isValidSecret(secret, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const payload = await request.json() as any;
    const datasetId = payload.resource?.defaultDatasetId;

    if (!datasetId) {
      return new Response(JSON.stringify({ error: 'Missing datasetId in webhook payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extract context variables from query string
    const projectTag = url.searchParams.get('projectTag') || 'General';
    const city = url.searchParams.get('city') || 'Pakistan';
    const query = url.searchParams.get('query') || '';
    const platform = url.searchParams.get('platform') || 'Google Maps';

    // Fetch scraped dataset items from Apify
    const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`);
    if (!datasetRes.ok) {
      throw new Error(`Failed to fetch dataset items: ${datasetRes.status}`);
    }

    const items = await datasetRes.json() as any[];

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, msg: 'No items in dataset' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

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
    const statements = items.map((item, i) => {
      const title = item.title || item.name || 'Unknown Business';
      const cleanCity = item.city || city;
      const id = generateDeterministicId(title, cleanCity);

      const rawPhone = item.phone || item.phoneUnformatted || '';
      const formattedPhone = formatPakistanPhone(rawPhone);

      // Sanitize wa.me and whatsapp.com links out of the website field
      let website = item.website || '';
      let websiteStatus = 'No Website';
      if (website && !website.includes('wa.me') && !website.includes('whatsapp.com') && !website.includes('api.whatsapp.com')) {
        websiteStatus = 'Reachable (status unverified)';
      } else {
        website = '';
      }

      return stmt.bind(
        id,
        title,
        item.ownerName || '',
        formattedPhone,
        formattedPhone, // WhatsApp
        item.email || item.emails?.[0] || '',
        website,
        websiteStatus,
        item.address || item.street || `${cleanCity}, Pakistan`,
        cleanCity,
        'Pakistan',
        item.categoryName || item.category || query || 'Tourism',
        item.totalScore || item.rating || null,
        item.reviewsCount || item.userRatingsTotal || null,
        platform,
        projectTag,
        'New', // outreachStatus
        payload.resource?.id || '', // apifyRunId
        new Date().toISOString(), // createdAt
        '', // lastContactedAt
        '', // followUpDate
        '', // followUpNotes
        '', // groupTag
        ''  // notes
      );
    });

    await env.DB.batch(statements);

    return new Response(JSON.stringify({ success: true, count: statements.length }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Apify Webhook Processing Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

interface Env {
  DB: D1Database;
}

// Phone normalizer helper
function normalizePhone(phone: string): string[] {
  if (!phone) return [];
  const digits = phone.replace(/\D/g, '');
  const variations: string[] = [phone, digits];

  if (digits.startsWith('923')) {
    variations.push('+' + digits);
    variations.push('0' + digits.slice(2));
  } else if (digits.startsWith('03')) {
    variations.push('+92' + digits.slice(1));
    variations.push('92' + digits.slice(1));
  } else if (digits.length === 10 && digits.startsWith('3')) {
    variations.push('+92' + digits);
    variations.push('0' + digits);
    variations.push('92' + digits);
  }

  return Array.from(new Set(variations));
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return new Response(JSON.stringify({ 
    status: 'online', 
    service: 'GlobeTrek Vendor Registration Sync Webhook',
    target: 'Auto-Promotes Registered Vendors to Converted'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as any;
    const phone = body.phone || body.whatsapp || body.mobile || '';
    const email = body.email || '';
    const businessName = body.businessName || body.agencyName || body.companyName || body.title || 'GlobeTrek Vendor';
    const city = body.city || 'Pakistan';
    const projectTag = body.projectTag || 'Globetrek';

    if (!phone && !email && !businessName) {
      return new Response(JSON.stringify({ error: 'Missing phone, email, or businessName in payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const phoneVariants = normalizePhone(phone);
    const nowIso = new Date().toISOString();
    let matchedLead: any = null;

    // 1. Search by phone number variants
    if (phoneVariants.length > 0) {
      for (const p of phoneVariants) {
        const lead = await env.DB.prepare(`
          SELECT * FROM leads 
          WHERE phone LIKE ? OR whatsapp LIKE ? 
          LIMIT 1
        `).bind(`%${p}%`, `%${p}%`).first();

        if (lead) {
          matchedLead = lead;
          break;
        }
      }
    }

    // 2. Search by email if not found
    if (!matchedLead && email) {
      matchedLead = await env.DB.prepare(`
        SELECT * FROM leads 
        WHERE email = ? 
        LIMIT 1
      `).bind(email.trim()).first();
    }

    // 3. Search by exact business name
    if (!matchedLead && businessName) {
      matchedLead = await env.DB.prepare(`
        SELECT * FROM leads 
        WHERE title LIKE ? 
        LIMIT 1
      `).bind(`%${businessName.trim()}%`).first();
    }

    if (matchedLead) {
      const updatedNotes = `🎉 Converted: Registered as official GlobeTrek Vendor on ${nowIso.split('T')[0]}\n${matchedLead.notes || ''}`.trim().slice(0, 500);

      // Auto-Convert lead in database
      await env.DB.prepare(`
        UPDATE leads 
        SET outreachStatus = 'Converted',
            lastContactedAt = ?,
            notes = ?
        WHERE id = ?
      `).bind(nowIso, updatedNotes, matchedLead.id).run();

      return new Response(JSON.stringify({
        success: true,
        action: 'CONVERTED_LEAD',
        leadId: matchedLead.id,
        businessName: matchedLead.title,
        status: 'Converted'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If vendor registered without a prior scraped record, create a new Converted lead entry
    const newId = `vendor_reg_${Date.now()}`;
    await env.DB.prepare(`
      INSERT INTO leads (
        id, title, phone, whatsapp, email, city, country, category, source, projectTag, outreachStatus, createdAt, lastContactedAt, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      newId,
      businessName,
      phone,
      phone,
      email,
      city,
      'Pakistan',
      'Registered Vendor Partner',
      'GlobeTrek Signup',
      projectTag,
      'Converted',
      nowIso,
      nowIso,
      '🎉 Direct Signup: Registered Vendor via GlobeTrek Portal'
    ).run();

    return new Response(JSON.stringify({
      success: true,
      action: 'CREATED_AND_CONVERTED',
      leadId: newId,
      businessName,
      status: 'Converted'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

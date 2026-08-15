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
  // Webhook challenge verification / health ping
  const url = new URL(context.request.url);
  const hubChallenge = url.searchParams.get('hub.challenge');
  if (hubChallenge) {
    return new Response(hubChallenge, { status: 200 });
  }

  return new Response(JSON.stringify({ 
    status: 'online', 
    service: 'GlobeTrek WhatsApp Inbound Reply Webhook',
    target: 'Auto-Promotes Responding Leads to Qualified'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const rawBody = await request.json() as any;
    
    // Parse incoming payload across multiple webhook formats (Gateway, Baileys, WhatsApp Cloud, WA.yello.bid)
    let sender = rawBody.sender || rawBody.from || rawBody.phone || rawBody.number || rawBody.recipient || rawBody.data?.from || '';
    let messageText = rawBody.message || rawBody.text || rawBody.body || rawBody.content || rawBody.data?.message || rawBody.data?.text || '';

    // If payload has nested entry (WhatsApp Cloud API format)
    if (rawBody.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const waMsg = rawBody.entry[0].changes[0].value.messages[0];
      sender = waMsg.from || sender;
      messageText = waMsg.text?.body || messageText;
    }

    // Handle delivery status update webhooks (e.g. from wa.yello.bid / WhatsApp Gateway status callbacks)
    const statusUpdate = rawBody.status || rawBody.event || rawBody.delivery_status || '';
    const messageId = rawBody.messageId || rawBody.message_id || rawBody.id || '';
    
    if (statusUpdate && (statusUpdate.toLowerCase() === 'failed' || statusUpdate.toLowerCase() === 'delivered' || statusUpdate.toLowerCase() === 'sent')) {
      const isFailed = statusUpdate.toLowerCase() === 'failed';
      const serverStatus = isFailed ? `FAILED: ${rawBody.reason || rawBody.error || 'Recipient not on WhatsApp / Landline'}` : 'DELIVERED';

      if (messageId) {
        await env.DB.prepare(`
          UPDATE whatsapp_logs 
          SET serverResponse = ?
          WHERE id = ? OR message LIKE ?
        `).bind(serverStatus, messageId, `%${messageId}%`).run();
      } else if (sender) {
        await env.DB.prepare(`
          UPDATE whatsapp_logs 
          SET serverResponse = ?
          WHERE phone = ?
          ORDER BY sentAt DESC
          LIMIT 1
        `).bind(serverStatus, sender).run();
      }

      return new Response(JSON.stringify({ success: true, action: 'STATUS_UPDATED', status: serverStatus }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!sender) {
      return new Response(JSON.stringify({ error: 'Missing sender phone number in webhook payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const phoneVariants = normalizePhone(sender);
    const nowIso = new Date().toISOString();
    const cleanSnippet = (typeof messageText === 'string' ? messageText : JSON.stringify(messageText)).slice(0, 150);

    // Search D1 database for matching lead by phone number
    let matchedLead: any = null;

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

    if (matchedLead) {
      const updatedNotes = `Inbound WhatsApp: "${cleanSnippet}"\n${matchedLead.notes || ''}`.trim().slice(0, 500);

      // Auto-Qualify lead in database
      await env.DB.prepare(`
        UPDATE leads 
        SET outreachStatus = 'Qualified',
            lastContactedAt = ?,
            notes = ?
        WHERE id = ?
      `).bind(nowIso, updatedNotes, matchedLead.id).run();

      // Log inbound interaction into whatsapp_logs
      const logId = `inbound_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      await env.DB.prepare(`
        INSERT INTO whatsapp_logs (id, leadId, phone, message, serverResponse, sentAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        logId,
        matchedLead.id,
        sender,
        cleanSnippet || 'Inbound reply received from vendor',
        'INBOUND_REPLY',
        nowIso
      ).run();

      return new Response(JSON.stringify({
        success: true,
        action: 'QUALIFIED_LEAD',
        leadId: matchedLead.id,
        businessName: matchedLead.title,
        status: 'Qualified',
        reply: cleanSnippet
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Lead not found in DB, still log the inbound event
    const orphanLogId = `inbound_unknown_${Date.now()}`;
    await env.DB.prepare(`
      INSERT INTO whatsapp_logs (id, leadId, phone, message, serverResponse, sentAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      orphanLogId,
      '',
      sender,
      cleanSnippet || 'Inbound reply from unrecorded number',
      'INBOUND_REPLY (Unmatched)',
      nowIso
    ).run();

    return new Response(JSON.stringify({
      success: true,
      action: 'LOGGED_ONLY',
      message: 'Inbound message logged (no matching lead phone found in DB)',
      sender
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

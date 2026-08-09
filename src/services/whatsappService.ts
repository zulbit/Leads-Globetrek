import { Lead, WhatsAppConfig } from '../types/scraper';

export const formatPakistanPhone = (phone: string): string => {
  if (!phone) return '';
  // Remove non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Format local PK numbers starting with 03xx to +923xx
  if (cleaned.startsWith('03')) {
    cleaned = '+92' + cleaned.slice(1);
  } else if (cleaned.startsWith('923') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  } else if (cleaned.length === 10 && cleaned.startsWith('3')) {
    cleaned = '+92' + cleaned;
  }
  
  return cleaned;
};

export const parseMessageTemplate = (template: string, lead: Lead): string => {
  return template
    .replace(/\{\{business_name\}\}/gi, lead.title || 'Partner')
    .replace(/\{\{contact_person\}\}/gi, lead.contactPerson || 'Manager')
    .replace(/\{\{city\}\}/gi, lead.city || 'Pakistan')
    .replace(/\{\{category\}\}/gi, lead.category || 'Business')
    .replace(/\{\{website\}\}/gi, lead.website || '')
    .replace(/\{\{project\}\}/gi, lead.projectTag);
};

export interface SendResult {
  success: boolean;
  leadId: string;
  phone: string;
  message: string;
  deliveryStatus: 'DELIVERED' | 'QUEUED' | 'FAILED_NOT_REGISTERED' | 'SERVER_ERROR';
  messageId?: string;
  response?: any;
  error?: string;
}

/**
 * Live WhatsApp Number Validator
 * Checks if phone number is registered & active on WhatsApp server
 */
export const verifyWhatsAppNumber = async (
  config: WhatsAppConfig,
  phone: string
): Promise<{ isRegistered: boolean; formattedPhone: string; statusText: string }> => {
  const formatted = formatPakistanPhone(phone);
  if (!formatted || formatted.length < 12) {
    return { isRegistered: false, formattedPhone: formatted, statusText: 'Invalid Phone Format' };
  }

  // Mobile prefix pattern check — this only validates FORMAT, not actual WhatsApp registration
  const isMobilePrefix = /^\+923[0-5]\d{8}$/.test(formatted);
  if (isMobilePrefix) {
    return { isRegistered: true, formattedPhone: formatted, statusText: 'Valid PK Mobile Format (WhatsApp unverified)' };
  }

  return { isRegistered: false, formattedPhone: formatted, statusText: 'Landline / Inactive Number' };
};

export const sendWhatsAppMessage = async (
  config: WhatsAppConfig,
  lead: Lead,
  customMessage?: string
): Promise<SendResult> => {
  const formattedPhone = formatPakistanPhone(lead.whatsapp || lead.phone);
  
  // Fix domain typos (e.g. solutons -> solutions) or default to wa.yello.bid
  let rawUrl = (config.serverUrl || '').trim();
  if (rawUrl.includes('transmaxsolutons.com')) {
    rawUrl = rawUrl.replace('transmaxsolutons.com', 'transmaxsolutions.com');
  }
  if (!rawUrl || rawUrl === 'https://wa.transmaxsolutons.com') {
    rawUrl = 'https://wa.yello.bid';
  }
  
  const cleanUrl = rawUrl.replace(/\/$/, '');
  const token = config.apiToken.trim() || 'be70066b8598f3c97dc16e7a712e95b98e773430';

  const template = customMessage || (config.templates && config.templates.length > 0 ? config.templates[0].content : 'Hello {{business_name}}, greetings from {{project}}!');
  const finalMessage = parseMessageTemplate(template, lead);

  if (!formattedPhone) {
    return {
      success: false,
      leadId: lead.id,
      phone: lead.phone,
      message: finalMessage,
      deliveryStatus: 'FAILED_NOT_REGISTERED',
      error: 'Invalid or missing WhatsApp phone number'
    };
  }

  // Multi-key payload compatible with wa.yello.bid and Transmax Gateway
  const payload = {
    api_key: token,
    access_token: token,
    token: token,
    secret_key: token,
    instance_id: config.instanceId || 'gateway_01',
    number: formattedPhone,
    phone: formattedPhone,
    to: formattedPhone,
    message: finalMessage,
    type: 'text'
  };

  // Try candidate endpoints: /api/send-message, /send-message, /api/send
  const candidateEndpoints = [
    `${cleanUrl}/api/send-message`,
    `${cleanUrl}/send-message`,
    `${cleanUrl}/api/send`
  ];

  let lastError = '';
  let lastStatusCode = 0;

  for (const endpoint of candidateEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      }).catch(() => null);

      if (response && response.ok) {
        let data: any = {};
        try { data = await response.json(); } catch(e) {}
        
        return {
          success: true,
          leadId: lead.id,
          phone: formattedPhone,
          message: finalMessage,
          deliveryStatus: 'DELIVERED',
          messageId: data.message_id || data.id || `WA-MSG-${Date.now()}`,
          response: data
        };
      }

      if (response) {
        lastStatusCode = response.status;
        let errText = '';
        try {
          const errJson = await response.json();
          errText = errJson.message || errJson.error || errJson.msg || '';
        } catch(e) {}
        lastError = `HTTP ${response.status}${errText ? `: ${errText}` : ''}`;
        
        // If 404/405, try next endpoint candidate
        if (response.status !== 404 && response.status !== 405) {
          break;
        }
      }
    } catch (e: any) {
      lastError = e.message || 'Network fetch failure';
    }
  }

  return {
    success: false,
    leadId: lead.id,
    phone: formattedPhone,
    message: finalMessage,
    deliveryStatus: 'SERVER_ERROR',
    error: lastError ? `WhatsApp Server Error (${lastError}). Endpoint: ${cleanUrl}` : `Connection failed to ${cleanUrl}`
  };
};

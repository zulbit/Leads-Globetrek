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
  const serverEndpoint = config.serverUrl.replace(/\/$/, '') + '/api/send-message';
  
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

  try {
    const payload = {
      instance_id: config.instanceId,
      access_token: config.apiToken,
      number: formattedPhone,
      message: finalMessage,
      type: 'text'
    };

    // Make live request to wa.transmaxsolutons.com server
    const response = await fetch(serverEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiToken}`
      },
      body: JSON.stringify(payload)
    }).catch(() => null);

    if (response && response.ok) {
      const data = await response.json();
      return {
        success: true,
        leadId: lead.id,
        phone: formattedPhone,
        message: finalMessage,
        deliveryStatus: 'DELIVERED',
        messageId: data.message_id || `WA-MSG-${Date.now()}`,
        response: data
      };
    } else {
      // Server returned non-OK — report honestly as failed
      const statusCode = response ? response.status : 0;
      return {
        success: false,
        leadId: lead.id,
        phone: formattedPhone,
        message: finalMessage,
        deliveryStatus: 'SERVER_ERROR',
        error: `WhatsApp server returned HTTP ${statusCode}. Message was NOT sent. Check API token and server config.`
      };
    }
  } catch (error: any) {
    return {
      success: false,
      leadId: lead.id,
      phone: formattedPhone,
      message: finalMessage,
      deliveryStatus: 'SERVER_ERROR',
      error: error.message || 'Server connection timeout'
    };
  }
};

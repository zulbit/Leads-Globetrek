interface Env {
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
    const { serverUrl, apiToken, instanceId, phone, message } = body;

    let targetUrl = (serverUrl || 'https://wa.yello.bid').trim().replace(/\/$/, '');
    if (targetUrl.includes('transmaxsolutons.com')) {
      targetUrl = targetUrl.replace('transmaxsolutons.com', 'transmaxsolutions.com');
    }
    if (!targetUrl || targetUrl === 'https://wa.transmaxsolutons.com') {
      targetUrl = 'https://wa.yello.bid';
    }

    const secretKey = (apiToken || '').trim() || 'bef0066b8598f3c97dc16e7af12e95b98e773430';
    const accountId = (instanceId || '').trim() || '1765976556c4ca4238a0b923820dcc509a6f75849b6942a9ec027d2';

    // Format phone to +92 format
    let cleanPhone = (phone || '').replace(/[^\d+]/g, '');
    if (cleanPhone.startsWith('03')) cleanPhone = '+92' + cleanPhone.slice(1);
    if (!cleanPhone.startsWith('+')) cleanPhone = '+' + cleanPhone;

    const endpoint = `${targetUrl}/api/send/whatsapp`;

    const formParams = new URLSearchParams();
    formParams.append('secret', secretKey);
    formParams.append('account', accountId);
    formParams.append('recipient', cleanPhone);
    formParams.append('message', message || 'Greetings from Globetrek PK!');
    formParams.append('type', 'text');

    const waResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formParams.toString()
    });

    const responseText = await waResponse.text();
    let resData: any = {};
    try { resData = JSON.parse(responseText); } catch(e) { resData = { raw: responseText }; }

    if (waResponse.ok && resData.status === 200) {
      return new Response(JSON.stringify({ 
        success: true, 
        messageId: resData.data?.messageId || `WA-${Date.now()}`,
        response: resData 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: resData.message || resData.error || `WhatsApp Gateway Error (HTTP ${waResponse.status})`
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

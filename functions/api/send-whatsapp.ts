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

    const token = (apiToken || 'be70066b8598f3c97dc16e7a712e95b98e773430').trim();

    // Format number
    let cleanPhone = (phone || '').replace(/[^\d+]/g, '');
    if (cleanPhone.startsWith('03')) cleanPhone = '+92' + cleanPhone.slice(1);
    if (cleanPhone.startsWith('923') && !cleanPhone.startsWith('+')) cleanPhone = '+' + cleanPhone;

    const payload = {
      api_key: token,
      access_token: token,
      token: token,
      secret_key: token,
      instance_id: instanceId || 'gateway_01',
      sender: '923293089377',
      number: cleanPhone,
      phone: cleanPhone,
      to: cleanPhone,
      receiver: cleanPhone,
      target: cleanPhone,
      message: message,
      text: message,
      msg: message,
      type: 'text'
    };

    // Candidate endpoints
    const candidateEndpoints = [
      `${targetUrl}/api/send-message`,
      `${targetUrl}/send-message`,
      `${targetUrl}/api/send`,
      `${targetUrl}/send`
    ];

    let lastError = '';
    let successData: any = null;

    for (const endpoint of candidateEndpoints) {
      try {
        const waResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (waResponse.ok) {
          try {
            successData = await waResponse.json();
          } catch (e) {
            successData = { status: 'sent' };
          }
          break;
        } else {
          let errText = '';
          try {
            const errJson = await waResponse.json() as any;
            errText = errJson.message || errJson.error || errJson.msg || '';
          } catch(e) {}
          lastError = `HTTP ${waResponse.status}${errText ? `: ${errText}` : ''}`;
        }
      } catch (e: any) {
        lastError = e.message || 'Fetch failed';
      }
    }

    if (successData) {
      return new Response(JSON.stringify({ success: true, response: successData }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: lastError || `Failed to connect to ${targetUrl}` 
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

/**
 * Cloudflare Pages Function: POST /api/check-website
 * Performs server-side HTTP URL validation from Cloudflare edge nodes.
 */
export const onRequestPost: PagesFunction = async (context) => {
  try {
    const { request } = context;
    const body = await request.json() as { url: string };
    const url = body.url;

    if (!url || typeof url !== 'string' || url.trim() === '') {
      return new Response(JSON.stringify({ url: '', status: 'No Website', httpCode: 0, error: 'No URL provided' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const lowerUrl = url.toLowerCase().trim();

    if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com') || lowerUrl.includes('fb.me')) {
      return new Response(JSON.stringify({ url, status: 'Facebook Page Only', httpCode: 200, social: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagr.am')) {
      return new Response(JSON.stringify({ url, status: 'Instagram Bio Only', httpCode: 200, social: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (lowerUrl.includes('tiktok.com')) {
      return new Response(JSON.stringify({ url, status: 'TikTok Profile Only', httpCode: 200, social: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    clearTimeout(timeoutId);

    const httpCode = response.status;
    let status;

    if (httpCode >= 200 && httpCode < 300) {
      status = 'Active (200 OK)';
    } else if (httpCode >= 300 && httpCode < 400) {
      status = 'Redirect (' + httpCode + ')';
    } else if (httpCode === 403) {
      status = 'Forbidden (403)';
    } else if (httpCode === 404) {
      status = 'Broken (404 Error)';
    } else if (httpCode >= 500) {
      status = 'Server Error (' + httpCode + ')';
    } else {
      status = 'HTTP ' + httpCode;
    }

    return new Response(JSON.stringify({
      url: response.url || targetUrl,
      status,
      httpCode,
      finalUrl: response.url,
      redirected: response.redirected
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    const errMsg = error.message || 'Unknown error';
    let status = 'Broken (404 Error)';

    if (errMsg.includes('abort') || errMsg.includes('timeout')) {
      status = 'Timeout (8s)';
    } else if (errMsg.includes('ENOTFOUND') || errMsg.includes('getaddrinfo') || errMsg.includes('dns')) {
      status = 'Domain Not Found';
    } else if (errMsg.includes('refused')) {
      status = 'Connection Refused';
    } else if (errMsg.includes('certificate') || errMsg.includes('ssl')) {
      status = 'SSL Error';
    }

    return new Response(JSON.stringify({
      url: 'https://' + url.replace(/https?:\/\//, ''),
      status,
      httpCode: 0,
      error: errMsg
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

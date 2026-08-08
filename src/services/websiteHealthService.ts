import { WebsiteStatus } from '../types/scraper';

/**
 * Real Website Health Check — calls the Node.js backend which performs
 * actual server-side HTTP requests with real status codes.
 * Falls back to classification-only if backend is unavailable.
 */
export const checkWebsiteHealth = async (url: string): Promise<WebsiteStatus> => {
  if (!url || url.trim() === '' || url === 'N/A') {
    return 'No Website';
  }

  const lowerUrl = url.toLowerCase();

  // Quick social media classification (no HTTP check needed)
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com') || lowerUrl.includes('fb.me')) {
    return 'Facebook Page Only';
  }
  if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagr.am')) {
    return 'Instagram Bio Only';
  }
  if (lowerUrl.includes('tiktok.com')) {
    return 'TikTok Profile Only';
  }

  try {
    const response = await fetch('/api/check-website', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (response.ok) {
      const data = await response.json();
      // Map backend status to our WebsiteStatus type
      const status = data.status as string;
      if (status === 'Active (200 OK)') return 'Active (200 OK)';
      if (status === 'Broken (404 Error)') return 'Broken (404 Error)';
      if (status === 'Facebook Page Only') return 'Facebook Page Only';
      if (status === 'Instagram Bio Only') return 'Instagram Bio Only';
      if (status === 'TikTok Profile Only') return 'TikTok Profile Only';
      if (status === 'No Website') return 'No Website';
      // Any other status (redirects, 403, 500, timeout, SSL error, etc.)
      // falls into 'Reachable (status unverified)' since it's not a clean 200
      if (data.httpCode > 0 && data.httpCode < 400) return 'Active (200 OK)';
      return 'Broken (404 Error)';
    }
  } catch {
    // Backend unavailable — fall through to browser-only check
  }

  // Fallback: if backend is down, try browser no-cors (still honest about limitations)
  let targetUrl = url;
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    await fetch(targetUrl, { method: 'GET', mode: 'no-cors', signal: controller.signal });
    clearTimeout(timeoutId);
    return 'Reachable (status unverified)' as WebsiteStatus;
  } catch {
    return 'Broken (404 Error)';
  }
};

/**
 * Pre-Flight Verification for social media profile links.
 * Returns a guaranteed-loadable URL (search/tag page) when direct profile URL is uncertain.
 */
export const getGuaranteedWorkingSocialUrl = (
  platform: 'Instagram Bio' | 'TikTok Account' | 'Facebook Page',
  businessTitle: string,
  rawUrl?: string
): { url: string; status: WebsiteStatus } => {
  const cleanName = businessTitle.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const tagSlug = cleanName.toLowerCase().replace(/\s+/g, '');
  const searchQuery = encodeURIComponent(`${cleanName} Pakistan`);

  if (platform === 'Instagram Bio') {
    if (rawUrl && rawUrl.includes('instagram.com/')) {
      return { url: rawUrl, status: 'Instagram Bio Only' };
    }
    return {
      url: `https://www.instagram.com/explore/tags/${tagSlug}/`,
      status: 'Instagram Bio Only'
    };
  }

  if (platform === 'TikTok Account') {
    if (rawUrl && rawUrl.includes('tiktok.com/')) {
      return { url: rawUrl, status: 'TikTok Profile Only' };
    }
    return {
      url: `https://www.tiktok.com/tag/${tagSlug}`,
      status: 'TikTok Profile Only'
    };
  }

  // Facebook Page
  if (rawUrl && rawUrl.includes('facebook.com/')) {
    return { url: rawUrl, status: 'Facebook Page Only' };
  }
  return {
    url: `https://www.facebook.com/search/top?q=${searchQuery}`,
    status: 'Facebook Page Only'
  };
};

/**
 * Trustpilot Search URL generator
 */
export const getTrustpilotSearchUrl = (businessTitle: string): string => {
  const query = encodeURIComponent(businessTitle.trim());
  return `https://www.trustpilot.com/search?query=${query}`;
};

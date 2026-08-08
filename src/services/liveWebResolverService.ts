import { WebsiteStatus } from '../types/scraper';

export interface ResolvedBusinessIdentity {
  website: string;
  websiteStatus: WebsiteStatus;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
}

/**
 * Real-Time Business URL Resolver
 * Attempts to find a working website for a business by trying common domain patterns.
 * Uses the Node.js backend for real HTTP checks (actual status codes).
 */
export const resolveBusinessOnlinePresence = async (
  businessTitle: string,
  city: string
): Promise<ResolvedBusinessIdentity> => {
  const cleanName = businessTitle
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .toLowerCase()
    .trim();
  
  const words = cleanName.split(/\s+/).filter(w => !['office', 'branch', 'pakistan', 'ltd', 'pvt', city.toLowerCase()].includes(w));
  const mainSlug = words.join('');
  const searchQuery = encodeURIComponent(`${businessTitle} ${city} Pakistan`);

  // Common Pakistani TLD attempts
  const potentialDomains = [
    `https://${mainSlug}.com`,
    `https://${mainSlug}.pk`,
    `https://www.${mainSlug}.com`,
    `https://www.${mainSlug}.pk`,
  ];

  // Use the backend for real HTTP checks
  for (const testUrl of potentialDomains) {
    try {
      const response = await fetch('/api/check-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: testUrl })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.httpCode >= 200 && data.httpCode < 400) {
          return {
            website: data.finalUrl || testUrl,
            websiteStatus: data.status as WebsiteStatus,
            facebookUrl: `https://www.facebook.com/search/top?q=${searchQuery}`,
            instagramUrl: `https://www.instagram.com/explore/tags/${mainSlug}/`
          };
        }
      }
    } catch {
      // Backend unavailable or request failed, skip this domain
    }
  }

  // No standalone domain found — return Facebook search as fallback
  return {
    website: `https://www.facebook.com/search/top?q=${searchQuery}`,
    websiteStatus: 'Facebook Page Only',
    facebookUrl: `https://www.facebook.com/search/top?q=${searchQuery}`,
    instagramUrl: `https://www.instagram.com/explore/tags/${mainSlug}/`
  };
};

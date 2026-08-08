import { WebsiteStatus } from '../types/scraper';

export interface GoogleProbedWebsite {
  url: string;
  status: WebsiteStatus;
  domainName: string;
}

/**
 * Website Prober — checks a specific URL via the Node.js backend.
 * No more hardcoded lookup tables. Uses real HTTP checks.
 * Falls back to a Google Search link if no direct URL is known.
 */
export const probeGoogleForOfficialWebsite = async (
  businessTitle: string,
  city: string
): Promise<GoogleProbedWebsite> => {
  const searchQuery = `${businessTitle} ${city} Pakistan official website`;
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

  // Try common domain patterns via backend
  const cleanTitle = businessTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const slug = cleanTitle.replace(/\s+/g, '');
  
  const candidates = [
    `https://${slug}.com`,
    `https://${slug}.pk`,
    `https://www.${slug}.com`,
    `https://www.${slug}.pk`,
  ];

  for (const candidateUrl of candidates) {
    try {
      const response = await fetch('/api/check-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: candidateUrl })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.httpCode >= 200 && data.httpCode < 400) {
          const domain = new URL(data.finalUrl || candidateUrl).hostname.replace('www.', '');
          return {
            url: data.finalUrl || candidateUrl,
            status: 'Active (200 OK)',
            domainName: domain
          };
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  // No working domain found — return Google Search link
  return {
    url: googleSearchUrl,
    status: 'No Website',
    domainName: 'google.com'
  };
};

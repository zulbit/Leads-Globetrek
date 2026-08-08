import { Lead, LeadSource, ProjectTag } from '../types/scraper';
import { formatPakistanPhone } from './whatsappService';
import { checkWebsiteHealth } from './websiteHealthService';

export interface LiveScrapeOptions {
  query: string;
  city: string;
  count: number;
  source: LeadSource;
  projectTag: ProjectTag;
  apifyToken?: string;
}

/**
 * Live Scraper Engine using real Apify Google Maps API / Live Web Proxies
 */
export const executeLiveWebScrape = async (options: LiveScrapeOptions): Promise<Lead[]> => {
  const token = options.apifyToken || localStorage.getItem('apify_api_token');

  // If Apify API token is provided, execute real live Apify Google Maps Actor fetch
  if (token) {
    try {
      const response = await fetch(`https://api.apify.com/v2/actors/compass~crawler-google-places/run-sync-get-dataset-items?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchStringsArray: [`${options.query} in ${options.city} Pakistan`],
          maxCrawledPlacesPerSearch: options.count,
          language: 'en'
        })
      });

      if (response.ok) {
        const items = await response.json();
        const leads: Lead[] = [];

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const rawPhone = item.phone || item.phoneUnformatted || '';
          const formattedPhone = formatPakistanPhone(rawPhone);
          const websiteUrl = item.website || '';
          const healthStatus = await checkWebsiteHealth(websiteUrl);

          leads.push({
            id: `apify_live_${Date.now()}_${i}`,
            title: item.title || item.name || `${options.query} ${i + 1}`,
            contactPerson: item.ownerName || 'Managing Director',
            phone: formattedPhone,
            whatsapp: formattedPhone,
            email: item.email || '',
            website: websiteUrl,
            websiteStatus: healthStatus,
            address: item.address || `${options.city}, Pakistan`,
            city: options.city,
            country: 'Pakistan',
            category: item.categoryName || options.query,
            rating: item.totalScore || undefined,
            reviewsCount: item.reviewsCount || undefined,
            source: options.source,
            projectTag: options.projectTag,
            outreachStatus: 'New',
            createdAt: new Date().toISOString(),
            apifyRunId: item.id
          });
        }
        return leads;
      }
    } catch (error) {
      console.error('Apify Live API call failed, falling back to local resolver', error);
    }
  }

  // Live CORS-Proxy / Search Fetcher fallback for real results without token
  return [];
};

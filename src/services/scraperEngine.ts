import { Lead, LeadSource, ProjectTag } from '../types/scraper';
import { formatPakistanPhone } from './whatsappService';
import { checkWebsiteHealth } from './websiteHealthService';

export interface ScrapeParams {
  platform: LeadSource;
  query: string;
  city: string;
  count: number;
  projectTag: ProjectTag;
  apifyToken?: string;
}

/**
 * Real Scraper Engine — requires Apify API token.
 * 
 * When a token is provided, it calls the Apify Google Maps Scraper actor
 * to fetch REAL business data (names, phones, websites, ratings, reviews).
 * 
 * When NO token is provided, it returns an empty array and the UI shows
 * a "Configure Apify API Token" prompt. No fake/sample data is generated.
 */
export const scrapeLeadsEngine = async (params: ScrapeParams): Promise<Lead[]> => {
  const token = params.apifyToken || localStorage.getItem('apify_api_token') || '';

  if (!token.trim()) {
    // No token — return empty. The UI will show a configuration prompt.
    return [];
  }

  // Real Apify Google Maps Scraper API call
  const searchQuery = `${params.query} in ${params.city}, Pakistan`;

  try {
    const response = await fetch(
      `https://api.apify.com/v2/actors/compass~crawler-google-places/run-sync-get-dataset-items?token=${encodeURIComponent(token.trim())}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchStringsArray: [searchQuery],
          maxCrawledPlacesPerSearch: params.count,
          language: 'en',
          extractEmail: true
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Apify API returned ${response.status}: ${errText}`);
    }

    const items = await response.json();

    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    const leads: Lead[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rawPhone = item.phone || item.phoneUnformatted || '';
      const formattedPhone = formatPakistanPhone(rawPhone);
      const websiteUrl = item.website || '';

      // Use backend for real health check if URL exists
      let websiteStatus = 'No Website' as any;
      if (websiteUrl) {
        try {
          websiteStatus = await checkWebsiteHealth(websiteUrl);
        } catch {
          websiteStatus = 'Reachable (status unverified)';
        }
      }

      leads.push({
        id: `apify_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
        title: item.title || item.name || '',
        contactPerson: item.ownerName || '',
        phone: formattedPhone,
        whatsapp: formattedPhone,
        email: item.email || item.emails?.[0] || '',
        website: websiteUrl,
        websiteStatus,
        address: item.address || item.street || `${params.city}, Pakistan`,
        city: item.city || params.city,
        country: 'Pakistan',
        category: item.categoryName || item.category || params.query,
        rating: item.totalScore || item.rating || undefined,
        reviewsCount: item.reviewsCount || item.userRatingsTotal || undefined,
        source: params.platform,
        projectTag: params.projectTag,
        outreachStatus: 'New',
        createdAt: new Date().toISOString()
      });
    }

    return leads;

  } catch (error: any) {
    console.error('Apify Scraper Error:', error);
    throw new Error(`Scraping failed: ${error.message}`);
  }
};

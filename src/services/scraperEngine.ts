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
  const secretToken = localStorage.getItem('access_token') || '';

  if (!token.trim()) {
    // No token — return empty. The UI will show a configuration prompt.
    return [];
  }

  // Real Apify Google Maps Scraper API call
  const searchQuery = `${params.query} in ${params.city}, Pakistan`;

  try {
    const webhookUrl = `https://leads-globetrek.pages.dev/api/apify-webhook?secret=${encodeURIComponent(secretToken)}&projectTag=${encodeURIComponent(params.projectTag)}&city=${encodeURIComponent(params.city)}&query=${encodeURIComponent(params.query)}&platform=${encodeURIComponent(params.platform)}&apifyToken=${encodeURIComponent(token.trim())}`;

    // Call the ASYNC run endpoint to avoid 5-minute HTTP timeouts
    const response = await fetch(
      `https://api.apify.com/v2/actors/compass~crawler-google-places/runs?token=${encodeURIComponent(token.trim())}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchStringsArray: [searchQuery],
          maxCrawledPlacesPerSearch: params.count,
          language: 'en',
          extractEmail: true,
          webhooks: [
            {
              eventTypes: ['ACTOR.RUN.SUCCEEDED'],
              requestUrl: webhookUrl
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Apify API returned ${response.status}: ${errText}`);
    }

    const runData = await response.json() as any;
    const runId = runData.data?.id || '';

    // Return a special single lead representing the asynchronous trigger success
    return [
      {
        id: 'async_trigger_success',
        title: runId, // Pass the runId in title so UI can show it
        contactPerson: '',
        phone: '',
        whatsapp: '',
        email: '',
        website: '',
        address: '',
        city: params.city,
        country: 'Pakistan',
        category: params.query,
        source: params.platform,
        projectTag: params.projectTag,
        outreachStatus: 'New',
        createdAt: new Date().toISOString()
      }
    ];

  } catch (error: any) {
    console.error('Apify Scraper Trigger Error:', error);
    throw new Error(`Scraping trigger failed: ${error.message}`);
  }
};

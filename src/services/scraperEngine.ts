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

// City sub-zones to ensure deep geographic grid coverage across Pakistan
const CITY_MAJOR_ZONES: Record<string, string[]> = {
  karachi: ['Saddar', 'Clifton', 'DHA', 'Gulshan-e-Iqbal', 'PECHS', 'North Nazimabad', 'Gulberg', 'Bahria Town Karachi'],
  lahore: ['Gulberg', 'DHA', 'Johar Town', 'Mall Road', 'Model Town', 'Allama Iqbal Town', 'Bahria Town Lahore', 'Faisal Town'],
  islamabad: ['Blue Area', 'F-6', 'F-7', 'F-10', 'G-9', 'G-11', 'E-11', 'I-8', 'Bahria Town Islamabad'],
  rawalpindi: ['Saddar', 'Satellite Town', 'Murree Road', 'Bahria Town Rawalpindi', 'Peshawar Road', 'Chaklala Scheme 3'],
  peshawar: ['University Road', 'Saddar', 'Hayatabad', 'City Center', 'Gulbahar'],
  multan: ['Cantonment', 'Gulgasht Colony', 'Bosan Road', 'Nishtar Road', 'Shah Rukn-e-Alam'],
  faisalabad: ['D Ground', 'Peoples Colony', 'Satyana Road', 'Jail Road', 'Clock Tower Bazar'],
  quetta: ['Jinnah Road', 'Zarghoon Road', 'Cantonment', 'Airport Road', 'Model Town']
};

export const getExpandedSearchQueries = (query: string, city: string, count: number): string[] => {
  // Clean redundant city strings if user typed city inside query
  const cleanCity = city.trim();
  const cleanQuery = query.replace(new RegExp(`in\\s+${cleanCity}`, 'gi'), '').replace(new RegExp(cleanCity, 'gi'), '').trim() || query.trim();
  
  const baseQuery = `${cleanQuery} in ${cleanCity}, Pakistan`;
  if (count <= 25) {
    return [baseQuery];
  }

  const cityKey = cleanCity.toLowerCase();
  const zones = CITY_MAJOR_ZONES[cityKey] || [];
  
  if (zones.length === 0) {
    return [
      baseQuery,
      `${cleanQuery} in Center ${cleanCity}, Pakistan`,
      `${cleanQuery} near ${cleanCity}, Pakistan`
    ];
  }

  // Generate multi-zone queries to extract deep listings across the entire metropolitan area
  const zoneQueries = zones.slice(0, count >= 100 ? 8 : 4).map(z => `${cleanQuery} in ${z}, ${cleanCity}, Pakistan`);
  return [baseQuery, ...zoneQueries];
};

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

  // Real Apify Google Maps Scraper API call with multi-zone expansion
  const searchQueries = getExpandedSearchQueries(params.query, params.city, params.count);
  const placesPerSearch = Math.max(15, Math.ceil(params.count / searchQueries.length));

  try {
    const webhookUrl = `https://leads-globetrek.pages.dev/api/apify-webhook?secret=${encodeURIComponent(secretToken)}&projectTag=${encodeURIComponent(params.projectTag)}&city=${encodeURIComponent(params.city)}&query=${encodeURIComponent(params.query)}&platform=${encodeURIComponent(params.platform)}&apifyToken=${encodeURIComponent(token.trim())}`;

    // Call the ASYNC run endpoint to avoid 5-minute HTTP timeouts
    const response = await fetch(
      `https://api.apify.com/v2/actors/compass~crawler-google-places/runs?token=${encodeURIComponent(token.trim())}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchStringsArray: searchQueries,
          locationQuery: `${params.city}, Pakistan`,
          maxCrawledPlacesPerSearch: placesPerSearch,
          language: 'en',
          extractEmail: true,
          allPlacesNoSearch: false,
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

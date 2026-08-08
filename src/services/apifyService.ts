import { Lead, ApifyConfig, ProjectTag } from '../types/scraper';
import { formatPakistanPhone } from './whatsappService';

export interface ApifyRunResult {
  runId: string;
  actorId: string;
  status: string;
  datasetId: string;
  items: any[];
}

export const runApifyGoogleMapsScraper = async (
  token: string,
  searchTerms: string[],
  city: string,
  maxCrawledPlaces: number = 20,
  projectTag: ProjectTag = 'Dreamstay'
): Promise<Lead[]> => {
  if (!token) {
    throw new Error('Apify API Token is required');
  }

  // Combine search term with Pakistan city
  const queries = searchTerms.map(term => `${term} in ${city}, Pakistan`);
  
  const actorId = 'compass~crawler-google-places';
  const url = `https://api.apify.com/v2/actors/${actorId}/runs?token=${encodeURIComponent(token.trim())}`;

  const payload = {
    searchStringsArray: queries,
    locationQuery: `${city}, Pakistan`,
    maxCrawledPlacesPerSearch: maxCrawledPlaces,
    language: 'en',
    extractEmail: true,
    allPlacesNoSearch: false
  };

  try {
    const runResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!runResponse.ok) {
      const errText = await runResponse.text();
      throw new Error(`Apify Actor Run Failed (${runResponse.status}): ${errText}`);
    }

    const runData = await runResponse.json();
    const datasetId = runData.data?.defaultDatasetId;
    const runId = runData.data?.id;

    if (!datasetId) {
      throw new Error('No dataset ID returned from Apify');
    }

    // Wait a brief moment & fetch dataset items (or return direct items)
    const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(token.trim())}`;
    
    // Poll dataset — Apify runs take 30-60s, so poll up to 12 times (60s total)
    let items: any[] = [];
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const res = await fetch(datasetUrl);
      if (res.ok) {
        items = await res.json();
        if (items.length > 0) break;
      }
    }

    return mapApifyItemsToLeads(items, city, projectTag, runId);
  } catch (error: any) {
    console.error('Apify API Call Error:', error);
    throw error;
  }
};

/**
 * Fetch dataset items from an existing Apify Actor Run ID.
 * This runs at ZERO compute cost (useful for loading large historical runs).
 */
export const fetchApifyDatasetByRunId = async (
  token: string,
  runId: string,
  city: string,
  projectTag: ProjectTag
): Promise<Lead[]> => {
  if (!token) throw new Error('Apify API Token is required');
  if (!runId) throw new Error('Run ID is required');

  const runUrl = `https://api.apify.com/v2/actor-runs/${runId.trim()}?token=${encodeURIComponent(token.trim())}`;
  const runRes = await fetch(runUrl);
  if (!runRes.ok) {
    throw new Error(`Failed to find Apify Run ID "${runId}". Check your token and Run ID.`);
  }
  const runData = await runRes.json();
  const datasetId = runData.data?.defaultDatasetId;
  if (!datasetId) {
    throw new Error('No dataset associated with this Run ID.');
  }

  const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(token.trim())}`;
  const res = await fetch(datasetUrl);
  if (!res.ok) {
    throw new Error('Failed to retrieve dataset items.');
  }
  const items = await res.json();
  return mapApifyItemsToLeads(items, city, projectTag, runId);
};


export const mapApifyItemsToLeads = (
  items: any[],
  city: string,
  projectTag: ProjectTag,
  runId?: string
): Lead[] => {
  return items.map((item, index) => {
    const rawPhone = item.phone || item.phoneNumber || item.phoneUnformatted || '';
    const formattedPhone = formatPakistanPhone(rawPhone);
    
    return {
      id: `apify_${runId || 'run'}_${index}_${Date.now()}`,
      title: item.title || item.name || item.businessName || 'Pakistan Business',
      contactPerson: item.ownerName || item.managerName || '',
      phone: formattedPhone || rawPhone || '',
      whatsapp: formattedPhone || rawPhone || '',
      email: item.email || item.contactEmail || item.emails?.[0] || '',
      website: item.website || item.url || '',
      address: item.address || item.street || `${city}, Pakistan`,
      city: item.city || city,
      country: 'Pakistan',
      category: item.categoryName || item.category || 'Hospitality / Travel',
      rating: item.totalScore || item.rating || undefined,
      reviewsCount: item.reviewsCount || item.userRatingsTotal || undefined,
      source: 'Apify Cloud',
      projectTag: projectTag,
      outreachStatus: 'New',
      apifyRunId: runId,
      createdAt: new Date().toISOString()
    };
  });
};

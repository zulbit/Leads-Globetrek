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
    const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(token.trim())}&limit=10000`;
    
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

  const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(token.trim())}&limit=10000`;
  const res = await fetch(datasetUrl);
  if (!res.ok) {
    throw new Error('Failed to retrieve dataset items.');
  }
  const items = await res.json();
  return mapApifyItemsToLeads(items, city, projectTag, runId);
};


export interface ScrapeRunRecord {
  runId: string;
  platform: string;
  query: string;
  city: string;
  count: number;
  projectTag: ProjectTag;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTED' | 'TIMED-OUT';
  createdAt: string;
  datasetId?: string;
  leadCount?: number;
}

export const getLocalRunHistory = (): ScrapeRunRecord[] => {
  try {
    const raw = localStorage.getItem('pk_recent_scraper_runs');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load local run history', e);
  }
  return [];
};

export const saveLocalRunRecord = (record: ScrapeRunRecord): void => {
  try {
    const existing = getLocalRunHistory();
    const filtered = existing.filter(r => r.runId !== record.runId);
    const updated = [record, ...filtered].slice(0, 30); // Keep last 30 runs
    localStorage.setItem('pk_recent_scraper_runs', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save run record', e);
  }
};

export const updateLocalRunStatus = (runId: string, status: ScrapeRunRecord['status'], leadCount?: number): void => {
  try {
    const existing = getLocalRunHistory();
    const updated = existing.map(r => r.runId === runId ? { ...r, status, leadCount: leadCount ?? r.leadCount } : r);
    localStorage.setItem('pk_recent_scraper_runs', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to update run status', e);
  }
};

/**
 * Fetch list of recent actor runs directly from Apify's API
 */
export const getRecentApifyRuns = async (token: string, limit = 15): Promise<any[]> => {
  if (!token) return [];
  try {
    const res = await fetch(`https://api.apify.com/v2/actor-runs?token=${encodeURIComponent(token.trim())}&limit=${limit}&desc=true`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data?.items || [];
  } catch (err) {
    console.error('Failed to fetch recent Apify runs', err);
    return [];
  }
};

/**
 * Automatically polls Apify run status until completion and immediately returns all extracted leads.
 */
export const pollAndFetchApifyRun = async (
  token: string,
  runId: string,
  city: string,
  projectTag: ProjectTag,
  onProgress?: (status: string, elapsedSeconds: number) => void
): Promise<Lead[]> => {
  if (!token) throw new Error('Apify API Token is required');
  if (!runId) throw new Error('Run ID is required');

  const runUrl = `https://api.apify.com/v2/actor-runs/${runId.trim()}?token=${encodeURIComponent(token.trim())}`;
  
  const startTime = Date.now();
  const maxWaitMs = 180000; // 3 minutes max polling
  const pollIntervalMs = 4000; // Poll every 4 seconds

  while (Date.now() - startTime < maxWaitMs) {
    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
    
    try {
      const res = await fetch(runUrl);
      if (!res.ok) {
        throw new Error(`Apify status check failed (${res.status})`);
      }
      const data = await res.json();
      const status = data.data?.status;
      const datasetId = data.data?.defaultDatasetId;

      if (onProgress) {
        onProgress(status || 'RUNNING', elapsedSeconds);
      }

      if (status === 'SUCCEEDED') {
        updateLocalRunStatus(runId, 'SUCCEEDED');
        if (!datasetId) throw new Error('No dataset ID returned for succeeded run');
        const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(token.trim())}&limit=10000`;
        const datasetRes = await fetch(datasetUrl);
        if (!datasetRes.ok) throw new Error('Failed to retrieve dataset items');
        const items = await datasetRes.json();
        const leads = mapApifyItemsToLeads(items, city, projectTag, runId);
        updateLocalRunStatus(runId, 'SUCCEEDED', leads.length);
        return leads;
      }

      if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        updateLocalRunStatus(runId, status as any);
        throw new Error(`Apify run ended with status: ${status}`);
      }
    } catch (err: any) {
      if (err.message.includes('ended with status')) throw err;
      console.warn('Polling check error, retrying...', err);
    }

    await new Promise(r => setTimeout(r, pollIntervalMs));
  }

  updateLocalRunStatus(runId, 'TIMED-OUT');
  throw new Error('Apify run polling timed out after 3 minutes. You can sync it anytime using the Run ID.');
};

export const normalizeCityName = (cityStr: string): string => {
  if (!cityStr) return 'Other';
  const c = cityStr.trim();
  const lower = c.toLowerCase();
  if (lower.includes('islamabad') || lower.includes('islambad') || lower === 'isl' || lower.includes('capital territory')) return 'Islamabad';
  if (lower.includes('rawalpindi') || lower.includes('pindi') || lower.includes('rwalpindi')) return 'Rawalpindi';
  if (lower.includes('lahore') || lower.includes('lhr')) return 'Lahore';
  if (lower.includes('karachi') || lower.includes('khi')) return 'Karachi';
  if (lower.includes('abbottabad') || lower.includes('abbotabad')) return 'Abbottabad';
  if (lower.includes('peshawar')) return 'Peshawar';
  if (lower.includes('quetta')) return 'Quetta';
  if (lower.includes('multan')) return 'Multan';
  if (lower.includes('faisalabad')) return 'Faisalabad';
  if (lower.includes('naran') || lower.includes('kaghan')) return 'Naran';
  if (lower.includes('murree')) return 'Murree';
  if (lower.includes('hunza')) return 'Hunza';
  if (lower.includes('skardu')) return 'Skardu';
  if (lower.includes('gilgit')) return 'Gilgit';
  if (lower.includes('swat')) return 'Swat';
  return c.charAt(0).toUpperCase() + c.slice(1);
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
    
    // Normalize city fallback
    let detectedCity = item.city || '';
    if (!detectedCity || detectedCity.toLowerCase() === 'isl' || detectedCity.toLowerCase().includes('islamabad') || detectedCity.toLowerCase().includes('islambad') || detectedCity.toLowerCase().includes('capital territory')) {
      detectedCity = city && city.toLowerCase() !== 'all' ? city : 'Islamabad';
    } else if (city && city.toLowerCase() !== 'all' && !detectedCity) {
      detectedCity = city;
    }
    detectedCity = normalizeCityName(detectedCity);

    return {
      id: `apify_${runId || 'run'}_${index}_${Date.now()}`,
      title: item.title || item.name || item.businessName || 'Pakistan Business',
      contactPerson: item.ownerName || item.managerName || '',
      phone: formattedPhone || rawPhone || '',
      whatsapp: formattedPhone || rawPhone || '',
      email: item.email || item.contactEmail || item.emails?.[0] || '',
      website: item.website || item.url || '',
      address: item.address || item.street || `${detectedCity}, Pakistan`,
      city: detectedCity,
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


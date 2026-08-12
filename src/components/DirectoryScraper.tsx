import React, { useState } from 'react';
import { Lead, ProjectTag } from '../types/scraper';
import { scrapeLeadsEngine } from '../services/scraperEngine';
import { saveLocalRunRecord, pollAndFetchApifyRun, fetchApifyDatasetByRunId } from '../services/apifyService';
import { Building2, Sparkles, Loader2, Database, ExternalLink, CheckCircle2, MapPin, Download, AlertCircle } from 'lucide-react';

interface DirectoryScraperProps {
  activeProject: ProjectTag;
  onLeadsScraped: (leads: Lead[]) => void;
  onLogScraperTask?: (query: string, city: string, platform: string) => void;
}

const PAKISTAN_CITIES = [
  'Abbottabad', 'Ayubia', 'Bahawalpur', 'Chitral', 'Dir', 'Faisalabad', 'Gilgit', 'Gujranwala', 'Gujrat', 
  'Hunza', 'Hyderabad', 'Islamabad', 'Jhang', 'Kaghan', 'Karachi', 'Lahore', 'Larkana', 'Malakand', 'Malam Jabba', 
  'Multan', 'Murree', 'Naran', 'Nathia Gali', 'Peshawar', 'Quetta', 'Rahim Yar Khan', 'Rawalpindi', 
  'Sahiwal', 'Sargodha', 'Sheikhupura', 'Shogran', 'Sialkot', 'Skardu', 'Sukkur', 'Swat'
];

export const DirectoryScraper: React.FC<DirectoryScraperProps> = ({
  activeProject,
  onLeadsScraped,
  onLogScraperTask
}) => {
  const [directory, setDirectory] = useState('PakBiz Directory');
  const [city, setCity] = useState('Islamabad');
  const [query, setQuery] = useState(activeProject === 'Dreamstay' ? 'Guest Houses & Hotels' : 'Travel Agencies & Tour Operators');
  const [isScraping, setIsScraping] = useState(false);
  const [pollStatus, setPollStatus] = useState<string>('');
  const [isManualFetching, setIsManualFetching] = useState(false);
  const [scrapedLeads, setScrapedLeads] = useState<Lead[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeSuccess, setScrapeSuccess] = useState<{ runId: string; city: string; query: string; count: number } | null>(null);

  const handleScrapeDirectory = async () => {
    setIsScraping(true);
    setSuccessMsg('');
    setScrapeError(null);
    setScrapeSuccess(null);
    setPollStatus(`🚀 Dispatching ${directory} scrape to Apify Cloud...`);

    try {
      const platformName = directory === 'PakBiz Directory' ? 'PakBiz Directory' : 'YellowPages PK';
      const token = localStorage.getItem('apify_api_token') || '';
      const leads = await scrapeLeadsEngine({
        platform: platformName,
        query,
        city,
        count: 12,
        projectTag: activeProject,
        apifyToken: token
      });
      
      if (leads.length === 0) {
        setScrapeError('No results. Please configure your Apify API token in the Apify Cloud tab to scrape real leads.');
        setIsScraping(false);
        return;
      }

      if (leads[0]?.id === 'async_trigger_success') {
        const runId = leads[0].title;
        setScrapeSuccess({
          runId,
          city,
          query,
          count: 12
        });

        // Save to local run history
        saveLocalRunRecord({
          runId,
          platform: platformName,
          query,
          city,
          count: 12,
          projectTag: activeProject,
          status: 'RUNNING',
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        if (onLogScraperTask) {
          onLogScraperTask(query, city, `${platformName} (Run ID: ${runId})`);
        }

        // Auto-polling
        if (token) {
          setPollStatus(`⏳ Extracting ${directory} leads in the cloud...`);
          try {
            const extractedLeads = await pollAndFetchApifyRun(
              token,
              runId,
              city,
              activeProject,
              (status, elapsed) => {
                setPollStatus(`🔍 Apify status: ${status} (${elapsed}s elapsed)...`);
              }
            );

            if (extractedLeads.length > 0) {
              setScrapedLeads(extractedLeads);
              onLeadsScraped(extractedLeads);
              setSuccessMsg(`Extracted ${extractedLeads.length} verified leads from ${directory} (${city})!`);
            }
          } catch (pollErr: any) {
            console.warn('Auto-polling notice:', pollErr.message);
            setPollStatus(`Run dispatched (${runId}). Click "Fetch Leads Now" to sync.`);
          }
        }
      } else {
        setScrapedLeads(leads);
        onLeadsScraped(leads);
        setSuccessMsg(`Extracted ${leads.length} verified leads from ${directory} (${city}) for ${activeProject}!`);
      }
    } catch (err: any) {
      setScrapeError(err.message || 'Scraping failed. Check your Apify API token.');
      console.error(err);
    } finally {
      setIsScraping(false);
    }
  };

  const handleManualFetchRun = async (runId: string) => {
    const token = localStorage.getItem('apify_api_token') || '';
    if (!token) {
      setScrapeError('Please save your Apify API Token first in the Apify Cloud tab.');
      return;
    }

    setIsManualFetching(true);
    setScrapeError(null);
    try {
      const leads = await fetchApifyDatasetByRunId(token, runId, city, activeProject);
      if (leads.length > 0) {
        setScrapedLeads(leads);
        onLeadsScraped(leads);
        setSuccessMsg(`✅ Successfully imported ${leads.length} leads from Run ID: ${runId} at $0 cost!`);
      } else {
        setScrapeError('The run has 0 items or is still processing in Apify. Please check again in a moment.');
      }
    } catch (err: any) {
      setScrapeError(err.message || 'Failed to fetch dataset items. The run may still be in progress.');
    } finally {
      setIsManualFetching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800">
                Pakistan Local Business Directories
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">PakBiz & YellowPages PK Extractor ({activeProject})</h2>
            <p className="text-xs text-slate-400">Scrape Pakistani registered business contact details from national online yellow pages.</p>
          </div>
        </div>
      </div>

      {/* Form Controls */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Directory Platform</label>
            <select
              value={directory}
              onChange={(e) => setDirectory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
            >
              <option value="PakBiz Directory">PakBiz Directory (PakBiz.com)</option>
              <option value="YellowPages PK">YellowPages Pakistan (YellowPages.com.pk)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Search Keywords</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Tour Operator, Car Rental"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" /> Target Pakistan City
            </label>
            <input
              type="text"
              list="directory-cities"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Type or select a city..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500 font-medium"
            />
            <datalist id="directory-cities">
              {PAKISTAN_CITIES.map(c => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>

        <button
          onClick={handleScrapeDirectory}
          disabled={isScraping}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-extrabold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
        >
          {isScraping ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Scraping {directory}...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" /> Scrape {directory} ({city})
            </>
          )}
        </button>

        {/* Live Auto-Polling Progress Bar */}
        {isScraping && pollStatus && (
          <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-4 shadow-lg flex items-center gap-3 text-xs text-amber-300 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400 shrink-0" />
            <div className="flex-1 font-mono">{pollStatus}</div>
          </div>
        )}

        {/* Asynchronous Trigger Success Card */}
        {scrapeSuccess && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 animate-pulse">
                <CheckCircle2 className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-1 text-xs">
                <h4 className="text-xs font-bold text-white">🚀 Scraper Task Dispatched to Apify Cloud!</h4>
                <p className="text-emerald-300 font-medium">
                  Extraction of <strong>{directory}</strong> leads for <strong>"{scrapeSuccess.query}"</strong> in <strong>{scrapeSuccess.city}</strong>.
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                  <span>• <strong>Run ID:</strong> <code className="text-slate-200 bg-slate-950 px-1.5 py-0.5 rounded text-[9px] font-mono">{scrapeSuccess.runId}</code></span>
                  <span>• <strong>Auto-Stream:</strong> Active</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleManualFetchRun(scrapeSuccess.runId)}
              disabled={isManualFetching}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all shrink-0 disabled:opacity-50"
            >
              {isManualFetching ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching Dataset...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" /> Fetch Leads Now ($0)
                </>
              )}
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Error / No Token Banner */}
      {scrapeError && (
        <div className="bg-red-950/60 border border-red-700/50 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-400 text-lg mt-0.5">⚠️</span>
          <div>
            <p className="text-red-300 text-sm font-semibold">Scraping Issue</p>
            <p className="text-red-400/80 text-xs mt-1">{scrapeError}</p>
            <p className="text-slate-400 text-xs mt-2">Go to <strong>Apify Cloud</strong> tab → enter your API token → then scrape from any tab.</p>
          </div>
        </div>
      )}

      {/* Results Grid Display */}
      {scrapedLeads.length > 0 && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">Directory Leads Extracted ({scrapedLeads.length})</h3>
            </div>
            <span className="text-xs text-emerald-400 font-semibold">Added to Active Database & Ready for Outreach</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scrapedLeads.map((lead) => (
              <div key={lead.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-amber-500/50 space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-white text-sm truncate">{lead.title}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                    {lead.source}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{lead.category} • {lead.city}</p>
                <div className="pt-2 text-xs font-mono text-teal-400 font-semibold border-t border-slate-800 flex justify-between items-center">
                  <span>{lead.whatsapp || lead.phone}</span>
                  {lead.websiteStatus === 'Active (200 OK)' ? (
                    <a href={lead.website} target="_blank" rel="noreferrer" className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 hover:bg-emerald-900">
                      🌐 Verified (200 OK) <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : lead.websiteStatus === 'Reachable (status unverified)' ? (
                    <a href={lead.website} target="_blank" rel="noreferrer" className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-950 text-yellow-300 border border-yellow-800 flex items-center gap-1 hover:bg-yellow-900">
                      🔗 Reachable (unverified) <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : lead.websiteStatus === 'Broken (404 Error)' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-800 flex items-center gap-1">
                      ❌ Broken (404)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                      ⚠️ No Website
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

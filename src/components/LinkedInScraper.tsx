import React, { useState } from 'react';
import { Lead, ProjectTag } from '../types/scraper';
import { scrapeLeadsEngine } from '../services/scraperEngine';
import { saveLocalRunRecord, pollAndFetchApifyRun, fetchApifyDatasetByRunId } from '../services/apifyService';
import { Linkedin, Search, Sparkles, Loader2, UserCheck, MapPin, CheckCircle2, Download, AlertCircle } from 'lucide-react';

interface LinkedInScraperProps {
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

export const LinkedInScraper: React.FC<LinkedInScraperProps> = ({
  activeProject,
  onLeadsScraped,
  onLogScraperTask
}) => {
  const [role, setRole] = useState(activeProject === 'Dreamstay' ? 'Hotel Manager' : 'Tour Director');
  const [city, setCity] = useState('Lahore');
  const [isScraping, setIsScraping] = useState(false);
  const [pollStatus, setPollStatus] = useState<string>('');
  const [isManualFetching, setIsManualFetching] = useState(false);
  const [results, setResults] = useState<Lead[]>([]);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeSuccess, setScrapeSuccess] = useState<{ runId: string; city: string; query: string; count: number } | null>(null);

  const handleScrapeLinkedIn = async () => {
    setIsScraping(true);
    setScrapeError(null);
    setScrapeSuccess(null);
    setPollStatus('🚀 Dispatching LinkedIn query to Apify Cloud...');

    try {
      const queryStr = `${role} in ${city}`;
      const token = localStorage.getItem('apify_api_token') || '';
      const leads = await scrapeLeadsEngine({
        platform: 'LinkedIn Profile',
        query: queryStr,
        city,
        count: 10,
        projectTag: activeProject,
        apifyToken: token
      });

      if (leads.length === 0) {
        setScrapeError('No results. Please configure your Apify API token in the Apify Cloud tab.');
        setIsScraping(false);
        return;
      }

      if (leads[0]?.id === 'async_trigger_success') {
        const runId = leads[0].title;
        setScrapeSuccess({
          runId,
          city,
          query: queryStr,
          count: 10
        });

        // Save to local run history
        saveLocalRunRecord({
          runId,
          platform: 'LinkedIn Profile',
          query: queryStr,
          city,
          count: 10,
          projectTag: activeProject,
          status: 'RUNNING',
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        if (onLogScraperTask) {
          onLogScraperTask(queryStr, city, `LinkedIn Profile (Run ID: ${runId})`);
        }

        // Auto-polling
        if (token) {
          setPollStatus(`⏳ Extracting LinkedIn profiles in the cloud...`);
          try {
            const extractedLeads = await pollAndFetchApifyRun(
              token,
              runId,
              city,
              activeProject,
              (status, elapsed) => {
                setPollStatus(`🔍 Apify LinkedIn status: ${status} (${elapsed}s elapsed)...`);
              }
            );

            if (extractedLeads.length > 0) {
              setResults(extractedLeads);
              onLeadsScraped(extractedLeads);
            }
          } catch (pollErr: any) {
            console.warn('Auto-polling notice:', pollErr.message);
            setPollStatus(`Run dispatched (${runId}). Click "Fetch Leads Now" to sync.`);
          }
        }
      } else {
        setResults(leads);
        onLeadsScraped(leads);
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
        setResults(leads);
        onLeadsScraped(leads);
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
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Linkedin className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950 text-blue-300 border border-blue-800">
                LinkedIn Profiles & Decision Makers
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">LinkedIn Business Leads ({activeProject})</h2>
            <p className="text-xs text-slate-400">Target Hoteliers, Guest House Owners, Tour Agency Directors & Travel Managers across Pakistan.</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Target Professional Role / Keywords</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Hotel Manager, Tour Operator Founder"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-400" /> Location (Pakistan City)
            </label>
            <input
              type="text"
              list="linkedin-cities"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Type or select a city..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 font-medium"
            />
            <datalist id="linkedin-cities">
              {PAKISTAN_CITIES.map(c => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>

        <button
          onClick={handleScrapeLinkedIn}
          disabled={isScraping}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-extrabold text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
        >
          {isScraping ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Extracting LinkedIn Profiles...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" /> Scrape LinkedIn Profiles ({role} in {city})
            </>
          )}
        </button>

        {/* Live Auto-Polling Progress Bar */}
        {isScraping && pollStatus && (
          <div className="bg-slate-950 border border-blue-500/40 rounded-2xl p-4 shadow-lg flex items-center gap-3 text-xs text-blue-300 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400 shrink-0" />
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
                  Extraction of <strong>LinkedIn profiles</strong> for <strong>"{role}"</strong> in <strong>{scrapeSuccess.city}</strong>.
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

        {scrapeError && (
          <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{scrapeError}</span>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
          <h3 className="font-bold text-white text-base">Extracted LinkedIn Profiles ({results.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((lead) => (
              <div key={lead.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-400" />
                    <h4 className="font-bold text-white text-sm">{lead.contactPerson || 'Decision Maker'}</h4>
                  </div>
                  <p className="text-xs text-slate-400">{lead.title} • {lead.city}</p>
                  <p className="text-xs font-mono text-teal-400">{lead.whatsapp}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  LinkedIn Verified
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Lead, ApifyConfig, ProjectTag } from '../types/scraper';
import { runApifyGoogleMapsScraper, fetchApifyDatasetByRunId } from '../services/apifyService';
import { Bot, Key, Sparkles, MapPin, Search, CheckCircle2, AlertCircle, Loader2, Database, ExternalLink, Download } from 'lucide-react';

interface ApifyScraperProps {
  apifyConfig: ApifyConfig;
  setApifyConfig: (cfg: ApifyConfig) => void;
  activeProject: ProjectTag;
  onLeadsScraped: (newLeads: Lead[]) => void;
  onLogScraperTask?: (query: string, city: string, platform: string) => void;
}

const PAKISTAN_CITIES = [
  'Lahore', 'Karachi', 'Islamabad', 'Murree', 'Hunza', 'Skardu', 
  'Peshawar', 'Faisalabad', 'Multan', 'Rawalpindi', 'Swat', 'Gilgit'
];

const DREAMSTAY_PRESET_TERMS = [
  'Hotels', 'Guest Houses', 'Resorts', 'Furnished Apartments', 'Boutique Stays', 'Bed and Breakfast'
];

const GLOBETREK_PRESET_TERMS = [
  'Travel Agencies', 'Tour Operators', 'Trekking Clubs', 'Adventure Tourism', 'Corporate Travel Agency', 'Car Rental Services'
];

export const ApifyScraper: React.FC<ApifyScraperProps> = ({
  apifyConfig,
  setApifyConfig,
  activeProject,
  onLeadsScraped,
  onLogScraperTask
}) => {
  const [apiToken, setApiToken] = useState(apifyConfig.apiToken || '');
  const [displayName, setDisplayName] = useState(apifyConfig.displayName || 'ZulCodex\'s Apify');
  const [selectedCity, setSelectedCity] = useState('Lahore');
  const [selectedTerm, setSelectedTerm] = useState(activeProject === 'Dreamstay' ? 'Guest Houses' : 'Tour Operators');
  const [maxPlaces, setMaxPlaces] = useState(25);
  const [selectedActor, setSelectedActor] = useState('compass/crawler-google-places');
  const [isScraping, setIsScraping] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [scrapedResults, setScrapedResults] = useState<Lead[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [pastRunId, setPastRunId] = useState('');
  const [isSyncingPastRun, setIsSyncingPastRun] = useState(false);

  const activePresets = activeProject === 'Dreamstay' ? DREAMSTAY_PRESET_TERMS : GLOBETREK_PRESET_TERMS;

  const handleSaveConfig = () => {
    const trimmedToken = apiToken.trim();
    setApifyConfig({
      ...apifyConfig,
      apiToken: trimmedToken,
      displayName: displayName.trim()
    });
    // Persist token so all scraper tabs can access it
    if (trimmedToken) {
      localStorage.setItem('apify_api_token', trimmedToken);
    }
    alert('Apify Configuration Saved! All scraper tabs will now use this token.');
  };

  const handleStartApifyRun = async () => {
    setErrorMsg('');
    setStatusMessage('');

    if (!apiToken.trim()) {
      setErrorMsg('Please provide a valid Apify API Token (e.g. apify_api_...)');
      return;
    }

    setIsScraping(true);
    setStatusMessage(`Triggering Apify Cloud Actor [${selectedActor}] for ${selectedTerm} in ${selectedCity}, Pakistan...`);

    try {
      const leads = await runApifyGoogleMapsScraper(
        apiToken,
        [selectedTerm],
        selectedCity,
        maxPlaces,
        activeProject
      );

      setScrapedResults(leads);
      onLeadsScraped(leads);
      if (onLogScraperTask && leads.length > 0) {
        onLogScraperTask(selectedTerm, selectedCity, 'Apify Cloud');
      }
      setStatusMessage(`Successfully extracted ${leads.length} leads from Apify Cloud!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error executing Apify Actor');
    } finally {
      setIsScraping(false);
    }
  };

  const handleTestRun = async () => {
    setErrorMsg('');
    setStatusMessage('');

    if (!apiToken.trim()) {
      setErrorMsg('Please provide a valid Apify API Token first.');
      return;
    }

    setIsScraping(true);
    setStatusMessage('🧪 Testing with 1 lead — this costs ~$0.01...');

    try {
      const leads = await runApifyGoogleMapsScraper(
        apiToken,
        [selectedTerm],
        selectedCity,
        1, // Only 1 result — minimal cost
        activeProject
      );

      setScrapedResults(leads);
      onLeadsScraped(leads);
      if (leads.length > 0) {
        setStatusMessage(`✅ Token works! Got "${leads[0].title}" — real data confirmed. Ready for full scrape.`);
      } else {
        setStatusMessage('⚠️ Actor ran but returned 0 results. Try a different search term or city.');
      }
    } catch (err: any) {
      setErrorMsg(`Test failed: ${err.message}`);
    } finally {
      setIsScraping(false);
    }
  };

  const handleSyncPastRun = async () => {
    if (!apiToken.trim()) {
      setErrorMsg('Please save your Apify API Token first before importing past runs.');
      return;
    }
    if (!pastRunId.trim()) {
      setErrorMsg('Please enter a valid Apify Run ID.');
      return;
    }

    setIsSyncingPastRun(true);
    setErrorMsg('');
    setStatusMessage('📥 Syncing past run dataset items...');

    try {
      const leads = await fetchApifyDatasetByRunId(
        apiToken,
        pastRunId,
        selectedCity,
        activeProject
      );

      setScrapedResults(leads);
      onLeadsScraped(leads);
      if (onLogScraperTask && leads.length > 0) {
        onLogScraperTask(`Import Dataset (Run: ${pastRunId})`, selectedCity, 'Apify Import');
      }
      setStatusMessage(`✅ Loaded ${leads.length} leads from Run ID: ${pastRunId} at $0 cost!`);
      setPastRunId('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to retrieve dataset items from Run ID.');
    } finally {
      setIsSyncingPastRun(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-950 text-teal-300 border border-teal-800">
                Apify Cloud Integration
              </span>
              <span className="text-xs text-slate-400">Enterprise Actor Runner</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">Apify Web Scraper for {activeProject}</h2>
            <p className="text-xs text-slate-400">Run enterprise Google Maps & LinkedIn Actors with proxy rotation across Pakistan.</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
          <Key className="w-4 h-4 text-amber-400" />
          <span className="text-slate-400">Connected Token:</span>
          <strong className="text-teal-400 font-mono">
            {apiToken ? `${apiToken.slice(0, 10)}...` : 'Not Set'}
          </strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Apify Connection Credentials Card */}
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-teal-400" />
              <h3 className="font-bold text-white text-sm">Apify Connection Settings</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
              Active Connection
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. ZulCodex's Apify"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Apify API Token</label>
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="apify_api_xxxxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-teal-300 font-mono text-xs focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              onClick={handleSaveConfig}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-teal-400" /> Save Apify Connection
            </button>
          </div>
        </div>

        {/* Sync Past Run ID Card (Free!) */}
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-teal-400" />
              <h3 className="font-bold text-white text-sm">Sync Past Run ID</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 animate-pulse">
              $0 Credit Cost
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <p className="text-[11px] text-slate-400 leading-normal">
              Already ran a scrape on the Apify console? Paste the <strong>Run ID</strong> (from the Apify URL or runs table) to load the results for free.
            </p>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Apify Run ID</label>
              <input
                type="text"
                value={pastRunId}
                onChange={(e) => setPastRunId(e.target.value)}
                placeholder="e.g. 0kLILXg6cM... (Paste here)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              onClick={handleSyncPastRun}
              disabled={isSyncingPastRun}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSyncingPastRun ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Fetching Dataset...
                </>
              ) : (
                <>
                  📥 Load Dataset Items ($0)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Apify Actor Scraper Config Card */}
        <div className="lg:col-span-2 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-base">Launch Apify Scraper Task</h3>
              <p className="text-xs text-slate-400">Targeting Pakistan Businesses for {activeProject}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-950/80 text-orange-400 border border-orange-800">
              {activeProject} Mode
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Target City Selector */}
            <div>
              <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-teal-400" /> Target Pakistan City
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500"
              >
                {PAKISTAN_CITIES.map(c => (
                  <option key={c} value={c}>{c}, Pakistan</option>
                ))}
              </select>
            </div>

            {/* Target Search Category */}
            <div>
              <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-teal-400" /> Business Category / Niche
              </label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500"
              >
                {activePresets.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Apify Actor Type */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">Apify Cloud Actor</label>
              <select
                value={selectedActor}
                onChange={(e) => setSelectedActor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500"
              >
                <option value="compass/crawler-google-places">compass/crawler-google-places (Recommended)</option>
                <option value="apify/linkedin-profile-scraper">apify/linkedin-profile-scraper</option>
                <option value="apify/web-scraper">apify/web-scraper (Custom Domain)</option>
              </select>
            </div>

            {/* Max Items Limit */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">Max Leads Limit</label>
              <select
                value={maxPlaces}
                onChange={(e) => setMaxPlaces(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-teal-300 font-bold focus:outline-none focus:border-teal-500"
              >
                <option value={10}>10 Leads (Fast Test)</option>
                <option value={25}>25 Leads (Standard)</option>
                <option value={50}>50 Leads (Recommended)</option>
                <option value={100}>100 Leads (Batch Extraction)</option>
                <option value={250}>250 Leads (High Volume)</option>
                <option value={500}>500 Leads (Full Region Batch)</option>
                <option value={1000}>1000 Leads (Maximum Enterprise Batch)</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              onClick={handleTestRun}
              disabled={isScraping}
              className="py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all whitespace-nowrap"
            >
              🧪 Test (1 Lead)
            </button>
            <button
              onClick={handleStartApifyRun}
              disabled={isScraping}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              {isScraping ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Scraping Apify Cloud...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" /> Scrape {maxPlaces} Leads ({selectedTerm} in {selectedCity})
                </>
              )}
            </button>
          </div>

          {/* Messages & Logs */}
          {statusMessage && (
            <div className="p-3 bg-teal-950/80 border border-teal-800 rounded-xl text-teal-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Scraped Results Preview */}
      {scrapedResults.length > 0 && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-teal-400" />
              <h3 className="font-bold text-white text-base">Extracted Apify Leads ({scrapedResults.length})</h3>
            </div>
            <span className="text-xs text-emerald-400 font-semibold">Synced to DB & Ready for WhatsApp</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scrapedResults.map((lead) => (
              <div key={lead.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-teal-500/50 transition-all space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-white text-sm truncate">{lead.title}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                    {lead.rating ? `★ ${lead.rating}` : 'No Rating'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{lead.category} • {lead.city}</p>
                <div className="pt-2 text-xs font-mono text-teal-400 font-semibold border-t border-slate-800/80 flex justify-between items-center">
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

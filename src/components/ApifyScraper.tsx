import React, { useState, useEffect } from 'react';
import { Lead, ApifyConfig, ProjectTag } from '../types/scraper';
import { runApifyGoogleMapsScraper, fetchApifyDatasetByRunId, getLocalRunHistory, getRecentApifyRuns, ScrapeRunRecord, saveLocalRunRecord } from '../services/apifyService';
import { Bot, Key, Sparkles, MapPin, Search, CheckCircle2, AlertCircle, Loader2, Database, ExternalLink, Download, History, RefreshCw, Clock, Eye, EyeOff } from 'lucide-react';

interface ApifyScraperProps {
  apifyConfig: ApifyConfig;
  setApifyConfig: (cfg: ApifyConfig) => void;
  activeProject: ProjectTag;
  onLeadsScraped: (newLeads: Lead[]) => void;
  onLogScraperTask?: (query: string, city: string, platform: string) => void;
}

const PAKISTAN_CITIES = [
  'Abbottabad', 'Ayubia', 'Bahawalpur', 'Chitral', 'Dir', 'Faisalabad', 'Gilgit', 'Gujranwala', 'Gujrat', 
  'Hunza', 'Hyderabad', 'Islamabad', 'Jhang', 'Kaghan', 'Karachi', 'Lahore', 'Larkana', 'Malakand', 'Malam Jabba', 
  'Multan', 'Murree', 'Naran', 'Nathia Gali', 'Peshawar', 'Quetta', 'Rahim Yar Khan', 'Rawalpindi', 
  'Sahiwal', 'Sargodha', 'Sheikhupura', 'Shogran', 'Sialkot', 'Skardu', 'Sukkur', 'Swat'
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
  const [showApifyToken, setShowApifyToken] = useState(false);
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
  const [activeSyncingRunId, setActiveSyncingRunId] = useState<string | null>(null);
  const [recentLocalRuns, setRecentLocalRuns] = useState<ScrapeRunRecord[]>(() => getLocalRunHistory());
  const [apifyCloudRuns, setApifyCloudRuns] = useState<any[]>([]);
  const [isLoadingCloudRuns, setIsLoadingCloudRuns] = useState(false);

  const activePresets = activeProject === 'Dreamstay' ? DREAMSTAY_PRESET_TERMS : GLOBETREK_PRESET_TERMS;

  const refreshRecentRuns = async () => {
    setRecentLocalRuns(getLocalRunHistory());
    if (apiToken.trim()) {
      setIsLoadingCloudRuns(true);
      const runs = await getRecentApifyRuns(apiToken, 10);
      setApifyCloudRuns(runs);
      setIsLoadingCloudRuns(false);
    }
  };

  useEffect(() => {
    refreshRecentRuns();
  }, [apiToken]);

  const handleSaveConfig = () => {
    const trimmedToken = apiToken.trim();
    setApifyConfig({
      ...apifyConfig,
      apiToken: trimmedToken,
      displayName: displayName.trim()
    });
    if (trimmedToken) {
      localStorage.setItem('apify_api_token', trimmedToken);
    }
    refreshRecentRuns();
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
      refreshRecentRuns();
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
        1,
        activeProject
      );

      setScrapedResults(leads);
      onLeadsScraped(leads);
      if (leads.length > 0) {
        setStatusMessage(`✅ Token works! Got "${leads[0].title}" — real data confirmed. Ready for full scrape.`);
      } else {
        setStatusMessage('⚠️ Actor ran but returned 0 results. Try a different search term or city.');
      }
      refreshRecentRuns();
    } catch (err: any) {
      setErrorMsg(`Test failed: ${err.message}`);
    } finally {
      setIsScraping(false);
    }
  };

  const handleSyncPastRun = async (runIdToSync?: string) => {
    const targetRunId = (runIdToSync || pastRunId).trim();
    if (!apiToken.trim()) {
      setErrorMsg('Please save your Apify API Token first before importing past runs.');
      return;
    }
    if (!targetRunId) {
      setErrorMsg('Please enter a valid Apify Run ID.');
      return;
    }

    setIsSyncingPastRun(true);
    setActiveSyncingRunId(targetRunId);
    setErrorMsg('');
    setStatusMessage('📥 Syncing past run dataset items...');

    try {
      const leads = await fetchApifyDatasetByRunId(
        apiToken,
        targetRunId,
        selectedCity,
        activeProject
      );

      setScrapedResults(leads);
      onLeadsScraped(leads);
      if (onLogScraperTask && leads.length > 0) {
        onLogScraperTask(`Import Dataset (Run: ${targetRunId})`, selectedCity, 'Apify Import');
      }
      setStatusMessage(`✅ Successfully loaded ${leads.length} leads from Run ID: ${targetRunId} at $0 cost!`);
      setPastRunId('');
      refreshRecentRuns();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to retrieve dataset items from Run ID.');
    } finally {
      setIsSyncingPastRun(false);
      setActiveSyncingRunId(null);
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
              <div className="relative">
                <input
                  type={showApifyToken ? 'text' : 'password'}
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="apify_api_xxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 pr-10 text-teal-300 font-mono text-xs focus:outline-none focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApifyToken(!showApifyToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-md transition-colors"
                  title={showApifyToken ? 'Hide Apify API Token' : 'Show Apify API Token'}
                >
                  {showApifyToken ? (
                    <EyeOff className="w-4 h-4 text-teal-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-400 hover:text-slate-200" />
                  )}
                </button>
              </div>
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
              Select or paste any <strong>Run ID</strong> to load all its scraped leads instantly into your database for free.
            </p>

            {/* Quick Auto-Fill Selector */}
            {recentLocalRuns.length > 0 && (
              <div>
                <label className="block text-slate-400 font-medium mb-1">Quick Select Recent Run</label>
                <select
                  onChange={(e) => setPastRunId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-teal-300 font-mono text-xs focus:outline-none focus:border-teal-500"
                  defaultValue=""
                >
                  <option value="" disabled>-- Choose a recent run to auto-fill --</option>
                  {recentLocalRuns.map((r) => (
                    <option key={r.runId} value={r.runId}>
                      {r.city} • {r.platform} ({r.runId.slice(0, 10)}...)
                    </option>
                  ))}
                </select>
              </div>
            )}

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
              onClick={() => handleSyncPastRun()}
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
              <input
                type="text"
                list="apify-cities"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                placeholder="Type or select a city..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 font-medium"
              />
              <datalist id="apify-cities">
                {PAKISTAN_CITIES.map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
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

      {/* Recent Scraper Runs & Command History Section */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="font-bold text-white text-base">Recent Scraper Runs & Command History</h3>
              <p className="text-xs text-slate-400">All recent scraper commands dispatched to Apify Cloud. 1-click sync any dataset at $0 cost.</p>
            </div>
          </div>
          <button
            onClick={refreshRecentRuns}
            disabled={isLoadingCloudRuns}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCloudRuns ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {recentLocalRuns.length === 0 && apifyCloudRuns.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            <Clock className="w-6 h-6 mx-auto mb-2 text-slate-600" />
            No recent scraping commands logged yet. When you scrape Google Maps, Facebook, or LinkedIn, runs will appear here automatically.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {/* Local app recent runs */}
            {recentLocalRuns.map((run) => (
              <div key={run.runId} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-950/40 p-2 rounded-xl transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 text-xs font-bold">
                    {run.platform.includes('Facebook') ? 'FB' : run.platform.includes('LinkedIn') ? 'LI' : 'GM'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">{run.city} • {run.query}</h4>
                      <span className="text-[10px] font-mono text-slate-400">({run.platform})</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="font-mono text-teal-400 text-[11px]">{run.runId}</span>
                      <span>•</span>
                      <span>{run.createdAt}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    run.status === 'SUCCEEDED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : run.status === 'RUNNING'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}>
                    {run.status}
                  </span>

                  <button
                    onClick={() => handleSyncPastRun(run.runId)}
                    disabled={isSyncingPastRun && activeSyncingRunId === run.runId}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/10 flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {isSyncingPastRun && activeSyncingRunId === run.runId ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" /> Sync ($0)
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}

            {/* Cloud Apify Account Runs */}
            {apifyCloudRuns.filter(cr => !recentLocalRuns.some(lr => lr.runId === cr.id)).map((cr) => (
              <div key={cr.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-950/40 p-2 rounded-xl transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">
                    API
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">Apify Actor Run</h4>
                      <span className="text-[10px] font-mono text-slate-400">({cr.actId || 'Google Places'})</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="font-mono text-purple-300 text-[11px]">{cr.id}</span>
                      <span>•</span>
                      <span>{new Date(cr.startedAt).toLocaleDateString()} {new Date(cr.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    cr.status === 'SUCCEEDED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : cr.status === 'RUNNING'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}>
                    {cr.status}
                  </span>

                  <button
                    onClick={() => handleSyncPastRun(cr.id)}
                    disabled={isSyncingPastRun && activeSyncingRunId === cr.id}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/10 flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {isSyncingPastRun && activeSyncingRunId === cr.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" /> Sync ($0)
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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

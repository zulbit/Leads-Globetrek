import React, { useState } from 'react';
import { Lead, ProjectTag } from '../types/scraper';
import { scrapeLeadsEngine } from '../services/scraperEngine';
import { Building2, Sparkles, Loader2, Database, ExternalLink, CheckCircle2, MapPin } from 'lucide-react';

interface DirectoryScraperProps {
  activeProject: ProjectTag;
  onLeadsScraped: (leads: Lead[]) => void;
}

const PAKISTAN_CITIES = [
  'Islamabad', 'Lahore', 'Karachi', 'Murree', 'Skardu', 'Hunza', 
  'Peshawar', 'Rawalpindi', 'Faisalabad', 'Multan', 'Swat', 'Gilgit', 'Chitral', 'Abbottabad'
];

export const DirectoryScraper: React.FC<DirectoryScraperProps> = ({
  activeProject,
  onLeadsScraped
}) => {
  const [directory, setDirectory] = useState('PakBiz Directory');
  const [city, setCity] = useState('Islamabad');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedLeads, setScrapedLeads] = useState<Lead[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  const handleScrapeDirectory = async () => {
    setIsScraping(true);
    setSuccessMsg('');
    setScrapeError(null);
    try {
      const leads = await scrapeLeadsEngine({
        platform: directory === 'PakBiz Directory' ? 'PakBiz Directory' : 'YellowPages PK',
        query: activeProject === 'Dreamstay' ? 'Hotels & Guest Houses' : 'Tourism & Travel Services',
        city,
        count: 12,
        projectTag: activeProject
      });
      
      setScrapedLeads(leads);
      onLeadsScraped(leads);
      if (leads.length === 0) {
        setScrapeError('No results. Please configure your Apify API token in the Apify Cloud tab to scrape real leads.');
      } else {
        setSuccessMsg(`Extracted ${leads.length} verified leads from ${directory} (${city}) for ${activeProject}!`);
      }
    } catch (err: any) {
      setScrapeError(err.message || 'Scraping failed. Check your Apify API token.');
      console.error(err);
    } finally {
      setIsScraping(false);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
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
            <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" /> Target Pakistan City Dropdown
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
            >
              {PAKISTAN_CITIES.map(c => (
                <option key={c} value={c}>{c}, Pakistan</option>
              ))}
            </select>
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

import React, { useState } from 'react';
import { Lead, LeadSource, ProjectTag } from '../types/scraper';
import { scrapeLeadsEngine } from '../services/scraperEngine';
import { MapPin, Search, Sparkles, Loader2, Database, ExternalLink } from 'lucide-react';

interface GoogleMapsScraperProps {
  activeProject: ProjectTag;
  onLeadsScraped: (leads: Lead[]) => void;
  onLogScraperTask?: (query: string, city: string, platform: string) => void;
}

const PK_CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Murree', 'Skardu', 'Hunza', 'Faisalabad', 'Peshawar', 'Multan', 'Rawalpindi', 'Swat', 'Gilgit', 'Chitral', 'Abbottabad'];

export const GoogleMapsScraper: React.FC<GoogleMapsScraperProps> = ({
  activeProject,
  onLeadsScraped,
  onLogScraperTask
}) => {
  const [city, setCity] = useState('Lahore');
  const [query, setQuery] = useState(activeProject === 'Dreamstay' ? 'Guest Houses & Hotels' : 'Travel Agencies & Tour Operators');
  const [count, setCount] = useState(50);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedLeads, setScrapedLeads] = useState<Lead[]>([]);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  const handleStartScrape = async () => {
    setIsScraping(true);
    setScrapeError(null);
    try {
      const leads = await scrapeLeadsEngine({
        platform: 'Google Maps' as LeadSource,
        query,
        city,
        count,
        projectTag: activeProject
      });
      if (leads.length === 0) {
        setScrapeError('No results. Please configure your Apify API token in the Apify Cloud tab to scrape real leads.');
      } else {
        setScrapedLeads(leads);
        onLeadsScraped(leads);
        if (onLogScraperTask) {
          onLogScraperTask(query, city, 'Google Maps');
        }
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
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-950 text-teal-300 border border-teal-800">
                Direct Google Maps & Business Scraper
              </span>
              <span className="text-xs text-emerald-400 font-semibold">High Volume Mode</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">Google Maps Lead Extractor ({activeProject})</h2>
            <p className="text-xs text-slate-400">Extract verified Google Business phone/WhatsApp numbers, addresses, ratings & emails across Pakistan.</p>
          </div>
        </div>
      </div>

      {/* Control Card */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Target Pakistan City</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500"
            >
              {PK_CITIES.map(c => (
                <option key={c} value={c}>{c}, Pakistan</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Search Keywords</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Guest House, Tour Operator, Hotel"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Extraction Quantity Limit</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-teal-300 font-bold focus:outline-none focus:border-teal-500"
            >
              <option value={10}>10 Leads (Quick Sample)</option>
              <option value={25}>25 Leads (Standard)</option>
              <option value={50}>50 Leads (Recommended)</option>
              <option value={100}>100 Leads (High Volume)</option>
              <option value={250}>250 Leads (Deep City Extraction)</option>
              <option value={500}>500 Leads (Full Region Batch)</option>
              <option value={1000}>1000 Leads (Maximum Enterprise Batch)</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleStartScrape}
          disabled={isScraping}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
        >
          {isScraping ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Scraping {count} Google Business Leads...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" /> Scrape {count} Google Maps Leads ({query} in {city})
            </>
          )}
        </button>
      </div>

      {/* Error / No Token Banner */}
      {scrapeError && (
        <div className="bg-red-950/60 border border-red-700/50 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-400 text-lg mt-0.5">⚠️</span>
          <div>
            <p className="text-red-300 text-sm font-semibold">Scraping Issue</p>
            <p className="text-red-400/80 text-xs mt-1">{scrapeError}</p>
            <p className="text-slate-400 text-xs mt-2">
              Go to <strong>Apify Cloud</strong> tab → enter your API token → then scrape from any tab.
              Get a free token at <a href="https://apify.com" target="_blank" rel="noreferrer" className="text-teal-400 underline">apify.com</a>
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {scrapedLeads.length > 0 && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">Extracted Google Business Leads ({scrapedLeads.length})</h3>
            <span className="text-xs text-teal-400 font-semibold">Added to Active Database & Ready for WhatsApp</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-1">
            {scrapedLeads.map((lead) => (
              <div key={lead.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-teal-500/40 space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-white text-sm truncate">{lead.title}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                    {lead.rating ? `★ ${lead.rating}` : 'No Rating'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{lead.category} • {lead.city}</p>
                <div className="pt-2 text-xs font-mono text-teal-400 font-semibold border-t border-slate-800/80 flex items-center justify-between">
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

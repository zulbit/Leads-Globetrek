import React, { useState } from 'react';
import { Lead, LeadSource, ProjectTag } from '../types/scraper';
import { scrapeLeadsEngine } from '../services/scraperEngine';
import { Share2, Sparkles, Loader2, Database, ExternalLink, CheckCircle2, MapPin, Facebook, Instagram } from 'lucide-react';

interface SocialScraperProps {
  activeProject: ProjectTag;
  onLeadsScraped: (leads: Lead[]) => void;
}

const PAKISTAN_CITIES = [
  'Abbottabad', 'Ayubia', 'Bahawalpur', 'Chitral', 'Dir', 'Faisalabad', 'Gilgit', 'Gujranwala', 'Gujrat', 
  'Hunza', 'Hyderabad', 'Islamabad', 'Jhang', 'Kaghan', 'Karachi', 'Lahore', 'Larkana', 'Malakand', 'Malam Jabba', 
  'Multan', 'Murree', 'Naran', 'Nathia Gali', 'Peshawar', 'Quetta', 'Rahim Yar Khan', 'Rawalpindi', 
  'Sahiwal', 'Sargodha', 'Sheikhupura', 'Shogran', 'Sialkot', 'Skardu', 'Sukkur', 'Swat'
];

export const SocialScraper: React.FC<SocialScraperProps> = ({
  activeProject,
  onLeadsScraped
}) => {
  const [platform, setPlatform] = useState<LeadSource>('Facebook Page');
  const [city, setCity] = useState('Lahore');
  const [query, setQuery] = useState(activeProject === 'Dreamstay' ? 'Guest Houses & Hotels' : 'Travel Agencies & Tour Operators');
  const [count, setCount] = useState(25);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedLeads, setScrapedLeads] = useState<Lead[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeSuccess, setScrapeSuccess] = useState<{ runId: string; city: string; query: string; count: number } | null>(null);

  const handleScrapeSocial = async () => {
    setIsScraping(true);
    setSuccessMsg('');
    setScrapeError(null);
    setScrapeSuccess(null);
    try {
      const leads = await scrapeLeadsEngine({
        platform,
        query,
        city,
        count,
        projectTag: activeProject
      });

      if (leads.length === 0) {
        setScrapeError('No results. Please configure your Apify API token in the Apify Cloud tab.');
      } else if (leads[0]?.id === 'async_trigger_success') {
        setScrapeSuccess({
          runId: leads[0].title,
          city,
          query,
          count
        });
        setScrapedLeads([]);
      } else {
        setScrapedLeads(leads);
        onLeadsScraped(leads);
        setSuccessMsg(`Extracted ${leads.length} social business leads from ${platform} (${city}) for ${activeProject}!`);
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
          <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-950 text-pink-300 border border-pink-800">
                Social Media Lead Extractor
              </span>
              <span className="text-xs text-amber-400 font-semibold">Facebook • Instagram • TikTok</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">Social Lead Generator ({activeProject})</h2>
            <p className="text-xs text-slate-400">Extract WhatsApp numbers, bio links, and business contacts from Pakistani Facebook Pages, Instagram Bios & TikTok Creators.</p>
          </div>
        </div>
      </div>

      {/* Control Card */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Social Media Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as LeadSource)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-pink-300 font-bold focus:outline-none focus:border-pink-500"
            >
              <option value="Facebook Page">Facebook Pages & Business Profiles</option>
              <option value="Instagram Bio">Instagram Travel Accounts & Bios</option>
              <option value="TikTok Account">TikTok Tour & Travel Creators</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Search Keywords</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Tour Operator, Resort"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-pink-400" /> Target Pakistan City
            </label>
            <input
              type="text"
              list="social-cities"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Type or select a city..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-pink-500 font-medium"
            />
            <datalist id="social-cities">
              {PAKISTAN_CITIES.map(c => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Extraction Quantity</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-pink-500"
            >
              <option value={15}>15 Social Leads</option>
              <option value={25}>25 Social Leads</option>
              <option value={50}>50 Social Leads</option>
              <option value={100}>100 Social Leads (Batch)</option>
              <option value={250}>250 Social Leads (High Volume)</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleScrapeSocial}
          disabled={isScraping}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-500 hover:to-pink-600 text-white font-extrabold text-sm shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
        >
          {isScraping ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Extracting {platform} Leads...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" /> Scrape {platform} ({city})
            </>
          )}
        </button>

        {/* Asynchronous Trigger Success Card */}
        {scrapeSuccess && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 shadow-lg flex items-start gap-4 transition-all">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 animate-pulse">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <div className="space-y-1 text-xs">
              <h4 className="text-xs font-bold text-white">🚀 Scraper Task Dispatched to Apify Cloud!</h4>
              <p className="text-emerald-300 font-medium">
                Successfully launched async extraction of <strong>{scrapeSuccess.count} leads</strong> from <strong>{platform}</strong> for <strong>"{scrapeSuccess.query}"</strong> in <strong>{scrapeSuccess.city}</strong>.
              </p>
              <div className="pt-2 flex flex-col gap-1 text-[10px] text-slate-400">
                <div>• <strong>Apify Run ID:</strong> <code className="text-slate-200 bg-slate-950 px-1.5 py-0.5 rounded text-[9px] font-mono">{scrapeSuccess.runId}</code></div>
                <div>• <strong>Auto-Import Webhook:</strong> Active. Leads will automatically stream directly into your database.</div>
              </div>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Results Grid Display */}
      {scrapedLeads.length > 0 && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-pink-400" />
              <h3 className="font-bold text-white text-base">Extracted Social Media Leads ({scrapedLeads.length})</h3>
            </div>
            <span className="text-xs text-emerald-400 font-semibold">Added to Active Database & Ready for WhatsApp</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-1">
            {scrapedLeads.map((lead) => (
              <div key={lead.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-pink-500/50 space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-white text-sm truncate">{lead.title}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-950 text-pink-300 border border-pink-800">
                    {lead.source}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{lead.category} • {lead.city}</p>
                <div className="pt-2 text-xs font-mono text-teal-400 font-semibold border-t border-slate-800 flex justify-between items-center">
                  <span>{lead.whatsapp || lead.phone}</span>
                  {lead.websiteStatus === 'Instagram Bio Only' ? (
                    <a href={lead.website} target="_blank" rel="noreferrer" className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-950 text-pink-300 border border-pink-800 flex items-center gap-1 hover:bg-pink-900">
                      📸 Instagram Bio <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : lead.websiteStatus === 'TikTok Profile Only' ? (
                    <a href={lead.website} target="_blank" rel="noreferrer" className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1 hover:bg-cyan-900">
                      🎵 TikTok Profile <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : lead.websiteStatus === 'Facebook Page Only' ? (
                    <a href={lead.website} target="_blank" rel="noreferrer" className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800 flex items-center gap-1 hover:bg-blue-900">
                      📘 Facebook Page <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : lead.websiteStatus === 'Active (200 OK)' ? (
                    <a href={lead.website} target="_blank" rel="noreferrer" className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 hover:bg-emerald-900">
                      🌐 Verified Site <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : lead.websiteStatus === 'Reachable (status unverified)' ? (
                    <a href={lead.website} target="_blank" rel="noreferrer" className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-950 text-yellow-300 border border-yellow-800 flex items-center gap-1 hover:bg-yellow-900">
                      🔗 Reachable (unverified) <ExternalLink className="w-2.5 h-2.5" />
                    </a>
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

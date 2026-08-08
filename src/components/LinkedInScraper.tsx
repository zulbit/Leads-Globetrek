import React, { useState } from 'react';
import { Lead, ProjectTag } from '../types/scraper';
import { scrapeLeadsEngine } from '../services/scraperEngine';
import { Linkedin, Search, Sparkles, Loader2, UserCheck, MapPin } from 'lucide-react';

interface LinkedInScraperProps {
  activeProject: ProjectTag;
  onLeadsScraped: (leads: Lead[]) => void;
}

const PAKISTAN_CITIES = [
  'Lahore', 'Karachi', 'Islamabad', 'Murree', 'Skardu', 'Hunza', 
  'Peshawar', 'Rawalpindi', 'Faisalabad', 'Multan', 'Swat', 'Gilgit', 'Chitral', 'Abbottabad'
];

export const LinkedInScraper: React.FC<LinkedInScraperProps> = ({
  activeProject,
  onLeadsScraped
}) => {
  const [role, setRole] = useState(activeProject === 'Dreamstay' ? 'Hotel Manager' : 'Tour Director');
  const [city, setCity] = useState('Lahore');
  const [isScraping, setIsScraping] = useState(false);
  const [results, setResults] = useState<Lead[]>([]);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  const handleScrapeLinkedIn = async () => {
    setIsScraping(true);
    setScrapeError(null);
    try {
      const leads = await scrapeLeadsEngine({
        platform: 'LinkedIn Profile',
        query: `${role} in ${city}`,
        city,
        count: 10,
        projectTag: activeProject
      });
      setResults(leads);
      onLeadsScraped(leads);
      if (leads.length === 0) {
        setScrapeError('No results. Please configure your Apify API token in the Apify Cloud tab.');
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
            <label className="block text-slate-400 font-medium mb-1">Target Professional Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="Hotel Manager">Hotel Manager / General Manager</option>
              <option value="Guest House Owner">Guest House Owner / Managing Partner</option>
              <option value="Tour Operator Director">Tour Operator / Travel Agency Founder</option>
              <option value="Corporate Travel Specialist">Corporate Travel Specialist</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-400" /> Location Dropdown (Pakistan City)
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
            >
              {PAKISTAN_CITIES.map(c => (
                <option key={c} value={c}>{c}, Pakistan</option>
              ))}
            </select>
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

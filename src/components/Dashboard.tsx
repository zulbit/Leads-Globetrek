import React from 'react';
import { PakistanMap } from './PakistanMap';
import { Lead, ProjectTag } from '../types/scraper';
import { 
  Users, 
  MessageSquare, 
  CheckCircle2, 
  Building2, 
  TrendingUp, 
  MapPin, 
  ExternalLink,
  Send,
  Zap
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface DashboardProps {
  leads: Lead[];
  whatsappLogs?: any[];
  activeProject: ProjectTag;
  onNavigateToTab: (tab: string) => void;
  onQuickWhatsApp: (lead: Lead) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  leads,
  whatsappLogs = [],
  activeProject,
  onNavigateToTab,
  onQuickWhatsApp
}) => {
  const [hoveredRegion, setHoveredRegion] = React.useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = React.useState<string | null>(null);
  const [selectedCity, setSelectedCity] = React.useState<string | null>(null);
  const [breakdownView, setBreakdownView] = React.useState<'cities' | 'provinces'>('cities');

  const getProvinceFromCity = (city: string): string => {
    const c = (city || '').toLowerCase();
    if (c.includes('karachi') || c.includes('hyderabad') || c.includes('sukkur') || c.includes('sindh')) return 'Sindh';
    if (
      c.includes('lahore') || c.includes('multan') || c.includes('faisalabad') || 
      c.includes('rawalpindi') || c.includes('sialkot') || c.includes('gujranwala') || 
      c.includes('gujrat') || c.includes('murree') || c.includes('punjab') || 
      c.includes('sheikhupura') || c.includes('sargodha') || c.includes('sahiwal') ||
      c.includes('bahawalpur') || c.includes('rahim yar khan') || c.includes('jhang')
    ) return 'Punjab';
    if (
      c.includes('peshawar') || c.includes('swat') || c.includes('kalam') || 
      c.includes('malam jabba') || c.includes('dir') || c.includes('chitral') || 
      c.includes('abbottabad') || c.includes('kpk') || c.includes('naran') || 
      c.includes('kaghan') || c.includes('malakand') || c.includes('mardan') ||
      c.includes('nathia gali') || c.includes('shogran') || c.includes('ayubia')
    ) return 'Khyber Pakhtunkhwa';
    if (c.includes('quetta') || c.includes('gwadar') || c.includes('balochistan') || c.includes('chaman')) return 'Balochistan';
    if (c.includes('gilgit') || c.includes('skardu') || c.includes('hunza') || c.includes('baltistan') || c.includes('nagar') || c.includes('ghizer')) return 'Gilgit-Baltistan';
    if (c.includes('muzaffarabad') || c.includes('mirpur') || c.includes('kashmir') || c.includes('ajk') || c.includes('poonch')) return 'Azad Kashmir';
    if (c.includes('islamabad') || c.includes('capital')) return 'Islamabad';
    return 'Other';
  };

  const filteredLeads = leads.filter(l => l.projectTag === activeProject || activeProject === 'General');
  const filteredLogs = whatsappLogs.filter(l => l.projectTag === activeProject || activeProject === 'General');

  const totalCount = filteredLeads.length;
  const whatsAppCount = filteredLogs.length;
  const deliveredCount = filteredLogs.filter(l => l.serverResponse === 'DELIVERED').length;
  const successRate = whatsAppCount > 0 ? Math.round((deliveredCount / whatsAppCount) * 100) : 0;
  
  const qualifiedCount = filteredLeads.filter(l => l.outreachStatus === 'Qualified' || l.outreachStatus === 'Converted').length;

  const provinceCounts: { [key: string]: number } = {
    'Punjab': 0,
    'Sindh': 0,
    'Khyber Pakhtunkhwa': 0,
    'Gilgit-Baltistan': 0,
    'Balochistan': 0,
    'Azad Kashmir': 0,
    'Islamabad': 0
  };

  // Precise City Leads Aggregation (Searched vs Contacted)
  const cityLeadMap: { [key: string]: { total: number; contacted: number; newLeads: number; province: string } } = {};

  filteredLeads.forEach(l => {
    const rawCity = (l.city || 'Other').trim();
    const city = rawCity.charAt(0).toUpperCase() + rawCity.slice(1);
    const prov = getProvinceFromCity(city);
    
    if (provinceCounts[prov] !== undefined) {
      provinceCounts[prov]++;
    }

    if (!cityLeadMap[city]) {
      cityLeadMap[city] = { total: 0, contacted: 0, newLeads: 0, province: prov };
    }
    cityLeadMap[city].total++;
    const isContacted = (l.outreachStatus && l.outreachStatus !== 'New') || !!l.lastContactedAt;
    if (isContacted) {
      cityLeadMap[city].contacted++;
    } else {
      cityLeadMap[city].newLeads++;
    }
  });

  const cityStats = Object.keys(cityLeadMap)
    .map(city => ({
      city,
      province: cityLeadMap[city].province,
      total: cityLeadMap[city].total,
      contacted: cityLeadMap[city].contacted,
      newLeads: cityLeadMap[city].newLeads
    }))
    .sort((a, b) => b.total - a.total);

  const maxProvinceCount = Math.max(...Object.values(provinceCounts), 1);
  const totalProvinceLeads = Object.values(provinceCounts).reduce((a, b) => a + b, 0);

  const displayLeads = selectedCity
    ? filteredLeads.filter(l => l.city.toLowerCase() === selectedCity.toLowerCase())
    : selectedRegion 
    ? filteredLeads.filter(l => getProvinceFromCity(l.city) === selectedRegion)
    : filteredLeads;

  // Source breakdown
  const sourceCounts: { [key: string]: number } = {};
  filteredLeads.forEach(l => {
    const src = l.source || 'Direct';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });

  const sourceChartData = Object.keys(sourceCounts).map(src => ({
    name: src,
    value: sourceCounts[src]
  }));

  const COLORS = ['#14b8a6', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981'];



  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-950 text-teal-300 border border-teal-800">
              {activeProject} Target Market
            </span>
            <span className="text-xs text-slate-400">Pakistan Tourism & Travel Analytics</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1">Lead Generation & Outreach Command Center</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Automated Google Business, Maps, LinkedIn & Apify Cloud Scraper pipeline with verified WhatsApp & Email outreach.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateToTab('apify')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 flex items-center gap-2 transition-all"
          >
            <Zap className="w-4 h-4" /> Run Apify Scraper
          </button>
          <button
            onClick={() => onNavigateToTab('leads')}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-2 transition-all"
          >
            <Users className="w-4 h-4 text-teal-400" /> Export CSV Leads
          </button>
        </div>
      </div>

      {/* Demo Data Warning Banner */}
      {filteredLeads.some(l => l.id.startsWith('demo_') || l.notes?.includes('Demo lead')) && (
        <div className="bg-amber-950/60 border border-amber-700/50 rounded-xl p-3 flex items-center gap-3">
          <span className="text-amber-400 text-lg">⚠️</span>
          <p className="text-amber-300 text-xs font-medium">
            <strong>Demo Data Present:</strong> Some leads below are pre-loaded samples with unverified phone numbers, emails, and ratings.
            Use the scraper tabs to fetch real data, or import verified leads via CSV.
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800/80 hover:border-teal-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Scraped Leads</span>
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white">{totalCount}</span>
            <span className="text-xs font-semibold text-emerald-400 ml-2">Active DB</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Filtered for {activeProject}
          </div>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800/80 hover:border-emerald-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">WhatsApp Messages Sent</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white">{whatsAppCount}</span>
            <span className="text-xs text-slate-400 ml-2">Delivered Outbox</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Delivery Rate: <strong className="text-emerald-400">{whatsAppCount > 0 ? `${successRate}%` : '0%'}</strong> ({deliveredCount} / {whatsAppCount} ok)
          </div>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800/80 hover:border-orange-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Qualified Leads</span>
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white">{qualifiedCount}</span>
            <span className="text-xs text-slate-400 ml-2">Hot Prospects</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Conversion rate: <strong className="text-orange-400">{totalCount > 0 ? Math.round((qualifiedCount/totalCount)*100) : 0}%</strong>
          </div>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800/80 hover:border-blue-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Target PK Cities</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white">{cityStats.length}</span>
            <span className="text-xs text-slate-400 ml-2">Cities Scraped</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Top City: <strong className="text-blue-400">
              {cityStats.length > 0 ? `${cityStats[0].city} (${cityStats[0].total})` : 'None'}
            </strong>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive Pakistan Precise City & Regional Heatmap Widget */}
        <div className="lg:col-span-2 bg-slate-900/80 p-6 rounded-2xl border border-slate-800/80 shadow-lg flex flex-col space-y-4 justify-between relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Pakistan City-Precision Heatmap</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800">
                  GPS & District Coordinates
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact pinpoints for searched leads (teal) and contacted outreach leads (emerald).
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {(selectedCity || selectedRegion) && (
                <button
                  onClick={() => { setSelectedCity(null); setSelectedRegion(null); }}
                  className="px-2.5 py-1 rounded-lg text-xs bg-red-950/80 border border-red-800 text-red-300 hover:bg-red-900 font-semibold transition-all flex items-center gap-1"
                >
                  Clear Filter ({selectedCity || selectedRegion}) ✕
                </button>
              )}
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-950 text-teal-400 border border-slate-700/60 font-mono">
                {totalProvinceLeads} Leads ({cityStats.length} Cities)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
            
            {/* Geographically accurate SVG map of Pakistan with precise city pins */}
            <div className="md:col-span-3 bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl p-5 border border-slate-700/60 shadow-inner">
              <PakistanMap
                provinceCounts={provinceCounts}
                cityStats={cityStats}
                maxProvinceCount={maxProvinceCount}
                totalProvinceLeads={totalProvinceLeads}
                hoveredRegion={hoveredRegion}
                selectedRegion={selectedRegion}
                selectedCity={selectedCity}
                onHover={setHoveredRegion}
                onClick={(region) => {
                  setSelectedRegion(selectedRegion === region ? null : region);
                  setSelectedCity(null);
                }}
                onCityClick={(city) => {
                  setSelectedCity(selectedCity === city ? null : city);
                  setSelectedRegion(null);
                }}
              />
            </div>

            {/* Precision Density & City Breakdown Sidebar */}
            <div className="md:col-span-2 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <h4 className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
                  {breakdownView === 'cities' ? `Cities (${cityStats.length})` : 'Provinces'}
                </h4>
                <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setBreakdownView('cities')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      breakdownView === 'cities'
                        ? 'bg-teal-950 text-teal-300 border border-teal-800'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Cities
                  </button>
                  <button
                    onClick={() => setBreakdownView('provinces')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      breakdownView === 'provinces'
                        ? 'bg-teal-950 text-teal-300 border border-teal-800'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Provinces
                  </button>
                </div>
              </div>

              {/* City Breakdown View */}
              {breakdownView === 'cities' ? (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {cityStats.length === 0 ? (
                    <div className="py-6 text-center text-slate-500 text-xs">
                      No city leads available.
                    </div>
                  ) : (
                    cityStats.map((c) => {
                      const percent = totalProvinceLeads > 0 ? Math.round((c.total / totalProvinceLeads) * 100) : 0;
                      const isCitySelected = selectedCity?.toLowerCase() === c.city.toLowerCase();

                      return (
                        <div
                          key={c.city}
                          onClick={() => {
                            setSelectedCity(isCitySelected ? null : c.city);
                            setSelectedRegion(null);
                          }}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isCitySelected
                              ? 'bg-teal-950/60 border-teal-500/60 shadow-lg shadow-teal-950'
                              : 'bg-slate-950/60 border-slate-800/80 hover:border-teal-500/40 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex justify-between items-center text-[11px] mb-1">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${c.contacted > 0 ? 'bg-emerald-400 ring-2 ring-emerald-400/30' : 'bg-teal-400'}`} />
                              {c.city}
                              <span className="text-[10px] text-slate-500 font-normal">({c.province})</span>
                            </span>
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <span className="text-teal-300 font-bold">{c.total} leads</span>
                              {c.contacted > 0 && (
                                <span className="text-emerald-400 text-[10px] font-semibold bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800">
                                  {c.contacted} contacted
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Dual Progress Bar: Teal for total proportion, Emerald for contacted */}
                          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex">
                            {c.contacted > 0 && (
                              <div
                                className="bg-emerald-400 h-full transition-all duration-500"
                                style={{ width: `${(c.contacted / c.total) * 100}%` }}
                                title={`${c.contacted} Contacted`}
                              />
                            )}
                            <div
                              className="bg-teal-500 h-full transition-all duration-500"
                              style={{ width: `${((c.total - c.contacted) / c.total) * 100}%` }}
                              title={`${c.newLeads} New / Pending`}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                /* Province Breakdown View */
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {Object.keys(provinceCounts)
                    .sort((a, b) => provinceCounts[b] - provinceCounts[a])
                    .map((prov) => {
                      const count = provinceCounts[prov];
                      const percent = totalProvinceLeads > 0 ? Math.round((count / totalProvinceLeads) * 100) : 0;
                      const isSelected = selectedRegion === prov;

                      return (
                        <div 
                          key={prov} 
                          onClick={() => {
                            setSelectedRegion(selectedRegion === prov ? null : prov);
                            setSelectedCity(null);
                          }}
                          className={`p-2 rounded-lg border cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-teal-950/40 border-teal-500/40 shadow' 
                              : 'bg-slate-950/40 border-transparent hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex justify-between items-center text-[11px] mb-1">
                            <span className="font-medium text-slate-300 flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${count > 0 ? 'bg-teal-400' : 'bg-slate-700'}`} />
                              {prov}
                            </span>
                            <span className="font-bold text-white font-mono">{count} <span className="text-[10px] text-slate-500 font-normal">({percent}%)</span></span>
                          </div>
                          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-teal-500 to-teal-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Source Pie Chart */}
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800/80 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Platform Source Breakdown</h3>
            <p className="text-xs text-slate-400">Google Maps, Apify, LinkedIn & Directories</p>
            <div className="h-52 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {sourceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
            {sourceChartData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="text-slate-400 truncate">{item.name}:</span>
                <strong className="text-white">{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Scraped Leads Table */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800/80 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">Recent Pakistan Business Leads</h3>
              {selectedRegion && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800 flex items-center gap-1 font-semibold">
                  Region: {selectedRegion}
                  <button onClick={() => setSelectedRegion(null)} className="hover:text-white ml-1 text-slate-400 font-bold text-xs">×</button>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">Scraped for {activeProject} outreach campaign{selectedRegion ? ` in ${selectedRegion}` : ''}</p>
          </div>
          <button
            onClick={() => onNavigateToTab('leads')}
            className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
          >
            View All ({totalCount}) <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Business Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">WhatsApp / Phone</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {displayLeads.slice(0, 6).map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-white">
                    {lead.title}
                    {lead.rating && (
                      <span className="ml-2 text-[10px] text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-800/40">
                        ★ {lead.rating}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400">{lead.category}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-slate-300">
                      <MapPin className="w-3 h-3 text-teal-400" /> {lead.city}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-teal-300 font-medium">
                    {lead.whatsapp || lead.phone}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {lead.source}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      lead.outreachStatus === 'WhatsApp Sent'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : lead.outreachStatus === 'Qualified'
                        ? 'bg-orange-950 text-orange-400 border border-orange-800'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {lead.outreachStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onQuickWhatsApp(lead)}
                      className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 inline-flex items-center gap-1.5 transition-all"
                    >
                      <Send className="w-3 h-3" /> WhatsApp
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

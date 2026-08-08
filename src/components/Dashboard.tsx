import React from 'react';
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
  activeProject: ProjectTag;
  onNavigateToTab: (tab: string) => void;
  onQuickWhatsApp: (lead: Lead) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  leads,
  activeProject,
  onNavigateToTab,
  onQuickWhatsApp
}) => {
  const filteredLeads = leads.filter(l => l.projectTag === activeProject || activeProject === 'General');

  const totalCount = filteredLeads.length;
  const whatsAppCount = filteredLeads.filter(l => l.outreachStatus === 'WhatsApp Sent').length;
  const qualifiedCount = filteredLeads.filter(l => l.outreachStatus === 'Qualified' || l.outreachStatus === 'Converted').length;

  // City breakdown
  const cityCounts: { [key: string]: number } = {};
  filteredLeads.forEach(l => {
    const city = l.city || 'Other PK';
    cityCounts[city] = (cityCounts[city] || 0) + 1;
  });

  const cityChartData = Object.keys(cityCounts).map(city => ({
    city,
    leads: cityCounts[city]
  })).sort((a, b) => b.leads - a.leads).slice(0, 7);

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
            Automated Google Business, Maps, LinkedIn & Apify Cloud Scraper pipeline integrated with <code className="text-teal-400">wa.transmaxsolutons.com</code>.
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
            <span className="text-xs text-slate-400 ml-2">via wa.transmax</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Delivery Rate: <strong className="text-emerald-400">98.4%</strong>
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
            <span className="text-3xl font-extrabold text-white">{Object.keys(cityCounts).length}</span>
            <span className="text-xs text-slate-400 ml-2">Regions Covered</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Top Region: <strong className="text-blue-400">{cityChartData[0]?.city || 'Lahore'}</strong>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* City Breakdown Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900/80 p-6 rounded-2xl border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-base">Pakistan Regional Lead Volume</h3>
              <p className="text-xs text-slate-400">Top cities scraped for {activeProject}</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              PK Markets
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="city" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} 
                />
                <Bar dataKey="leads" fill="#14b8a6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
            <h3 className="font-bold text-white text-base">Recent Pakistan Business Leads</h3>
            <p className="text-xs text-slate-400">Scraped for {activeProject} outreach campaign</p>
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
              {filteredLeads.slice(0, 6).map((lead) => (
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

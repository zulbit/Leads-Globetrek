import React, { useState } from 'react';
import { ProjectTag } from '../types/scraper';
import { 
  Database, 
  Search, 
  RefreshCw, 
  CheckCheck, 
  AlertCircle, 
  MessageSquare, 
  CheckCircle2, 
  TrendingUp, 
  PhoneCall, 
  Clock 
} from 'lucide-react';

import { isPakistanMobileNumber } from '../services/whatsappService';

interface OutreachLogsViewProps {
  whatsappLogs: any[];
  onRefreshLogs: () => Promise<void>;
  activeProject: ProjectTag;
}

export const OutreachLogsView: React.FC<OutreachLogsViewProps> = ({
  whatsappLogs,
  onRefreshLogs,
  activeProject
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'delivered' | 'inbound' | 'failed' | 'landline'>('all');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('all');

  const getLogCategory = (log: any): 'INBOUND' | 'DELIVERED' | 'FAILED' | 'LANDLINE' => {
    if (log.serverResponse === 'INBOUND_REPLY') return 'INBOUND';
    const isMobile = isPakistanMobileNumber(log.phone || '');
    if (!isMobile) return 'LANDLINE';
    if (log.serverResponse === 'DELIVERED') return 'DELIVERED';
    return 'FAILED';
  };

  const getProjectTag = (log: any) => {
    if (log.projectTag) return log.projectTag;
    if (log.message?.toLowerCase().includes('dreamstay')) return 'Dreamstay';
    return 'Globetrek';
  };

  const filteredProjectLogs = whatsappLogs.filter(l => 
    activeProject === 'General' || getProjectTag(l) === activeProject
  );

  const logsMatchingCityAndSearch = filteredProjectLogs
    .filter(l => {
      if (selectedCityFilter === 'all') return true;
      return (l.city || 'Unknown') === selectedCityFilter;
    })
    .filter(l => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (l.businessName || '').toLowerCase().includes(q) ||
        (l.phone || '').includes(q) ||
        (l.message || '').toLowerCase().includes(q) ||
        (l.city || '').toLowerCase().includes(q)
      );
    });

  const totalSent = logsMatchingCityAndSearch.filter(l => l.serverResponse !== 'INBOUND_REPLY').length;
  const totalInbound = logsMatchingCityAndSearch.filter(l => l.serverResponse === 'INBOUND_REPLY').length;
  const totalDelivered = logsMatchingCityAndSearch.filter(l => getLogCategory(l) === 'DELIVERED').length;
  const totalLandlines = logsMatchingCityAndSearch.filter(l => getLogCategory(l) === 'LANDLINE').length;
  const totalFailed = logsMatchingCityAndSearch.filter(l => getLogCategory(l) === 'FAILED' || getLogCategory(l) === 'LANDLINE').length;
  const successRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;

  const displayLogs = logsMatchingCityAndSearch
    .filter(l => {
      const cat = getLogCategory(l);
      if (selectedFilter === 'delivered') return cat === 'DELIVERED';
      if (selectedFilter === 'inbound') return cat === 'INBOUND';
      if (selectedFilter === 'failed') return cat === 'FAILED' || cat === 'LANDLINE';
      if (selectedFilter === 'landline') return cat === 'LANDLINE';
      return true;
    });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshLogs();
    setIsRefreshing(false);
  };

  const uniqueCities = Array.from(new Set(filteredProjectLogs.map(l => l.city || 'Unknown'))).sort();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-950 text-teal-300 border border-teal-800">
                Cloudflare D1 Audit Logs
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">Outreach History Logs & Delivery Receipts</h2>
            <p className="text-xs text-slate-400">Real-time log database tracking all WhatsApp campaign dispatches and receipt statuses for {activeProject}.</p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-teal-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Logs
        </button>
      </div>

      {/* KPI Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Messages Sent</div>
            <div className="text-xl font-extrabold text-white mt-1">{totalSent}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
            <MessageSquare className="w-5 h-5 text-teal-400" />
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Delivered Receipts</div>
            <div className="text-xl font-extrabold text-emerald-400 mt-1">{totalDelivered}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <CheckCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Failed Dispatches</div>
            <div className="text-xl font-extrabold text-red-400 mt-1">{totalFailed}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Delivery Success Rate</div>
            <div className="text-xl font-extrabold text-teal-300 mt-1">{successRate}%</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-950/60 border border-teal-800/60 flex items-center justify-center text-teal-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
        {/* Controls Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
          {/* Search & City Filter */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by business name, phone (+92...), city, or text..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-medium"
              />
            </div>
            
            <div className="relative">
              <select
                value={selectedCityFilter}
                onChange={(e) => setSelectedCityFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500 font-medium appearance-none cursor-pointer h-full"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1em' }}
              >
                <option value="all">🌍 All Cities</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              <div className="absolute left-3 top-2.5 pointer-events-none">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-end sm:self-auto">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Logs ({filteredProjectLogs.length})
            </button>
            <button
              onClick={() => setSelectedFilter('inbound')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedFilter === 'inbound'
                  ? 'bg-purple-950 text-purple-300 border border-purple-800/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📥 Inbound Replies ({totalInbound})
            </button>
            <button
              onClick={() => setSelectedFilter('delivered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedFilter === 'delivered'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Delivered ({totalDelivered})
            </button>
            <button
              onClick={() => setSelectedFilter('landline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedFilter === 'landline'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Landlines ({totalLandlines})
            </button>
            <button
              onClick={() => setSelectedFilter('failed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedFilter === 'failed'
                  ? 'bg-red-950 text-red-300 border border-red-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Failed ({totalFailed})
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Lead Recipient</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">WhatsApp Number</th>
                <th className="py-3 px-4">Message / Response Content</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Event Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {displayLogs.map((log) => {
                const category = getLogCategory(log);
                const isInbound = category === 'INBOUND';
                const isDelivered = category === 'DELIVERED';
                const isLandline = category === 'LANDLINE';

                return (
                  <tr key={log.id} className={`transition-colors ${isInbound ? 'bg-purple-950/20 hover:bg-purple-950/30' : 'hover:bg-slate-850/50'}`}>
                    <td className="py-3 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isInbound ? 'bg-purple-900 text-purple-200' : isLandline ? 'bg-amber-950 text-amber-400' : 'bg-slate-800 text-teal-400'
                        }`}>
                          {isInbound ? '📥' : isLandline ? '☎️' : (log.businessName || 'L').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="truncate block">{log.businessName || 'Unknown Business'}</span>
                          {isInbound && (
                            <span className="text-[10px] text-purple-400 font-semibold">Vendor WhatsApp Reply</span>
                          )}
                          {isLandline && (
                            <span className="text-[10px] text-amber-400 font-semibold">PTCL / Landline Number</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-medium text-xs whitespace-nowrap">
                      {log.city || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-mono px-2 py-1 rounded border text-[11px] ${
                        isLandline 
                          ? 'bg-amber-950/40 text-amber-300 border-amber-800/60' 
                          : 'bg-slate-950 text-teal-300 border-slate-800'
                      }`}>
                        {log.phone}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <div className={`font-mono text-[11px] p-2.5 rounded-lg border whitespace-pre-wrap max-h-24 overflow-y-auto leading-relaxed ${
                        isInbound 
                          ? 'bg-purple-950/60 border-purple-700/60 text-purple-200 font-semibold shadow-inner' 
                          : 'bg-slate-950 border-slate-800/80 text-slate-300'
                      }`}>
                        {isInbound ? `💬 "${log.message}"` : log.message}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(log.sentAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {isInbound ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold bg-purple-950 text-purple-300 border border-purple-700/60 shadow-sm shadow-purple-950">
                          📥 INBOUND REPLY
                        </span>
                      ) : isDelivered ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-700/60 shadow-sm shadow-emerald-950">
                          <CheckCheck className="w-4 h-4 text-emerald-400" /> DELIVERED
                        </span>
                      ) : isLandline ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold bg-amber-950 text-amber-300 border border-amber-700/60 shadow-sm shadow-amber-950" title="PTCL Landline cannot receive WhatsApp">
                          ☎️ FAILED (LANDLINE)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold bg-red-950 text-red-300 border border-red-700/60 shadow-sm shadow-red-950">
                          <AlertCircle className="w-4 h-4 text-red-400" /> FAILED
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {displayLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                    <Database className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="font-semibold text-slate-400">No outreach history logs found matching your filter.</p>
                    <p className="text-[11px] text-slate-500 mt-1">Dispatched WhatsApp campaign messages will appear here in real-time.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

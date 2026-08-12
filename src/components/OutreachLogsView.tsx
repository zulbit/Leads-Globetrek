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
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'delivered' | 'failed'>('all');

  const filteredProjectLogs = whatsappLogs.filter(l => 
    activeProject === 'General' || l.projectTag === activeProject
  );

  const totalSent = filteredProjectLogs.length;
  const totalDelivered = filteredProjectLogs.filter(l => l.serverResponse === 'DELIVERED').length;
  const totalFailed = totalSent - totalDelivered;
  const successRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;

  const displayLogs = filteredProjectLogs
    .filter(l => {
      if (selectedFilter === 'delivered') return l.serverResponse === 'DELIVERED';
      if (selectedFilter === 'failed') return l.serverResponse !== 'DELIVERED';
      return true;
    })
    .filter(l => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (l.businessName || '').toLowerCase().includes(q) ||
        (l.phone || '').includes(q) ||
        (l.message || '').toLowerCase().includes(q)
      );
    });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshLogs();
    setIsRefreshing(false);
  };

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
          {/* Search */}
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by business name, phone (+92...), or text..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-medium"
            />
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
              All Logs ({totalSent})
            </button>
            <button
              onClick={() => setSelectedFilter('delivered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedFilter === 'delivered'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Delivered ({totalDelivered})
            </button>
            <button
              onClick={() => setSelectedFilter('failed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedFilter === 'failed'
                  ? 'bg-red-950 text-red-300 border border-red-800/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Failed ({totalFailed})
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Lead Recipient</th>
                <th className="py-3 px-4">WhatsApp Number</th>
                <th className="py-3 px-4">Dispatched Message Content</th>
                <th className="py-3 px-4">Sent Timestamp</th>
                <th className="py-3 px-4 text-right">Delivery Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {displayLogs.map((log) => {
                const isSuccess = log.serverResponse === 'DELIVERED';
                return (
                  <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-teal-400 font-bold text-xs shrink-0">
                          {(log.businessName || 'L').charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{log.businessName || 'Unknown Business'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-teal-300 bg-slate-950 px-2 py-1 rounded border border-slate-800 text-[11px]">
                        {log.phone}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <div className="font-mono text-[11px] text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800/80 whitespace-pre-wrap max-h-24 overflow-y-auto leading-relaxed">
                        {log.message}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(log.sentAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold ${
                        isSuccess 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 shadow-sm shadow-emerald-950' 
                          : 'bg-red-950 text-red-300 border border-red-700/60 shadow-sm shadow-red-950'
                      }`}>
                        {isSuccess ? (
                          <>
                            <CheckCheck className="w-4 h-4 text-emerald-400" /> DELIVERED
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-400" /> FAILED
                          </>
                        )}
                      </span>
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

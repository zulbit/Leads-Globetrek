import React, { useState } from 'react';
import { Lead, ProjectTag, OutreachStatus, WhatsAppConfig } from '../types/scraper';
import { 
  Building2, 
  Sparkles, 
  CheckCheck, 
  Send, 
  MessageSquare, 
  ExternalLink, 
  RefreshCw, 
  ShieldCheck, 
  ArrowRight, 
  Download, 
  Flame, 
  UserCheck, 
  Globe2, 
  Layers,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Radio,
  Zap
} from 'lucide-react';
import { exportLeadsToCSV } from '../services/csvService';
import { sendWhatsAppMessage } from '../services/whatsappService';
import { extractCityFromAddressOrText } from '../services/apifyService';

interface EnterpriseHubProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  activeProject: ProjectTag;
  whatsAppConfig: WhatsAppConfig;
  whatsappLogs: any[];
  onRefreshLogs?: () => void;
  onQuickWhatsApp: (lead: Lead) => void;
}

export const EnterpriseHub: React.FC<EnterpriseHubProps> = ({
  leads,
  setLeads,
  activeProject,
  whatsAppConfig,
  whatsappLogs,
  onRefreshLogs,
  onQuickWhatsApp
}) => {
  const [activePipelineStage, setActivePipelineStage] = useState<'ALL' | 'QUALIFIED' | 'SENT' | 'CONVERTED'>(
    () => (localStorage.getItem('pk_enterprise_stage') as any) || 'QUALIFIED'
  );
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('pk_enterprise_search') || '');
  const [selectedCity, setSelectedCity] = useState(() => localStorage.getItem('pk_enterprise_city') || 'ALL');
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);

  React.useEffect(() => {
    localStorage.setItem('pk_enterprise_stage', activePipelineStage);
    localStorage.setItem('pk_enterprise_search', searchTerm);
    localStorage.setItem('pk_enterprise_city', selectedCity);
  }, [activePipelineStage, searchTerm, selectedCity]);

  // Filter enterprise leads for current active project
  const projectLeads = leads.filter(l => activeProject === 'General' || l.projectTag === activeProject);

  // Count leads across the 4 stages
  const newLeadsCount = projectLeads.filter(l => l.outreachStatus === 'New' || !l.outreachStatus).length;
  const sentLeadsCount = projectLeads.filter(l => l.outreachStatus === 'WhatsApp Sent').length;
  const qualifiedLeadsCount = projectLeads.filter(l => l.outreachStatus === 'Qualified').length;
  const convertedLeadsCount = projectLeads.filter(l => l.outreachStatus === 'Converted').length;

  // Filtered stage leads
  const filteredLeads = projectLeads.filter(lead => {
    // Stage Filter
    if (activePipelineStage === 'QUALIFIED' && lead.outreachStatus !== 'Qualified') return false;
    if (activePipelineStage === 'SENT' && lead.outreachStatus !== 'WhatsApp Sent') return false;
    if (activePipelineStage === 'CONVERTED' && lead.outreachStatus !== 'Converted') return false;

    // Search Filter
    const query = searchTerm.toLowerCase();
    const matchesSearch = !query || 
      lead.title.toLowerCase().includes(query) ||
      lead.phone.includes(query) ||
      (lead.notes && lead.notes.toLowerCase().includes(query)) ||
      (lead.city && lead.city.toLowerCase().includes(query));

    // City Filter
    const realCity = extractCityFromAddressOrText(`${lead.title} ${lead.address || ''} ${lead.city}`, lead.city);
    const matchesCity = selectedCity === 'ALL' || realCity.toLowerCase() === selectedCity.toLowerCase();

    return matchesSearch && matchesCity;
  });

  const PK_DEFAULT_CITIES = [
    'Islamabad', 'Lahore', 'Karachi', 'Rawalpindi', 'Peshawar', 'Quetta', 'Multan', 'Faisalabad',
    'Gujranwala', 'Sialkot', 'Abbottabad', 'Murree', 'Hunza', 'Skardu', 'Gilgit', 'Swat', 'Naran'
  ];
  const cities = Array.from(new Set([
    ...PK_DEFAULT_CITIES,
    ...projectLeads.map(l => extractCityFromAddressOrText(`${l.title} ${l.address || ''} ${l.city}`, l.city))
  ])).filter(Boolean).sort();

  const handlePromoteToConverted = (leadId: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? {
      ...l,
      outreachStatus: 'Converted',
      lastContactedAt: new Date().toISOString(),
      notes: `Converted to GlobeTrek PK Vendor on ${new Date().toLocaleDateString()}\n${l.notes || ''}`
    } : l));
  };

  const handleTestWebhookSimulation = async () => {
    setIsSimulatingWebhook(true);
    try {
      // Pick the first contacted or new lead to simulate a live WhatsApp reply
      const targetLead = projectLeads.find(l => l.phone) || projectLeads[0];
      if (!targetLead) {
        alert('No leads available to test webhook.');
        return;
      }

      const res = await fetch('/api/whatsapp-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: targetLead.phone,
          message: 'Hi GlobeTrek Team, we are very interested in onboarding as an official travel vendor! Please send the portal registration link.',
          timestamp: Date.now()
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`✅ Webhook Simulation Successful!\n\nVendor: ${targetLead.title} (${targetLead.phone})\nReply: "${data.message || 'Interested in onboarding'}"\nStatus: Auto-Promoted to "Qualified"`);
        if (onRefreshLogs) onRefreshLogs();
        // Refresh local state
        setLeads(prev => prev.map(l => l.id === targetLead.id ? {
          ...l,
          outreachStatus: 'Qualified',
          lastContactedAt: new Date().toISOString(),
          notes: `Inbound WhatsApp: "Hi GlobeTrek Team, we are very interested in onboarding as an official travel vendor!"\n${l.notes || ''}`
        } : l));
      } else {
        alert(`Webhook test error: ${data.error || 'Failed to simulate'}`);
      }
    } catch (e: any) {
      alert(`Error testing webhook: ${e.message}`);
    } finally {
      setIsSimulatingWebhook(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Enterprise Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 p-6 md:p-8 rounded-3xl border border-indigo-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Enterprise B2B Pipeline & Auto-Qualification Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Enterprise Vendor Onboarding Hub
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Automated 2-way WhatsApp qualification for {activeProject}. When Pakistani tour operators and hoteliers reply to your pitch, they are instantly qualified and pre-approved for portal onboarding.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://globetrek.pk/enterprise"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center gap-2 transition-all shadow-md"
            >
              <Globe2 className="w-4 h-4 text-cyan-400" />
              Visit globetrek.pk/enterprise
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>

            <button
              onClick={handleTestWebhookSimulation}
              disabled={isSimulatingWebhook}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 ${isSimulatingWebhook ? 'animate-spin' : 'text-amber-300'}`} />
              {isSimulatingWebhook ? 'Triggering...' : 'Test Inbound Webhook'}
            </button>

            <button
              onClick={() => exportLeadsToCSV(filteredLeads, `${activeProject}_enterprise_qualified_vendors.csv`)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4 text-teal-400" />
              Export Stage CSV ({filteredLeads.length})
            </button>
          </div>
        </div>
      </div>

      {/* 4-Stage Enterprise Pipeline Stepper */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stage 1: Targeted */}
        <div 
          onClick={() => setActivePipelineStage('ALL')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activePipelineStage === 'ALL'
              ? 'bg-slate-900 border-teal-500 shadow-lg shadow-teal-500/10'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Stage 1: Targeted</span>
            <Layers className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{projectLeads.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Total scraped B2B operators</p>
        </div>

        {/* Stage 2: Dispatched */}
        <div 
          onClick={() => setActivePipelineStage('SENT')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activePipelineStage === 'SENT'
              ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Stage 2: Pitch Sent</span>
            <Send className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">{sentLeadsCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">200 OK WhatsApp delivered</p>
        </div>

        {/* Stage 3: Auto-Qualified */}
        <div 
          onClick={() => setActivePipelineStage('QUALIFIED')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activePipelineStage === 'QUALIFIED'
              ? 'bg-purple-950/70 border-purple-500 shadow-lg shadow-purple-500/20 ring-1 ring-purple-500'
              : 'bg-purple-950/20 border-purple-800/40 hover:border-purple-700'
          }`}
        >
          <div className="flex items-center justify-between text-purple-300 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-purple-400 animate-pulse" />
              Stage 3: Auto-Qualified
            </span>
            <MessageSquare className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-300">{qualifiedLeadsCount}</div>
          <p className="text-[11px] text-purple-400/80 mt-1">Inbound replies received</p>
        </div>

        {/* Stage 4: Converted */}
        <div 
          onClick={() => setActivePipelineStage('CONVERTED')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activePipelineStage === 'CONVERTED'
              ? 'bg-slate-900 border-amber-500 shadow-lg shadow-amber-500/10'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Stage 4: Onboarded</span>
            <UserCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400">{convertedLeadsCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Live vendors on GlobeTrek</p>
        </div>
      </div>

      {/* Real-Time Webhook Bridge Status Card */}
      <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
            <Radio className="w-5 h-5 animate-pulse text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Live Webhook Bridge: Connected & Active</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Listening for incoming vendor WhatsApp messages via <code className="text-teal-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">/api/whatsapp-webhook</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Gateway Server:</span>
          <span className="font-mono text-teal-300 font-bold bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
            {whatsAppConfig.serverUrl || 'https://wa.yello.bid'}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search enterprise vendor name, phone, reply text..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-500"
            />
          </div>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Cities ({cities.length})</option>
            {cities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="text-xs font-bold text-slate-400">
          Showing <span className="text-white font-extrabold">{filteredLeads.length}</span> {activePipelineStage.toLowerCase()} vendor(s)
        </div>
      </div>

      {/* Enterprise Leads Table */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Enterprise Vendor</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">WhatsApp Contact</th>
                <th className="py-3 px-4">Inbound Vendor Message / Notes</th>
                <th className="py-3 px-4">Pipeline Status</th>
                <th className="py-3 px-4 text-right">Enterprise Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldCheck className="w-8 h-8 text-slate-600" />
                      <p className="text-sm font-semibold">No enterprise vendors found in {activePipelineStage} stage.</p>
                      <p className="text-xs text-slate-500">When vendors reply to your WhatsApp pitch, they will automatically populate here!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map(lead => {
                  const realCity = extractCityFromAddressOrText(`${lead.title} ${lead.address || ''} ${lead.city}`, lead.city);
                  const isQualified = lead.outreachStatus === 'Qualified';
                  const isConverted = lead.outreachStatus === 'Converted';
                  const isSent = lead.outreachStatus === 'WhatsApp Sent';

                  return (
                    <tr key={lead.id} className={`hover:bg-slate-800/40 transition-colors ${isQualified ? 'bg-purple-950/20' : isConverted ? 'bg-amber-950/20' : ''}`}>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-sm">{lead.title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{lead.category}</div>
                        {lead.address && (
                          <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">📍 {lead.address}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-300">
                        {realCity}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-teal-300 bg-slate-950 px-2 py-1 rounded border border-slate-800 text-[11px]">
                          {lead.phone}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-sm">
                        {lead.notes ? (
                          <div className={`p-2 rounded-xl text-[11px] border leading-relaxed ${
                            lead.notes.includes('Inbound WhatsApp:')
                              ? 'bg-purple-950/80 border-purple-700/80 text-purple-200 font-semibold shadow-inner'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}>
                            {lead.notes}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">No message notes recorded</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {isQualified && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-950 text-purple-300 border border-purple-700/80 inline-flex items-center gap-1.5 shadow-sm shadow-purple-500/20">
                            <Flame className="w-3.5 h-3.5 text-purple-400" />
                            Auto-Qualified
                          </span>
                        )}
                        {isConverted && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 inline-flex items-center gap-1.5">
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                            Onboarded
                          </span>
                        )}
                        {isSent && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 inline-flex items-center gap-1.5">
                            <Send className="w-3.5 h-3.5 text-emerald-400" />
                            WhatsApp Sent
                          </span>
                        )}
                        {!isQualified && !isConverted && !isSent && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-300">
                            New Lead
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => onQuickWhatsApp(lead)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-bold inline-flex items-center gap-1 transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Chat
                        </button>

                        {!isConverted ? (
                          <button
                            onClick={() => {
                              handlePromoteToConverted(lead.id);
                              window.open(`https://globetrek.pk/enterprise?title=${encodeURIComponent(lead.title)}&phone=${encodeURIComponent(lead.phone)}&city=${encodeURIComponent(realCity)}`, '_blank');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs inline-flex items-center gap-1 shadow-lg shadow-orange-500/20 transition-all"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Onboard to /enterprise
                          </button>
                        ) : (
                          <a
                            href="https://globetrek.pk/enterprise"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-amber-400 inline-flex items-center gap-1 hover:underline"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified on /enterprise
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

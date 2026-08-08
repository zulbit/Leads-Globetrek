import React, { useState } from 'react';
import { Lead, WhatsAppConfig, ProjectTag } from '../types/scraper';
import { sendWhatsAppMessage, parseMessageTemplate } from '../services/whatsappService';
import { MessageSquare, Server, Send, CheckCircle2, AlertCircle, Loader2, Sparkles, Code2 } from 'lucide-react';

interface OutreachCenterProps {
  whatsAppConfig: WhatsAppConfig;
  setWhatsAppConfig: (cfg: WhatsAppConfig) => void;
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  activeProject: ProjectTag;
}

export const OutreachCenter: React.FC<OutreachCenterProps> = ({
  whatsAppConfig,
  setWhatsAppConfig,
  leads,
  setLeads,
  activeProject
}) => {
  const [serverUrl, setServerUrl] = useState(whatsAppConfig.serverUrl || 'https://wa.transmaxsolutons.com');
  const [apiToken, setApiToken] = useState(whatsAppConfig.apiToken || '');
  const [instanceId, setInstanceId] = useState(whatsAppConfig.instanceId || 'instance_01');
  
  const defaultDreamstayMsg = `Hello {{business_name}}! Greetings from Dreamstay. We discovered your listing in {{city}} and would love to partner with you to boost your guest bookings and direct reservations across Pakistan. Let's connect on WhatsApp!`;
  const defaultGlobetrekMsg = `Hello {{business_name}}! Greetings from Globetrek. We noticed your tour & travel operations in {{city}}. We have corporate travel groups looking for premium tours and mountain expeditions. Let's discuss partnership opportunities!`;

  const [messageTemplate, setMessageTemplate] = useState(
    activeProject === 'Dreamstay' ? defaultDreamstayMsg : defaultGlobetrekMsg
  );

  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [batchLog, setBatchLog] = useState<string[]>([]);

  const handleSaveConfig = () => {
    setWhatsAppConfig({
      ...whatsAppConfig,
      serverUrl: serverUrl.trim(),
      apiToken: apiToken.trim(),
      instanceId: instanceId.trim()
    });
    alert('WhatsApp Server Configuration Saved!');
  };

  const handleRunBatchOutreach = async () => {
    const targetLeads = leads.filter(l => (activeProject === 'General' || l.projectTag === activeProject) && l.outreachStatus === 'New');
    if (targetLeads.length === 0) {
      alert('No new leads found matching the current target project.');
      return;
    }

    setIsSendingBatch(true);
    setBatchLog([`Starting WhatsApp Campaign via ${serverUrl} for ${targetLeads.length} leads...`]);

    let sentCount = 0;
    const updatedLeads = [...leads];

    for (const lead of targetLeads) {
      setBatchLog(prev => [...prev, `Sending to ${lead.title} (${lead.whatsapp || lead.phone})...`]);
      
      const result = await sendWhatsAppMessage(whatsAppConfig, lead, messageTemplate);

      if (result.success) {
        sentCount++;
        setBatchLog(prev => [...prev, `✅ Delivered to ${lead.title} (${result.phone})`]);
        const idx = updatedLeads.findIndex(l => l.id === lead.id);
        if (idx !== -1) {
          const followUpDateStr = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          updatedLeads[idx] = { 
            ...updatedLeads[idx], 
            outreachStatus: 'WhatsApp Sent', 
            lastContactedAt: new Date().toISOString(),
            followUpDate: followUpDateStr
          };
        }
      } else {
        setBatchLog(prev => [...prev, `❌ Failed for ${lead.title}: ${result.error}`]);
      }

      await new Promise(r => setTimeout(r, 600));
    }

    setLeads(updatedLeads);
    setIsSendingBatch(false);
    setBatchLog(prev => [...prev, `🎉 Campaign Complete! Total WhatsApp Messages Delivered: ${sentCount}`]);
  };

  const previewLead: Lead = leads[0] || {
    id: 'sample',
    title: 'Pearl Continental Hotel',
    contactPerson: 'Manager',
    phone: '+923001234567',
    whatsapp: '+923001234567',
    email: 'info@pchotel.pk',
    website: 'https://pchotel.pk',
    address: 'Mall Road, Lahore',
    city: 'Lahore',
    country: 'Pakistan',
    category: '5-Star Hotel',
    source: 'Google Maps',
    projectTag: activeProject,
    outreachStatus: 'New',
    createdAt: new Date().toISOString()
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                wa.transmaxsolutons.com Server Client
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">WhatsApp & Email Campaign Center</h2>
            <p className="text-xs text-slate-400">Automated WhatsApp message dispatcher using your custom WhatsApp API server endpoint.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* WhatsApp Server Settings */}
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Server className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">WhatsApp Server Settings</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">WhatsApp Server URL</label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-300 font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">API Token / Secret Key</label>
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Enter API token..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Instance ID</label>
              <input
                type="text"
                value={instanceId}
                onChange={(e) => setInstanceId(e.target.value)}
                placeholder="e.g. instance_01"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={handleSaveConfig}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Save Server Config
            </button>
          </div>
        </div>

        {/* Template Builder & Dispatcher */}
        <div className="lg:col-span-2 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-base">Campaign Message Template ({activeProject})</h3>
              <p className="text-xs text-slate-400">Use placeholders: <code className="text-emerald-400">{"{{business_name}}"}</code>, <code className="text-emerald-400">{"{{city}}"}</code>, <code className="text-emerald-400">{"{{project}}"}</code></p>
            </div>
          </div>

          <textarea
            rows={4}
            value={messageTemplate}
            onChange={(e) => setMessageTemplate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
          />

          {/* Live Message Preview */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Code2 className="w-3.5 h-3.5 text-teal-400" /> Live Rendered Preview ({previewLead.title}):
            </div>
            <p className="text-xs text-emerald-300 font-mono bg-slate-900 p-3 rounded-lg border border-slate-800">
              {parseMessageTemplate(messageTemplate, previewLead)}
            </p>
          </div>

          <button
            onClick={handleRunBatchOutreach}
            disabled={isSendingBatch}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          >
            {isSendingBatch ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Dispatching WhatsApp Campaign...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" /> Launch WhatsApp Campaign via wa.transmaxsolutons.com
              </>
            )}
          </button>

          {/* Log Output */}
          {batchLog.length > 0 && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-48 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1">
              {batchLog.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

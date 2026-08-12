import React, { useState } from 'react';
import { Lead, ProjectTag, OutreachStatus, WebsiteStatus } from '../types/scraper';
import { exportLeadsToCSV, parseCSVToLeads } from '../services/csvService';
import { checkWebsiteHealth } from '../services/websiteHealthService';
import { probeGoogleForOfficialWebsite } from '../services/googleSearchWebsiteProber';
import { 
  Users, 
  Search, 
  Download, 
  Upload, 
  Filter, 
  Send, 
  Trash2, 
  MapPin,
  ExternalLink,
  Globe,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Clock,
  Calendar,
  BellRing,
  X,
  Tag,
  FolderPlus
} from 'lucide-react';

interface LeadManagerProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  activeProject: ProjectTag;
  onOpenOutreachModal: (lead: Lead) => void;
  onLoadDemoLeads?: () => void;
}

export const LeadManager: React.FC<LeadManagerProps> = ({
  leads,
  setLeads,
  activeProject,
  onOpenOutreachModal,
  onLoadDemoLeads
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedWebStatus, setSelectedWebStatus] = useState<string>('ALL');
  const [selectedGroupTag, setSelectedGroupTag] = useState<string>('ALL');
  const [followUpFilter, setFollowUpFilter] = useState<string>('ALL');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);

  // Follow-up Schedule Drawer state
  const [followUpLead, setFollowUpLead] = useState<Lead | null>(null);
  const [reminderDays, setReminderDays] = useState(3);
  const [reminderNotes, setReminderNotes] = useState('');

  // Group Tagging Modal State
  const [isAssignGroupModalOpen, setIsAssignGroupModalOpen] = useState(false);
  const [newGroupTagName, setNewGroupTagName] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const handleClearDemoLeads = () => {
    if (confirm("Are you sure you want to remove all pre-loaded sample/demo leads? This cannot be undone.")) {
      setLeads(prev => prev.filter(l => !l.id.startsWith('demo_')));
      setSelectedLeadIds([]);
    }
  };

  const handleReAuditWebsites = async () => {
    setIsAuditing(true);
    const updated = [...leads];
    let changedCount = 0;
    let unchangedCount = 0;

    for (let i = 0; i < updated.length; i++) {
      const oldStatus = updated[i].websiteStatus;
      let auditedStatus: WebsiteStatus = 'No Website';

      if (updated[i].website) {
        auditedStatus = await checkWebsiteHealth(updated[i].website);
      } else {
        auditedStatus = 'No Website';
      }

      if (oldStatus !== auditedStatus) {
        changedCount++;
        updated[i] = { ...updated[i], websiteStatus: auditedStatus };
      } else {
        unchangedCount++;
      }
    }

    setLeads(updated);
    setIsAuditing(false);
    alert(
      `🌐 Live Website Health Re-Audit Complete!\n\n` +
      `• Total Leads Audited: ${updated.length}\n` +
      `• Statuses Updated (Changed): ${changedCount}\n` +
      `• Statuses Unchanged: ${unchangedCount}`
    );
  };

  // Collect all unique custom group tags
  const existingGroupTags = Array.from(new Set(leads.map(l => l.groupTag).filter(Boolean))) as string[];

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    const matchesProject = activeProject === 'General' || lead.projectTag === activeProject;
    const matchesSearch = lead.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.phone.includes(searchTerm) ||
                          (lead.groupTag && lead.groupTag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCity = selectedCity === 'ALL' || lead.city.toLowerCase() === selectedCity.toLowerCase();
    const matchesStatus = selectedStatus === 'ALL' || lead.outreachStatus === selectedStatus;
    const matchesSource = selectedSource === 'ALL' || lead.source === selectedSource;
    const matchesGroup = selectedGroupTag === 'ALL' || lead.groupTag === selectedGroupTag;
    
    let matchesWebStatus = true;
    if (selectedWebStatus === 'MISSING_OR_BROKEN') {
      matchesWebStatus = lead.websiteStatus === 'No Website' || lead.websiteStatus === 'Broken (404 Error)' || lead.websiteStatus === 'Facebook Page Only';
    } else if (selectedWebStatus !== 'ALL') {
      matchesWebStatus = lead.websiteStatus === selectedWebStatus;
    }

    let matchesFollowUp = true;
    if (followUpFilter === 'DUE_TODAY') {
      matchesFollowUp = !!lead.followUpDate && lead.followUpDate <= todayStr;
    } else if (followUpFilter === 'CONTACTED') {
      matchesFollowUp = !!lead.lastContactedAt;
    } else if (followUpFilter === 'UNCONTACTED') {
      matchesFollowUp = !lead.lastContactedAt;
    }

    return matchesProject && matchesSearch && matchesCity && matchesStatus && matchesSource && matchesWebStatus && matchesFollowUp && matchesGroup;
  });

  const cities = Array.from(new Set(leads.map(l => l.city))).filter(Boolean);
  const dueFollowUpCount = leads.filter(l => (activeProject === 'General' || l.projectTag === activeProject) && l.followUpDate && l.followUpDate <= todayStr).length;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(selectedLeadIds.filter(i => i !== id));
    } else {
      setSelectedLeadIds([...selectedLeadIds, id]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedLeadIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedLeadIds.length} selected leads?`)) {
      setLeads(leads.filter(l => !selectedLeadIds.includes(l.id)));
      setSelectedLeadIds([]);
    }
  };

  const handleApplyGroupTagToSelected = () => {
    if (!newGroupTagName.trim()) {
      alert('Please enter or select a group tag name (e.g. FB Karachi - Contacted)');
      return;
    }

    const tagName = newGroupTagName.trim();
    setLeads(leads.map(l => selectedLeadIds.includes(l.id) ? { ...l, groupTag: tagName } : l));
    alert(`Assigned group tag "${tagName}" to ${selectedLeadIds.length} leads!`);
    setIsAssignGroupModalOpen(false);
    setNewGroupTagName('');
  };

  const handleStatusChange = (leadId: string, newStatus: OutreachStatus) => {
    setLeads(leads.map(l => l.id === leadId ? { ...l, outreachStatus: newStatus } : l));
  };

  const handleSaveFollowUp = () => {
    if (!followUpLead) return;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + reminderDays);
    const dateStr = targetDate.toISOString().split('T')[0];

    setLeads(leads.map(l => l.id === followUpLead.id ? {
      ...l,
      followUpDate: dateStr,
      followUpNotes: reminderNotes.trim() || `Follow up on ${reminderDays}-day proposal`
    } : l));

    alert(`Follow-up scheduled for ${followUpLead.title} on ${dateStr}!`);
    setFollowUpLead(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await parseCSVToLeads(file);
      const formatted: Lead[] = imported.map((item, idx) => ({
        id: item.id || `imp_${Date.now()}_${idx}`,
        title: item.title || 'Imported Lead',
        phone: item.phone || '',
        whatsapp: item.whatsapp || item.phone || '',
        email: item.email || '',
        website: item.website || '',
        websiteStatus: item.website ? 'Reachable (status unverified)' : 'No Website',
        address: item.address || 'Pakistan',
        city: item.city || 'Lahore',
        country: 'Pakistan',
        category: item.category || 'General Business',
        source: 'CSV Import',
        projectTag: activeProject,
        outreachStatus: 'New',
        createdAt: new Date().toISOString()
      }));

      setLeads([...formatted, ...leads]);
      alert(`Successfully imported ${formatted.length} leads from CSV!`);
    } catch (err: any) {
      alert(`CSV Parsing Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-950 text-teal-300 border border-teal-800">
                {activeProject} Database
              </span>
              {dueFollowUpCount > 0 && (
                <span className="text-xs text-amber-300 font-bold px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 flex items-center gap-1">
                  <BellRing className="w-3 h-3 text-amber-400 animate-pulse" /> {dueFollowUpCount} Follow-ups Due Today!
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2 flex-wrap">
              <span>Lead & Vendor Hub</span>
              <span className="text-xs font-bold text-teal-300 bg-teal-950 px-3 py-1 rounded-full border border-teal-800 shadow-sm">
                {filteredLeads.length} {activeProject === 'Dreamstay' ? (filteredLeads.length === 1 ? 'Hotel/Property' : 'Hotels & Guest Houses') : (filteredLeads.length === 1 ? 'Tour Operator' : 'Tour Operators')} {selectedCity !== 'ALL' ? `in ${selectedCity}` : 'Total'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">Group leads into custom lists (e.g. FB Karachi - Contacted), track history & schedule reminders.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {leads.some(l => l.id.startsWith('demo_')) && (
            <button
              onClick={handleClearDemoLeads}
              className="px-4 py-2.5 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-300 font-bold text-xs border border-red-800 flex items-center gap-2 transition-all"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              Clear Demo Leads
            </button>
          )}

          <button
            onClick={handleReAuditWebsites}
            disabled={isAuditing}
            className="px-4 py-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 font-bold text-xs border border-amber-800 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isAuditing ? 'animate-spin' : ''}`} />
            {isAuditing ? 'Auditing Live Sites...' : 'Re-Audit Website Health'}
          </button>

          <label className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 cursor-pointer flex items-center gap-2 transition-all">
            <Upload className="w-4 h-4 text-teal-400" /> Import CSV
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={() => exportLeadsToCSV(filteredLeads, `${activeProject}_leads_pakistan.csv`)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-teal-500/20 flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" /> Export CSV ({filteredLeads.length})
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search business name..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Group / Tag Filter */}
          <div>
            <select
              value={selectedGroupTag}
              onChange={(e) => setSelectedGroupTag(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-purple-300 font-bold focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">All Custom Groups ({existingGroupTags.length})</option>
              {existingGroupTags.map(gt => (
                <option key={gt} value={gt}>🏷️ {gt}</option>
              ))}
            </select>
          </div>

          {/* Follow-up / Contact History Filter */}
          <div>
            <select
              value={followUpFilter}
              onChange={(e) => setFollowUpFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-300 font-bold focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Contact History</option>
              <option value="DUE_TODAY">⏰ Follow-ups Due Today ({dueFollowUpCount})</option>
              <option value="CONTACTED">✅ Contacted Leads Only</option>
              <option value="UNCONTACTED">🆕 Uncontacted Leads Only</option>
            </select>
          </div>

          {/* Website Health Audit Filter */}
          <div>
            <select
              value={selectedWebStatus}
              onChange={(e) => setSelectedWebStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-300 font-bold focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Website Audits</option>
              <option value="MISSING_OR_BROKEN">🔥 No Website / FB Only / 404 (Hot Targets)</option>
              <option value="Facebook Page Only">📘 Facebook Page Only</option>
              <option value="No Website">⚠️ No Website Listed</option>
              <option value="Broken (404 Error)">❌ Broken Website (404)</option>
              <option value="Active (200 OK)">🌐 Verified (200 OK)</option>
              <option value="Reachable (status unverified)">🔗 Reachable (unverified)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Outreach Statuses</option>
              <option value="New">New</option>
              <option value="WhatsApp Sent">WhatsApp Sent</option>
              <option value="Qualified">Qualified</option>
              <option value="Converted">Converted</option>
            </select>
          </div>

          {/* City Filter */}
          <div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All PK Cities</option>
              {cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Action Toolbar */}
        {selectedLeadIds.length > 0 && (
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs bg-slate-950/60 p-3 rounded-xl">
            <span className="text-teal-400 font-semibold">
              {selectedLeadIds.length} lead(s) selected
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAssignGroupModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-purple-950 text-purple-300 border border-purple-800 hover:bg-purple-900 font-semibold flex items-center gap-1.5"
              >
                <FolderPlus className="w-3.5 h-3.5" /> Assign Custom Group / Tag
              </button>

              <button
                onClick={handleDeleteSelected}
                className="px-3 py-1.5 rounded-lg bg-red-950 text-red-300 border border-red-800 hover:bg-red-900 font-semibold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-lg overflow-hidden">
        {/* Active Filter Summary Bar at Top of Table */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3 bg-slate-950/80 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-medium">Operators Count:</span>
            <span className="text-teal-300 font-extrabold text-sm bg-teal-950 px-2.5 py-0.5 rounded-lg border border-teal-800">
              {filteredLeads.length} {activeProject === 'Dreamstay' ? (filteredLeads.length === 1 ? 'Hotel/Property' : 'Hotels & Guest Houses') : (filteredLeads.length === 1 ? 'Tour Operator' : 'Tour Operators')}
            </span>
            {selectedCity !== 'ALL' && (
              <span className="px-2.5 py-0.5 rounded-lg bg-teal-900/40 text-teal-300 border border-teal-700/60 font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-teal-400" /> City: {selectedCity}
              </span>
            )}
            {selectedStatus !== 'ALL' && (
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-medium">
                Status: {selectedStatus}
              </span>
            )}
            {selectedGroupTag !== 'ALL' && (
              <span className="px-2.5 py-0.5 rounded-lg bg-purple-950 text-purple-300 border border-purple-800 font-medium">
                🏷️ {selectedGroupTag}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {selectedCity !== 'ALL' ? `Filtered by ${selectedCity} (${filteredLeads.length} matching)` : `Showing all cities (${filteredLeads.length} total)`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedLeadIds.length > 0 && selectedLeadIds.length === filteredLeads.length}
                    className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-0"
                  />
                </th>
                <th className="py-3 px-4">Business Name & City</th>
                <th className="py-3 px-4">Custom Group / Tag</th>
                <th className="py-3 px-4">WhatsApp / Phone</th>
                <th className="py-3 px-4">Contacted History</th>
                <th className="py-3 px-4">Follow-up Schedule</th>
                <th className="py-3 px-4">Website Health</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="text-slate-400 text-xs font-semibold">No Pakistan business leads found.</div>
                      <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                        Start scraping from Google Maps or Apify, or upload a CSV file to populate the database.
                      </p>
                      {onLoadDemoLeads && leads.length === 0 && (
                        <button
                          onClick={onLoadDemoLeads}
                          className="mt-2 px-4 py-2 text-xs font-bold text-teal-400 hover:text-teal-300 border border-teal-800 hover:border-teal-700 bg-teal-950/40 hover:bg-teal-950/60 rounded-xl transition-all shadow-md shadow-teal-950/10 flex items-center gap-1.5"
                        >
                          <Sparkles className="w-4 h-4" /> Load Sample/Demo Leads
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isSelected = selectedLeadIds.includes(lead.id);
                  const webStatus = lead.websiteStatus || (lead.website ? 'Reachable (status unverified)' : 'No Website');
                  const isFollowUpDue = !!lead.followUpDate && lead.followUpDate <= todayStr;

                  return (
                    <tr key={lead.id} className={`hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-teal-950/20' : ''} ${isFollowUpDue ? 'bg-amber-950/20' : ''}`}>
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(lead.id)}
                          className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-0"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center flex-wrap gap-2">
                          <div className="font-bold text-white text-sm">{lead.title}</div>
                          {lead.rating !== undefined && (
                            <span className="text-[10px] text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-800/40 font-bold inline-flex items-center gap-0.5">
                              ★ {lead.rating} <span className="text-slate-500 font-normal">({lead.reviewsCount || 0})</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-teal-400" /> {lead.city} • <span className="text-slate-500">{lead.category}</span>
                        </div>
                        {lead.address && (
                          <div className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                            📍 {lead.address}
                          </div>
                        )}
                        {lead.notes && (
                          <div className="text-[10px] text-amber-400/80 mt-1 italic">
                            {lead.notes}
                          </div>
                        )}
                      </td>

                    {/* Custom Group Tag Column */}
                    <td className="py-3 px-4">
                      {lead.groupTag ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800 inline-flex items-center gap-1">
                          🏷️ {lead.groupTag}
                        </span>
                      ) : (
                        <button
                          onClick={() => { setSelectedLeadIds([lead.id]); setIsAssignGroupModalOpen(true); }}
                          className="text-[10px] text-slate-500 hover:text-purple-400 font-medium"
                        >
                          + Add Group
                        </button>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-teal-300">
                        {lead.whatsapp || lead.phone || 'No Phone'}
                      </div>
                      {lead.email && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[150px]">
                          📧 <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a>
                        </div>
                      )}
                    </td>

                    {/* Contact History Column */}
                    <td className="py-3 px-4">
                      {lead.lastContactedAt ? (
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-400" /> Contacted
                          </span>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {new Date(lead.lastContactedAt).toLocaleDateString()} {new Date(lead.lastContactedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          Not Contacted Yet
                        </span>
                      )}
                    </td>

                    {/* Follow-up Schedule Column */}
                    <td className="py-3 px-4">
                      {lead.followUpDate ? (
                        <div className="space-y-0.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                            isFollowUpDue
                              ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}>
                            <Calendar className="w-3 h-3 text-amber-400" /> 
                            {isFollowUpDue ? 'Due Today!' : lead.followUpDate}
                          </span>
                          {lead.followUpNotes && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[140px] italic">
                              "{lead.followUpNotes}"
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => { setFollowUpLead(lead); setReminderNotes(''); }}
                          className="text-[11px] text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
                        >
                          + Set Reminder
                        </button>
                      )}
                    </td>

                    {/* Website Audit Column */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {lead.website && (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-teal-400 hover:text-teal-300 font-semibold hover:underline block truncate max-w-[150px]"
                            title={lead.website}
                          >
                            {lead.website.replace('https://', '').replace('http://', '').replace('www.', '')}
                          </a>
                        )}
                        {webStatus === 'Active (200 OK)' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 inline-flex items-center gap-1">
                            🌐 Verified (200 OK)
                          </span>
                        ) : webStatus === 'Reachable (status unverified)' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-950 text-yellow-300 border border-yellow-800 inline-flex items-center gap-1">
                            🔗 Reachable (unverified)
                          </span>
                        ) : webStatus === 'Facebook Page Only' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800 inline-flex items-center gap-1">
                            📘 FB Page Only
                          </span>
                        ) : webStatus === 'Broken (404 Error)' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-800 inline-flex items-center gap-1">
                            ❌ Broken (404)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 inline-flex items-center gap-1">
                            ⚠️ No Website
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <select
                        value={lead.outreachStatus}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value as OutreachStatus)}
                        className="bg-slate-950 border border-slate-800 text-[11px] font-bold rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-teal-500"
                      >
                        <option value="New">New</option>
                        <option value="WhatsApp Sent">WhatsApp Sent</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Converted">Converted</option>
                        <option value="Unresponsive">Unresponsive</option>
                      </select>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setFollowUpLead(lead); setReminderNotes(lead.followUpNotes || ''); }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700"
                          title="Set Follow-up Schedule"
                        >
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                        {(webStatus === 'No Website' || webStatus === 'Broken (404 Error)' || !lead.website) && (
                          <button
                            onClick={async () => {
                              const probed = await probeGoogleForOfficialWebsite(lead.title, lead.city);
                              const updated = leads.map(l => l.id === lead.id ? { ...l, website: probed.url, websiteStatus: probed.status } : l);
                              setLeads(updated);
                              alert(`🔍 Google Probe Result for "${lead.title}":\n\nOfficial Website: ${probed.url}\nStatus: ${probed.status}`);
                            }}
                            className="px-2 py-1 text-[10px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800 flex items-center gap-1 transition-all"
                            title="Probe Google Search live for 200 OK website"
                          >
                            🔍 Probe Google
                          </button>
                        )}

                        <button
                          onClick={() => onOpenOutreachModal(lead)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition-all shadow-sm"
                        >
                          <Send className="w-3 h-3" /> WhatsApp
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Assign Custom Group Tag Modal */}
      {isAssignGroupModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Assign Custom Group / Tag</h3>
                <p className="text-xs text-purple-400 font-mono mt-0.5">Assigning tag to {selectedLeadIds.length} lead(s)</p>
              </div>
              <button onClick={() => setIsAssignGroupModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Pick Existing Group Tag</label>
                <select
                  onChange={(e) => setNewGroupTagName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Choose Existing Group --</option>
                  {existingGroupTags.map(gt => (
                    <option key={gt} value={gt}>{gt}</option>
                  ))}
                  <option value="FB Karachi - Contacted">FB Karachi - Contacted</option>
                  <option value="Lahore - Hot Web Pitch">Lahore - Hot Web Pitch</option>
                  <option value="Skardu Guest Houses - VIP">Skardu Guest Houses - VIP</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Or Create New Custom Group Tag</label>
                <input
                  type="text"
                  value={newGroupTagName}
                  onChange={(e) => setNewGroupTagName(e.target.value)}
                  placeholder="e.g. FB Karachi - Contacted"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-purple-300 font-bold focus:outline-none focus:border-purple-500 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsAssignGroupModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyGroupTagToSelected}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-500/20"
              >
                <FolderPlus className="w-3.5 h-3.5" /> Assign Group Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Reminder Schedule Modal */}
      {followUpLead && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Schedule Follow-up Reminder</h3>
                <p className="text-xs text-amber-400 font-mono mt-0.5">{followUpLead.title}</p>
              </div>
              <button onClick={() => setFollowUpLead(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Follow-up Timeframe</label>
                <select
                  value={reminderDays}
                  onChange={(e) => setReminderDays(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={1}>In 1 Day (Tomorrow)</option>
                  <option value={3}>In 3 Days (Standard Follow-up)</option>
                  <option value={7}>In 7 Days (1 Week Check-in)</option>
                  <option value={14}>In 14 Days (2 Weeks Check-in)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Follow-up Notes / Goal</label>
                <textarea
                  rows={3}
                  value={reminderNotes}
                  onChange={(e) => setReminderNotes(e.target.value)}
                  placeholder="e.g. Check if GM reviewed proposal link for direct booking engine..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setFollowUpLead(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFollowUp}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
              >
                <BellRing className="w-3.5 h-3.5" /> Save Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

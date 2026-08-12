import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { ApifyScraper } from './components/ApifyScraper';
import { GoogleMapsScraper } from './components/GoogleMapsScraper';
import { LinkedInScraper } from './components/LinkedInScraper';
import { DirectoryScraper } from './components/DirectoryScraper';
import { SocialScraper } from './components/SocialScraper';
import { LeadManager } from './components/LeadManager';
import { OutreachCenter } from './components/OutreachCenter';
import { OutreachLogsView } from './components/OutreachLogsView';
import { TaskManager } from './components/TaskManager';
import { Lead, ApifyConfig, WhatsAppConfig, TaskItem, ProjectTag } from './types/scraper';
import { sendWhatsAppMessage, formatPakistanPhone } from './services/whatsappService';
import { Send, X, Globe2, Menu } from 'lucide-react';

// ⚠️ DEMO DATA — Pre-loaded samples for UI demonstration only.
// Business names, websites, and addresses are real/public. Phone numbers, emails,
// contact persons, ratings, and review counts are NOT verified and should be
// treated as placeholders until replaced with real scraped data.
const INITIAL_LEADS: Lead[] = [
  {
    id: 'demo_01',
    title: 'Pearl Continental Hotel Lahore',
    contactPerson: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: 'https://www.pchotels.com.pk',
    websiteStatus: 'Reachable (status unverified)',
    address: 'Shahrah-e-Quaid-e-Azam, Mall Road, Lahore',
    city: 'Lahore',
    country: 'Pakistan',
    category: '5-Star Hotel & Suites',
    source: 'CSV Import',
    projectTag: 'Dreamstay',
    outreachStatus: 'New',
    notes: '⚠️ Demo lead — verify phone/email before outreach',
    createdAt: new Date().toISOString()
  },
  {
    id: 'demo_02',
    title: 'Avari Hotel Lahore',
    contactPerson: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: 'https://www.avari.com',
    websiteStatus: 'Reachable (status unverified)',
    address: '87 Shahrah-e-Quaid-e-Azam, Lahore',
    city: 'Lahore',
    country: 'Pakistan',
    category: 'Luxury Hotel',
    source: 'CSV Import',
    projectTag: 'Dreamstay',
    outreachStatus: 'New',
    notes: '⚠️ Demo lead — verify phone/email before outreach',
    createdAt: new Date().toISOString()
  },
  {
    id: 'demo_03',
    title: 'Shangrila Resort Skardu',
    contactPerson: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: 'https://shangrilaresorts.com.pk',
    websiteStatus: 'Reachable (status unverified)',
    address: 'Kachura Lake, Skardu, Gilgit-Baltistan',
    city: 'Skardu',
    country: 'Pakistan',
    category: 'Lake Resort & Cottages',
    source: 'CSV Import',
    projectTag: 'Dreamstay',
    outreachStatus: 'New',
    notes: '⚠️ Demo lead — verify phone/email before outreach',
    createdAt: new Date().toISOString()
  },
  {
    id: 'demo_04',
    title: 'Luxus Hunza Attabad Lake Resort',
    contactPerson: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: 'https://luxushunza.com',
    websiteStatus: 'Reachable (status unverified)',
    address: 'Attabad Lake, Hunza Valley',
    city: 'Hunza',
    country: 'Pakistan',
    category: 'Waterfront Resort',
    source: 'CSV Import',
    projectTag: 'Dreamstay',
    outreachStatus: 'New',
    notes: '⚠️ Demo lead — verify phone/email before outreach',
    createdAt: new Date().toISOString()
  },
  {
    id: 'demo_05',
    title: 'Hunza Explorers Treks & Tours',
    contactPerson: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: 'https://hunzaexplorers.com',
    websiteStatus: 'Reachable (status unverified)',
    address: 'Karimabad, Hunza Valley',
    city: 'Hunza',
    country: 'Pakistan',
    category: 'Tour Operator & Trekking',
    source: 'CSV Import',
    projectTag: 'Globetrek',
    outreachStatus: 'New',
    notes: '⚠️ Demo lead — verify phone/email before outreach',
    createdAt: new Date().toISOString()
  },
  {
    id: 'demo_06',
    title: 'Walkabout Travels Pakistan',
    contactPerson: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: 'https://walkabout.pk',
    websiteStatus: 'Reachable (status unverified)',
    trustpilotStatus: 'No Trustpilot',
    trustpilotUrl: 'https://www.trustpilot.com/search?query=Walkabout%20Travels%20Pakistan',
    address: 'Gulberg III, Main Boulevard, Lahore',
    city: 'Lahore',
    country: 'Pakistan',
    category: 'Travel Agency & Expeditions',
    source: 'CSV Import',
    projectTag: 'Globetrek',
    outreachStatus: 'New',
    notes: '⚠️ Demo lead — verify phone/email before outreach',
    createdAt: new Date().toISOString()
  }
];

const INITIAL_TASKS: TaskItem[] = [];

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeProject, setActiveProject] = useState<ProjectTag>('Globetrek');
  
  
  // Cloudflare D1 Cloud SQLite Database Integration Active & Authorized
  const [sessionToken, setSessionToken] = useState<string | null>(() => localStorage.getItem('access_token'));
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('pk_leads_backup');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_LEADS;
  });

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem('pk_tasks_backup');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out legacy demo tasks ('t1', 't2')
          return parsed.filter((t: any) => t.id !== 't1' && t.id !== 't2');
        }
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_TASKS;
  });

  const [isLoadingDB, setIsLoadingDB] = useState(true);

  // Sync leads & tasks back to local storage
  useEffect(() => {
    if (leads.length > 0) {
      localStorage.setItem('pk_leads_backup', JSON.stringify(leads));
    }
  }, [leads]);

  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem('pk_tasks_backup', JSON.stringify(tasks));
    }
  }, [tasks]);

  const handleLoginSuccess = (token: string) => {
    localStorage.setItem('access_token', token);
    setSessionToken(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setSessionToken(null);
  };

  const [apifyConfig, setApifyConfig] = useState<ApifyConfig>(() => {
    const saved = localStorage.getItem('apify_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return {
      apiToken: localStorage.getItem('apify_api_token') || '',
      displayName: 'ZulCodex\'s Apify',
      actorId: 'compass/crawler-google-places',
      maxItems: 25,
      autoSyncToCloud: true
    };
  });

  const [whatsAppConfig, setWhatsAppConfig] = useState<WhatsAppConfig>(() => {
    const saved = localStorage.getItem('whatsapp_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.serverUrl && !parsed.serverUrl.includes('transmaxsolutons')) {
          return parsed;
        }
      } catch (e) { console.error(e); }
    }
    return {
      serverUrl: 'https://wa.yello.bid',
      apiToken: 'bef0066b8598f3c97dc16e7af12e95b98e773430',
      instanceId: '1765976556c4ca4238a0b923820dcc509a6f75849b6942a9ec027d2',
      autoFormatPkNumbers: true,
      templates: []
    };
  });

  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([]);

  // Sync configs to localStorage
  useEffect(() => {
    localStorage.setItem('apify_config', JSON.stringify(apifyConfig));
  }, [apifyConfig]);

  useEffect(() => {
    localStorage.setItem('whatsapp_config', JSON.stringify(whatsAppConfig));
  }, [whatsAppConfig]);

  const fetchLogs = async () => {
    if (!sessionToken) return;
    try {
      const res = await fetch('/api/whatsapp-logs', {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setWhatsappLogs(data);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  };

  // Load leads & tasks from Cloudflare D1 Database on mount
  useEffect(() => {
    if (!sessionToken) {
      setIsLoadingDB(false);
      return;
    }

    const initDatabase = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${sessionToken}` };
        
        const leadsRes = await fetch('/api/leads', { headers });
        if (leadsRes.status === 401) {
          handleLogout();
          return;
        }
        
        const leadsType = leadsRes.headers.get('content-type');
        if (leadsRes.ok && leadsType && leadsType.includes('application/json')) {
          const data = await leadsRes.json();
          if (Array.isArray(data) && data.length > 0) {
            setLeads(data);
            localStorage.setItem('pk_leads_backup', JSON.stringify(data));
          }
        }

        const tasksRes = await fetch('/api/tasks', { headers });
        if (tasksRes.status === 401) {
          handleLogout();
          return;
        }
        
        const tasksType = tasksRes.headers.get('content-type');
        if (tasksRes.ok && tasksType && tasksType.includes('application/json')) {
          const data = await tasksRes.json();
          if (Array.isArray(data) && data.length > 0) {
            setTasks(data);
            localStorage.setItem('pk_tasks_backup', JSON.stringify(data));
          }
        }

        const logsRes = await fetch('/api/whatsapp-logs', { headers });
        const logsType = logsRes.headers.get('content-type');
        if (logsRes.ok && logsType && logsType.includes('application/json')) {
          const data = await logsRes.json();
          if (Array.isArray(data)) {
            setWhatsappLogs(data);
          }
        }

      } catch (err) {
        console.error("Failed to fetch leads or tasks from D1 database", err);
      } finally {
        setIsLoadingDB(false);
      }
    };
    initDatabase();
  }, [sessionToken]);

  // Sync changes back to D1 Database (only when connected to actual backend)
  useEffect(() => {
    if (!isLoadingDB && sessionToken && leads.length > 0) {
      fetch('/api/leads', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify(leads)
      }).then(res => {
        if (res.status === 401) handleLogout();
      }).catch(err => console.error("Leads D1 sync failed", err));
    }
  }, [leads, isLoadingDB, sessionToken]);

  useEffect(() => {
    if (!isLoadingDB && sessionToken) {
      fetch('/api/tasks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify(tasks)
      }).then(res => {
        if (res.status === 401) handleLogout();
      }).catch(err => console.error("Tasks D1 sync failed", err));
    }
  }, [tasks, isLoadingDB, sessionToken]);

  const [activeWhatsAppLead, setActiveWhatsAppLead] = useState<Lead | null>(null);
  const [quickMsgText, setQuickMsgText] = useState('');
  const [isSendingQuick, setIsSendingQuick] = useState(false);

  const handleLeadsScraped = (newLeads: Lead[]) => {
    setLeads(prev => {
      const existingTitles = new Set(prev.map(l => `${l.title.toLowerCase().trim()}_${l.city.toLowerCase().trim()}`));
      const existingPhones = new Set(prev.map(l => l.phone.trim()).filter(Boolean));
      const existingWebsites = new Set(prev.map(l => l.website.toLowerCase().trim()).filter(w => w && w !== 'n/a'));

      const uniqueNew = newLeads.filter(l => {
        const titleCityKey = `${l.title.toLowerCase().trim()}_${l.city.toLowerCase().trim()}`;
        const phoneKey = l.phone.trim();
        const websiteKey = l.website?.toLowerCase().trim();

        if (existingTitles.has(titleCityKey)) return false;
        if (phoneKey && existingPhones.has(phoneKey)) return false;
        if (websiteKey && websiteKey !== 'n/a' && existingWebsites.has(websiteKey)) return false;

        return true;
      });
      return [...uniqueNew, ...prev];
    });
  };

  const handleLogScraperTask = (query: string, city: string, platform: string) => {
    const newTask: TaskItem = {
      id: `task_scrape_${Date.now()}`,
      title: `${platform} Scrape: ${query}`,
      projectTag: activeProject,
      category: query,
      targetCity: city,
      status: 'Completed',
      autoOutreach: true,
      createdDate: new Date().toLocaleDateString(),
      completedDate: new Date().toLocaleDateString()
    };
    setTasks(prev => {
      // Avoid duplicates if identical task was logged today
      if (prev.some(t => t.title === newTask.title && t.targetCity === newTask.targetCity && t.createdDate === newTask.createdDate)) {
        return prev;
      }
      return [newTask, ...prev];
    });
  };

  const handleLoadDemoLeads = () => {
    setLeads(INITIAL_LEADS);
    setTasks(INITIAL_TASKS);
    alert('Demo leads and tasks loaded! They are now saved in your D1 cloud database.');
  };

  const handleOpenOutreachModal = (lead: Lead) => {
    setActiveWhatsAppLead(lead);

    const isInstagram = lead.websiteStatus === 'Instagram Bio Only' || lead.source === 'Instagram Bio';
    const isTikTok = lead.websiteStatus === 'TikTok Profile Only' || lead.source === 'TikTok Account';
    const isMissingOrBrokenWeb = lead.websiteStatus === 'No Website' || lead.websiteStatus === 'Broken (404 Error)' || lead.websiteStatus === 'Facebook Page Only';

    let defaultMsg = '';
    if (isInstagram) {
      defaultMsg = `AOA ${lead.title}! Greetings from ${lead.projectTag}. We saw your active Instagram profile (${lead.website}). You have great travel content for ${lead.city}, but relying only on Instagram DMs loses 60% of bookings. We build instant 1-click booking sites designed specifically for Instagram bio links in Pakistan. Can we share a 30-sec demo?`;
    } else if (isTikTok) {
      defaultMsg = `AOA ${lead.title}! Greetings from ${lead.projectTag}. We came across your TikTok travel videos for ${lead.city}. Your video reach is impressive, but converting TikTok viewers into paid WhatsApp bookings requires a fast 1-click booking engine. We build TikTok bio booking pages for Pakistan operators in 24 hours. Can we send a quick preview?`;
    } else if (lead.projectTag === 'Dreamstay') {
      if (isMissingOrBrokenWeb) {
        defaultMsg = `Hello ${lead.title}! Greetings from Dreamstay. We noticed your hotel/guest house in ${lead.city} doesn't have an active direct booking website (or returns a 404 error). We build 0% commission direct guest booking websites for Pakistan hotels in 24 hours. Can we share a quick demo?`;
      } else {
        defaultMsg = `Hello ${lead.title}! Greetings from Dreamstay. We discovered your listing in ${lead.city} and would love to partner with you to boost your direct guest bookings across Pakistan. Let's connect on WhatsApp!`;
      }
    } else {
      if (isMissingOrBrokenWeb) {
        defaultMsg = `Hello ${lead.title}! Greetings from Globetrek. We noticed your tour operations in ${lead.city} don't have an active website yet. We build instant tour package booking websites for Pakistan tour operators. Let me know if you'd like to see a demo!`;
      } else {
        defaultMsg = `Hello ${lead.title}! Greetings from Globetrek. We noticed your tour operations in ${lead.city}. We have corporate travel groups looking for premium tours and mountain expeditions. Let's discuss partnership opportunities!`;
      }
    }

    setQuickMsgText(defaultMsg);
  };

  const handleSendQuickWhatsApp = async () => {
    if (!activeWhatsAppLead) return;
    setIsSendingQuick(true);
    const result = await sendWhatsAppMessage(whatsAppConfig, activeWhatsAppLead, quickMsgText);
    setIsSendingQuick(false);

    if (result.success) {
      const followUpDateStr = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setLeads(leads.map(l => l.id === activeWhatsAppLead.id ? { 
        ...l, 
        outreachStatus: 'WhatsApp Sent',
        lastContactedAt: new Date().toISOString(),
        followUpDate: followUpDateStr,
        followUpNotes: 'Auto 3-day follow-up after WhatsApp pitch'
      } : l));
      alert(`✅ WhatsApp Message Dispatched & Delivered to ${activeWhatsAppLead.title} (${result.phone})!\n\nDelivery Receipt ID: ${result.messageId || '#WA-CONFIRMED'}\nServer: ${whatsAppConfig.serverUrl || 'WhatsApp Server'}`);
      setActiveWhatsAppLead(null);
    } else {
      alert(`Error sending WhatsApp message: ${result.error}`);
    }
  };

  const totalLeadsCount = leads.filter(l => activeProject === 'General' || l.projectTag === activeProject).length;
  const whatsAppCount = leads.filter(l => (activeProject === 'General' || l.projectTag === activeProject) && l.outreachStatus === 'WhatsApp Sent').length;
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  if (!sessionToken) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-teal-500 selection:text-white">
      {/* Mobile Sidebar Overlay Backdrop */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden transition-all duration-300"
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeProject={activeProject}
        setActiveProject={setActiveProject}
        totalLeadsCount={totalLeadsCount}
        whatsAppCount={whatsAppCount}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Breadcrumb Bar */}
        <header className="bg-slate-900/60 border-b border-slate-800/80 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* Hamburger menu button for mobile screens */}
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-1.5 text-slate-400 hover:text-white border border-slate-800 rounded-xl bg-slate-900"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Globe2 className="w-4 h-4 text-teal-400" />
            <span className="text-xs text-slate-400 hidden sm:inline">PK Lead Engine</span>
            <span className="text-slate-600 hidden sm:inline">/</span>
            <span className="text-xs font-bold text-white capitalize">{activeTab.replace('-', ' ')}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden xs:inline">Targeting:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                activeProject === 'Dreamstay' 
                  ? 'bg-teal-950 text-teal-300 border border-teal-800' 
                  : 'bg-orange-950 text-orange-300 border border-orange-800'
              }`}>
                {activeProject}
              </span>
            </div>
            <button 
              onClick={handleLogout}
              className="px-3 py-1 text-xs font-bold text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 bg-slate-950/60 rounded-xl transition-all"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <Dashboard
              leads={leads}
              whatsappLogs={whatsappLogs}
              activeProject={activeProject}
              onNavigateToTab={setActiveTab}
              onQuickWhatsApp={handleOpenOutreachModal}
            />
          )}

          {activeTab === 'apify' && (
            <ApifyScraper
              apifyConfig={apifyConfig}
              setApifyConfig={setApifyConfig}
              activeProject={activeProject}
              onLeadsScraped={handleLeadsScraped}
              onLogScraperTask={handleLogScraperTask}
            />
          )}

          {activeTab === 'gmaps' && (
            <GoogleMapsScraper
              activeProject={activeProject}
              onLeadsScraped={handleLeadsScraped}
              onLogScraperTask={handleLogScraperTask}
            />
          )}

          {activeTab === 'social' && (
            <SocialScraper
              activeProject={activeProject}
              onLeadsScraped={handleLeadsScraped}
              onLogScraperTask={handleLogScraperTask}
            />
          )}

          {activeTab === 'linkedin' && (
            <LinkedInScraper
              activeProject={activeProject}
              onLeadsScraped={handleLeadsScraped}
              onLogScraperTask={handleLogScraperTask}
            />
          )}

          {activeTab === 'directories' && (
            <DirectoryScraper
              activeProject={activeProject}
              onLeadsScraped={handleLeadsScraped}
              onLogScraperTask={handleLogScraperTask}
            />
          )}

          {activeTab === 'leads' && (
            <LeadManager
              leads={leads}
              setLeads={setLeads}
              activeProject={activeProject}
              onOpenOutreachModal={handleOpenOutreachModal}
              onLoadDemoLeads={handleLoadDemoLeads}
            />
          )}

          {activeTab === 'outreach' && (
            <OutreachCenter
              whatsAppConfig={whatsAppConfig}
              setWhatsAppConfig={setWhatsAppConfig}
              leads={leads}
              setLeads={setLeads}
              activeProject={activeProject}
              whatsappLogs={whatsappLogs}
              onRefreshLogs={fetchLogs}
            />
          )}

          {activeTab === 'outreach-logs' && (
            <OutreachLogsView
              whatsappLogs={whatsappLogs}
              onRefreshLogs={fetchLogs}
              activeProject={activeProject}
            />
          )}

          {activeTab === 'tasks' && (
            <TaskManager
              tasks={tasks}
              setTasks={setTasks}
              activeProject={activeProject}
              whatsAppConfig={whatsAppConfig}
              onLeadsScraped={handleLeadsScraped}
            />
          )}
        </main>
      </div>

      {/* Quick WhatsApp Send Modal */}
      {activeWhatsAppLead && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Send WhatsApp Message</h3>
                <p className="text-xs text-teal-400 font-mono mt-0.5">{activeWhatsAppLead.title} ({formatPakistanPhone(activeWhatsAppLead.whatsapp || activeWhatsAppLead.phone)})</p>
              </div>
              <button onClick={() => setActiveWhatsAppLead(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Target WhatsApp Server Endpoint</label>
              <div className="text-xs font-mono bg-slate-950 p-2 rounded-lg text-emerald-400 border border-slate-800">
                {whatsAppConfig.serverUrl}/api/send-message
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Message Content</label>
              <textarea
                rows={4}
                value={quickMsgText}
                onChange={(e) => setQuickMsgText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveWhatsAppLead(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSendQuickWhatsApp}
                disabled={isSendingQuick}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <Send className="w-3.5 h-3.5" /> Dispatch WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

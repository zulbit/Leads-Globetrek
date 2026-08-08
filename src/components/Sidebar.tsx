import React from 'react';
import { ProjectTag } from '../types/scraper';
import { 
  BarChart3, 
  Bot, 
  MapPin, 
  Linkedin, 
  Building2, 
  Users, 
  MessageSquare, 
  CheckSquare, 
  Globe2, 
  Sparkles,
  Server,
  Share2,
  X
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeProject: ProjectTag;
  setActiveProject: (proj: ProjectTag) => void;
  totalLeadsCount: number;
  whatsAppCount: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeProject,
  setActiveProject,
  totalLeadsCount,
  whatsAppCount,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const navSections = [
    {
      group: 'Overview',
      items: [
        { id: 'dashboard', label: 'Analytics Dashboard', icon: BarChart3 }
      ]
    },
    {
      group: 'Lead Scrapers',
      items: [
        { id: 'apify', label: 'Apify Cloud Scraper', icon: Bot, badge: 'Apify API' },
        { id: 'gmaps', label: 'Google Maps & Business', icon: MapPin },
        { id: 'social', label: 'FB / Insta / TikTok', icon: Share2, badge: 'Social' },
        { id: 'linkedin', label: 'LinkedIn Profiles', icon: Linkedin },
        { id: 'directories', label: 'Pak Directories', icon: Building2 }
      ]
    },
    {
      group: 'Management & Outreach',
      items: [
        { id: 'leads', label: 'Lead Hub & CSV Export', icon: Users },
        { id: 'outreach', label: 'WhatsApp Server Outreach', icon: MessageSquare, badge: 'wa.transmax' },
        { id: 'tasks', label: 'Tasks & Automation', icon: CheckSquare }
      ]
    }
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800/80 flex flex-col justify-between h-screen transition-transform duration-300 transform ${
      isMobileOpen ? 'translate-x-0' : '-translate-x-full'
    } md:translate-x-0 md:static md:flex-shrink-0`}>
      <div className="p-4 space-y-6 overflow-y-auto scrollbar-thin">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-orange-500 p-0.5 shadow-lg shadow-teal-500/10">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Globe2 className="w-5 h-5 text-teal-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base text-white tracking-tight">PK Lead Engine</h1>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-950 text-teal-300 border border-teal-800/50">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Scraper & Outreach SaaS</p>
            </div>
          </div>
          
          {/* Close button for mobile */}
          <button 
            onClick={onCloseMobile}
            className="md:hidden p-1 text-slate-400 hover:text-white border border-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Project Target Switcher (Dreamstay vs Globetrek) */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> Active Target Market
          </label>
          <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveProject('Dreamstay')}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeProject === 'Dreamstay'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-teal-950"></span>
              Dreamstay
            </button>
            <button
              onClick={() => setActiveProject('Globetrek')}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeProject === 'Globetrek'
                  ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-orange-950"></span>
              Globetrek
            </button>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-5">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1">
                {section.group}
              </h3>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-teal-500/20 to-teal-500/10 text-teal-300 border border-teal-500/30 shadow-md shadow-teal-500/5'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-950 text-teal-300 border border-teal-800">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer System & Stats Widget */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400">Total Leads</div>
            <div className="text-sm font-extrabold text-teal-400">{totalLeadsCount}</div>
          </div>
          <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400">WhatsApp</div>
            <div className="text-sm font-extrabold text-emerald-400">{whatsAppCount}</div>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Server className="w-3 h-3 text-emerald-400" /> Server:
          </span>
          <span className="text-emerald-400 font-mono text-[10px]">wa.transmax</span>
        </div>
      </div>
    </aside>
  );
};

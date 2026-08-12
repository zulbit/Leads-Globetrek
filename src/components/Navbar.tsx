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
  Sparkles 
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeProject: ProjectTag;
  setActiveProject: (proj: ProjectTag) => void;
  totalLeadsCount: number;
  whatsAppCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeProject,
  setActiveProject,
  totalLeadsCount,
  whatsAppCount
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Analytics Dashboard', icon: BarChart3 },
    { id: 'apify', label: 'Apify Cloud Scraper', icon: Bot, badge: 'Apify API' },
    { id: 'gmaps', label: 'Google Maps & Business', icon: MapPin },
    { id: 'linkedin', label: 'LinkedIn Profiles', icon: Linkedin },
    { id: 'directories', label: 'Pak Business Directories', icon: Building2 },
    { id: 'leads', label: 'Lead Hub & CSV', icon: Users },
    { id: 'outreach', label: 'WhatsApp Server Outreach', icon: MessageSquare, badge: 'Outreach' },
    { id: 'tasks', label: 'Tasks & Automation', icon: CheckSquare },
  ];

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between h-16 border-b border-slate-800/60 py-2">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-orange-500 p-0.5 shadow-lg shadow-teal-500/10">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Globe2 className="w-5 h-5 text-teal-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg text-white tracking-tight">PK Lead Engine</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-950/80 text-teal-300 border border-teal-800/50">
                  v2.4 PRO
                </span>
              </div>
              <p className="text-xs text-slate-400">Pakistan Hospitality & Tourism Lead Generator</p>
            </div>
          </div>

          {/* Project Switcher Badges (Dreamstay vs Globetrek) */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-400 px-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Active Target:
            </span>
            <button
              onClick={() => setActiveProject('Dreamstay')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeProject === 'Dreamstay'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-teal-950"></span>
              Dreamstay (Stays/Hotels)
            </button>
            <button
              onClick={() => setActiveProject('Globetrek')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeProject === 'Globetrek'
                  ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-orange-950"></span>
              Globetrek (Tours/Travel)
            </button>
          </div>

          {/* Live Metric Tickers */}
          <div className="hidden lg:flex items-center gap-4 text-xs">
            <div className="bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
              <span className="text-slate-400">Total Scraped:</span>
              <span className="font-bold text-teal-400 text-sm">{totalLeadsCount}</span>
            </div>
            <div className="bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
              <span className="text-slate-400">WhatsApp Sent:</span>
              <span className="font-bold text-emerald-400 text-sm">{whatsAppCount}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-500/20 to-teal-500/10 text-teal-300 border border-teal-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-950 text-teal-400 border border-teal-800">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

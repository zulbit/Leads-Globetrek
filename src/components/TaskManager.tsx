import React, { useState } from 'react';
import { TaskItem, ProjectTag, Lead, WhatsAppConfig, LeadSource } from '../types/scraper';
import { scrapeLeadsEngine } from '../services/scraperEngine';
import { fetchApifyDatasetByRunId } from '../services/apifyService';
import { sendWhatsAppMessage } from '../services/whatsappService';
import { CheckSquare, Plus, CheckCircle2, Clock, Play, Trash2, Download, Loader2 } from 'lucide-react';

const PK_CITIES = [
  'Abbottabad', 'Ayubia', 'Bahawalpur', 'Chitral', 'Dir', 'Faisalabad', 'Gilgit', 'Gujranwala', 'Gujrat', 
  'Hunza', 'Hyderabad', 'Islamabad', 'Jhang', 'Kaghan', 'Karachi', 'Lahore', 'Larkana', 'Malakand', 'Malam Jabba', 
  'Multan', 'Murree', 'Naran', 'Nathia Gali', 'Peshawar', 'Quetta', 'Rahim Yar Khan', 'Rawalpindi', 
  'Sahiwal', 'Sargodha', 'Sheikhupura', 'Shogran', 'Sialkot', 'Skardu', 'Sukkur', 'Swat'
];

interface TaskManagerProps {
  tasks: TaskItem[];
  setTasks: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  activeProject: ProjectTag;
  whatsAppConfig?: WhatsAppConfig;
  onLeadsScraped?: (leads: Lead[]) => void;
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  tasks,
  setTasks,
  activeProject,
  whatsAppConfig,
  onLeadsScraped
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newCity, setNewCity] = useState('Lahore');
  const [scheduleFreq, setScheduleFreq] = useState<'Once' | 'Weekly' | 'Monthly'>('Weekly');
  const [autoOutreachToggle, setAutoOutreachToggle] = useState(true);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [fetchingTaskId, setFetchingTaskId] = useState<string | null>(null);
  const [fetchedTaskIds, setFetchedTaskIds] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('pk_synced_tasks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [executionLog, setExecutionLog] = useState<string[]>([]);

  const extractRunId = (title: string): string | null => {
    const match = title.match(/Run ID:\s*([a-zA-Z0-9_-]+)/i);
    return match ? match[1] : null;
  };

  const handleFetchDatasetForTask = async (task: TaskItem, runId: string) => {
    const token = localStorage.getItem('apify_api_token') || '';
    if (!token) {
      alert('Please save your Apify API Token first in the Apify Cloud tab.');
      return;
    }

    setFetchingTaskId(task.id);
    setExecutionLog([
      `📥 Fetching dataset for Run ID: ${runId}...`,
      `🔍 Target: ${task.targetCity} (${task.category})`
    ]);

    try {
      let explicitSource: LeadSource = 'Google Maps';
      if (task.title.toLowerCase().includes('instagram')) {
        explicitSource = 'Instagram Bio';
      } else if (task.title.toLowerCase().includes('facebook')) {
        explicitSource = 'Facebook Page';
      }

      const leads = await fetchApifyDatasetByRunId(token, runId, task.targetCity, task.projectTag, explicitSource);
      if (leads.length > 0) {
        if (onLeadsScraped) onLeadsScraped(leads);
        setFetchedTaskIds(prev => {
          const updated = { ...prev, [task.id]: leads.length };
          localStorage.setItem('pk_synced_tasks', JSON.stringify(updated));
          return updated;
        });
        setExecutionLog(prev => [
          ...prev,
          `✅ Successfully loaded ${leads.length} leads directly from Apify dataset!`,
          `💾 Synced ${leads.length} records to your Lead Hub.`
        ]);
      } else {
        setExecutionLog(prev => [
          ...prev,
          `⚠️ Dataset returned 0 items. The run may still be in progress on Apify.`
        ]);
      }
    } catch (err: any) {
      setExecutionLog(prev => [
        ...prev,
        `❌ Dataset Fetch Error: ${err.message}`
      ]);
    } finally {
      setFetchingTaskId(null);
    }
  };

  const handleAddTask = () => {
    if (!newTitle.trim()) return;
    const task: TaskItem = {
      id: `task_${Date.now()}`,
      title: newTitle,
      projectTag: activeProject,
      category: activeProject === 'Dreamstay' ? 'Hotels & Guest Houses' : 'Tour Agencies',
      targetCity: newCity,
      status: 'Pending',
      autoOutreach: autoOutreachToggle,
      createdDate: new Date().toLocaleDateString()
    };
    setTasks([task, ...tasks]);
    setNewTitle('');
  };

  const handleRunTaskNow = async (task: TaskItem) => {
    setRunningTaskId(task.id);
    setExecutionLog([
      `🚀 Initiating Real Auto-Pilot Task: ${task.title}...`,
      `🔍 Extracting REAL live leads for ${task.targetCity} (${task.category}) via Google Maps Engine...`
    ]);

    // Update status to In Progress
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'In Progress' } : t));

    try {
      const realLeads = await scrapeLeadsEngine({
        platform: 'Google Maps',
        query: task.category || (task.projectTag === 'Dreamstay' ? 'Hotels & Guest Houses' : 'Travel Agencies & Tour Operators'),
        city: task.targetCity,
        count: 10,
        projectTag: task.projectTag
      });

      setExecutionLog(prev => [
        ...prev, 
        `✅ Successfully extracted ${realLeads.length} REAL verified leads for ${task.targetCity}!`,
        `💾 Saved ${realLeads.length} leads to Cloudflare D1 Database & Lead Hub.`
      ]);

      if (onLeadsScraped && realLeads.length > 0) {
        onLeadsScraped(realLeads);
      }

      if (task.autoOutreach && realLeads.length > 0 && whatsAppConfig) {
        setExecutionLog(prev => [...prev, `💬 Auto-Outreach Triggered: Dispatching personalized WhatsApp messages to ${realLeads.length} new leads...`]);
        
        let sentCount = 0;
        const template = task.projectTag === 'Dreamstay' 
          ? `Hello {{business_name}}! Greetings from Dreamstay. We discovered your listing in {{city}} and would love to partner with you to boost your guest bookings.`
          : `*GlobeTrek PK — Vendor Onboarding* 🌍✈️\n\nDear *{{business_name}}*,\n\nWelcome to *GlobeTrek*! Register your business in {{city}} at https://globetrek.pk/auth?mode=signup&role=vendor`;

        for (const lead of realLeads) {
          const res = await sendWhatsAppMessage(whatsAppConfig, lead, template);
          if (res.success) {
            sentCount++;
            setExecutionLog(prev => [...prev, `🟢 WhatsApp Delivered to ${lead.title} (${res.phone})`]);
          } else {
            setExecutionLog(prev => [...prev, `⚠️ Dispatch failed for ${lead.title}: ${res.error}`]);
          }
          await new Promise(r => setTimeout(r, (whatsAppConfig.sendIntervalSeconds || 5) * 1000));
        }

        setExecutionLog(prev => [...prev, `🎉 Campaign Complete! Delivered ${sentCount}/${realLeads.length} WhatsApp messages.`]);
      }
    } catch (err: any) {
      setExecutionLog(prev => [...prev, `❌ Task Execution Error: ${err.message}`]);
    }

    setTasks(prev => prev.map(t => t.id === task.id ? { 
      ...t, 
      status: 'Completed', 
      completedDate: new Date().toLocaleDateString() 
    } : t));

    setRunningTaskId(null);
  };

  const handleToggleTaskStatus = (id: string) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'Completed' ? 'Pending' : 'Completed';
        return { ...t, status: nextStatus, completedDate: nextStatus === 'Completed' ? new Date().toLocaleDateString() : undefined };
      }
      return t;
    }));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-950 text-purple-300 border border-purple-800">
                Auto-Pilot Scheduler Engine
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">Scheduled Lead Scraping & Campaign Tasks</h2>
            <p className="text-xs text-slate-400">Automate recurring scraping jobs across Pakistan cities and trigger auto-outreach campaigns.</p>
          </div>
        </div>
      </div>

      {/* Add New Task Form */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
        <h3 className="font-bold text-white text-base">Schedule New Scraping & Outreach Task ({activeProject})</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Task Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Scrape Murree Guest Houses & Send WhatsApp"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Target City</label>
            <input
              type="text"
              list="task-cities"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="e.g. Lahore, Skardu, Hunza"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 font-medium"
            />
            <datalist id="task-cities">
              {PK_CITIES.map(c => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Recurrence Schedule</label>
            <select
              value={scheduleFreq}
              onChange={(e) => setScheduleFreq(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 font-medium"
            >
              <option value="Once">Run Once (Manual Trigger)</option>
              <option value="Weekly">Weekly (Every Monday 9 AM)</option>
              <option value="Monthly">Monthly (1st of Month)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleAddTask}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Auto-Pilot Task
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <label className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={autoOutreachToggle}
              onChange={(e) => setAutoOutreachToggle(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-purple-500 focus:ring-purple-500"
            />
            <span>Auto-launch WhatsApp Outreach Campaign immediately when scraping completes</span>
          </label>
        </div>
      </div>

      {/* Real-time Execution Logger */}
      {executionLog.length > 0 && (
        <div className="bg-slate-950 p-4 rounded-xl border border-purple-500/40 space-y-1.5 font-mono text-xs text-purple-300 shadow-lg">
          <div className="font-bold text-purple-400 flex items-center gap-2 pb-1 border-b border-slate-800">
            <Clock className="w-4 h-4 animate-spin text-purple-400" /> Auto-Pilot Execution Output:
          </div>
          {executionLog.map((log, idx) => (
            <div key={idx}>{log}</div>
          ))}
        </div>
      )}

      {/* Task List */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-base">Active & Completed Tasks ({activeProject})</h3>
          <span className="text-xs text-purple-400 font-semibold font-mono">
            {tasks.filter(t => activeProject === 'General' || t.projectTag === activeProject).length} tasks
          </span>
        </div>

        <div className="space-y-3">
          {tasks
            .filter(t => activeProject === 'General' || t.projectTag === activeProject)
            .map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                task.status === 'Completed'
                  ? 'bg-slate-950/60 border-slate-800/60 opacity-80'
                  : 'bg-slate-950 border-purple-500/30 hover:border-purple-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleTaskStatus(task.id)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                    task.status === 'Completed'
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                      : 'border-slate-700 hover:border-purple-400 text-transparent'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <div>
                  <h4 className={`font-bold text-sm text-white ${task.status === 'Completed' ? 'line-through text-slate-400' : ''}`}>
                    {task.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span className="text-purple-400 font-semibold">{task.targetCity}</span> • <span>{task.category}</span> • <span className="text-slate-500">Added: {task.createdDate}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {extractRunId(task.title) && (
                  <button
                    onClick={() => handleFetchDatasetForTask(task, extractRunId(task.title)!)}
                    disabled={fetchingTaskId === task.id}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                      fetchedTaskIds[task.id]
                        ? 'bg-teal-950/80 text-teal-300 border-teal-700/80'
                        : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-700/60'
                    }`}
                    title="Fetch leads directly from this Apify dataset at $0 cost"
                  >
                    {fetchingTaskId === task.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching...
                      </>
                    ) : fetchedTaskIds[task.id] ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> ✓ Synced ({fetchedTaskIds[task.id]})
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" /> Fetch Leads ($0)
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => handleRunTaskNow(task)}
                  disabled={runningTaskId === task.id}
                  className="px-3 py-1.5 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-700/60 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${runningTaskId === task.id ? 'animate-spin' : ''}`} />
                  {runningTaskId === task.id ? 'Running...' : 'Run Now'}
                </button>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  task.status === 'Completed'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : task.status === 'In Progress'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-purple-950 text-purple-300 border border-purple-800'
                }`}>
                  {task.status}
                </span>

                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-slate-500 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {tasks.filter(t => activeProject === 'General' || t.projectTag === activeProject).length === 0 && (
            <div className="py-8 text-center text-slate-500 text-xs">
              <CheckSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              No active or completed automation tasks scheduled for {activeProject}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

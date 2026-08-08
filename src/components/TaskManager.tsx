import React, { useState } from 'react';
import { TaskItem, ProjectTag } from '../types/scraper';
import { CheckSquare, Plus, CheckCircle2, Clock, Play, Trash2 } from 'lucide-react';

interface TaskManagerProps {
  tasks: TaskItem[];
  setTasks: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  activeProject: ProjectTag;
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  tasks,
  setTasks,
  activeProject
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newCity, setNewCity] = useState('Lahore');

  const handleAddTask = () => {
    if (!newTitle.trim()) return;
    const task: TaskItem = {
      id: `task_${Date.now()}`,
      title: newTitle,
      projectTag: activeProject,
      category: activeProject === 'Dreamstay' ? 'Hotels & Guest Houses' : 'Tour Agencies',
      targetCity: newCity,
      status: 'Pending',
      autoOutreach: true,
      createdDate: new Date().toLocaleDateString()
    };
    setTasks([task, ...tasks]);
    setNewTitle('');
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
                Task Automation & Completion Scheduler
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">Scheduled Lead Scraping & Campaign Tasks</h2>
            <p className="text-xs text-slate-400">Automate recurring scraping jobs across Pakistan cities and track completion status.</p>
          </div>
        </div>
      </div>

      {/* Add New Task Form */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
        <h3 className="font-bold text-white text-base">Schedule New Scraping & Outreach Task ({activeProject})</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Task Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Scrape Murree Guest Houses & Send WhatsApp"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Target City</label>
            <input
              type="text"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="e.g. Lahore, Skardu, Hunza"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleAddTask}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
        <h3 className="font-bold text-white text-base">Active & Completed Tasks ({tasks.length})</h3>

        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                task.status === 'Completed'
                  ? 'bg-slate-950/60 border-slate-800/60 opacity-70'
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

              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  task.status === 'Completed'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
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
        </div>
      </div>
    </div>
  );
};

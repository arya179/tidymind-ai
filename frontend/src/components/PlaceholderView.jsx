import React from 'react';
import { 
  CheckSquare, 
  FileText, 
  FolderTree, 
  History as HistoryIcon, 
  Info as InfoIcon,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Lock
} from 'lucide-react';

export default function PlaceholderView({ tabId, onNavigate }) {
  const configs = {
    tasks: {
      title: 'Task Organizer',
      icon: CheckSquare,
      desc: 'Transform raw thoughts, unorganized notes, and messy lists into clean, prioritized tasks with categories and sub-items.',
      color: 'indigo',
      actionText: 'Return to Dashboard',
    },
    notes: {
      title: 'Notes Summarizer',
      icon: FileText,
      desc: 'Condense long meeting transcripts, study notes, or brainstorms into actionable takeaways and clear summaries.',
      color: 'violet',
      actionText: 'Return to Dashboard',
    },
    files: {
      title: 'File Organizer & Planner',
      icon: FolderTree,
      desc: 'Plan intuitive folder structures and naming rules for your downloads, project repositories, or document archives.',
      color: 'blue',
      actionText: 'Return to Dashboard',
    },
    history: {
      title: 'Productivity History',
      icon: HistoryIcon,
      desc: 'Review past local organization tasks, summaries, and folder blueprints saved safely on your local device.',
      color: 'slate',
      actionText: 'Return to Dashboard',
    },
    about: {
      title: 'About TidyMind AI',
      icon: InfoIcon,
      desc: 'A Hacktoberfest 2026 Week 3 project demonstrating local privacy-preserving AI productivity via Ollama.',
      color: 'indigo',
      actionText: 'Back to Dashboard',
    },
  };

  const item = configs[tabId] || configs.about;
  const Icon = item.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-4 shadow-sm border border-indigo-100 dark:border-indigo-900/40">
          <Icon className="w-8 h-8" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {item.title}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2 max-w-xl mx-auto leading-relaxed">
          {item.desc}
        </p>

        <div className="inline-flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mt-6 border border-slate-200 dark:border-slate-700">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
          <span>Core AI integration scheduled for the next milestone</span>
        </div>

        <div className="pt-6">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {item.actionText}
          </button>
        </div>
      </div>

      {tabId === 'about' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <Shield className="w-5 h-5 text-emerald-500 mb-2" />
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">100% Privacy</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Zero cloud dependencies. Prompts never leave your computer.</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <Layers className="w-5 h-5 text-indigo-500 mb-2" />
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Open-Weight AI</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Powered by Ollama running locally installed open-weight models.</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <Lock className="w-5 h-5 text-violet-500 mb-2" />
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Clean Architecture</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">FastAPI backend and React frontend built for maintainability.</p>
          </div>
        </div>
      )}
    </div>
  );
}

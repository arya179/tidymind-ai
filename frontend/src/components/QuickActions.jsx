import React from 'react';
import { CheckSquare, FileText, FolderTree, ArrowRight } from 'lucide-react';

export default function QuickActions({ onSelectAction }) {
  const actions = [
    {
      id: 'tasks',
      title: 'Organize Tasks',
      description: 'Convert raw brain-dumps into structured, prioritized, actionable to-do items.',
      icon: CheckSquare,
      badge: 'Local AI',
      buttonText: 'Open Task Organizer',
      color: 'indigo',
    },
    {
      id: 'notes',
      title: 'Summarize Notes',
      description: 'Extract key takeaways, action steps, and summaries from raw meeting or study notes.',
      icon: FileText,
      badge: 'Local AI',
      buttonText: 'Open Notes Summarizer',
      color: 'violet',
    },
    {
      id: 'files',
      title: 'Organize Files',
      description: 'Plan a sensible, tidy directory layout for chaotic downloads, documents, or projects.',
      icon: FolderTree,
      badge: 'Local AI',
      buttonText: 'Open Directory Planner',
      color: 'blue',
    },
  ];

  const colorVariants = {
    indigo: {
      accent: 'border-indigo-500/20 hover:border-indigo-500/40 bg-gradient-to-b from-indigo-50/40 to-white dark:from-indigo-950/20 dark:to-slate-900',
      badge: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300',
      iconBg: 'bg-indigo-600 text-white',
      btn: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500',
    },
    violet: {
      accent: 'border-violet-500/20 hover:border-violet-500/40 bg-gradient-to-b from-violet-50/40 to-white dark:from-violet-950/20 dark:to-slate-900',
      badge: 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300',
      iconBg: 'bg-violet-600 text-white',
      btn: 'bg-violet-600 hover:bg-violet-700 text-white focus:ring-violet-500',
    },
    blue: {
      accent: 'border-blue-500/20 hover:border-blue-500/40 bg-gradient-to-b from-blue-50/40 to-white dark:from-blue-950/20 dark:to-slate-900',
      badge: 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300',
      iconBg: 'bg-blue-600 text-white',
      btn: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    },
  };

  return (
    <section aria-labelledby="quick-actions-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 id="quick-actions-heading" className="text-lg font-bold text-slate-900 dark:text-white">
            Quick Actions
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Select a productivity tool to begin organizing with your local model.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {actions.map((act) => {
          const Icon = act.icon;
          const styles = colorVariants[act.color];

          return (
            <div
              key={act.id}
              className={`rounded-2xl p-6 border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between ${styles.accent}`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl shadow-sm ${styles.iconBg}`}>
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${styles.badge}`}>
                    {act.badge}
                  </span>
                </div>

                <h4 className="text-base font-semibold text-slate-900 dark:text-white mt-4">
                  {act.title}
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  {act.description}
                </p>
              </div>

              <div className="pt-6 mt-2">
                <button
                  type="button"
                  onClick={() => onSelectAction(act.id)}
                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold inline-flex items-center justify-center transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${styles.btn}`}
                >
                  <span>{act.buttonText}</span>
                  <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

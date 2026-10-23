import React from 'react';
import { 
  CheckSquare, 
  FileText, 
  FolderTree, 
  Clock, 
  Inbox, 
  CheckCircle2, 
  ChevronRight 
} from 'lucide-react';

export default function RecentActivity({ activities = [], onViewAll }) {
  // Meaningful empty state when there are no items
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200/80 dark:border-slate-800 text-center shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 mx-auto flex items-center justify-center mb-3">
          <Inbox className="w-6 h-6" aria-hidden="true" />
        </div>
        <h4 className="text-base font-semibold text-slate-900 dark:text-white">
          No activity recorded yet
        </h4>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Start organizing your messy tasks, summarizing notes, or planning folders to see your history logged here.
        </p>
      </div>
    );
  }

  const iconMap = {
    tasks: CheckSquare,
    notes: FileText,
    files: FolderTree,
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Recent Activity
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Recently processed productivity jobs (Sample Demonstration)
          </p>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center focus:outline-none focus:underline"
        >
          View all history
          <ChevronRight className="w-3.5 h-3.5 ml-0.5" aria-hidden="true" />
        </button>
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-slate-800" role="list">
        {activities.map((item) => {
          const Icon = iconMap[item.type] || CheckSquare;
          return (
            <li key={item.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </p>
                    <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {item.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {item.summary}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end flex-shrink-0">
                  <span className="inline-flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    Completed
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center mt-1">
                    <Clock className="w-3 h-3 mr-1" aria-hidden="true" />
                    {item.time}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

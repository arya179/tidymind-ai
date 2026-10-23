import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'indigo' }) {
  const colorStyles = {
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
      icon: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-100 dark:border-indigo-900/40',
    },
    violet: {
      bg: 'bg-violet-50 dark:bg-violet-950/40',
      icon: 'text-violet-600 dark:text-violet-400',
      border: 'border-violet-100 dark:border-violet-900/40',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      icon: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-100 dark:border-blue-900/40',
    },
  };

  const currentStyle = colorStyles[color] || colorStyles.indigo;

  return (
    <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-xl ${currentStyle.bg} ${currentStyle.border} border`}>
          <Icon className={`w-6 h-6 ${currentStyle.icon}`} aria-hidden="true" />
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">
          Demo Data
        </span>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {title}
        </h3>
        <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
          {value}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center">
          <ArrowUpRight className="w-3.5 h-3.5 mr-1 text-emerald-500" aria-hidden="true" />
          <span>{subtitle}</span>
        </p>
      </div>
    </div>
  );
}

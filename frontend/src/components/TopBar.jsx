import React from 'react';
import { Menu, Sun, Moon, Sparkles } from 'lucide-react';

export default function TopBar({ onOpenMobile, isDark, onToggleTheme, title = "Dashboard" }) {
  return (
    <header className="sticky top-0 z-10 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex items-center space-x-3">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onOpenMobile}
          className="p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-slate-400 dark:text-slate-500 hidden sm:inline">Workspace /</span>
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white capitalize">
            {title}
          </h2>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Hacktoberfest 2026 Tag */}
        <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
          <Sparkles className="w-3 h-3 mr-1" aria-hidden="true" />
          Hacktoberfest 2026
        </span>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600" aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
}

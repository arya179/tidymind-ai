import React from 'react';
import { ShieldCheck, Cpu, HardDrive, RefreshCw, AlertTriangle } from 'lucide-react';

export default function PrivacyStatus({ 
  healthData = null,
  onCheckConnection,
  isChecking = false
}) {
  const isConnected = healthData?.ollama_reachable && healthData?.model_available;
  const isDegraded = healthData?.ollama_reachable && !healthData?.model_available;
  const isOffline = !healthData?.ollama_reachable;

  const configuredModel = healthData?.configured_model || 'gemma:2b';
  const installedModels = healthData?.installed_models || [];
  const mode = healthData?.mode || 'demo_mode_only';

  return (
    <div className="bg-gradient-to-br from-white to-slate-50/70 dark:from-slate-900 dark:to-slate-950 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-2xl flex-shrink-0 ${
            isConnected 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40' 
              : isDegraded
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
          }`}>
            <ShieldCheck className="w-6 h-6" aria-hidden="true" />
          </div>

          <div>
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Privacy & Local Inference
              </h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                isConnected 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' 
                  : isDegraded
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : isDegraded ? 'bg-amber-500' : 'bg-rose-500'
                }`}></span>
                {isConnected 
                  ? `Local AI Online (${configuredModel})` 
                  : isDegraded 
                  ? 'Ollama Online (Model Missing)'
                  : 'Ollama Offline (Demo Mode Ready)'}
              </span>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Strictly zero cloud transmission. All tasks, notes, and file paths are processed locally via Ollama.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:self-center">
          <button
            type="button"
            onClick={onCheckConnection}
            disabled={isChecking}
            className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isChecking ? 'animate-spin' : ''}`} aria-hidden="true" />
            {isChecking ? 'Checking...' : 'Check Status'}
          </button>
        </div>
      </div>

      {isDegraded && (
        <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 flex items-center space-x-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Configured model <code>{configuredModel}</code> not found in installed models. Falling back to demo mode or first available model.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-200/60 dark:border-slate-800/80">
        <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
          <Cpu className="w-4 h-4 text-indigo-500 flex-shrink-0" aria-hidden="true" />
          <span>Endpoint: <strong className="text-slate-900 dark:text-slate-200 font-medium">{healthData?.ollama_base_url || 'http://127.0.0.1:11434'}</strong></span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
          <HardDrive className="w-4 h-4 text-violet-500 flex-shrink-0" aria-hidden="true" />
          <span>Target Model: <strong className="text-slate-900 dark:text-slate-200 font-medium">{configuredModel}</strong></span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" aria-hidden="true" />
          <span>Mode: <strong className="text-slate-900 dark:text-slate-200 font-medium">{mode === 'full_local_ai' ? 'Local AI Active' : 'Demo Fallback'}</strong></span>
        </div>
      </div>
    </div>
  );
}

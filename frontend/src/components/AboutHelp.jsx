import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  HardDrive, 
  Terminal, 
  FolderLock, 
  Database, 
  Info, 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronRight,
  Sliders,
  CheckCircle2,
  Lock
} from 'lucide-react';

export default function AboutHelp({ healthData, onNavigate }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyCommand = (text, idx) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const configuredModel = healthData?.configured_model || 'gemma:2b';
  const ollamaUrl = healthData?.ollama_base_url || 'http://127.0.0.1:11434';
  const isOnline = healthData?.ollama_reachable && healthData?.model_available;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-1">
          <Info className="w-5 h-5" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider">Help & Technical Architecture</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          About TidyMind AI
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
          TidyMind AI is a privacy-first personal productivity engine designed for the Hacktoberfest 2026 Week 3 challenge. It organizes messy tasks, synthesizes meeting notes, and structures file systems using open-weight models executed strictly on your local machine.
        </p>
      </div>

      {/* Local Engine Status Banner */}
      <div className={`p-6 rounded-3xl border shadow-sm ${
        isOnline 
          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-950 dark:text-emerald-100'
          : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-950 dark:text-amber-100'
      }`}>
        <div className="flex items-start space-x-3.5">
          <ShieldCheck className={`w-6 h-6 flex-shrink-0 mt-0.5 ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} />
          <div className="space-y-1">
            <h2 className="text-base font-bold">
              {isOnline ? 'Local Engine Operational' : 'Ollama Offline / Demo Mode Active'}
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed opacity-90">
              {isOnline 
                ? `FastAPI backend is securely linked to Ollama at ${ollamaUrl} running model '${configuredModel}'. All text operations execute 100% locally with zero cloud transmissions.`
                : `Ollama is currently unreachable or model '${configuredModel}' is missing. TidyMind AI is running in deterministic Local Demo Mode, providing instant heuristics without requiring an AI runtime.`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Architecture Matrix */}
      <section aria-labelledby="privacy-matrix-heading" className="space-y-4">
        <h2 id="privacy-matrix-heading" className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Lock className="w-5 h-5 text-indigo-500" />
          <span>Privacy & Security Guarantees</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm mb-2">
              <Cpu className="w-4 h-4" />
              <h3>Zero Cloud Telemetry</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Task lists and personal notes are sent exclusively to your local machine’s loopback interface (<code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">127.0.0.1</code>). No analytics or remote telemetry servers are contacted.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center space-x-2 text-violet-600 dark:text-violet-400 font-bold text-sm mb-2">
              <FolderLock className="w-4 h-4" />
              <h3>Sandboxed Filesystem Boundaries</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              File reorganization is strictly restricted to administrator-approved directories configured via <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">APPROVED_DIRECTORIES</code>. Path traversal (<code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">../</code>) is rejected at the API layer.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm mb-2">
              <Database className="w-4 h-4" />
              <h3>Private SQLite History Logging</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Activity history records timestamps, operation types, and summary metrics. To safeguard confidentiality, <strong>raw note contents and full file texts are never saved to disk</strong>.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-bold text-sm mb-2">
              <ShieldCheck className="w-4 h-4" />
              <h3>Anti-Data-Loss Invariant</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              The application contains zero deletion functions. Existing destination files are never overwritten, moves require explicit checkbox confirmation, and all file operations can be safely reversed via the Undo engine.
            </p>
          </div>
        </div>
      </section>

      {/* Ollama Setup & Configuration Guide */}
      <section aria-labelledby="ollama-guide-heading" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
        <div>
          <h2 id="ollama-guide-heading" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-indigo-500" />
            <span>Ollama Setup & Model Configuration</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Follow these commands to install or start your local open-weight model engine.
          </p>
        </div>

        <div className="space-y-4">
          {/* Step 1 */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                1. Ensure Ollama Service is Running
              </span>
              <button
                type="button"
                onClick={() => copyCommand("ollama serve", 1)}
                className="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center cursor-pointer"
              >
                {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedIndex === 1 ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-2.5 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto">
              ollama serve
            </pre>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                2. Download the Recommended Gemma Model (~1.6GB)
              </span>
              <button
                type="button"
                onClick={() => copyCommand("ollama pull gemma:2b", 2)}
                className="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center cursor-pointer"
              >
                {copiedIndex === 2 ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedIndex === 2 ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-2.5 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto">
              ollama pull gemma:2b
            </pre>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Other supported models: <code className="text-indigo-500">gemma2:2b</code>, <code className="text-indigo-500">llama3.2:latest</code>, or <code className="text-indigo-500">phi3:mini</code>.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                3. Configure Backend Environment (.env)
              </span>
              <button
                type="button"
                onClick={() => copyCommand("OLLAMA_MODEL=gemma:2b\nOLLAMA_BASE_URL=http://127.0.0.1:11434", 3)}
                className="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center cursor-pointer"
              >
                {copiedIndex === 3 ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedIndex === 3 ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-2.5 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto">
              OLLAMA_BASE_URL=http://127.0.0.1:11434&#10;OLLAMA_MODEL=gemma:2b
            </pre>
          </div>
        </div>
      </section>

      {/* Navigation Quick Links */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-6 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Ready to organize your workflow?</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Jump directly to any productivity tool.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onNavigate('tasks')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
          >
            Task Organizer
          </button>
          <button
            type="button"
            onClick={() => onNavigate('notes')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Notes Summarizer
          </button>
          <button
            type="button"
            onClick={() => onNavigate('files')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            File Organizer
          </button>
        </div>
      </div>
    </div>
  );
}

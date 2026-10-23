import React, { useState } from 'react';
import { 
  Sparkles, 
  Trash2, 
  Copy, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  ListOrdered, 
  CheckSquare, 
  Cpu, 
  Layers,
  ArrowRight
} from 'lucide-react';

const EXAMPLE_NOTES = `Engineering Sync & Architecture Decision Record (Week 3)
Attendees: Priya, Marcus, David, Elena

Key Discussion Points:
1. Local AI Execution: We agreed to run all inference through local Ollama instances rather than external cloud APIs to uphold privacy guarantees for Hacktoberfest.
2. Models: Google Gemma 2B and Llama 3.2 perform well on low-spec developer laptops with less than 2GB RAM overhead.
3. User Experience: The frontend must provide immediate feedback, clear light/dark modes, and explicit distinction when running in rule-based local demo mode vs actual AI inference.
4. Security: User note content and file names must never be logged on server files or stdout.

Decisions Made:
- We selected FastAPI for the backend service due to built-in Pydantic v2 validation.
- We selected Tailwind CSS v4 and React + Vite for the user interface.

Action Items:
- todo: David needs to finalize Pydantic schemas for Notes Summarizer and Directory Planner.
- todo: Elena to implement copy-to-clipboard buttons and loading state transitions in React.
- Marcus must run performance benchmarks on Gemma 2B response latency.
- follow up: Schedule next checkpoint meeting for Friday 10 AM.`;

export default function NotesSummarizer() {
  const [inputNotes, setInputNotes] = useState('');
  const [result, setResult] = useState(null);
  const [statusState, setStatusState] = useState({
    loading: false,
    error: null,
    warning: null,
    source: null,
    modelUsed: null,
    message: null,
  });
  const [forceDemo, setForceDemo] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);

  const MAX_CHARS = 30000;
  const charsRemaining = MAX_CHARS - inputNotes.length;

  const handleLoadExample = () => {
    setInputNotes(EXAMPLE_NOTES);
    setStatusState(prev => ({ ...prev, error: null }));
  };

  const handleClearInput = () => {
    setInputNotes('');
    setStatusState(prev => ({ ...prev, error: null }));
  };

  const handleClearOutput = () => {
    setResult(null);
    setStatusState({
      loading: false,
      error: null,
      warning: null,
      source: null,
      modelUsed: null,
      message: null,
    });
  };

  const handleSummarize = async () => {
    const trimmed = inputNotes.trim();
    if (!trimmed) {
      setStatusState(prev => ({ ...prev, error: 'Please enter or paste your notes before summarizing.' }));
      return;
    }

    if (trimmed.length > MAX_CHARS) {
      setStatusState(prev => ({ 
        ...prev, 
        error: `Notes text exceeds the maximum limit of ${MAX_CHARS.toLocaleString()} characters. Please trim the content.` 
      }));
      return;
    }

    setStatusState({
      loading: true,
      error: null,
      warning: null,
      source: null,
      modelUsed: null,
      message: null,
    });

    try {
      const response = await fetch('http://localhost:8000/api/notes/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw_notes: trimmed,
          force_demo: forceDemo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error (${response.status})`);
      }

      const data = await response.json();
      setResult({
        summary: data.summary,
        key_points: data.key_points || [],
        action_items: data.action_items || [],
      });
      setStatusState({
        loading: false,
        error: null,
        warning: data.warning || null,
        source: data.source,
        modelUsed: data.model_used,
        message: data.message,
      });
    } catch (err) {
      console.error('Error summarizing notes:', err);
      setStatusState({
        loading: false,
        error: `Could not connect to FastAPI backend at http://localhost:8000. Ensure the backend server is running. (${err.message})`,
        warning: null,
        source: null,
        modelUsed: null,
        message: null,
      });
    }
  };

  const copyToClipboard = (text, sectionName) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(sectionName);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  };

  const formatAllForCopy = () => {
    if (!result) return '';
    let out = `## SUMMARY\n${result.summary}\n\n`;
    if (result.key_points && result.key_points.length > 0) {
      out += `## KEY POINTS\n` + result.key_points.map(p => `- ${p}`).join('\n') + `\n\n`;
    }
    if (result.action_items && result.action_items.length > 0) {
      out += `## ACTION ITEMS\n` + result.action_items.map(a => `[ ] ${a}`).join('\n') + `\n`;
    }
    return out;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-violet-600 dark:text-violet-400 mb-1">
          <FileText className="w-5 h-5" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider">Executive Notes Distillation</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Notes Summarizer
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Condense lengthy transcripts, brainstorms, or study notes into executive summaries, key decisions, and explicit action items entirely on your machine.
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center space-x-2">
            <label htmlFor="raw-notes-input" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Paste Meeting, Study, or Project Notes
            </label>
            <span className={`text-[11px] font-mono ${charsRemaining < 1000 ? 'text-amber-500 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
              ({inputNotes.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleLoadExample}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/50 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
            >
              Load Example Notes
            </button>
            <button
              type="button"
              onClick={handleClearInput}
              disabled={!inputNotes}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
            >
              Clear Text
            </button>
          </div>
        </div>

        {/* Text Area */}
        <textarea
          id="raw-notes-input"
          rows={8}
          value={inputNotes}
          onChange={(e) => setInputNotes(e.target.value)}
          placeholder="Paste unstructured notes, interview records, meeting transcripts, or articles here..."
          className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all font-sans leading-relaxed resize-y"
        />

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          {/* Demo Mode Toggle */}
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              id="force-demo-toggle-notes"
              checked={forceDemo}
              onChange={(e) => setForceDemo(e.target.checked)}
              className="w-4 h-4 text-violet-600 rounded border-slate-300 dark:border-slate-600 focus:ring-violet-500 dark:bg-slate-800 cursor-pointer"
            />
            <label htmlFor="force-demo-toggle-notes" className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
              Force Local Demo Mode <span className="text-slate-400 dark:text-slate-500">(Rule-based heuristic, no AI model invoked)</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSummarize}
            disabled={statusState.loading || !inputNotes.trim()}
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 cursor-pointer"
          >
            {statusState.loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Summarizing with Local Model...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
                Summarize Notes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading State Banner */}
      {statusState.loading && (
        <div className="bg-violet-50/70 dark:bg-violet-950/40 rounded-2xl p-6 border border-violet-200 dark:border-violet-900/50 text-center animate-pulse">
          <div className="w-10 h-10 rounded-full bg-violet-600 text-white mx-auto flex items-center justify-center mb-3">
            <Cpu className="w-5 h-5 animate-spin" />
          </div>
          <h4 className="text-sm font-bold text-violet-900 dark:text-violet-200">
            Distilling Notes via Local Model
          </h4>
          <p className="text-xs text-violet-700 dark:text-violet-300 mt-1 max-w-md mx-auto">
            Extracting key decisions, structuring actionable items, and synthesizing narrative context with 100% device privacy.
          </p>
        </div>
      )}

      {/* Error State Banner */}
      {statusState.error && (
        <div className="bg-rose-50 dark:bg-rose-950/50 rounded-2xl p-5 border border-rose-200 dark:border-rose-900/60 flex items-start space-x-3 text-rose-900 dark:text-rose-200">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-semibold">Unable to Process Notes</p>
            <p className="mt-0.5 text-rose-700 dark:text-rose-300 leading-relaxed">{statusState.error}</p>
          </div>
        </div>
      )}

      {/* Metadata Attribution Banner */}
      {statusState.source && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs ${
          statusState.source === 'local_ai'
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
            : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200'
        }`}>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <div>
              <span className="font-semibold uppercase tracking-wide mr-1.5">
                [{statusState.source === 'local_ai' ? 'LOCAL AI' : 'LOCAL DEMO MODE'}]
              </span>
              <span>{statusState.message}</span>
              {statusState.warning && (
                <p className="text-amber-700 dark:text-amber-300 mt-0.5">Note: {statusState.warning}</p>
              )}
            </div>
          </div>

          {result && (
            <button
              type="button"
              onClick={() => copyToClipboard(formatAllForCopy(), 'all')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors inline-flex items-center"
            >
              {copiedSection === 'all' ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Copied All
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Copy Full Summary
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Results Output Section */}
      {result ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Distillation Results</span>
            </h2>
            <button
              type="button"
              onClick={handleClearOutput}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2.5 py-1.5 rounded-xl transition-colors inline-flex items-center cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear Results
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Section 1: Executive Summary (Span 2 cols on desktop) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Executive Summary
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(result.summary, 'summary')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Copy summary to clipboard"
                  >
                    {copiedSection === 'summary' ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-4 leading-relaxed font-normal">
                  {result.summary}
                </p>
              </div>

              {/* Section 2: Key Points */}
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                      <Layers className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Key Points & Decisions ({result.key_points.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(result.key_points.map(p => `• ${p}`).join('\n'), 'points')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Copy key points to clipboard"
                  >
                    {copiedSection === 'points' ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {result.key_points.length > 0 ? (
                  <ul className="space-y-2 mt-2">
                    {result.key_points.map((pt, idx) => (
                      <li key={idx} className="flex items-start text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 mr-2.5 flex-shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 italic">No explicit bullet points extracted.</p>
                )}
              </div>
            </div>

            {/* Section 3: Action Items (1 col on desktop) */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Action Items ({result.action_items.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(result.action_items.map(a => `[ ] ${a}`).join('\n'), 'actions')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Copy action items to clipboard"
                  >
                    {copiedSection === 'actions' ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {result.action_items.length > 0 ? (
                  <ul className="space-y-2.5 mt-4">
                    {result.action_items.map((item, idx) => (
                      <li key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-start space-x-2.5">
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-slate-300 dark:border-slate-600 text-violet-600 focus:ring-violet-500 cursor-pointer"
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                    <CheckCircle2 className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    No specific action items identified in these notes.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        !statusState.loading && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200/80 dark:border-slate-800 text-center shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950/50 text-violet-500 mx-auto flex items-center justify-center mb-3">
              <FileText className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No notes summarized yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Type or paste your notes above or click <strong>Load Example Notes</strong> to extract executive summaries, key decisions, and action items.
            </p>
          </div>
        )
      )}
    </div>
  );
}

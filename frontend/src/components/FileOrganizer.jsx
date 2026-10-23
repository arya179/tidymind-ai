import React, { useState, useEffect } from 'react';
import { 
  FolderTree, 
  Folder, 
  File, 
  ArrowRight, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  RefreshCw, 
  Info, 
  SlidersHorizontal,
  ChevronRight,
  HardDrive,
  FileCheck2,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';

export default function FileOrganizer() {
  const [directoryPath, setDirectoryPath] = useState('');
  const [approvedDirs, setApprovedDirs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedPlanIds, setSelectedPlanIds] = useState(new Set());
  const [useAiNaming, setUseAiNaming] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [results, setResults] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);

  // Fetch health data to retrieve approved directories
  const fetchApprovedDirs = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/health');
      if (res.ok) {
        const data = await res.json();
        const dirs = data.approved_directories || [];
        setApprovedDirs(dirs);
        if (dirs.length > 0 && !directoryPath) {
          setDirectoryPath(dirs[0]);
        }
      }
    } catch (e) {
      console.warn('Could not fetch approved directories from backend:', e);
    }
  };

  useEffect(() => {
    fetchApprovedDirs();
  }, []);

  const handleScan = async () => {
    const trimmed = directoryPath.trim();
    if (!trimmed) {
      setErrorMessage('Please specify an approved directory path to scan.');
      return;
    }

    setIsScanning(true);
    setErrorMessage(null);
    setWarningMessage(null);
    setStatusMessage(null);
    setResults(null);
    setPlans([]);
    setSelectedPlanIds(new Set());

    try {
      const response = await fetch('http://localhost:8000/api/files/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          directory_path: trimmed,
          use_ai_naming: useAiNaming,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Scan failed (${response.status})`);
      }

      const data = await response.json();
      setPlans(data.plans || []);
      // Select all proposed changes by default
      const allIds = new Set((data.plans || []).map(p => p.id));
      setSelectedPlanIds(allIds);
      setStatusMessage(data.message);
      if (data.warning) {
        setWarningMessage(data.warning);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleTogglePlan = (id) => {
    setSelectedPlanIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedPlanIds.size === plans.length) {
      setSelectedPlanIds(new Set());
    } else {
      setSelectedPlanIds(new Set(plans.map(p => p.id)));
    }
  };

  const handleApplySelected = async () => {
    const selectedPlans = plans.filter(p => selectedPlanIds.has(p.id));
    if (selectedPlans.length === 0) {
      setErrorMessage('Please select at least one proposed file operation to confirm.');
      return;
    }

    setIsApplying(true);
    setErrorMessage(null);

    try {
      const response = await fetch('http://localhost:8000/api/files/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          directory_path: directoryPath.trim(),
          operations: selectedPlans.map(p => ({
            id: p.id,
            original_rel_path: p.original_rel_path,
            proposed_rel_path: p.proposed_rel_path,
          })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Operation failed (${response.status})`);
      }

      const data = await response.json();
      setResults(data);
      setStatusMessage(data.message);
      // Re-scan directory to refresh view after operations
      setTimeout(() => {
        handleScan();
      }, 1000);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsApplying(false);
    }
  };

  const categoryColors = {
    Documents: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/50',
    Images: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50',
    Audio: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/50',
    Video: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/50',
    Code: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/50',
    Archives: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-900/50',
    Miscellaneous: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-1">
          <FolderTree className="w-5 h-5" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider">Safe File Organizer & Planner</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          File Organizer
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Clean messy directories with confidence. Preview every proposed rename and folder move before confirming. No deletions. No overwrites.
        </p>
      </div>

      {/* Safety Notice Card */}
      <div className="bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-800/40 flex items-start space-x-3.5">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 space-y-1">
          <p className="font-semibold">Safety & Anti-Loss Protections Enforced</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
            • Permanent dry-run preview by default. Files are only moved upon explicit confirmation.<br />
            • Overwrites are strictly prohibited: existing files are never replaced.<br />
            • Deletions are completely unsupported in this application.<br />
            • Scans are strictly restricted to approved local folders to prevent unauthorized access.
          </p>
        </div>
      </div>

      {/* Directory Input & Scan Form */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
        <div>
          <label htmlFor="dir-path-input" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
            Directory Path to Scan
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="dir-path-input"
              type="text"
              value={directoryPath}
              onChange={(e) => setDirectoryPath(e.target.value)}
              placeholder="e.g. /path/to/tidymind-ai/sample_organizer_workspace/downloads"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            <button
              type="button"
              onClick={handleScan}
              disabled={isScanning || !directoryPath.trim()}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Scan Directory (Dry Run)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Approved Directories Helper */}
        {approvedDirs.length > 0 && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Approved Roots: </span>
            {approvedDirs.map((dir, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setDirectoryPath(dir)}
                className="underline hover:text-indigo-600 dark:hover:text-indigo-400 mr-3 inline-block font-mono"
              >
                {dir}
              </button>
            ))}
          </div>
        )}

        {/* Options */}
        <div className="flex items-center space-x-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <input
            type="checkbox"
            id="use-ai-naming"
            checked={useAiNaming}
            onChange={(e) => setUseAiNaming(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500 dark:bg-slate-800 cursor-pointer"
          />
          <label htmlFor="use-ai-naming" className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            Enhance with Local AI Suggestions <span className="text-slate-400">(Invokes local Gemma to suggest clean descriptive names; preserves file extensions)</span>
          </label>
        </div>
      </div>

      {/* Error & Warning Banners */}
      {errorMessage && (
        <div className="bg-rose-50 dark:bg-rose-950/50 rounded-2xl p-4 border border-rose-200 dark:border-rose-900/60 flex items-start space-x-3 text-rose-900 dark:text-rose-200 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Operation Error</p>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {warningMessage && (
        <div className="bg-amber-50 dark:bg-amber-950/40 rounded-2xl p-4 border border-amber-200 dark:border-amber-800/40 flex items-start space-x-3 text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Notice</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">{warningMessage}</p>
          </div>
        </div>
      )}

      {/* Execution Results Banner */}
      {results && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-900 dark:text-white">
            <FileCheck2 className="w-5 h-5 text-emerald-500" />
            <span>Execution Summary: {results.successful_count} Moved, {results.failed_count} Failed</span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
            {results.results.map((res, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-md">{res.original_rel_path}</span>
                <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                  res.status === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' :
                  res.status === 'skipped' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300' :
                  'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                }`}>
                  {res.status.toUpperCase()}: {res.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proposed Changes Review Table */}
      {plans.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Review Proposed Organization Changes</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  {selectedPlanIds.size} of {plans.length} selected
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review each destination and reason. Deselect any operations you wish to skip.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                {selectedPlanIds.size === plans.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                type="button"
                onClick={handleApplySelected}
                disabled={isApplying || selectedPlanIds.size === 0}
                className="text-xs font-semibold px-4 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50 flex items-center"
              >
                {isApplying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Confirm & Apply Selected ({selectedPlanIds.size})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-4 w-12 text-center">Select</th>
                  <th className="p-4">Current File & Size</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Proposed Organized Path</th>
                  <th className="p-4">Reason / Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {plans.map((p) => {
                  const isSelected = selectedPlanIds.has(p.id);
                  const badgeClass = categoryColors[p.category] || categoryColors.Miscellaneous;

                  return (
                    <tr 
                      key={p.id} 
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${
                        isSelected ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                      }`}
                      onClick={() => handleTogglePlan(p.id)}
                    >
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleTogglePlan(p.id)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <File className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white font-mono">
                              {p.original_name}
                            </p>
                            <span className="text-[11px] text-slate-400 font-sans">{p.size_formatted}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badgeClass}`}>
                          {p.category}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                        <div className="flex items-center space-x-1.5 text-indigo-600 dark:text-indigo-400">
                          <Folder className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate max-w-xs">{p.proposed_rel_path}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                        {p.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {plans.length === 0 && !isScanning && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200/80 dark:border-slate-800 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 mx-auto flex items-center justify-center mb-3">
            <FolderTree className="w-6 h-6" aria-hidden="true" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No active directory scan
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Select or enter an approved directory above and click <strong>Scan Directory</strong> to produce a safe dry-run organization plan.
          </p>
        </div>
      )}
    </div>
  );
}

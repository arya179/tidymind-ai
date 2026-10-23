import React, { useState, useEffect } from 'react';
import { 
  History as HistoryIcon, 
  Trash2, 
  RotateCcw, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  CheckSquare, 
  FileText, 
  FolderTree, 
  FolderSync, 
  ShieldCheck, 
  RefreshCw,
  Inbox,
  X,
  AlertOctagon
} from 'lucide-react';

export default function ActivityHistory({ onNavigate }) {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Dialog States
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    mode: 'selected', // 'selected' | 'all'
    title: '',
    message: '',
  });

  const [undoModal, setUndoModal] = useState({
    isOpen: false,
    record: null,
  });

  const [statusFeedback, setStatusFeedback] = useState(null);
  const [isActionPending, setIsActionPending] = useState(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    setStatusFeedback(null);
    try {
      let url = 'http://localhost:8000/api/history?';
      if (typeFilter !== 'ALL') url += `operation_type=${typeFilter}&`;
      if (statusFilter !== 'ALL') url += `status=${statusFilter}&`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setTotal(data.total || 0);
        setSelectedIds(new Set());
      }
    } catch (e) {
      console.error('Failed to load history:', e);
      setStatusFeedback({ type: 'error', message: 'Could not connect to backend to fetch activity records.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [typeFilter, statusFilter]);

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
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
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map(r => r.id)));
    }
  };

  const promptClearSelected = () => {
    if (selectedIds.size === 0) return;
    setConfirmModal({
      isOpen: true,
      mode: 'selected',
      title: 'Clear Selected History',
      message: `Are you sure you want to remove ${selectedIds.size} selected activity record(s)? This only removes operational log entries; your original files and notes are NEVER deleted.`,
    });
  };

  const promptClearAll = () => {
    setConfirmModal({
      isOpen: true,
      mode: 'all',
      title: 'Reset & Clear All Activity History',
      message: 'Are you sure you want to clear your entire activity history log? This only removes operational log entries from the local database; your actual files, tasks, and notes will NOT be touched.',
    });
  };

  const executeClear = async () => {
    setIsActionPending(true);
    try {
      const payload = confirmModal.mode === 'selected' 
        ? { record_ids: Array.from(selectedIds) }
        : { record_ids: null };

      const res = await fetch('http://localhost:8000/api/history/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to clear records.');
      }

      const data = await res.json();
      setStatusFeedback({ type: 'success', message: data.message });
      setConfirmModal({ isOpen: false, mode: 'selected', title: '', message: '' });
      // Refresh UI immediately
      await fetchHistory();
    } catch (e) {
      setStatusFeedback({ type: 'error', message: e.message });
    } finally {
      setIsActionPending(false);
    }
  };

  const promptUndo = (record) => {
    setUndoModal({
      isOpen: true,
      record: record,
    });
  };

  const executeUndo = async () => {
    if (!undoModal.record) return;
    setIsActionPending(true);
    try {
      const res = await fetch(`http://localhost:8000/api/history/${undoModal.record.id}/undo`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Could not reverse operation.');
      }

      setStatusFeedback({ type: 'success', message: `${data.message} ${data.detail}` });
      setUndoModal({ isOpen: false, record: null });
      // Refresh UI immediately
      await fetchHistory();
    } catch (e) {
      setStatusFeedback({ type: 'error', message: e.message });
    } finally {
      setIsActionPending(false);
    }
  };

  const iconByType = {
    tasks_organize: CheckSquare,
    notes_summarize: FileText,
    files_scan: FolderTree,
    files_apply: FolderSync,
    files_undo: RotateCcw,
  };

  const formatTimestamp = (isoStr) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-1">
          <HistoryIcon className="w-5 h-5" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider">Audit & Rollback Log</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Activity History
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Persistent log of your local productivity actions. Stored strictly in local SQLite with zero private notes contents saved. Reversible operations can be safely rolled back.
        </p>
      </div>

      {/* Feedback Banner */}
      {statusFeedback && (
        <div className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-start space-x-3 ${
          statusFeedback.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-200'
        }`}>
          {statusFeedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{statusFeedback.type === 'success' ? 'Success' : 'Notice'}</p>
            <p className="mt-0.5">{statusFeedback.message}</p>
          </div>
          <button 
            type="button" 
            onClick={() => setStatusFeedback(null)}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters and Controls Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Filters */}
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Operations</option>
              <option value="tasks_organize">Tasks Organized</option>
              <option value="notes_summarize">Notes Summarized</option>
              <option value="files_scan">File Scans</option>
              <option value="files_apply">File Moves Applied</option>
              <option value="files_undo">File Moves Undone</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Outcomes</option>
              <option value="success">Success</option>
              <option value="warning">Warning / Fallback</option>
              <option value="error">Error</option>
            </select>
          </div>

          <button
            type="button"
            onClick={fetchHistory}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            title="Refresh history"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5 self-end md:self-auto">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={promptClearSelected}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors flex items-center"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Clear Selected ({selectedIds.size})
            </button>
          )}

          {records.length > 0 && (
            <button
              type="button"
              onClick={promptClearAll}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
            >
              Clear All History
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      {records.length > 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={selectedIds.size === records.length && records.length > 0}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {selectedIds.size} of {records.length} records selected
              </span>
            </div>
            <span>Showing newest first</span>
          </div>

          <ul className="divide-y divide-slate-100 dark:divide-slate-800" role="list">
            {records.map((r) => {
              const Icon = iconByType[r.operation_type] || HistoryIcon;
              const isSelected = selectedIds.has(r.id);

              return (
                <li
                  key={r.id}
                  className={`p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected ? 'bg-indigo-50/20 dark:bg-indigo-950/20' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(r.id)}
                      className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                    />

                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex-shrink-0">
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {r.title}
                        </h4>
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                          r.status === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' :
                          r.status === 'warning' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300' :
                          'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                        }`}>
                          {r.status}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          {r.source.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        {r.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-3 flex-shrink-0 sm:pl-10">
                    <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      {formatTimestamp(r.timestamp)}
                    </span>

                    {/* Safe Undo Button */}
                    {r.can_undo && (
                      <button
                        type="button"
                        onClick={() => promptUndo(r)}
                        className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800/60 transition-colors shadow-sm"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Undo Move
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        /* Meaningful Empty State */
        !isLoading && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200/80 dark:border-slate-800 text-center shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <Inbox className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No activity records found
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Your activity history is currently empty. Organizing tasks, summarizing notes, or organizing files will log audit records here.
            </p>
          </div>
        )
      )}

      {/* Confirmation Dialog Modal for Clear/Reset */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {confirmModal.title}
              </h3>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>Safety guarantee: Original files and notes are 100% preserved.</span>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, mode: 'selected', title: '', message: '' })}
                disabled={isActionPending}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeClear}
                disabled={isActionPending}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm"
              >
                {isActionPending ? 'Clearing...' : 'Confirm Clear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal for Safe Undo */}
      {undoModal.isOpen && undoModal.record && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-indigo-600">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Revert File Operation
              </h3>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to revert <strong>{undoModal.record.title}</strong>?
            </p>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">Pre-flight Verification:</p>
              <p>• The system will verify that original destination file paths are vacant.</p>
              <p>• If a file was modified or deleted externally, the rollback is safely aborted.</p>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setUndoModal({ isOpen: false, record: null })}
                disabled={isActionPending}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeUndo}
                disabled={isActionPending}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
              >
                {isActionPending ? 'Rolling back...' : 'Confirm Rollback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

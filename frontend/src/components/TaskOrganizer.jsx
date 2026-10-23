import React, { useState } from 'react';
import { 
  Sparkles, 
  Trash2, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Cpu, 
  ListOrdered, 
  SlidersHorizontal,
  ChevronRight,
  Filter,
  Info
} from 'lucide-react';
import TaskItem from './TaskItem';

const EXAMPLE_TASKS = `urgent: fix database connection leak in auth service
need to submit quarterly budget report by 4pm
email Sarah regarding frontend design system token updates
buy oat milk, apples and espresso beans
gym leg day workout at 6:30
read chapter 4 of Clean Architecture book someday
schedule annual dental checkup`;

export default function TaskOrganizer() {
  const [inputText, setInputText] = useState('');
  const [tasks, setTasks] = useState([]);
  const [statusState, setStatusState] = useState({
    loading: false,
    error: null,
    warning: null,
    source: null,
    modelUsed: null,
    message: null,
  });
  const [forceDemo, setForceDemo] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');

  const handleLoadExample = () => {
    setInputText(EXAMPLE_TASKS);
    setStatusState(prev => ({ ...prev, error: null }));
  };

  const handleClearInput = () => {
    setInputText('');
    setStatusState(prev => ({ ...prev, error: null }));
  };

  const handleClearResults = () => {
    setTasks([]);
    setStatusState({
      loading: false,
      error: null,
      warning: null,
      source: null,
      modelUsed: null,
      message: null,
    });
  };

  const handleOrganizeTasks = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      setStatusState(prev => ({ ...prev, error: 'Please enter or paste some tasks first.' }));
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
      const response = await fetch('http://localhost:8000/api/tasks/organize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw_text: trimmed,
          force_demo: forceDemo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error (${response.status})`);
      }

      const data = await response.json();
      setTasks(data.tasks || []);
      setStatusState({
        loading: false,
        error: null,
        warning: data.warning || null,
        source: data.source,
        modelUsed: data.model_used,
        message: data.message,
      });
    } catch (err) {
      console.error('Error organizing tasks:', err);
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

  // Task actions
  const handleToggleComplete = (taskId) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleEditTask = (taskId, updatedFields) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, ...updatedFields } : t))
    );
  };

  const handleDeleteTask = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  // Filter tasks by category
  const categories = ['ALL', ...Array.from(new Set(tasks.map(t => t.category)))];
  const filteredTasks = filterCategory === 'ALL' 
    ? tasks 
    : tasks.filter(t => t.category === filterCategory);

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-1">
          <Sparkles className="w-5 h-5" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider">Productivity Assistant</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Task Organizer
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Paste unstructured lists, rough brainstorms, or meeting thoughts. Local open-weight AI structures them into actionable tasks with category, priority, and order.
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <label htmlFor="raw-tasks-input" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Unstructured Tasks
          </label>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleLoadExample}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Load Example Tasks
            </button>
            <button
              type="button"
              onClick={handleClearInput}
              disabled={!inputText}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Clear Text
            </button>
          </div>
        </div>

        {/* Text Area */}
        <textarea
          id="raw-tasks-input"
          rows={6}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste or write your messy task list here (e.g., bullet points, comma separated, or raw thoughts)..."
          className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-sans leading-relaxed resize-y"
        />

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          {/* Demo Mode Toggle */}
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              id="force-demo-toggle"
              checked={forceDemo}
              onChange={(e) => setForceDemo(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500 dark:bg-slate-800 cursor-pointer"
            />
            <label htmlFor="force-demo-toggle" className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
              Force Local Demo Mode <span className="text-slate-400 dark:text-slate-500">(Rule-based heuristic, no AI model invoked)</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleOrganizeTasks}
            disabled={statusState.loading || !inputText.trim()}
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
          >
            {statusState.loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Organizing with Local Model...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
                Organize Tasks
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading State Banner */}
      {statusState.loading && (
        <div className="bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl p-6 border border-indigo-200 dark:border-indigo-900/50 text-center animate-pulse">
          <div className="w-10 h-10 rounded-full bg-indigo-600 text-white mx-auto flex items-center justify-center mb-3">
            <Cpu className="w-5 h-5 animate-spin" />
          </div>
          <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">
            Analyzing & Structuring Tasks
          </h4>
          <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1 max-w-md mx-auto">
            Extracting priorities, categorizing work items, and sequencing your schedule entirely on your machine.
          </p>
        </div>
      )}

      {/* Error State Banner */}
      {statusState.error && (
        <div className="bg-rose-50 dark:bg-rose-950/50 rounded-2xl p-5 border border-rose-200 dark:border-rose-900/60 flex items-start space-x-3 text-rose-900 dark:text-rose-200">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-semibold">Unable to Complete Task Organization</p>
            <p className="mt-0.5 text-rose-700 dark:text-rose-300 leading-relaxed">{statusState.error}</p>
          </div>
        </div>
      )}

      {/* Success / Source Metadata Banner */}
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
        </div>
      )}

      {/* Results Section */}
      {tasks.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Organized Tasks</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  {completedCount}/{tasks.length} Completed
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ordered by suggested execution sequence and priority.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Category Filter */}
              {categories.length > 2 && (
                <div className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <Filter className="w-3.5 h-3.5" />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={handleClearResults}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2.5 py-1.5 rounded-xl transition-colors inline-flex items-center"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Clear Results
              </button>
            </div>
          </div>

          {/* Task Items List */}
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Meaningful Empty State */
        !statusState.loading && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200/80 dark:border-slate-800 text-center shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 mx-auto flex items-center justify-center mb-3">
              <ListOrdered className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No tasks organized yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Type or paste your task list in the box above or click <strong>Load Example Tasks</strong> to test the workflow.
            </p>
          </div>
        )
      )}
    </div>
  );
}

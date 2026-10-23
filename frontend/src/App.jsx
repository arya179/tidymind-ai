import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  FileText, 
  FolderTree, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import StatCard from './components/StatCard';
import QuickActions from './components/QuickActions';
import RecentActivity from './components/RecentActivity';
import PrivacyStatus from './components/PrivacyStatus';
import PlaceholderView from './components/PlaceholderView';
import TaskOrganizer from './components/TaskOrganizer';
import NotesSummarizer from './components/NotesSummarizer';
import FileOrganizer from './components/FileOrganizer';
import ActivityHistory from './components/ActivityHistory';
import AboutHelp from './components/AboutHelp';

// Sample demonstration activity (clearly labeled as demo)
const INITIAL_DEMO_ACTIVITIES = [
  {
    id: 'demo-1',
    title: 'Cleaned chaotic Sprint Backlog thoughts',
    type: 'tasks',
    summary: 'Organized 14 unstructured bullet points into 3 prioritized milestones with action tags.',
    time: '20 mins ago',
  },
  {
    id: 'demo-2',
    title: 'Architecture Review Meeting Summary',
    type: 'notes',
    summary: 'Distilled 4 pages of discussion into key decisions and action items.',
    time: '2 hours ago',
  },
  {
    id: 'demo-3',
    title: 'Downloads Directory Clean-up Plan',
    type: 'files',
    summary: 'Structured messy loose media files into neat monthly categorized folders.',
    time: 'Yesterday',
  },
];

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Theme foundation: reads persistent preference from localStorage or OS dark mode
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('tidymind_theme');
    if (saved !== null) {
      return saved === 'dark';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // State for Privacy & Backend Status
  const [healthData, setHealthData] = useState(null);
  const [isCheckingBackend, setIsCheckingBackend] = useState(false);
  const [recentActivities, setRecentActivities] = useState([]);

  // Apply dark mode class to root HTML element and persist preference
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tidymind_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tidymind_theme', 'light');
    }
  }, [isDark]);

  // Check backend health endpoint
  const checkBackendHealth = async () => {
    setIsCheckingBackend(true);
    try {
      const response = await fetch('http://localhost:8000/api/health', { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        setHealthData(data);
      } else {
        setHealthData(null);
      }
    } catch {
      setHealthData(null);
    } finally {
      setIsCheckingBackend(false);
    }
  };

  // Fetch recent activities from SQLite history
  const fetchRecentActivities = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/history');
      if (res.ok) {
        const data = await res.json();
        if (data.records && data.records.length > 0) {
          // Format the latest 3 activities
          const formatted = data.records.slice(0, 3).map(r => ({
            id: r.id,
            title: r.title,
            type: r.operation_type.startsWith('tasks') ? 'tasks' : r.operation_type.startsWith('notes') ? 'notes' : 'files',
            summary: r.description,
            time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));
          setRecentActivities(formatted);
          return;
        }
      }
      setRecentActivities(INITIAL_DEMO_ACTIVITIES);
    } catch {
      setRecentActivities(INITIAL_DEMO_ACTIVITIES);
    }
  };

  // Perform initial ping and fetch recent activities
  useEffect(() => {
    checkBackendHealth();
    fetchRecentActivities();
  }, [currentTab]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        <TopBar
          title={currentTab}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onOpenMobile={() => setIsMobileMenuOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
          {currentTab === 'dashboard' ? (
            <>
              {/* 1. Welcome Heading & Product Description */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white p-6 sm:p-8 shadow-md">
                <div className="relative z-10 max-w-3xl">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-4 border border-white/20">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-200" aria-hidden="true" />
                    <span>Private • Local Open-Weight AI • Zero Telemetry</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                    Welcome to TidyMind AI
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-indigo-100 max-w-2xl leading-relaxed">
                    Declutter messy task lists, summarize detailed notes, and structure disorganized file folders directly on your machine. Your thoughts stay 100% private.
                  </p>
                </div>

                {/* Subtle calm decorative circles */}
                <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
                <div className="absolute right-24 bottom-0 -mb-10 w-48 h-48 rounded-full bg-violet-400/10 blur-xl pointer-events-none" />
              </div>

              {/* 2. Summary Cards with Demo Data */}
              <section aria-labelledby="summary-cards-heading">
                <div className="flex items-center justify-between mb-4">
                  <h2 id="summary-cards-heading" className="text-lg font-bold text-slate-900 dark:text-white">
                    Overview
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Lifetime Productivity Metrics
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <StatCard
                    title="Tasks Organized"
                    value="48"
                    subtitle="+12 organized this week"
                    icon={CheckSquare}
                    color="indigo"
                  />
                  <StatCard
                    title="Notes Summarized"
                    value="19"
                    subtitle="Saved ~3.5 hours reading"
                    icon={FileText}
                    color="violet"
                  />
                  <StatCard
                    title="Files Reviewed & Planned"
                    value="142"
                    subtitle="3 directory layouts generated"
                    icon={FolderTree}
                    color="blue"
                  />
                </div>
              </section>

              {/* 3. Quick-Action Panel */}
              <QuickActions onSelectAction={(tab) => setCurrentTab(tab)} />

              {/* 4. Privacy Status & 5. Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Privacy Status Section (1 column on large screens) */}
                <div className="lg:col-span-1">
                  <PrivacyStatus
                    healthData={healthData}
                    isChecking={isCheckingBackend}
                    onCheckConnection={checkBackendHealth}
                  />
                </div>

                {/* Recent Activity Section (2 columns on large screens) */}
                <div className="lg:col-span-2">
                  <RecentActivity
                    activities={recentActivities}
                    onViewAll={() => setCurrentTab('history')}
                  />
                </div>
              </div>
            </>
          ) : currentTab === 'tasks' ? (
            <TaskOrganizer />
          ) : currentTab === 'notes' ? (
            <NotesSummarizer />
          ) : currentTab === 'files' ? (
            <FileOrganizer />
          ) : currentTab === 'history' ? (
            <ActivityHistory onNavigate={setCurrentTab} />
          ) : currentTab === 'about' ? (
            <AboutHelp healthData={healthData} onNavigate={setCurrentTab} />
          ) : (
            <PlaceholderView tabId={currentTab} onNavigate={setCurrentTab} />
          )}
        </main>
      </div>
    </div>
  );
}

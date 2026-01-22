"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Globe, 
  Database, 
  Activity, 
  Zap, 
  TrendingUp,
  Server,
  Clock,
  CheckCircle
} from "lucide-react";
import { StatsCard } from "./StatsCard";
import { ActivityFeed } from "./ActivityFeed";
import { NeonCard } from "../ui/NeonCard";
import { ProgressBar } from "../ui/ProgressBar";
import { Terminal, createTerminalLine } from "../ui/Terminal";

interface ActivityItem {
  id: string;
  type: "scrape" | "success" | "error" | "pending" | "database" | "info";
  message: string;
  site?: string;
  timestamp: Date;
  details?: string;
}

interface SourceStats {
  sourceIdentifier: string;
  sourceName: string | null;
  recordCount: number;
  lastScraped: string;
}

interface DashboardStats {
  totalSources: number;
  totalRecords: number;
  activeRuns: number;
  successRate: number;
  sources: SourceStats[];
  isLoading: boolean;
}

const terminalLines = [
  createTerminalLine("info", "DemonOS v1.0 initialized"),
  createTerminalLine("success", "Connected to Apify API"),
  createTerminalLine("success", "Supabase connection established"),
  createTerminalLine("info", "System ready"),
];

/**
 * Main Dashboard Component
 * Displays real system stats, activity feed, and system overview
 */
export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSources: 0,
    totalRecords: 0,
    activeRuns: 0,
    successRate: 0,
    sources: [],
    isLoading: true,
  });

  const [activity, setActivity] = useState<ActivityItem[]>([]);

  // Fetch real stats from API
  const fetchStats = useCallback(async () => {
    try {
      // Fetch stats and runs in parallel
      const [statsRes, runsRes] = await Promise.all([
        fetch("/api/scraper/stats?scraperType=telegram"),
        fetch("/api/scraper/runs?limit=50"),
      ]);

      const statsData = await statsRes.json();
      const runsData = await runsRes.json();

      if (statsData.success) {
        const runs = runsData.success ? runsData.data.runs : [];
        const activeRuns = runs.filter((r: { status: string }) => r.status === "running").length;
        const succeededRuns = runs.filter((r: { status: string }) => r.status === "succeeded").length;
        const totalRuns = runs.length;
        const successRate = totalRuns > 0 ? (succeededRuns / totalRuns) * 100 : 100;

        setStats({
          totalSources: statsData.data.totals.totalSources,
          totalRecords: statsData.data.totals.totalRecords,
          activeRuns,
          successRate: Math.round(successRate * 10) / 10,
          sources: statsData.data.sources,
          isLoading: false,
        });

        // Generate activity from recent runs
        const recentActivity: ActivityItem[] = runs.slice(0, 10).map((run: {
          run_id: string;
          status: string;
          started_at: string;
          items_count: number;
          actor_name: string;
        }) => ({
          id: run.run_id,
          type: run.status === "running" ? "scrape" as const : 
                run.status === "succeeded" ? "success" as const : 
                run.status === "failed" ? "error" as const : "info" as const,
          message: run.status === "running" ? "Scraping in progress..." :
                   run.status === "succeeded" ? "Scrape completed" :
                   run.status === "failed" ? "Scrape failed" : "Run pending",
          site: "telegram",
          timestamp: new Date(run.started_at),
          details: run.items_count > 0 ? `${run.items_count.toLocaleString()} items` : undefined,
        }));

        setActivity(recentActivity);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Initial fetch and refresh interval
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl font-semibold text-demon-text">
            System Dashboard
          </h1>
          <p className="text-sm text-demon-text-muted mt-1">
            Real-time monitoring and control center
          </p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg glass">
          <span className="text-xs text-demon-text-muted">System Status:</span>
          <span className="flex items-center gap-2 text-sm text-demon-success font-medium">
            <span className="w-2 h-2 rounded-full bg-demon-success animate-pulse" />
            Operational
          </span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Sources"
          value={stats.isLoading ? 0 : stats.totalSources}
          icon={Globe}
          variant="default"
        />
        <StatsCard
          title="Total Records"
          value={stats.isLoading ? 0 : stats.totalRecords}
          icon={Database}
          variant="success"
        />
        <StatsCard
          title="Active Runs"
          value={stats.isLoading ? 0 : stats.activeRuns}
          icon={Zap}
          variant={stats.activeRuns > 0 ? "warning" : "default"}
        />
        <StatsCard
          title="Success Rate"
          value={stats.isLoading ? 0 : stats.successRate}
          icon={TrendingUp}
          variant="success"
          suffix="%"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Activity Feed & Progress */}
        <div className="lg:col-span-2 space-y-6">
          {/* Data Sources */}
          <NeonCard
            variant="default"
            header={
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-demon-primary" />
                <span className="text-sm font-medium">
                  Data Sources
                </span>
                <span className="ml-auto text-xs text-demon-text-muted font-mono">
                  {stats.sources.length} sources
                </span>
              </div>
            }
          >
            <div className="space-y-4">
              {stats.isLoading ? (
                <div className="text-sm text-demon-text-muted animate-pulse">
                  Loading sources...
                </div>
              ) : stats.sources.length === 0 ? (
                <div className="text-sm text-demon-text-muted">
                  No data sources yet. Start scraping to see them here.
                </div>
              ) : (
                stats.sources.slice(0, 5).map((source) => {
                  const maxRecords = Math.max(...stats.sources.map(s => s.recordCount), 1);
                  const percentage = (source.recordCount / maxRecords) * 100;
                  return (
                    <ProgressBar
                      key={source.sourceIdentifier}
                      value={percentage}
                      label={source.sourceName || source.sourceIdentifier}
                      variant="success"
                      showValue={false}
                    />
                  );
                })
              )}
            </div>
          </NeonCard>

          {/* Activity Feed */}
          <NeonCard variant="default">
            <ActivityFeed items={activity} maxItems={6} />
          </NeonCard>
        </div>

        {/* Right Column - System Info */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <NeonCard
            variant="default"
            header={
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-demon-primary" />
                <span className="text-sm font-medium">
                  Quick Status
                </span>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-demon-bg/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-demon-success/20 flex items-center justify-center">
                    <Server className="w-4 h-4 text-demon-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Apify API</p>
                    <p className="text-xs text-demon-text-muted">Connected</p>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-demon-success" />
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-demon-bg/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-demon-success/20 flex items-center justify-center">
                    <Database className="w-4 h-4 text-demon-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Supabase</p>
                    <p className="text-xs text-demon-text-muted">Synced</p>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-demon-success" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-demon-bg/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-demon-warning/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-demon-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Next Sync</p>
                    <p className="text-xs text-demon-text-muted">In 5 minutes</p>
                  </div>
                </div>
              </div>
            </div>
          </NeonCard>

          {/* Data Overview */}
          <NeonCard
            variant="default"
            header={
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-demon-primary" />
                <span className="text-sm font-medium">
                  Data Overview
                </span>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-demon-bg/50">
                <span className="text-sm text-demon-text-muted">Total Records</span>
                <span className="text-sm font-mono text-demon-accent">
                  {stats.isLoading ? "..." : stats.totalRecords.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-demon-bg/50">
                <span className="text-sm text-demon-text-muted">Sources</span>
                <span className="text-sm font-mono text-demon-accent">
                  {stats.isLoading ? "..." : stats.totalSources}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-demon-bg/50">
                <span className="text-sm text-demon-text-muted">Success Rate</span>
                <span className="text-sm font-mono text-demon-success">
                  {stats.isLoading ? "..." : `${stats.successRate}%`}
                </span>
              </div>
            </div>
          </NeonCard>
        </div>
      </div>

      {/* Terminal */}
      <NeonCard variant="default">
        <Terminal initialLines={terminalLines} />
      </NeonCard>
    </div>
  );
}

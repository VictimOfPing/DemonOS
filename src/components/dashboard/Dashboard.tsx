"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Globe, 
  Database, 
  Activity, 
  Zap, 
  TrendingUp,
  Server,
  Cpu,
  HardDrive
} from "lucide-react";
import { StatsCard } from "./StatsCard";
import { ActivityFeed } from "./ActivityFeed";
import { RadarView } from "./RadarView";
import { NeonCard } from "../ui/NeonCard";
import { ProgressBar } from "../ui/ProgressBar";
import { Terminal, createTerminalLine } from "../ui/Terminal";
import { GlitchText } from "../ui/GlitchText";

// Activity item type
interface ActivityItem {
  id: string;
  type: "scrape" | "success" | "error" | "pending" | "database" | "info";
  message: string;
  site?: string;
  timestamp: Date;
  details?: string;
}

// Mock data
const mockSites = [
  { id: "1", name: "amazon.it", status: "active" as const, angle: 0.5, distance: 0.7 },
  { id: "2", name: "ebay.com", status: "active" as const, angle: 2.1, distance: 0.5 },
  { id: "3", name: "target.com", status: "idle" as const, angle: 3.8, distance: 0.8 },
  { id: "4", name: "walmart.com", status: "error" as const, angle: 5.2, distance: 0.6 },
];

const initialActivity: ActivityItem[] = [
  {
    id: "1",
    type: "success",
    message: "Batch scrape completed successfully",
    site: "amazon.it",
    timestamp: new Date(Date.now() - 60000),
    details: "1,247 products extracted",
  },
  {
    id: "2",
    type: "scrape",
    message: "Scraping in progress...",
    site: "ebay.com",
    timestamp: new Date(Date.now() - 30000),
    details: "Page 47 of 120",
  },
  {
    id: "3",
    type: "database",
    message: "Data synced to Supabase",
    timestamp: new Date(Date.now() - 120000),
    details: "3,421 records updated",
  },
  {
    id: "4",
    type: "error",
    message: "Connection timeout",
    site: "walmart.com",
    timestamp: new Date(Date.now() - 180000),
    details: "Retry scheduled in 5 minutes",
  },
];

const terminalLines = [
  createTerminalLine("info", "DemonOS v1.0 initialized"),
  createTerminalLine("success", "Connected to Apify API"),
  createTerminalLine("success", "Supabase connection established"),
  createTerminalLine("info", "Loading scraper configurations..."),
  createTerminalLine("output", "4 sites configured"),
  createTerminalLine("info", "System ready"),
];

/**
 * Main Dashboard Component
 * Displays system stats, activity feed, radar view, and terminal
 */
export function Dashboard() {
  const [stats, setStats] = useState({
    sitesActive: 4,
    totalData: 124789,
    requestsPerMin: 42,
    successRate: 98.5,
  });

  const [activity, setActivity] = useState<ActivityItem[]>(initialActivity);
  const [scrapingProgress, setScrapingProgress] = useState({
    amazon: 100,
    ebay: 78,
    target: 0,
    walmart: 45,
  });

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        totalData: prev.totalData + Math.floor(Math.random() * 10),
        requestsPerMin: Math.floor(Math.random() * 20) + 35,
      }));

      setScrapingProgress((prev) => ({
        ...prev,
        ebay: Math.min(100, prev.ebay + Math.random() * 2),
        walmart: Math.min(100, prev.walmart + Math.random() * 3),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Add new activity periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const types = ["scrape", "success", "info", "database"] as const;
      const messages = [
        "Processing batch request",
        "Data validation complete",
        "Cache refreshed",
        "API quota check passed",
      ];

      if (Math.random() > 0.5) {
        const newActivity: ActivityItem = {
          id: Date.now().toString(),
          type: types[Math.floor(Math.random() * types.length)],
          message: messages[Math.floor(Math.random() * messages.length)],
          timestamp: new Date(),
        };

        setActivity((prev) => [newActivity, ...prev.slice(0, 9)]);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <GlitchText
            text="SYSTEM DASHBOARD"
            as="h1"
            className="text-2xl font-bold text-demon-accent"
            autoGlitch
            neon
          />
          <p className="text-sm text-demon-text-muted mt-1">
            Real-time monitoring and control center
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-demon-text-muted">System Status:</span>
          <span className="flex items-center gap-1 text-xs text-demon-success">
            <span className="w-2 h-2 rounded-full bg-demon-success animate-pulse" />
            OPERATIONAL
          </span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Sites"
          value={stats.sitesActive}
          icon={Globe}
          variant="default"
          trend={{ value: 12, positive: true }}
        />
        <StatsCard
          title="Total Records"
          value={stats.totalData}
          icon={Database}
          variant="success"
          trend={{ value: 8, positive: true }}
        />
        <StatsCard
          title="Requests/min"
          value={stats.requestsPerMin}
          icon={Zap}
          variant="warning"
        />
        <StatsCard
          title="Success Rate"
          value={stats.successRate}
          icon={TrendingUp}
          variant="success"
          suffix="%"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Activity Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scraping Progress */}
          <NeonCard
            variant="glow"
            header={
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-demon-primary" />
                <span className="text-sm font-mono uppercase tracking-wider">
                  Active Scrapers
                </span>
              </div>
            }
          >
            <div className="space-y-4">
              <ProgressBar
                value={scrapingProgress.amazon}
                label="amazon.it"
                variant="success"
              />
              <ProgressBar
                value={scrapingProgress.ebay}
                label="ebay.com"
                variant="default"
                striped
                animated
              />
              <ProgressBar
                value={scrapingProgress.target}
                label="target.com"
                variant="warning"
              />
              <ProgressBar
                value={scrapingProgress.walmart}
                label="walmart.com"
                variant="danger"
                striped
              />
            </div>
          </NeonCard>

          {/* Activity Feed */}
          <NeonCard variant="default">
            <ActivityFeed items={activity} maxItems={6} />
          </NeonCard>
        </div>

        {/* Right Column - Radar & System */}
        <div className="space-y-6">
          {/* Radar View */}
          <NeonCard variant="glow">
            <RadarView sites={mockSites} />
          </NeonCard>

          {/* System Resources */}
          <NeonCard
            variant="subtle"
            header={
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-demon-primary" />
                <span className="text-sm font-mono uppercase tracking-wider">
                  System Resources
                </span>
              </div>
            }
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-demon-text-muted" />
                  <span className="text-xs text-demon-text-muted">CPU</span>
                </div>
                <span className="text-xs font-mono text-demon-accent">23%</span>
              </div>
              <ProgressBar value={23} showValue={false} size="sm" />

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-demon-text-muted" />
                  <span className="text-xs text-demon-text-muted">Memory</span>
                </div>
                <span className="text-xs font-mono text-demon-accent">1.2GB</span>
              </div>
              <ProgressBar value={45} showValue={false} size="sm" />
            </div>
          </NeonCard>
        </div>
      </div>

      {/* Terminal */}
      <NeonCard variant="default" className="mt-6">
        <Terminal initialLines={terminalLines} />
      </NeonCard>
    </div>
  );
}

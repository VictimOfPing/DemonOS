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
  HardDrive,
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

const initialActivity: ActivityItem[] = [
  {
    id: "1",
    type: "success",
    message: "Batch scrape completed successfully",
    site: "telegram.org",
    timestamp: new Date(Date.now() - 60000),
    details: "45,231 users extracted",
  },
  {
    id: "2",
    type: "scrape",
    message: "Scraping in progress...",
    site: "facebook.com",
    timestamp: new Date(Date.now() - 30000),
    details: "Page 147 of 500",
  },
  {
    id: "3",
    type: "database",
    message: "Data synced to Supabase",
    timestamp: new Date(Date.now() - 120000),
    details: "89,127 records updated",
  },
  {
    id: "4",
    type: "scrape",
    message: "Extracting user profiles...",
    site: "instagram.com",
    timestamp: new Date(Date.now() - 180000),
    details: "234,567 profiles processed",
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
 * Displays system stats, activity feed, and system overview
 */
export function Dashboard() {
  const [stats, setStats] = useState({
    sitesActive: 4,
    totalData: 496768,
    requestsPerMin: 156,
    successRate: 99.2,
  });

  const [activity, setActivity] = useState<ActivityItem[]>(initialActivity);
  const [scrapingProgress, setScrapingProgress] = useState({
    telegram: 100,
    facebook: 78,
    whatsapp: 92,
    instagram: 45,
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
        facebook: Math.min(100, prev.facebook + Math.random() * 2),
        instagram: Math.min(100, prev.instagram + Math.random() * 3),
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
        {/* Left Column - Activity Feed & Progress */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scraping Progress */}
          <NeonCard
            variant="default"
            header={
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-demon-primary" />
                <span className="text-sm font-medium">
                  Active Scrapers
                </span>
              </div>
            }
          >
            <div className="space-y-4">
              <ProgressBar
                value={scrapingProgress.telegram}
                label="telegram.org"
                variant="success"
              />
              <ProgressBar
                value={scrapingProgress.facebook}
                label="facebook.com"
                variant="default"
                striped
                animated
              />
              <ProgressBar
                value={scrapingProgress.whatsapp}
                label="whatsapp.com"
                variant="success"
              />
              <ProgressBar
                value={scrapingProgress.instagram}
                label="instagram.com"
                variant="default"
                striped
                animated
              />
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

          {/* System Resources */}
          <NeonCard
            variant="default"
            header={
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-demon-primary" />
                <span className="text-sm font-medium">
                  System Resources
                </span>
              </div>
            }
          >
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-demon-text-muted" />
                    <span className="text-sm text-demon-text-muted">CPU Usage</span>
                  </div>
                  <span className="text-sm font-mono text-demon-accent">23%</span>
                </div>
                <ProgressBar value={23} showValue={false} size="sm" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-demon-text-muted" />
                    <span className="text-sm text-demon-text-muted">Memory</span>
                  </div>
                  <span className="text-sm font-mono text-demon-accent">1.2 GB</span>
                </div>
                <ProgressBar value={45} showValue={false} size="sm" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-demon-text-muted" />
                    <span className="text-sm text-demon-text-muted">Storage</span>
                  </div>
                  <span className="text-sm font-mono text-demon-accent">112 MB</span>
                </div>
                <ProgressBar value={22} showValue={false} size="sm" />
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

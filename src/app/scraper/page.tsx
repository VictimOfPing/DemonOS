"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Settings,
  Globe,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  BarChart3,
  Download,
  Plus,
  X,
  FileText,
  Database,
  Zap,
  Activity,
} from "lucide-react";
import { NetworkBackground } from "@/components/background/NetworkBackground";
import { ModMenuSidebar } from "@/components/layout/ModMenuSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { HUDOverlay } from "@/components/layout/HUDOverlay";
import { NeonCard } from "@/components/ui/NeonCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  AVAILABLE_SCRAPERS,
  mapApifyStatusToUI,
  type ScraperConfig,
  type ScraperStatus,
} from "@/types/scraper";
import { useScraperMonitor } from "@/hooks/useScraperMonitor";

/** Calculate estimated progress based on time and items */
function estimateProgress(
  startedAt: string,
  status: ScraperStatus,
  itemsCount: number,
  maxItems: number
): number {
  if (status === "completed") return 100;
  if (status === "idle" || status === "error") return 0;

  // Use items count if available
  if (itemsCount > 0 && maxItems > 0) {
    return Math.min(95, Math.floor((itemsCount / maxItems) * 100));
  }

  // Fallback to time-based estimation
  const elapsed = Date.now() - new Date(startedAt).getTime();
  const estimatedDuration = 120000; // 2 minutes estimated
  return Math.min(95, Math.floor((elapsed / estimatedDuration) * 100));
}

export default function ScraperPage() {
  const [scrapers, setScrapers] = useState<ScraperConfig[]>(() =>
    AVAILABLE_SCRAPERS.map((s) => ({
      ...s,
      status: "idle" as ScraperStatus,
      progress: 0,
      itemsScraped: 0,
      lastRun: null,
      currentRunId: null,
      avgSpeed: 0,
    }))
  );
  const [selectedScraper, setSelectedScraper] = useState<string | null>(null);
  const [showNewScraperModal, setShowNewScraperModal] = useState(false);
  const [newScraperGroup, setNewScraperGroup] = useState("");
  const [newScraperAuthToken, setNewScraperAuthToken] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [currentLogs, setCurrentLogs] = useState<string>("");
  const [logsRunId, setLogsRunId] = useState<string | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  // Monitor hook - auto-polls every 30 seconds, 10 seconds when active
  const {
    isPolling,
    isLoading: isMonitorLoading,
    lastSync,
    summary,
    runs: monitorRuns,
    hasActiveRuns,
    activeRunsCount,
    sync: forceSync,
  } = useScraperMonitor({
    enabled: true,
    autoSave: true,
    onRunComplete: (run) => {
      console.log(`Run ${run.runId} completed with status: ${run.status}`);
      // Show notification for completed runs
      if (run.dataSaved) {
        alert(`Scraper completed! ${run.itemsCount} items saved automatically.`);
      }
    },
    onDataSaved: (count) => {
      console.log(`Auto-saved ${count} items to database`);
    },
    onError: (error) => {
      console.error("Monitor error:", error);
    },
  });

  // Update scrapers state based on monitor data
  useEffect(() => {
    if (!monitorRuns.length) return;

    setScrapers((prev) =>
      prev.map((scraper) => {
        // Find matching run from monitor
        const matchingRun = monitorRuns.find(
          (run) => run.status === "running" || run.status === "pending"
        );

        if (!matchingRun) {
          // Check if scraper was previously running but now completed
          if (scraper.status === "running") {
            return {
              ...scraper,
              status: "completed" as ScraperStatus,
              progress: 100,
            };
          }
          return scraper;
        }

        const uiStatus = matchingRun.isFinished
          ? matchingRun.status === "succeeded"
            ? ("completed" as ScraperStatus)
            : ("error" as ScraperStatus)
          : ("running" as ScraperStatus);

        return {
          ...scraper,
          status: uiStatus,
          progress: estimateProgress(
            scraper.lastRun?.toISOString() || new Date().toISOString(),
            uiStatus,
            matchingRun.itemsCount,
            10000 // Max possible items
          ),
          itemsScraped: matchingRun.itemsCount || scraper.itemsScraped,
          currentRunId: matchingRun.runId,
        };
      })
    );
  }, [monitorRuns]);

  // PWA Install prompt handler
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  // Legacy fetchStatus - now calls forceSync
  const fetchStatus = useCallback(async () => {
    await forceSync();
  }, [forceSync]);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const getStatusIcon = (status: ScraperConfig["status"]) => {
    switch (status) {
      case "running":
        return (
          <RefreshCw className="w-4 h-4 animate-spin text-demon-primary" />
        );
      case "paused":
        return <Pause className="w-4 h-4 text-demon-warning" />;
      case "error":
        return <AlertTriangle className="w-4 h-4 text-demon-danger" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-demon-success" />;
      default:
        return <Clock className="w-4 h-4 text-demon-text-muted" />;
    }
  };

  const getStatusLabel = (status: ScraperConfig["status"]) => {
    switch (status) {
      case "running":
        return "Running";
      case "paused":
        return "Paused";
      case "error":
        return "Error";
      case "completed":
        return "Completed";
      default:
        return "Idle";
    }
  };

  const getStatusColor = (status: ScraperConfig["status"]) => {
    switch (status) {
      case "running":
        return "text-demon-primary";
      case "paused":
        return "text-demon-warning";
      case "error":
        return "text-demon-danger";
      case "completed":
        return "text-demon-success";
      default:
        return "text-demon-text-muted";
    }
  };

  const toggleScraper = (id: string) => {
    setScrapers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const startScraper = async (id: string, targetGroup?: string) => {
    const scraper = scrapers.find((s) => s.id === id);
    if (!scraper || !scraper.enabled) return;

    const group = targetGroup || newScraperGroup;
    if (!group) {
      setSelectedScraper(id);
      setShowNewScraperModal(true);
      return;
    }

    setIsStarting(true);
    try {
      const response = await fetch("/api/scraper/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scraperId: id,
          targetGroup: group,
          authToken: newScraperAuthToken || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setScrapers((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: "running" as ScraperStatus,
                  progress: 0,
                  currentRunId: data.data.runId,
                  lastRun: new Date(),
                }
              : s
          )
        );
        setShowNewScraperModal(false);
        setNewScraperGroup("");
        setNewScraperAuthToken("");
      } else {
        console.error("Failed to start scraper:", data.error);
        alert(`Failed to start scraper: ${data.error}`);
      }
    } catch (error) {
      console.error("Error starting scraper:", error);
      alert("Failed to start scraper. Please try again.");
    } finally {
      setIsStarting(false);
    }
  };

  const stopScraper = async (id: string) => {
    const scraper = scrapers.find((s) => s.id === id);
    if (!scraper?.currentRunId) return;

    try {
      const response = await fetch("/api/scraper/abort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: scraper.currentRunId }),
      });

      const data = await response.json();

      if (data.success) {
        setScrapers((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: "idle" as ScraperStatus,
                  currentRunId: null,
                  avgSpeed: 0,
                }
              : s
          )
        );
      }
    } catch (error) {
      console.error("Error stopping scraper:", error);
    }
  };

  const viewLogs = async (runId: string) => {
    setLogsRunId(runId);
    setCurrentLogs("Loading logs...");
    setShowLogsModal(true);

    try {
      const response = await fetch(`/api/scraper/logs/${runId}`);
      const data = await response.json();

      if (data.success) {
        setCurrentLogs(data.data.logs || "No logs available");
      } else {
        setCurrentLogs(`Error: ${data.error}`);
      }
    } catch (error) {
      setCurrentLogs(`Failed to load logs: ${error}`);
    }
  };

  const saveToDatabase = async (runId: string) => {
    try {
      const response = await fetch("/api/scraper/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Successfully saved ${data.data.saved} records to database!`);
      } else {
        alert(`Failed to save: ${data.error}`);
      }
    } catch (error) {
      console.error("Error saving to database:", error);
      alert("Failed to save data to database");
    }
  };

  const totalItems = scrapers.reduce((acc, s) => acc + s.itemsScraped, 0);
  const totalSucceeded = summary?.succeeded ?? 0;
  const totalFailed = summary?.failed ?? 0;

  return (
    <main className="relative min-h-screen w-full bg-transparent">
      <NetworkBackground />
      <HUDOverlay />

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <ModMenuSidebar />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar />

      <div className="relative z-10 flex min-h-screen pt-14">
        {/* Main content area - responsive padding and margin */}
        <div
          className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 
                        pt-[4.5rem] lg:pt-4
                        pb-24 lg:pb-8
                        overflow-auto h-[calc(100vh-3.5rem)]"
        >
          <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
            {/* Install App Banner - PWA */}
            <AnimatePresence>
              {showInstallPrompt && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="glass rounded-2xl p-4 border border-demon-primary/20 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-demon-primary/20 flex items-center justify-center shrink-0">
                      <Download className="w-5 h-5 text-demon-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-demon-text">
                        Install DEMON OS
                      </p>
                      <p className="text-xs text-demon-text-muted truncate">
                        Install as app for quick access and offline use
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setShowInstallPrompt(false)}
                      className="flex-1 sm:flex-none px-4 py-2 text-sm text-demon-text-muted hover:text-demon-text transition-colors"
                    >
                      Later
                    </button>
                    <button
                      onClick={handleInstallApp}
                      className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium bg-demon-primary text-white rounded-xl hover:bg-demon-primary/90 transition-colors"
                    >
                      Install
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header - Responsive */}
            <motion.div
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-demon-text flex items-center gap-3">
                  Scraper Control
                  {/* Monitor Status Indicator */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium
                              ${isPolling 
                                ? hasActiveRuns 
                                  ? "bg-demon-success/20 text-demon-success" 
                                  : "bg-demon-primary/20 text-demon-primary"
                                : "bg-demon-text-muted/20 text-demon-text-muted"
                              }`}
                  >
                    <Activity className={`w-3 h-3 ${isPolling && hasActiveRuns ? "animate-pulse" : ""}`} />
                    {isPolling ? (hasActiveRuns ? "Monitoring" : "Idle") : "Paused"}
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-demon-text-muted mt-1">
                  Manage and monitor your Apify scrapers
                  {lastSync && (
                    <span className="ml-2 text-demon-text-muted/60">
                      · Last sync: {new Date(lastSync.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <NeonButton
                  variant="primary"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    setSelectedScraper("telegram");
                    setShowNewScraperModal(true);
                  }}
                  className="flex-1 sm:flex-none text-sm py-2 sm:py-2.5"
                >
                  <span className="hidden xs:inline">New Scrape</span>
                  <span className="xs:hidden">New</span>
                </NeonButton>
                <NeonButton
                  variant="secondary"
                  icon={<RefreshCw className={`w-4 h-4 ${isMonitorLoading ? "animate-spin" : ""}`} />}
                  onClick={fetchStatus}
                  disabled={isMonitorLoading}
                  className="flex-1 sm:flex-none text-sm py-2 sm:py-2.5"
                >
                  <span className="hidden xs:inline">Sync</span>
                </NeonButton>
              </div>
            </motion.div>

            {/* Stats Overview - Responsive Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <motion.div
                className="p-3 sm:p-4 rounded-xl sm:rounded-2xl glass border border-demon-primary/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0
                                ${activeRunsCount > 0 ? "bg-demon-success/20" : "bg-demon-primary/20"}`}>
                    <Zap className={`w-4 h-4 sm:w-5 sm:h-5 ${activeRunsCount > 0 ? "text-demon-success animate-pulse" : "text-demon-primary"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-semibold text-demon-text">
                      {activeRunsCount}
                    </p>
                    <p className="text-[10px] sm:text-xs text-demon-text-muted truncate">
                      Active Runs
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="p-3 sm:p-4 rounded-xl sm:rounded-2xl glass border border-demon-primary/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-demon-success/20 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-demon-success" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-semibold text-demon-text truncate">
                      {totalItems.toLocaleString()}
                    </p>
                    <p className="text-[10px] sm:text-xs text-demon-text-muted truncate">
                      Total Items
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="p-3 sm:p-4 rounded-xl sm:rounded-2xl glass border border-demon-primary/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-demon-success/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-demon-success" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-semibold text-demon-text">
                      {totalSucceeded}
                    </p>
                    <p className="text-[10px] sm:text-xs text-demon-text-muted truncate">
                      Completed
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="p-3 sm:p-4 rounded-xl sm:rounded-2xl glass border border-demon-primary/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0
                                ${totalFailed > 0 ? "bg-demon-danger/20" : "bg-demon-accent/20"}`}>
                    {totalFailed > 0 ? (
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-demon-danger" />
                    ) : (
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-demon-accent" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-lg sm:text-2xl font-semibold ${totalFailed > 0 ? "text-demon-danger" : "text-demon-text"}`}>
                      {totalFailed > 0 ? totalFailed : (summary?.total ?? scrapers.length)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-demon-text-muted truncate">
                      {totalFailed > 0 ? "Failed" : "Total Runs"}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Scrapers Grid - Responsive */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
              <AnimatePresence>
                {scrapers.map((scraper, index) => (
                  <motion.div
                    key={scraper.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <NeonCard
                      variant={
                        selectedScraper === scraper.id ? "intense" : "default"
                      }
                      className="cursor-pointer touch-manipulation"
                      onClick={() =>
                        setSelectedScraper(
                          selectedScraper === scraper.id ? null : scraper.id
                        )
                      }
                    >
                      {/* Card Header */}
                      <div className="flex items-start sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-demon-bg flex items-center justify-center border border-demon-primary/20 shrink-0">
                            {getStatusIcon(scraper.status)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-demon-text text-sm sm:text-base truncate">
                              {scraper.name}
                            </h3>
                            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                              <Globe className="w-3 h-3 text-demon-text-muted shrink-0" />
                              <span className="text-[10px] sm:text-xs text-demon-text-muted truncate">
                                {scraper.platform}
                              </span>
                            </div>
                          </div>
                        </div>

                        <ToggleSwitch
                          checked={scraper.enabled}
                          onChange={() => toggleScraper(scraper.id)}
                          size="sm"
                        />
                      </div>

                      {/* Progress */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] sm:text-xs text-demon-text-muted">
                            Progress
                          </span>
                          <span className="text-[10px] sm:text-xs font-mono text-demon-accent">
                            {Math.round(scraper.progress)}%
                          </span>
                        </div>
                        <ProgressBar
                          value={scraper.progress}
                          showValue={false}
                          variant={
                            scraper.status === "error"
                              ? "danger"
                              : scraper.status === "completed"
                                ? "success"
                                : "default"
                          }
                          striped={scraper.status === "running"}
                          animated={scraper.status === "running"}
                        />
                      </div>

                      {/* Stats & Controls */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                          <div className="text-xs sm:text-sm">
                            <span className="text-demon-text-muted">
                              Items:{" "}
                            </span>
                            <span className="font-mono text-demon-text">
                              {scraper.itemsScraped.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span
                              className={`font-medium text-xs sm:text-sm ${getStatusColor(scraper.status)}`}
                            >
                              {getStatusLabel(scraper.status)}
                            </span>
                          </div>
                        </div>

                        {/* Controls - Touch optimized */}
                        <div className="flex items-center gap-2 justify-end">
                          {scraper.status === "running" ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                stopScraper(scraper.id);
                              }}
                              className="p-2.5 sm:p-2 rounded-xl sm:rounded-lg bg-demon-danger/10 text-demon-danger 
                                       active:bg-demon-danger/30 transition-colors touch-manipulation"
                              aria-label="Stop scraper"
                            >
                              <Square className="w-5 h-5 sm:w-4 sm:h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startScraper(scraper.id);
                              }}
                              className="p-2.5 sm:p-2 rounded-xl sm:rounded-lg bg-demon-success/10 text-demon-success 
                                       active:bg-demon-success/30 transition-colors touch-manipulation"
                              disabled={!scraper.enabled}
                              aria-label="Start scraper"
                            >
                              <Play className="w-5 h-5 sm:w-4 sm:h-4" />
                            </button>
                          )}
                          {scraper.currentRunId && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  viewLogs(scraper.currentRunId!);
                                }}
                                className="p-2.5 sm:p-2 rounded-xl sm:rounded-lg bg-demon-accent/10 text-demon-accent 
                                         active:bg-demon-accent/30 transition-colors touch-manipulation"
                                aria-label="View logs"
                              >
                                <FileText className="w-5 h-5 sm:w-4 sm:h-4" />
                              </button>
                              {scraper.status === "completed" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    saveToDatabase(scraper.currentRunId!);
                                  }}
                                  className="p-2.5 sm:p-2 rounded-xl sm:rounded-lg bg-demon-primary/10 text-demon-primary 
                                           active:bg-demon-primary/30 transition-colors touch-manipulation"
                                  aria-label="Save to database"
                                >
                                  <Database className="w-5 h-5 sm:w-4 sm:h-4" />
                                </button>
                              )}
                            </>
                          )}
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-2.5 sm:p-2 rounded-xl sm:rounded-lg bg-demon-primary/10 text-demon-primary 
                                     active:bg-demon-primary/30 transition-colors touch-manipulation"
                            aria-label="Settings"
                          >
                            <Settings className="w-5 h-5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {selectedScraper === scraper.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-4 pt-4 border-t border-demon-primary/10"
                          >
                            <p className="text-xs text-demon-text-muted mb-3">
                              {scraper.description}
                            </p>
                            <div className="grid grid-cols-2 gap-2 sm:gap-4 text-sm">
                              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-demon-bg/50">
                                <span className="text-demon-text-muted block mb-1 text-[10px] sm:text-xs">
                                  Actor
                                </span>
                                <span className="font-mono text-demon-text text-xs sm:text-sm truncate block">
                                  {scraper.actorId.split("/")[1]}
                                </span>
                              </div>
                              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-demon-bg/50">
                                <span className="text-demon-text-muted block mb-1 text-[10px] sm:text-xs">
                                  Items Scraped
                                </span>
                                <span className="font-mono text-demon-success text-xs sm:text-sm">
                                  {scraper.itemsScraped.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            {scraper.lastRun && (
                              <div className="mt-3 flex items-center gap-2 text-[10px] sm:text-xs text-demon-text-muted">
                                <Clock className="w-3 h-3" />
                                <span>
                                  Last run: {scraper.lastRun.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </NeonCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* New Scraper Modal */}
      <AnimatePresence>
        {showNewScraperModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowNewScraperModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md glass rounded-2xl p-6 border border-demon-primary/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-demon-text">
                  Start New Scrape
                </h2>
                <button
                  onClick={() => setShowNewScraperModal(false)}
                  className="p-2 rounded-lg hover:bg-demon-primary/10 transition-colors"
                >
                  <X className="w-5 h-5 text-demon-text-muted" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-demon-text-muted mb-2">
                    Target Group Name <span className="text-demon-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={newScraperGroup}
                    onChange={(e) => setNewScraperGroup(e.target.value)}
                    placeholder="groupname or @groupname or https://t.me/groupname"
                    className="w-full px-4 py-3 rounded-xl bg-demon-bg border border-demon-primary/20 
                             text-demon-text placeholder:text-demon-text-muted
                             focus:border-demon-primary/50 focus:outline-none transition-colors"
                  />
                  <p className="text-xs text-demon-text-muted mt-1">
                    Title or username of the Telegram group/channel
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-demon-text-muted mb-2">
                    Telegram Auth Token <span className="text-demon-text-muted/50">(optional)</span>
                  </label>
                  <input
                    type="password"
                    value={newScraperAuthToken}
                    onChange={(e) => setNewScraperAuthToken(e.target.value)}
                    placeholder="For private groups (leave empty for public)"
                    className="w-full px-4 py-3 rounded-xl bg-demon-bg border border-demon-primary/20 
                             text-demon-text placeholder:text-demon-text-muted
                             focus:border-demon-primary/50 focus:outline-none transition-colors"
                  />
                  <p className="text-xs text-demon-text-muted mt-1">
                    Required only for accessing private groups
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-demon-warning/10 border border-demon-warning/20">
                  <p className="text-xs text-demon-warning">
                    ⚠️ Note: This tool requires scanning a QR code from the Log Tab. 
                    Check the Apify console after starting for instructions.
                  </p>
                </div>

                <NeonButton
                  variant="primary"
                  icon={<Play className="w-4 h-4" />}
                  onClick={() =>
                    startScraper(selectedScraper || "telegram", newScraperGroup)
                  }
                  disabled={!newScraperGroup || isStarting}
                  loading={isStarting}
                  className="w-full"
                >
                  {isStarting ? "Starting..." : "Start Scraping"}
                </NeonButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logs Modal */}
      <AnimatePresence>
        {showLogsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLogsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-3xl h-[80vh] glass rounded-2xl p-6 border border-demon-primary/20 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-demon-text">
                  Run Logs
                </h2>
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="p-2 rounded-lg hover:bg-demon-primary/10 transition-colors"
                >
                  <X className="w-5 h-5 text-demon-text-muted" />
                </button>
              </div>

              <div className="flex-1 overflow-auto rounded-xl bg-demon-bg/80 p-4 font-mono text-xs text-demon-text">
                <pre className="whitespace-pre-wrap break-words">
                  {currentLogs}
                </pre>
              </div>

              {logsRunId && (
                <div className="mt-4 flex justify-end">
                  <NeonButton
                    variant="secondary"
                    icon={<RefreshCw className="w-4 h-4" />}
                    onClick={() => viewLogs(logsRunId)}
                  >
                    Refresh Logs
                  </NeonButton>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

// Type for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

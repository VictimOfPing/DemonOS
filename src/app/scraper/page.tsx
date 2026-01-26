"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Square,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Download,
  Plus,
  X,
  FileText,
  Activity,
  Clock,
} from "lucide-react";
import Image from "next/image";
import { NetworkBackground } from "@/components/background/NetworkBackground";
import { ModMenuSidebar } from "@/components/layout/ModMenuSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { HUDOverlay } from "@/components/layout/HUDOverlay";
import { NeonButton } from "@/components/ui/NeonButton";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";

/** Run data from API */
interface ScraperRun {
  id: string;
  run_id: string;
  actor_id: string;
  actor_name: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number;
  items_count: number;
  dataset_id: string | null;
  input_config: Record<string, unknown>;
  error_message: string | null;
  compute_units: number | null;
  usage_usd: number | null;
  created_at: string;
}

/** Format duration in human readable format */
function formatDuration(ms: number): string {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/** Format date to locale string */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("it-IT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }) + "\n" + date.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Get actor display name from actor ID */
function getActorDisplayName(actorId: string): { name: string; shortName: string; iconSrc: string | null; color: string } {
  if (actorId.includes("telegram")) {
    return { 
      name: "Telegram Groups/C...el Member Scraper", 
      shortName: "Telegram",
      iconSrc: "/icons/telegram.png", 
      color: "#0088cc" 
    };
  }
  if (actorId.includes("facebook")) {
    return { 
      name: "Facebook Group Members Scraper", 
      shortName: "Facebook",
      iconSrc: "/icons/facebook.png", 
      color: "#1877F2" 
    };
  }
  if (actorId.includes("instagram")) {
    return { 
      name: "Instagram Followers Scraper", 
      shortName: "Instagram",
      iconSrc: "/icons/instagram.png", 
      color: "#E4405F" 
    };
  }
  return { name: actorId, shortName: "Custom", iconSrc: null, color: "#6B7280" };
}

/** Get status info */
function getStatusInfo(status: string, itemsCount: number, errorMessage: string | null): { 
  icon: React.ReactNode; 
  color: string; 
  message: string 
} {
  // Normalize status - handle both hyphenated and underscored versions
  const normalizedStatus = status.toLowerCase().replace(/-/g, "_");
  
  switch (normalizedStatus) {
    case "succeeded":
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        color: "text-demon-success",
        message: `Actor succeeded with ${itemsCount.toLocaleString()} results in the dataset`,
      };
    case "running":
    case "pending":
      return {
        icon: <RefreshCw className="w-4 h-4 animate-spin" />,
        color: "text-demon-primary",
        message: "Actor is running...",
      };
    case "failed":
      return {
        icon: <XCircle className="w-4 h-4" />,
        color: "text-demon-danger",
        message: errorMessage || "Actor failed",
      };
    case "timed_out":
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        color: "text-demon-warning",
        message: errorMessage || `Actor timed out with ${itemsCount.toLocaleString()} results`,
      };
    case "aborted":
      return {
        icon: <Square className="w-4 h-4" />,
        color: "text-demon-warning",
        message: "The Actor process was aborted. You can resurrect it to continue where you left off.",
      };
    default:
      return {
        icon: <Clock className="w-4 h-4" />,
        color: "text-demon-text-muted",
        message: status,
      };
  }
}

export default function ScraperPage() {
  const [runs, setRuns] = useState<ScraperRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewScraperModal, setShowNewScraperModal] = useState(false);
  const [newScraperGroup, setNewScraperGroup] = useState("");
  const [newScraperAuthToken, setNewScraperAuthToken] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  // Facebook-specific state
  const [facebookGroupUrl, setFacebookGroupUrl] = useState("");
  const [facebookMaxItems, setFacebookMaxItems] = useState(50);
  // Instagram-specific state
  const [instagramUsername, setInstagramUsername] = useState("");
  const [instagramMaxItems, setInstagramMaxItems] = useState(200);
  const [modalScraperType, setModalScraperType] = useState<"telegram" | "facebook" | "instagram">("telegram");
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [currentLogs, setCurrentLogs] = useState<string>("");
  const [logsRunId, setLogsRunId] = useState<string | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  /** Fetch runs from API */
  const fetchRuns = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/scraper/runs?limit=20");
      const data = await response.json();
      if (data.success) {
        setRuns(data.data.runs);
        
        // If there are running jobs, trigger sync in background
        const hasActiveRuns = data.data.runs.some(
          (r: ScraperRun) => r.status === "running" || r.status === "pending"
        );
        if (hasActiveRuns) {
          fetch("/api/scraper/sync").catch(console.error);
        }
      }
    } catch (error) {
      console.error("Error fetching runs:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchRuns();
    
    // Poll every 5 seconds for faster updates
    const interval = setInterval(fetchRuns, 5000);
    return () => clearInterval(interval);
  }, [fetchRuns]);

  // PWA Install prompt handler
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const startScraper = async (id: string) => {
    setIsStarting(true);
    try {
      let requestBody: Record<string, unknown> = { scraperId: id };

      if (id === "telegram") {
        requestBody = {
          ...requestBody,
          targetGroup: newScraperGroup,
          authToken: newScraperAuthToken || undefined,
        };
      } else if (id === "facebook") {
        const urls = facebookGroupUrl
          .split(/[,\n]/)
          .map((url) => url.trim())
          .filter((url) => url.length > 0);
        
        requestBody = {
          ...requestBody,
          groupUrls: urls,
          maxItems: facebookMaxItems,
        };
      } else if (id === "instagram") {
        const usernames = instagramUsername
          .split(/[,\n]/)
          .map((u) => u.trim().replace(/^@/, ""))
          .filter((u) => u.length > 0);
        
        requestBody = {
          ...requestBody,
          instagramUsernames: usernames,
          maxItems: instagramMaxItems,
          instagramType: "followers",
        };
      }

      const response = await fetch("/api/scraper/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        setShowNewScraperModal(false);
        setNewScraperGroup("");
        setNewScraperAuthToken("");
        setFacebookGroupUrl("");
        setFacebookMaxItems(50);
        setInstagramUsername("");
        setInstagramMaxItems(200);
        // Refresh runs list
        await fetchRuns();
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

  const abortRun = async (runId: string) => {
    try {
      const response = await fetch("/api/scraper/abort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchRuns();
      }
    } catch (error) {
      console.error("Error aborting run:", error);
    }
  };

  const forceCloseRun = async (runId: string) => {
    if (!confirm("Force close this stuck run? This will mark it as timed_out.")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/scraper/sync/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "timed_out" }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchRuns();
      } else {
        alert(`Failed to close run: ${data.error}`);
      }
    } catch (error) {
      console.error("Error force closing run:", error);
      alert("Failed to force close run");
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

  const activeRunsCount = runs.filter(r => r.status === "running" || r.status === "pending").length;

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
                      <p className="text-sm font-medium text-demon-text">Install DEMON OS</p>
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

            {/* Header */}
            <motion.div
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-demon-text flex items-center gap-3">
                  Runs
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium
                              ${activeRunsCount > 0 
                                ? "bg-demon-success/20 text-demon-success" 
                                : "bg-demon-primary/20 text-demon-primary"
                              }`}
                  >
                    <Activity className={`w-3 h-3 ${activeRunsCount > 0 ? "animate-pulse" : ""}`} />
                    {runs.length} recent runs
                  </span>
                </h1>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <NeonButton
                  variant="primary"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    setModalScraperType("telegram");
                    setShowNewScraperModal(true);
                  }}
                  className="flex-1 sm:flex-none text-sm py-2 sm:py-2.5"
                >
                  <span className="hidden xs:inline">New Run</span>
                  <span className="xs:hidden">New</span>
                </NeonButton>
                <NeonButton
                  variant="secondary"
                  icon={<RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />}
                  onClick={fetchRuns}
                  disabled={isLoading}
                  className="flex-1 sm:flex-none text-sm py-2 sm:py-2.5"
                >
                  <span className="hidden xs:inline">Sync</span>
                </NeonButton>
              </div>
            </motion.div>

            {/* Runs Table */}
            <motion.div
              className="glass rounded-2xl border border-demon-primary/10 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {/* Table Header */}
              <div className="hidden lg:grid lg:grid-cols-[auto_1fr_90px_120px_120px_80px_60px] gap-4 px-4 py-3 bg-demon-bg/50 border-b border-demon-primary/10 text-xs font-medium text-demon-text-muted uppercase tracking-wider">
                <div className="w-8">Status</div>
                <div>Actor</div>
                <div className="text-right">Results</div>
                <div className="text-right">Started</div>
                <div className="text-right">Finished</div>
                <div className="text-right">Duration</div>
                <div></div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-demon-primary/5">
                {runs.length === 0 ? (
                  <div className="px-4 py-12 text-center text-demon-text-muted">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No runs yet</p>
                    <p className="text-xs mt-1">Start a new scrape to see runs here</p>
                  </div>
                ) : (
                  runs.map((run, index) => {
                    const statusInfo = getStatusInfo(run.status, run.items_count, run.error_message);
                    const actorInfo = getActorDisplayName(run.actor_id);
                    const isRunning = run.status === "running" || run.status === "pending";
                    const isSucceeded = run.status === "succeeded";

                    return (
                      <motion.div
                        key={run.run_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="group hover:bg-demon-primary/5 transition-colors"
                      >
                        {/* Desktop View */}
                        <div className="hidden lg:grid lg:grid-cols-[auto_1fr_90px_120px_120px_80px_60px] gap-4 px-4 py-3 items-center">
                          {/* Status */}
                          <div className={`w-8 flex items-center ${statusInfo.color}`}>
                            {statusInfo.icon}
                          </div>

                          {/* Actor */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                              style={{ backgroundColor: `${actorInfo.color}20` }}
                            >
                              {actorInfo.iconSrc ? (
                                <Image src={actorInfo.iconSrc} alt="" width={20} height={20} className="object-contain" />
                              ) : (
                                <span className="text-lg">⚙️</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-demon-text truncate">
                                {run.actor_name || actorInfo.name}
                              </p>
                              <p className="text-xs text-demon-text-muted truncate">
                                {run.actor_id.split("/").pop()}
                              </p>
                            </div>
                          </div>

                          {/* Results */}
                          <div className="text-right">
                            <span className="text-sm font-mono text-demon-primary">
                              {run.items_count.toLocaleString()}
                            </span>
                          </div>

                          {/* Started */}
                          <div className="text-right text-xs text-demon-text-muted whitespace-pre-line">
                            {formatDate(run.started_at)}
                          </div>

                          {/* Finished */}
                          <div className="text-right text-xs text-demon-text-muted whitespace-pre-line">
                            {formatDate(run.finished_at)}
                          </div>

                          {/* Duration */}
                          <div className="text-right text-xs text-demon-text-muted">
                            {formatDuration(run.duration_ms)}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-1">
                            {isRunning && (
                              <>
                                <button
                                  onClick={() => abortRun(run.run_id)}
                                  className="p-1.5 rounded-lg text-demon-danger hover:bg-demon-danger/10 transition-colors"
                                  title="Abort run"
                                >
                                  <Square className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => forceCloseRun(run.run_id)}
                                  className="p-1.5 rounded-lg text-demon-warning hover:bg-demon-warning/10 transition-colors"
                                  title="Force close stuck run"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => viewLogs(run.run_id)}
                              className="p-1.5 rounded-lg text-demon-accent hover:bg-demon-accent/10 transition-colors"
                              title="View logs"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Mobile View */}
                        <div className="lg:hidden px-4 py-3 space-y-2">
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 ${statusInfo.color}`}>
                              {statusInfo.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {actorInfo.iconSrc ? (
                                  <Image src={actorInfo.iconSrc} alt="" width={20} height={20} className="object-contain" />
                                ) : (
                                  <span className="text-lg">⚙️</span>
                                )}
                                <span className="text-sm font-medium text-demon-text truncate">
                                  {run.actor_name || actorInfo.shortName}
                                </span>
                              </div>
                              <p className="text-xs text-demon-text-muted mt-0.5 line-clamp-2">
                                {statusInfo.message}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-sm font-mono text-demon-primary">
                                {run.items_count.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-demon-text-muted pl-7">
                            <span>{new Date(run.started_at).toLocaleString()}</span>
                            <span>{formatDuration(run.duration_ms)}</span>
                          </div>
                          <div className="flex items-center gap-2 pl-7">
                            {isRunning && (
                              <>
                                <button
                                  onClick={() => abortRun(run.run_id)}
                                  className="px-3 py-1.5 rounded-lg text-xs bg-demon-danger/10 text-demon-danger"
                                >
                                  Abort
                                </button>
                                <button
                                  onClick={() => forceCloseRun(run.run_id)}
                                  className="px-3 py-1.5 rounded-lg text-xs bg-demon-warning/10 text-demon-warning"
                                >
                                  Force Close
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => viewLogs(run.run_id)}
                              className="px-3 py-1.5 rounded-lg text-xs bg-demon-accent/10 text-demon-accent"
                            >
                              Logs
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
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
                  Start New Run
                </h2>
                <button
                  onClick={() => setShowNewScraperModal(false)}
                  className="p-2 rounded-lg hover:bg-demon-primary/10 transition-colors"
                >
                  <X className="w-5 h-5 text-demon-text-muted" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Platform Selector */}
                <div>
                  <label className="block text-sm text-demon-text-muted mb-2">
                    Platform
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setModalScraperType("telegram")}
                      className={`flex-1 px-4 py-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                        modalScraperType === "telegram"
                          ? "bg-[#0088cc]/20 border-[#0088cc] text-[#0088cc]"
                          : "bg-demon-bg border-demon-primary/20 text-demon-text-muted hover:border-demon-primary/40"
                      }`}
                    >
                      <Image src="/icons/telegram.png" alt="Telegram" width={24} height={24} className="object-contain" />
                      <span className="text-sm font-medium">Telegram</span>
                    </button>
                    <button
                      onClick={() => setModalScraperType("facebook")}
                      className={`flex-1 px-4 py-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                        modalScraperType === "facebook"
                          ? "bg-[#1877F2]/20 border-[#1877F2] text-[#1877F2]"
                          : "bg-demon-bg border-demon-primary/20 text-demon-text-muted hover:border-demon-primary/40"
                      }`}
                    >
                      <Image src="/icons/facebook.png" alt="Facebook" width={24} height={24} className="object-contain" />
                      <span className="text-sm font-medium">Facebook</span>
                    </button>
                    <button
                      onClick={() => setModalScraperType("instagram")}
                      className={`flex-1 px-4 py-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                        modalScraperType === "instagram"
                          ? "bg-[#E4405F]/20 border-[#E4405F] text-[#E4405F]"
                          : "bg-demon-bg border-demon-primary/20 text-demon-text-muted hover:border-demon-primary/40"
                      }`}
                    >
                      <Image src="/icons/instagram.png" alt="Instagram" width={24} height={24} className="object-contain" />
                      <span className="text-sm font-medium">Instagram</span>
                    </button>
                  </div>
                </div>

                {/* Telegram inputs */}
                {modalScraperType === "telegram" && (
                  <>
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
                    </div>
                    <div>
                      <label className="block text-sm text-demon-text-muted mb-2">
                        Telegram Auth Token <span className="text-demon-text-muted/50">(optional)</span>
                      </label>
                      <input
                        type="password"
                        value={newScraperAuthToken}
                        onChange={(e) => setNewScraperAuthToken(e.target.value)}
                        placeholder="For private groups"
                        className="w-full px-4 py-3 rounded-xl bg-demon-bg border border-demon-primary/20 
                                 text-demon-text placeholder:text-demon-text-muted
                                 focus:border-demon-primary/50 focus:outline-none transition-colors"
                      />
                    </div>
                  </>
                )}

                {/* Facebook inputs */}
                {modalScraperType === "facebook" && (
                  <>
                    <div>
                      <label className="block text-sm text-demon-text-muted mb-2">
                        Facebook Group URL(s) <span className="text-demon-danger">*</span>
                      </label>
                      <textarea
                        value={facebookGroupUrl}
                        onChange={(e) => setFacebookGroupUrl(e.target.value)}
                        placeholder="https://www.facebook.com/groups/123456789"
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl bg-demon-bg border border-demon-primary/20 
                                 text-demon-text placeholder:text-demon-text-muted
                                 focus:border-demon-primary/50 focus:outline-none transition-colors resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-demon-text-muted mb-2">
                        Max Members: {facebookMaxItems}
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="1000"
                        step="10"
                        value={facebookMaxItems}
                        onChange={(e) => setFacebookMaxItems(parseInt(e.target.value))}
                        className="w-full h-2 bg-demon-bg rounded-lg appearance-none cursor-pointer accent-demon-primary"
                      />
                    </div>
                  </>
                )}

                {/* Instagram inputs */}
                {modalScraperType === "instagram" && (
                  <>
                    <div>
                      <label className="block text-sm text-demon-text-muted mb-2">
                        Instagram Username(s) <span className="text-demon-danger">*</span>
                      </label>
                      <textarea
                        value={instagramUsername}
                        onChange={(e) => setInstagramUsername(e.target.value)}
                        placeholder="username or @username"
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl bg-demon-bg border border-demon-primary/20 
                                 text-demon-text placeholder:text-demon-text-muted
                                 focus:border-demon-primary/50 focus:outline-none transition-colors resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-demon-text-muted mb-2">
                        Max Followers: {instagramMaxItems.toLocaleString()}
                      </label>
                      <input
                        type="range"
                        min="100"
                        max="1000000"
                        step="100"
                        value={instagramMaxItems}
                        onChange={(e) => setInstagramMaxItems(parseInt(e.target.value))}
                        className="w-full h-2 bg-demon-bg rounded-lg appearance-none cursor-pointer accent-[#E4405F]"
                      />
                      <div className="flex justify-between text-xs text-demon-text-muted mt-1">
                        <span>100</span>
                        <span>1M</span>
                      </div>
                    </div>
                  </>
                )}

                <NeonButton
                  variant="primary"
                  icon={<Play className="w-4 h-4" />}
                  onClick={() => startScraper(modalScraperType)}
                  disabled={
                    isStarting ||
                    (modalScraperType === "telegram" && !newScraperGroup) ||
                    (modalScraperType === "facebook" && !facebookGroupUrl) ||
                    (modalScraperType === "instagram" && !instagramUsername)
                  }
                  loading={isStarting}
                  className="w-full"
                >
                  {isStarting ? "Starting..." : "Start Run"}
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
                <h2 className="text-lg font-semibold text-demon-text">Run Logs</h2>
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="p-2 rounded-lg hover:bg-demon-primary/10 transition-colors"
                >
                  <X className="w-5 h-5 text-demon-text-muted" />
                </button>
              </div>

              <div className="flex-1 overflow-auto rounded-xl bg-demon-bg/80 p-4 font-mono text-xs text-demon-text">
                <pre className="whitespace-pre-wrap break-words">{currentLogs}</pre>
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

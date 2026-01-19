"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { NetworkBackground } from "@/components/background/NetworkBackground";
import { ModMenuSidebar } from "@/components/layout/ModMenuSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { HUDOverlay } from "@/components/layout/HUDOverlay";
import { NeonCard } from "@/components/ui/NeonCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface ScraperConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  status: "idle" | "running" | "paused" | "error" | "completed";
  progress: number;
  itemsScraped: number;
  lastRun: Date | null;
  avgSpeed: number;
  settings: {
    maxPages: number;
    delay: number;
    retries: number;
  };
}

const initialScrapers: ScraperConfig[] = [
  {
    id: "1",
    name: "Telegram User Scraper",
    url: "telegram.org",
    enabled: true,
    status: "completed",
    progress: 100,
    itemsScraped: 45231,
    lastRun: new Date(Date.now() - 1800000),
    avgSpeed: 0,
    settings: { maxPages: 500, delay: 1500, retries: 3 },
  },
  {
    id: "2",
    name: "Facebook Profile Extractor",
    url: "facebook.com",
    enabled: true,
    status: "running",
    progress: 67,
    itemsScraped: 127843,
    lastRun: new Date(Date.now() - 3600000),
    avgSpeed: 156,
    settings: { maxPages: 1000, delay: 2000, retries: 5 },
  },
  {
    id: "3",
    name: "WhatsApp Contact Scraper",
    url: "whatsapp.com",
    enabled: true,
    status: "running",
    progress: 89,
    itemsScraped: 89127,
    lastRun: new Date(Date.now() - 7200000),
    avgSpeed: 98,
    settings: { maxPages: 300, delay: 2500, retries: 3 },
  },
  {
    id: "4",
    name: "Instagram Data Collector",
    url: "instagram.com",
    enabled: true,
    status: "running",
    progress: 45,
    itemsScraped: 234567,
    lastRun: new Date(Date.now() - 900000),
    avgSpeed: 234,
    settings: { maxPages: 2000, delay: 1800, retries: 4 },
  },
];

export default function ScraperPage() {
  const [scrapers, setScrapers] = useState<ScraperConfig[]>(initialScrapers);
  const [selectedScraper, setSelectedScraper] = useState<string | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

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

  // Simulate progress updates
  useEffect(() => {
    const interval = setInterval(() => {
      setScrapers((prev) =>
        prev.map((s) => {
          if (s.status === "running" && s.progress < 100) {
            const newProgress = Math.min(100, s.progress + Math.random() * 2);
            const newItems = s.itemsScraped + Math.floor(Math.random() * 5);
            return {
              ...s,
              progress: newProgress,
              itemsScraped: newItems,
              avgSpeed: Math.floor(Math.random() * 10) + 35,
              status: newProgress >= 100 ? "completed" : "running",
            };
          }
          return s;
        })
      );
    }, 1500);

    return () => clearInterval(interval);
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

  const getStatusIcon = (status: ScraperConfig["status"]) => {
    switch (status) {
      case "running":
        return <RefreshCw className="w-4 h-4 animate-spin text-demon-primary" />;
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
      case "running": return "Running";
      case "paused": return "Paused";
      case "error": return "Error";
      case "completed": return "Completed";
      default: return "Idle";
    }
  };

  const getStatusColor = (status: ScraperConfig["status"]) => {
    switch (status) {
      case "running": return "text-demon-primary";
      case "paused": return "text-demon-warning";
      case "error": return "text-demon-danger";
      case "completed": return "text-demon-success";
      default: return "text-demon-text-muted";
    }
  };

  const toggleScraper = (id: string) => {
    setScrapers((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      )
    );
  };

  const startScraper = (id: string) => {
    setScrapers((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "running", progress: s.progress || 0 } : s
      )
    );
  };

  const pauseScraper = (id: string) => {
    setScrapers((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "paused" } : s
      )
    );
  };

  const stopScraper = (id: string) => {
    setScrapers((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "idle", progress: 0 } : s
      )
    );
  };

  const runningCount = scrapers.filter(s => s.status === "running").length;
  const totalItems = scrapers.reduce((acc, s) => acc + s.itemsScraped, 0);

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
        <div className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 
                        pt-[4.5rem] lg:pt-4
                        pb-24 lg:pb-8
                        overflow-auto h-[calc(100vh-3.5rem)]">
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

            {/* Header - Responsive */}
            <motion.div
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-demon-text">
                  Scraper Control
                </h1>
                <p className="text-xs sm:text-sm text-demon-text-muted mt-1">
                  Manage and monitor your Apify scrapers
                </p>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <NeonButton
                  variant="primary"
                  icon={<Play className="w-4 h-4" />}
                  onClick={() => scrapers.filter(s => s.enabled && s.status !== "running").forEach(s => startScraper(s.id))}
                  className="flex-1 sm:flex-none text-sm py-2 sm:py-2.5"
                >
                  <span className="hidden xs:inline">Run All</span>
                  <span className="xs:hidden">Run</span>
                </NeonButton>
                <NeonButton
                  variant="secondary"
                  icon={<Square className="w-4 h-4" />}
                  onClick={() => scrapers.forEach(s => stopScraper(s.id))}
                  className="flex-1 sm:flex-none text-sm py-2 sm:py-2.5"
                >
                  <span className="hidden xs:inline">Stop All</span>
                  <span className="xs:hidden">Stop</span>
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
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-demon-primary/20 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-demon-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-semibold text-demon-text">{runningCount}</p>
                    <p className="text-[10px] sm:text-xs text-demon-text-muted truncate">Active Scrapers</p>
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
                    <p className="text-lg sm:text-2xl font-semibold text-demon-text truncate">{totalItems.toLocaleString()}</p>
                    <p className="text-[10px] sm:text-xs text-demon-text-muted truncate">Total Items</p>
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
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-demon-warning/20 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-demon-warning" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-semibold text-demon-text">
                      {scrapers.filter(s => s.status === "running").reduce((acc, s) => acc + s.avgSpeed, 0)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-demon-text-muted truncate">Items/min</p>
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
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-demon-accent/20 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-demon-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-semibold text-demon-text">24h</p>
                    <p className="text-[10px] sm:text-xs text-demon-text-muted truncate">Uptime</p>
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
                      variant={selectedScraper === scraper.id ? "intense" : "default"}
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
                                {scraper.url}
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
                          <span className="text-[10px] sm:text-xs text-demon-text-muted">Progress</span>
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
                            <span className="text-demon-text-muted">Items: </span>
                            <span className="font-mono text-demon-text">
                              {scraper.itemsScraped.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`font-medium text-xs sm:text-sm ${getStatusColor(scraper.status)}`}>
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
                                pauseScraper(scraper.id);
                              }}
                              className="p-2.5 sm:p-2 rounded-xl sm:rounded-lg bg-demon-warning/10 text-demon-warning 
                                       active:bg-demon-warning/30 transition-colors touch-manipulation"
                              aria-label="Pause scraper"
                            >
                              <Pause className="w-5 h-5 sm:w-4 sm:h-4" />
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
                            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-sm">
                              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-demon-bg/50">
                                <span className="text-demon-text-muted block mb-1 text-[10px] sm:text-xs">
                                  Max Pages
                                </span>
                                <span className="font-mono text-demon-text text-xs sm:text-sm">
                                  {scraper.settings.maxPages}
                                </span>
                              </div>
                              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-demon-bg/50">
                                <span className="text-demon-text-muted block mb-1 text-[10px] sm:text-xs">
                                  Delay
                                </span>
                                <span className="font-mono text-demon-text text-xs sm:text-sm">
                                  {scraper.settings.delay}ms
                                </span>
                              </div>
                              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-demon-bg/50">
                                <span className="text-demon-text-muted block mb-1 text-[10px] sm:text-xs">
                                  Retries
                                </span>
                                <span className="font-mono text-demon-text text-xs sm:text-sm">
                                  {scraper.settings.retries}
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
    </main>
  );
}

// Type for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

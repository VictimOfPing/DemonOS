"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Settings,
  Globe,
  Clock,
  Zap,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { MatrixRain } from "@/components/background/MatrixRain";
import { ModMenuSidebar } from "@/components/layout/ModMenuSidebar";
import { HUDOverlay } from "@/components/layout/HUDOverlay";
import { NeonCard } from "@/components/ui/NeonCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { GlitchText } from "@/components/ui/GlitchText";
import { Terminal, createTerminalLine } from "@/components/ui/Terminal";

interface ScraperConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  status: "idle" | "running" | "paused" | "error" | "completed";
  progress: number;
  itemsScraped: number;
  lastRun: Date | null;
  settings: {
    maxPages: number;
    delay: number;
    retries: number;
  };
}

const initialScrapers: ScraperConfig[] = [
  {
    id: "1",
    name: "Amazon Product Scraper",
    url: "amazon.it",
    enabled: true,
    status: "running",
    progress: 67,
    itemsScraped: 1247,
    lastRun: new Date(Date.now() - 3600000),
    settings: { maxPages: 100, delay: 2000, retries: 3 },
  },
  {
    id: "2",
    name: "eBay Listing Scraper",
    url: "ebay.com",
    enabled: true,
    status: "paused",
    progress: 45,
    itemsScraped: 892,
    lastRun: new Date(Date.now() - 7200000),
    settings: { maxPages: 50, delay: 1500, retries: 2 },
  },
  {
    id: "3",
    name: "Target Catalog Scraper",
    url: "target.com",
    enabled: false,
    status: "idle",
    progress: 0,
    itemsScraped: 0,
    lastRun: null,
    settings: { maxPages: 75, delay: 2500, retries: 3 },
  },
  {
    id: "4",
    name: "Walmart Price Monitor",
    url: "walmart.com",
    enabled: true,
    status: "error",
    progress: 23,
    itemsScraped: 156,
    lastRun: new Date(Date.now() - 1800000),
    settings: { maxPages: 80, delay: 2000, retries: 5 },
  },
];

const terminalLines = [
  createTerminalLine("info", "Scraper Control Panel initialized"),
  createTerminalLine("output", "Loading scraper configurations..."),
  createTerminalLine("success", "4 scrapers loaded"),
];

export default function ScraperPage() {
  const [scrapers, setScrapers] = useState<ScraperConfig[]>(initialScrapers);
  const [selectedScraper, setSelectedScraper] = useState<string | null>(null);
  const [isAllRunning, setIsAllRunning] = useState(false);

  const getStatusIcon = (status: ScraperConfig["status"]) => {
    switch (status) {
      case "running":
        return <RefreshCw className="w-4 h-4 animate-spin text-demon-success" />;
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

  const getStatusColor = (status: ScraperConfig["status"]) => {
    switch (status) {
      case "running":
        return "text-demon-success border-demon-success/50";
      case "paused":
        return "text-demon-warning border-demon-warning/50";
      case "error":
        return "text-demon-danger border-demon-danger/50";
      case "completed":
        return "text-demon-success border-demon-success/50";
      default:
        return "text-demon-text-muted border-demon-text-muted/30";
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
        s.id === id ? { ...s, status: "running" } : s
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

  const runAll = () => {
    setIsAllRunning(true);
    setScrapers((prev) =>
      prev.map((s) => (s.enabled ? { ...s, status: "running" } : s))
    );
  };

  const stopAll = () => {
    setIsAllRunning(false);
    setScrapers((prev) =>
      prev.map((s) => ({ ...s, status: "idle", progress: 0 }))
    );
  };

  return (
    <main className="relative min-h-screen w-full">
      <MatrixRain />
      <HUDOverlay />

      <div className="flex min-h-screen pt-12">
        <ModMenuSidebar />

        <div className="flex-1 ml-64 p-6 overflow-auto h-[calc(100vh-3rem)]">
          <div className="space-y-6">
            {/* Header */}
            <motion.div
              className="flex items-center justify-between"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div>
                <GlitchText
                  text="SCRAPER CONTROL"
                  as="h1"
                  className="text-2xl font-bold text-demon-accent"
                  autoGlitch
                  neon
                />
                <p className="text-sm text-demon-text-muted mt-1">
                  Manage and monitor your Apify scrapers
                </p>
              </div>

              {/* Global controls */}
              <div className="flex items-center gap-3">
                <NeonButton
                  variant="success"
                  icon={<Play className="w-4 h-4" />}
                  onClick={runAll}
                  disabled={isAllRunning}
                >
                  RUN ALL
                </NeonButton>
                <NeonButton
                  variant="danger"
                  icon={<Square className="w-4 h-4" />}
                  onClick={stopAll}
                >
                  STOP ALL
                </NeonButton>
              </div>
            </motion.div>

            {/* Scrapers Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AnimatePresence>
                {scrapers.map((scraper, index) => (
                  <motion.div
                    key={scraper.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <NeonCard
                      variant={selectedScraper === scraper.id ? "intense" : "default"}
                      className="cursor-pointer"
                      onClick={() =>
                        setSelectedScraper(
                          selectedScraper === scraper.id ? null : scraper.id
                        )
                      }
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded border ${getStatusColor(
                              scraper.status
                            )}`}
                          >
                            {getStatusIcon(scraper.status)}
                          </div>
                          <div>
                            <h3 className="font-mono font-bold text-demon-text">
                              {scraper.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Globe className="w-3 h-3 text-demon-text-muted" />
                              <span className="text-xs text-demon-text-muted">
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
                      <ProgressBar
                        value={scraper.progress}
                        variant={
                          scraper.status === "error"
                            ? "danger"
                            : scraper.status === "running"
                            ? "default"
                            : "warning"
                        }
                        striped={scraper.status === "running"}
                        animated={scraper.status === "running"}
                      />

                      {/* Stats */}
                      <div className="flex items-center justify-between mt-4 text-xs">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-demon-text-muted">Items: </span>
                            <span className="font-mono text-demon-accent">
                              {scraper.itemsScraped.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-demon-text-muted">Status: </span>
                            <span
                              className={`font-mono uppercase ${getStatusColor(
                                scraper.status
                              )}`}
                            >
                              {scraper.status}
                            </span>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2">
                          {scraper.status === "running" ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                pauseScraper(scraper.id);
                              }}
                              className="p-1.5 rounded bg-demon-warning/20 text-demon-warning 
                                       hover:bg-demon-warning/30 transition-colors"
                            >
                              <Pause className="w-3 h-3" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startScraper(scraper.id);
                              }}
                              className="p-1.5 rounded bg-demon-success/20 text-demon-success 
                                       hover:bg-demon-success/30 transition-colors"
                              disabled={!scraper.enabled}
                            >
                              <Play className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              stopScraper(scraper.id);
                            }}
                            className="p-1.5 rounded bg-demon-danger/20 text-demon-danger 
                                     hover:bg-demon-danger/30 transition-colors"
                          >
                            <Square className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded bg-demon-primary/20 text-demon-primary 
                                     hover:bg-demon-primary/30 transition-colors"
                          >
                            <Settings className="w-3 h-3" />
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
                            className="mt-4 pt-4 border-t border-demon-primary/20"
                          >
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <div>
                                <span className="text-demon-text-muted block mb-1">
                                  Max Pages
                                </span>
                                <span className="font-mono text-demon-accent">
                                  {scraper.settings.maxPages}
                                </span>
                              </div>
                              <div>
                                <span className="text-demon-text-muted block mb-1">
                                  Delay (ms)
                                </span>
                                <span className="font-mono text-demon-accent">
                                  {scraper.settings.delay}
                                </span>
                              </div>
                              <div>
                                <span className="text-demon-text-muted block mb-1">
                                  Retries
                                </span>
                                <span className="font-mono text-demon-accent">
                                  {scraper.settings.retries}
                                </span>
                              </div>
                            </div>
                            {scraper.lastRun && (
                              <div className="mt-3 text-xs text-demon-text-muted">
                                <Clock className="w-3 h-3 inline mr-1" />
                                Last run:{" "}
                                {scraper.lastRun.toLocaleString()}
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

            {/* Terminal Output */}
            <NeonCard variant="default" className="mt-6">
              <Terminal initialLines={terminalLines} />
            </NeonCard>
          </div>
        </div>
      </div>
    </main>
  );
}

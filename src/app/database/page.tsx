"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Table,
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  ChevronRight,
  Eye,
  ExternalLink,
  TrendingUp,
  Clock,
  Users,
  Crown,
  Bot,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Globe,
} from "lucide-react";
import Image from "next/image";
import { NetworkBackground } from "@/components/background/NetworkBackground";
import { ModMenuSidebar } from "@/components/layout/ModMenuSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { HUDOverlay } from "@/components/layout/HUDOverlay";
import { NeonCard } from "@/components/ui/NeonCard";
import { NeonButton } from "@/components/ui/NeonButton";
import type { ScrapedDataRecord, ScraperType } from "@/types/scraped-data";

// Scraper type configuration
const SCRAPER_CONFIGS: Record<ScraperType, {
  name: string;
  icon: React.ReactNode;
  iconSrc?: string;
  color: string;
  bgColor: string;
  profileUrlPrefix?: string;
}> = {
  telegram: {
    name: "Telegram",
    icon: <Image src="/icons/telegram.png" alt="Telegram" width={16} height={16} className="object-contain" />,
    iconSrc: "/icons/telegram.png",
    color: "text-[#0088cc]",
    bgColor: "bg-[#0088cc]/20",
    profileUrlPrefix: "https://t.me/",
  },
  instagram: {
    name: "Instagram",
    icon: <Image src="/icons/instagram.png" alt="Instagram" width={16} height={16} className="object-contain" />,
    iconSrc: "/icons/instagram.png",
    color: "text-[#E4405F]",
    bgColor: "bg-[#E4405F]/20",
    profileUrlPrefix: "https://instagram.com/",
  },
  twitter: {
    name: "Twitter/X",
    icon: <Globe className="w-4 h-4" />,
    color: "text-[#1DA1F2]",
    bgColor: "bg-[#1DA1F2]/20",
    profileUrlPrefix: "https://x.com/",
  },
  facebook: {
    name: "Facebook",
    icon: <Image src="/icons/facebook.png" alt="Facebook" width={16} height={16} className="object-contain" />,
    iconSrc: "/icons/facebook.png",
    color: "text-[#1877F2]",
    bgColor: "bg-[#1877F2]/20",
    profileUrlPrefix: "https://facebook.com/",
  },
  linkedin: {
    name: "LinkedIn",
    icon: <Globe className="w-4 h-4" />,
    color: "text-[#0A66C2]",
    bgColor: "bg-[#0A66C2]/20",
    profileUrlPrefix: "https://linkedin.com/in/",
  },
  tiktok: {
    name: "TikTok",
    icon: <Globe className="w-4 h-4" />,
    color: "text-white",
    bgColor: "bg-white/20",
    profileUrlPrefix: "https://tiktok.com/@",
  },
  discord: {
    name: "Discord",
    icon: <Globe className="w-4 h-4" />,
    color: "text-[#5865F2]",
    bgColor: "bg-[#5865F2]/20",
  },
  whatsapp: {
    name: "WhatsApp",
    icon: <MessageSquare className="w-4 h-4" />,
    color: "text-[#25D366]",
    bgColor: "bg-[#25D366]/20",
  },
  custom: {
    name: "Custom",
    icon: <Globe className="w-4 h-4" />,
    color: "text-demon-text-muted",
    bgColor: "bg-demon-text-muted/20",
  },
};

// Main platforms always shown
const MAIN_PLATFORMS: ScraperType[] = ["telegram", "facebook", "instagram"];

interface SourceStats {
  sourceIdentifier: string;
  sourceName: string | null;
  recordCount: number;
  premiumCount: number;
  verifiedCount: number;
  botCount: number;
  suspiciousCount: number;
  lastScraped: string;
}

interface RunInfo {
  id: string;
  run_id: string;
  actor_name: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  items_count: number;
}

export default function DatabasePage() {
  // State
  const [activeScraperType, setActiveScraperType] = useState<ScraperType>("telegram");
  const [availableTypes, setAvailableTypes] = useState<ScraperType[]>(["telegram"]);
  const [sources, setSources] = useState<SourceStats[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [records, setRecords] = useState<ScrapedDataRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [runs, setRuns] = useState<RunInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Global stats
  const [globalStats, setGlobalStats] = useState({
    totalSources: 0,
    totalRecords: 0,
    premiumCount: 0,
    verifiedCount: 0,
    botCount: 0,
    successfulRuns: 0,
  });

  // Fetch aggregated stats (optimized - uses database aggregation instead of client-side)
  const fetchSources = useCallback(async (scraperType: ScraperType) => {
    try {
      // Use the optimized stats endpoint
      const response = await fetch(`/api/scraper/stats?scraperType=${scraperType}`);
      const data = await response.json();

      if (data.success && data.data) {
        setSources(data.data.sources || []);
        
        // Update global stats from pre-calculated totals
        setGlobalStats(prev => ({
          ...prev,
          totalSources: data.data.totals?.totalSources || 0,
          totalRecords: data.data.totals?.totalRecords || 0,
          premiumCount: data.data.totals?.premiumCount || 0,
          verifiedCount: data.data.totals?.verifiedCount || 0,
          botCount: data.data.totals?.botCount || 0,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch sources:", error);
    }
  }, []);

  // Fetch records for selected source
  const fetchRecords = useCallback(
    async (sourceIdentifier: string) => {
      setIsLoading(true);
      try {
        const offset = (currentPage - 1) * pageSize;
        const response = await fetch(
          `/api/scraper/data?source=database&scraperType=${activeScraperType}&sourceIdentifier=${encodeURIComponent(sourceIdentifier)}&limit=${pageSize}&offset=${offset}`
        );
        const data = await response.json();

        if (data.success && data.data?.items) {
          setRecords(data.data.items);
          setTotalRecords(data.data.total || 0);
        }
      } catch (error) {
        console.error("Failed to fetch records:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, activeScraperType]
  );

  // Fetch available scraper types from database
  const fetchAvailableTypes = useCallback(async () => {
    try {
      // Query distinct scraper types from the database
      const response = await fetch("/api/scraper/stats/types");
      const data = await response.json();
      
      if (data.success && data.data?.types) {
        // Start with main platforms
        const typesSet = new Set<ScraperType>(MAIN_PLATFORMS);
        
        // Add any additional types from database (excluding "custom" if not needed)
        (data.data.types as string[]).forEach((t) => {
          if (t in SCRAPER_CONFIGS && t !== "custom") {
            typesSet.add(t as ScraperType);
          }
        });
        
        setAvailableTypes(Array.from(typesSet));
      } else {
        // Fallback to main platforms
        setAvailableTypes(MAIN_PLATFORMS);
      }
    } catch (error) {
      console.error("Failed to fetch available types:", error);
      // Fallback to main platforms
      setAvailableTypes(MAIN_PLATFORMS);
    }
  }, []);

  // Fetch recent runs
  const fetchRuns = useCallback(async () => {
    try {
      const response = await fetch("/api/scraper/runs?limit=20");
      const data = await response.json();

      if (data.success && data.data?.runs) {
        const mappedRuns = data.data.runs.map((run: {
          id: string;
          run_id: string;
          actor_name?: string;
          status: string;
          started_at: string;
          finished_at: string | null;
          items_count: number;
        }) => ({
          id: run.id,
          run_id: run.run_id,
          actor_name: run.actor_name || "Scraper",
          status: run.status,
          started_at: run.started_at,
          finished_at: run.finished_at,
          items_count: run.items_count,
        }));
        
        setRuns(mappedRuns);
        
        // Update successful runs count in global stats
        setGlobalStats(prev => ({
          ...prev,
          successfulRuns: mappedRuns.filter((r: RunInfo) => r.status.toLowerCase() === "succeeded").length,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch runs:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchAvailableTypes(), fetchRuns()]);
      await fetchSources(activeScraperType);
      setIsLoading(false);
    };
    loadData();
  }, [fetchAvailableTypes, fetchRuns, fetchSources, activeScraperType]);

  // Load records when source is selected
  useEffect(() => {
    if (selectedSource) {
      fetchRecords(selectedSource);
    }
  }, [selectedSource, fetchRecords]);

  // Change scraper type
  const handleScraperTypeChange = (type: ScraperType) => {
    setActiveScraperType(type);
    setSelectedSource(null);
    setRecords([]);
    setCurrentPage(1);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchSources(activeScraperType), fetchRuns()]);
    if (selectedSource) {
      await fetchRecords(selectedSource);
    }
    setIsRefreshing(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStatusBadge = (record: ScrapedDataRecord) => {
    if (record.isSuspicious) {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-demon-danger/20 text-demon-danger flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Suspicious
        </span>
      );
    }
    if (!record.isActive) {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-demon-text-muted/20 text-demon-text-muted">
          Inactive
        </span>
      );
    }
    if (record.isPremium) {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-demon-warning/20 text-demon-warning flex items-center gap-1">
          <Crown className="w-3 h-3" /> Premium
        </span>
      );
    }
    if (record.isBot) {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-demon-accent/20 text-demon-accent flex items-center gap-1">
          <Bot className="w-3 h-3" /> Bot
        </span>
      );
    }
    if (record.isVerified) {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-demon-success/20 text-demon-success flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Verified
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-demon-primary/20 text-demon-primary">
        Active
      </span>
    );
  };

  const getRunStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "running" || statusLower === "pending") {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-demon-primary/20 text-demon-primary animate-pulse">
          Running
        </span>
      );
    }
    if (statusLower === "succeeded") {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-demon-success/20 text-demon-success">
          Completed
        </span>
      );
    }
    if (statusLower === "failed" || statusLower === "timed_out") {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-demon-danger/20 text-demon-danger">
          Failed
        </span>
      );
    }
    if (statusLower === "aborted") {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-demon-warning/20 text-demon-warning">
          Aborted
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-demon-text-muted/20 text-demon-text-muted">
        {status}
      </span>
    );
  };

  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Helper: escape CSV value properly
  const escapeCSV = (value: string | number | boolean | null | undefined): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    // If contains comma, quote, or newline, wrap in quotes and escape quotes
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Helper: clean string for export (remove problematic characters)
  const cleanString = (value: string | null | undefined): string => {
    if (!value) return "";
    // Remove emojis and special unicode for cleaner export (ES5 compatible)
    return value
      .split("")
      .filter((char) => {
        const code = char.charCodeAt(0);
        // Keep only basic ASCII and common extended characters
        return code < 0xD800 || (code > 0xDFFF && code < 0xFE00);
      })
      .join("")
      .trim();
  };

  const exportData = async (format: "csv" | "json") => {
    setShowExportMenu(false);
    try {
      const response = await fetch(
        `/api/scraper/data?source=database&scraperType=${activeScraperType}${selectedSource ? `&sourceIdentifier=${encodeURIComponent(selectedSource)}` : ""}&limit=50000`
      );
      const data = await response.json();

      if (!data.success || !data.data?.items) {
        alert("No data to export");
        return;
      }

      const items = data.data.items as ScrapedDataRecord[];
      const timestamp = new Date().toISOString().split("T")[0];
      const sourceSuffix = selectedSource ? `_${cleanString(selectedSource).replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)}` : "";

      if (format === "json") {
        // JSON Export - clean and structured
        const exportData = items.map((r) => ({
          id: r.entityId,
          username: r.username || null,
          firstName: r.displayName || null,
          fullName: r.entityName || null,
          type: r.entityType,
          flags: {
            premium: r.isPremium,
            verified: r.isVerified,
            bot: r.isBot,
            suspicious: r.isSuspicious,
            active: r.isActive,
          },
          source: cleanString(r.sourceIdentifier),
          profileUrl: r.profileUrl || null,
          scrapedAt: r.createdAt,
        }));

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${activeScraperType}${sourceSuffix}_${timestamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // CSV Export - clean with proper escaping
        const headers = [
          "ID",
          "Username", 
          "First Name",
          "Full Name",
          "Type",
          "Premium",
          "Verified",
          "Bot",
          "Suspicious",
          "Active",
          "Source",
          "Profile URL",
          "Scraped At",
        ];

        const rows = items.map((r) => [
          escapeCSV(r.entityId),
          escapeCSV(r.username),
          escapeCSV(cleanString(r.displayName)),
          escapeCSV(cleanString(r.entityName)),
          escapeCSV(r.entityType),
          r.isPremium ? "Yes" : "No",
          r.isVerified ? "Yes" : "No",
          r.isBot ? "Yes" : "No",
          r.isSuspicious ? "Yes" : "No",
          r.isActive ? "Yes" : "No",
          escapeCSV(cleanString(r.sourceIdentifier)),
          escapeCSV(r.profileUrl),
          escapeCSV(r.createdAt?.split("T")[0] || ""),
        ]);

        // Add UTF-8 BOM for Excel compatibility
        const BOM = "\uFEFF";
        const csv = BOM + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${activeScraperType}${sourceSuffix}_${timestamp}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data");
    }
  };

  const selectedSourceInfo = sources.find((s) => s.sourceIdentifier === selectedSource);
  const totalPages = Math.ceil(totalRecords / pageSize);
  const config = SCRAPER_CONFIGS[activeScraperType];

  // Filter records by search
  const filteredRecords = records.filter(
    (r) =>
      !searchQuery ||
      r.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.entityName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.entityId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-demon-text">
                  Database Viewer
                </h1>
                <p className="text-xs sm:text-sm text-demon-text-muted mt-1">
                  Browse and manage scraped data
                </p>
              </div>

              <div className="flex items-center gap-3">
                <NeonButton
                  variant="secondary"
                  icon={
                    <RefreshCw
                      className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                    />
                  }
                  onClick={handleRefresh}
                  loading={isRefreshing}
                >
                  Sync
                </NeonButton>
                
                {/* Export Dropdown */}
                <div className="relative">
                  <NeonButton
                    variant="primary"
                    icon={<Download className="w-4 h-4" />}
                    onClick={() => setShowExportMenu(!showExportMenu)}
                  >
                    Export
                  </NeonButton>
                  
                  {showExportMenu && (
                    <>
                      {/* Backdrop to close menu */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowExportMenu(false)}
                      />
                      {/* Dropdown menu */}
                      <div className="absolute right-0 mt-2 w-48 rounded-xl bg-demon-bg-secondary border border-demon-primary/20 shadow-lg z-50 overflow-hidden">
                        <button
                          onClick={() => exportData("csv")}
                          className="w-full px-4 py-3 text-left text-sm text-demon-text hover:bg-demon-primary/10 transition-colors flex items-center gap-3"
                        >
                          <Table className="w-4 h-4 text-demon-success" />
                          <div>
                            <div className="font-medium">Export CSV</div>
                            <div className="text-xs text-demon-text-muted">Excel compatible</div>
                          </div>
                        </button>
                        <button
                          onClick={() => exportData("json")}
                          className="w-full px-4 py-3 text-left text-sm text-demon-text hover:bg-demon-primary/10 transition-colors flex items-center gap-3 border-t border-demon-primary/10"
                        >
                          <Database className="w-4 h-4 text-demon-accent" />
                          <div>
                            <div className="font-medium">Export JSON</div>
                            <div className="text-xs text-demon-text-muted">Structured data</div>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Platform Tabs */}
            <motion.div
              className="flex flex-wrap gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              {availableTypes.map((type) => {
                const typeConfig = SCRAPER_CONFIGS[type];
                const isActive = activeScraperType === type;
                return (
                  <button
                    key={type}
                    onClick={() => handleScraperTypeChange(type)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                      transition-all duration-200 border
                      ${isActive 
                        ? `${typeConfig.bgColor} ${typeConfig.color} border-current` 
                        : "bg-demon-bg/50 text-demon-text-muted border-demon-primary/10 hover:border-demon-primary/30"
                      }
                    `}
                  >
                    {typeConfig.icon}
                    {typeConfig.name}
                  </button>
                );
              })}
              {/* Future platforms placeholder */}
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                           bg-demon-bg/30 text-demon-text-muted/50 border border-dashed border-demon-primary/10
                           cursor-not-allowed"
              >
                + Add Platform
              </button>
            </motion.div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div
                className="p-4 rounded-2xl glass border border-demon-primary/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center ${config.color}`}>
                    {config.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-demon-text">
                      {sources.length}
                    </p>
                    <p className="text-xs text-demon-text-muted">Sources</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="p-4 rounded-2xl glass border border-demon-primary/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-demon-success/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-demon-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-demon-text">
                      {sources.reduce((acc, s) => acc + s.recordCount, 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-demon-text-muted">Total Records</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="p-4 rounded-2xl glass border border-demon-primary/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-demon-warning/20 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-demon-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-demon-text">
                      {sources.reduce((acc, s) => acc + s.premiumCount, 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-demon-text-muted">Premium</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="p-4 rounded-2xl glass border border-demon-primary/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-demon-accent/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-demon-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-demon-text">
                      {runs.filter((r) => r.status.toLowerCase() === "succeeded").length}
                    </p>
                    <p className="text-xs text-demon-text-muted">Successful Runs</p>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar - Sources List */}
              <div className="lg:col-span-1">
                <NeonCard variant="default">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`${config.color}`}>{config.icon}</div>
                    <span className="text-sm font-medium text-demon-text">
                      {config.name} Sources ({sources.length})
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {sources.length === 0 && !isLoading && (
                      <p className="text-sm text-demon-text-muted text-center py-4">
                        No data yet. Run a scraper first!
                      </p>
                    )}
                    {sources.map((source, index) => (
                      <motion.button
                        key={source.sourceIdentifier}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-xl text-left
                          transition-all duration-200
                          ${
                            selectedSource === source.sourceIdentifier
                              ? "bg-demon-primary/15 border border-demon-primary/30"
                              : "bg-demon-bg/30 border border-transparent hover:border-demon-primary/20 hover:bg-demon-bg/50"
                          }
                        `}
                        onClick={() => {
                          setSelectedSource(source.sourceIdentifier);
                          setCurrentPage(1);
                        }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Table
                          className={`w-4 h-4 ${
                            selectedSource === source.sourceIdentifier
                              ? "text-demon-accent"
                              : "text-demon-text-muted"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate text-demon-text">
                            {source.sourceName || source.sourceIdentifier}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-demon-text-muted mt-0.5">
                            <span>{source.recordCount.toLocaleString()} records</span>
                            {source.premiumCount > 0 && (
                              <span className="text-demon-warning">
                                {source.premiumCount} ⭐
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${
                            selectedSource === source.sourceIdentifier
                              ? "text-demon-accent rotate-90"
                              : "text-demon-text-muted"
                          }`}
                        />
                      </motion.button>
                    ))}
                  </div>
                </NeonCard>
              </div>

              {/* Data View */}
              <div className="lg:col-span-3">
                <NeonCard variant="default">
                  {/* Table Header */}
                  {selectedSourceInfo ? (
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-demon-primary/10">
                      <div>
                        <h2 className="text-lg font-semibold text-demon-text">
                          {selectedSourceInfo.sourceName || selectedSourceInfo.sourceIdentifier}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-demon-text-muted">
                          <span>{selectedSourceInfo.recordCount.toLocaleString()} records</span>
                          <span>•</span>
                          <span className="text-demon-warning">
                            {selectedSourceInfo.premiumCount} ⭐ premium
                          </span>
                          {selectedSourceInfo.suspiciousCount > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-demon-danger">
                                {selectedSourceInfo.suspiciousCount} ⚠️ suspicious
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(selectedSourceInfo.lastScraped)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-demon-text-muted" />
                          <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 text-sm bg-demon-bg border border-demon-primary/20 
                                     rounded-xl text-demon-text placeholder:text-demon-text-muted
                                     focus:border-demon-primary/50 focus:outline-none transition-colors"
                          />
                        </div>
                        <button className="p-2 rounded-xl bg-demon-bg border border-demon-primary/20 
                                         text-demon-text-muted hover:text-demon-text hover:border-demon-primary/40 transition-colors">
                          <Filter className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Database className="w-12 h-12 text-demon-primary/30 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-demon-text mb-2">
                        Select a Source
                      </h3>
                      <p className="text-sm text-demon-text-muted">
                        Choose a source from the sidebar to view its data
                      </p>
                    </div>
                  )}

                  {/* Data Table */}
                  {selectedSource && (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-demon-primary/10">
                              <th className="text-left py-3 px-4 text-xs font-medium uppercase text-demon-text-muted">
                                Username
                              </th>
                              <th className="text-left py-3 px-4 text-xs font-medium uppercase text-demon-text-muted">
                                Name
                              </th>
                              <th className="text-left py-3 px-4 text-xs font-medium uppercase text-demon-text-muted">
                                ID
                              </th>
                              <th className="text-left py-3 px-4 text-xs font-medium uppercase text-demon-text-muted">
                                Status
                              </th>
                              <th className="text-right py-3 px-4 text-xs font-medium uppercase text-demon-text-muted">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {isLoading ? (
                              <tr>
                                <td colSpan={5} className="py-8 text-center">
                                  <RefreshCw className="w-6 h-6 animate-spin text-demon-primary mx-auto" />
                                </td>
                              </tr>
                            ) : filteredRecords.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-demon-text-muted">
                                  No records found
                                </td>
                              </tr>
                            ) : (
                              <AnimatePresence>
                                {filteredRecords.map((record, index) => (
                                  <motion.tr
                                    key={record.id}
                                    className="border-b border-demon-primary/5 hover:bg-demon-primary/5 transition-colors"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                  >
                                    <td className="py-3 px-4">
                                      <div className="max-w-xs">
                                        <p className="text-sm text-demon-text truncate">
                                          {record.username ? `@${record.username}` : "-"}
                                        </p>
                                        <p className="text-[10px] text-demon-text-muted mt-0.5">
                                          {formatDate(record.createdAt)}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="text-sm text-demon-text">
                                        {record.entityName || record.displayName || "-"}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="text-sm font-mono text-demon-text-muted">
                                        {record.entityId}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      {getStatusBadge(record)}
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          className="p-2 rounded-lg bg-demon-primary/10 text-demon-primary 
                                                   hover:bg-demon-primary/20 transition-colors"
                                          title="View details"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                        {(record.profileUrl || record.username) && (
                                          <a
                                            href={record.profileUrl || `${config.profileUrlPrefix}${record.username}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg bg-demon-accent/10 text-demon-accent 
                                                     hover:bg-demon-accent/20 transition-colors"
                                            title={`Open ${config.name}`}
                                          >
                                            <ExternalLink className="w-4 h-4" />
                                          </a>
                                        )}
                                        <button
                                          className="p-2 rounded-lg bg-demon-danger/10 text-demon-danger 
                                                   hover:bg-demon-danger/20 transition-colors"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </motion.tr>
                                ))}
                              </AnimatePresence>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-demon-primary/10">
                        <span className="text-sm text-demon-text-muted">
                          Page {currentPage} of {totalPages || 1} ({totalRecords.toLocaleString()} total)
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 text-sm rounded-xl bg-demon-bg border 
                                     border-demon-primary/20 text-demon-text-muted 
                                     hover:border-demon-primary/40 hover:text-demon-text 
                                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            className="px-4 py-2 text-sm rounded-xl bg-demon-bg border 
                                     border-demon-primary/20 text-demon-text-muted 
                                     hover:border-demon-primary/40 hover:text-demon-text 
                                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </NeonCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

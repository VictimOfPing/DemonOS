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
  HardDrive,
  TrendingUp,
  Clock,
  CheckCircle,
  Users,
  Crown,
  Bot,
} from "lucide-react";
import { NetworkBackground } from "@/components/background/NetworkBackground";
import { ModMenuSidebar } from "@/components/layout/ModMenuSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { HUDOverlay } from "@/components/layout/HUDOverlay";
import { NeonCard } from "@/components/ui/NeonCard";
import { NeonButton } from "@/components/ui/NeonButton";

interface GroupStats {
  source_url: string;
  member_count: number;
  premium_count: number;
  bot_count: number;
  scam_count: number;
  deleted_count: number;
  last_scraped: string;
}

interface TelegramMember {
  id: string;
  source_url: string;
  processor: string;
  processed_at: string;
  telegram_id: string;
  first_name: string | null;
  last_name: string | null;
  usernames: string[];
  phone: string | null;
  type: string;
  is_deleted: boolean;
  is_verified: boolean;
  is_premium: boolean;
  is_scam: boolean;
  is_fake: boolean;
  is_restricted: boolean;
  lang_code: string | null;
  last_seen: string | null;
  stories_hidden: boolean;
  premium_contact: boolean;
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
  const [groups, setGroups] = useState<GroupStats[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [members, setMembers] = useState<TelegramMember[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [runs, setRuns] = useState<RunInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"groups" | "runs">("groups");
  const pageSize = 20;

  // Fetch group statistics (aggregated by source_url)
  const fetchGroups = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/scraper/data?source=database&limit=10000"
      );
      const data = await response.json();

      if (data.success && data.data?.items) {
        // Aggregate by source_url (Telegram group)
        const groupMap = new Map<string, GroupStats>();

        data.data.items.forEach((member: TelegramMember) => {
          const existing = groupMap.get(member.source_url);
          if (existing) {
            existing.member_count++;
            if (member.is_premium) existing.premium_count++;
            if (member.type === "bot") existing.bot_count++;
            if (member.is_scam) existing.scam_count++;
            if (member.is_deleted) existing.deleted_count++;
            if (
              new Date(member.processed_at) > new Date(existing.last_scraped)
            ) {
              existing.last_scraped = member.processed_at;
            }
          } else {
            groupMap.set(member.source_url, {
              source_url: member.source_url,
              member_count: 1,
              premium_count: member.is_premium ? 1 : 0,
              bot_count: member.type === "bot" ? 1 : 0,
              scam_count: member.is_scam ? 1 : 0,
              deleted_count: member.is_deleted ? 1 : 0,
              last_scraped: member.processed_at,
            });
          }
        });

        setGroups(Array.from(groupMap.values()));
        setTotalMembers(data.data.total || data.data.items.length);
      }
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    }
  }, []);

  // Fetch members for selected group (by source_url)
  const fetchMembers = useCallback(
    async (sourceUrl: string) => {
      setIsLoading(true);
      try {
        const offset = (currentPage - 1) * pageSize;
        const response = await fetch(
          `/api/scraper/data?source=database&sourceUrl=${encodeURIComponent(sourceUrl)}&limit=${pageSize}&offset=${offset}`
        );
        const data = await response.json();

        if (data.success && data.data?.items) {
          setMembers(data.data.items);
          setTotalMembers(data.data.total || 0);
        }
      } catch (error) {
        console.error("Failed to fetch members:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage]
  );

  // Fetch recent runs
  const fetchRuns = useCallback(async () => {
    try {
      const response = await fetch("/api/scraper/status?limit=10");
      const data = await response.json();

      if (data.success && data.data?.runs) {
        setRuns(
          data.data.runs.map(
            (run: {
              id: string;
              actorId: string;
              status: string;
              startedAt: string;
              finishedAt: string | null;
              itemsCount: number;
            }) => ({
              id: run.id,
              run_id: run.id,
              actor_name: "Telegram Scraper",
              status: run.status,
              started_at: run.startedAt,
              finished_at: run.finishedAt,
              items_count: run.itemsCount,
            })
          )
        );
      }
    } catch (error) {
      console.error("Failed to fetch runs:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchGroups(), fetchRuns()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchGroups, fetchRuns]);

  // Load members when group is selected
  useEffect(() => {
    if (selectedGroup) {
      fetchMembers(selectedGroup);
    }
  }, [selectedGroup, fetchMembers]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchGroups(), fetchRuns()]);
    if (selectedGroup) {
      await fetchMembers(selectedGroup);
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

  const getStatusBadge = (member: TelegramMember) => {
    if (member.is_scam) {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-demon-danger/20 text-demon-danger">
          ⚠️ Scam
        </span>
      );
    }
    if (member.is_fake) {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-demon-danger/20 text-demon-danger">
          Fake
        </span>
      );
    }
    if (member.is_deleted) {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-demon-text-muted/20 text-demon-text-muted">
          Deleted
        </span>
      );
    }
    if (member.is_premium) {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-demon-warning/20 text-demon-warning flex items-center gap-1">
          <Crown className="w-3 h-3" /> Premium
        </span>
      );
    }
    if (member.type === "bot") {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-demon-accent/20 text-demon-accent flex items-center gap-1">
          <Bot className="w-3 h-3" /> Bot
        </span>
      );
    }
    if (member.is_verified) {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-demon-success/20 text-demon-success">
          ✓ Verified
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-demon-primary/20 text-demon-primary">
        User
      </span>
    );
  };

  const getRunStatusBadge = (status: string) => {
    switch (status) {
      case "RUNNING":
      case "READY":
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-demon-primary/20 text-demon-primary animate-pulse">
            Running
          </span>
        );
      case "SUCCEEDED":
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-demon-success/20 text-demon-success">
            Completed
          </span>
        );
      case "FAILED":
      case "TIMED-OUT":
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-demon-danger/20 text-demon-danger">
            Failed
          </span>
        );
      case "ABORTED":
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-demon-warning/20 text-demon-warning">
            Aborted
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-demon-text-muted/20 text-demon-text-muted">
            {status}
          </span>
        );
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch(
        `/api/scraper/data?source=database${selectedGroup ? `&sourceUrl=${encodeURIComponent(selectedGroup)}` : ""}&limit=10000`
      );
      const data = await response.json();

      if (data.success && data.data?.items) {
        const csv = [
          [
            "Telegram ID",
            "Usernames",
            "First Name",
            "Last Name",
            "Phone",
            "Type",
            "Premium",
            "Verified",
            "Scam",
            "Deleted",
            "Language",
            "Last Seen",
            "Source URL",
            "Processed At",
          ].join(","),
          ...data.data.items.map((m: TelegramMember) =>
            [
              m.telegram_id || m.id,
              (m.usernames || []).join(";"),
              m.first_name || "",
              m.last_name || "",
              m.phone || "",
              m.type,
              m.is_premium,
              m.is_verified,
              m.is_scam,
              m.is_deleted,
              m.lang_code || "",
              m.last_seen || "",
              m.source_url,
              m.processed_at,
            ].join(",")
          ),
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `telegram_members_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data");
    }
  };

  const selectedGroupInfo = groups.find((g) => g.source_url === selectedGroup);
  const totalPages = Math.ceil(totalMembers / pageSize);

  // Extract group name from source_url (e.g., "https://t.me/groupname" -> "groupname")
  const getGroupName = (sourceUrl: string) => {
    const match = sourceUrl.match(/t\.me\/([^/?]+)/);
    return match ? `@${match[1]}` : sourceUrl;
  };

  // Filter members by search (searches in usernames array and names)
  const filteredMembers = members.filter(
    (m) =>
      !searchQuery ||
      m.usernames?.some(u => u.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.telegram_id?.toLowerCase().includes(searchQuery.toLowerCase())
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
                  Browse and manage scraped data from Supabase
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
                <NeonButton
                  variant="primary"
                  icon={<Download className="w-4 h-4" />}
                  onClick={exportData}
                >
                  Export
                </NeonButton>
              </div>
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
                  <div className="w-10 h-10 rounded-xl bg-demon-primary/20 flex items-center justify-center">
                    <Database className="w-5 h-5 text-demon-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-demon-text">
                      {groups.length}
                    </p>
                    <p className="text-xs text-demon-text-muted">Groups</p>
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
                      {groups
                        .reduce((acc, g) => acc + g.member_count, 0)
                        .toLocaleString()}
                    </p>
                    <p className="text-xs text-demon-text-muted">
                      Total Members
                    </p>
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
                      {groups
                        .reduce((acc, g) => acc + g.premium_count, 0)
                        .toLocaleString()}
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
                      {runs.filter((r) => r.status === "SUCCEEDED").length}
                    </p>
                    <p className="text-xs text-demon-text-muted">
                      Successful Runs
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar - Groups/Runs List */}
              <div className="lg:col-span-1">
                <NeonCard variant="default">
                  {/* View Toggle */}
                  <div className="flex mb-4 p-1 rounded-xl bg-demon-bg/50">
                    <button
                      onClick={() => setViewMode("groups")}
                      className={`flex-1 py-2 px-3 text-xs rounded-lg transition-colors ${
                        viewMode === "groups"
                          ? "bg-demon-primary/20 text-demon-primary"
                          : "text-demon-text-muted hover:text-demon-text"
                      }`}
                    >
                      Groups
                    </button>
                    <button
                      onClick={() => setViewMode("runs")}
                      className={`flex-1 py-2 px-3 text-xs rounded-lg transition-colors ${
                        viewMode === "runs"
                          ? "bg-demon-primary/20 text-demon-primary"
                          : "text-demon-text-muted hover:text-demon-text"
                      }`}
                    >
                      Runs
                    </button>
                  </div>

                  {viewMode === "groups" ? (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <Database className="w-4 h-4 text-demon-primary" />
                        <span className="text-sm font-medium text-demon-text">
                          Groups ({groups.length})
                        </span>
                      </div>

                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {groups.length === 0 && !isLoading && (
                          <p className="text-sm text-demon-text-muted text-center py-4">
                            No data yet. Run a scraper first!
                          </p>
                        )}
                        {groups.map((group, index) => (
                          <motion.button
                            key={group.source_url}
                            className={`
                              w-full flex items-center gap-3 p-3 rounded-xl text-left
                              transition-all duration-200
                              ${
                                selectedGroup === group.source_url
                                  ? "bg-demon-primary/15 border border-demon-primary/30"
                                  : "bg-demon-bg/30 border border-transparent hover:border-demon-primary/20 hover:bg-demon-bg/50"
                              }
                            `}
                            onClick={() => {
                              setSelectedGroup(group.source_url);
                              setCurrentPage(1);
                            }}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Table
                              className={`w-4 h-4 ${
                                selectedGroup === group.source_url
                                  ? "text-demon-accent"
                                  : "text-demon-text-muted"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate text-demon-text">
                                {getGroupName(group.source_url)}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-demon-text-muted mt-0.5">
                                <span>
                                  {group.member_count.toLocaleString()} members
                                </span>
                                {group.premium_count > 0 && (
                                  <span className="text-demon-warning">
                                    {group.premium_count} ⭐
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight
                              className={`w-4 h-4 transition-transform ${
                                selectedGroup === group.source_url
                                  ? "text-demon-accent rotate-90"
                                  : "text-demon-text-muted"
                              }`}
                            />
                          </motion.button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-demon-primary" />
                        <span className="text-sm font-medium text-demon-text">
                          Recent Runs
                        </span>
                      </div>

                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {runs.length === 0 && !isLoading && (
                          <p className="text-sm text-demon-text-muted text-center py-4">
                            No runs yet
                          </p>
                        )}
                        {runs.map((run, index) => (
                          <motion.div
                            key={run.id}
                            className="p-3 rounded-xl bg-demon-bg/30 border border-transparent"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-demon-text truncate">
                                {run.actor_name}
                              </span>
                              {getRunStatusBadge(run.status)}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-demon-text-muted">
                              <span>{formatDate(run.started_at)}</span>
                              <span>{run.items_count} items</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}
                </NeonCard>
              </div>

              {/* Data View */}
              <div className="lg:col-span-3">
                <NeonCard variant="default">
                  {/* Table Header */}
                  {selectedGroupInfo ? (
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-demon-primary/10">
                      <div>
                        <h2 className="text-lg font-semibold text-demon-text">
                          {getGroupName(selectedGroupInfo.source_url)}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-demon-text-muted">
                          <span>
                            {selectedGroupInfo.member_count.toLocaleString()} members
                          </span>
                          <span>•</span>
                          <span className="text-demon-warning">
                            {selectedGroupInfo.premium_count} ⭐ premium
                          </span>
                          {selectedGroupInfo.scam_count > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-demon-danger">
                                {selectedGroupInfo.scam_count} ⚠️ scam
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(selectedGroupInfo.last_scraped)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-demon-text-muted" />
                          <input
                            type="text"
                            placeholder="Search members..."
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
                        Select a Group
                      </h3>
                      <p className="text-sm text-demon-text-muted">
                        Choose a group from the sidebar to view its members
                      </p>
                    </div>
                  )}

                  {/* Data Table */}
                  {selectedGroup && (
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
                                User ID
                              </th>
                              <th className="text-left py-3 px-4 text-xs font-medium uppercase text-demon-text-muted">
                                Type
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
                            ) : filteredMembers.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="py-8 text-center text-demon-text-muted"
                                >
                                  No members found
                                </td>
                              </tr>
                            ) : (
                              <AnimatePresence>
                                {filteredMembers.map((member, index) => (
                                  <motion.tr
                                    key={member.id || member.telegram_id}
                                    className="border-b border-demon-primary/5 hover:bg-demon-primary/5 transition-colors"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                  >
                                    <td className="py-3 px-4">
                                      <div className="max-w-xs">
                                        <p className="text-sm text-demon-text truncate">
                                          {member.usernames && member.usernames.length > 0
                                            ? `@${member.usernames[0]}`
                                            : "-"}
                                        </p>
                                        {member.usernames && member.usernames.length > 1 && (
                                          <p className="text-[10px] text-demon-text-muted truncate">
                                            +{member.usernames.length - 1} more
                                          </p>
                                        )}
                                        <p className="text-[10px] text-demon-text-muted mt-0.5">
                                          {formatDate(member.processed_at)}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div>
                                        <span className="text-sm text-demon-text">
                                          {[member.first_name, member.last_name]
                                            .filter(Boolean)
                                            .join(" ") || "-"}
                                        </span>
                                        {member.lang_code && (
                                          <span className="ml-2 text-[10px] text-demon-text-muted">
                                            ({member.lang_code})
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="text-sm font-mono text-demon-text-muted">
                                        {member.telegram_id || member.id}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      {getStatusBadge(member)}
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
                                        {member.usernames && member.usernames.length > 0 && (
                                          <a
                                            href={`https://t.me/${member.usernames[0]}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg bg-demon-accent/10 text-demon-accent 
                                                     hover:bg-demon-accent/20 transition-colors"
                                            title="Open Telegram"
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
                          Page {currentPage} of {totalPages || 1} (
                          {totalMembers.toLocaleString()} total)
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setCurrentPage((p) => Math.max(1, p - 1))
                            }
                            disabled={currentPage === 1}
                            className="px-4 py-2 text-sm rounded-xl bg-demon-bg border 
                                     border-demon-primary/20 text-demon-text-muted 
                                     hover:border-demon-primary/40 hover:text-demon-text 
                                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() =>
                              setCurrentPage((p) => Math.min(totalPages, p + 1))
                            }
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

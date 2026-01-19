"use client";

import { useState } from "react";
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
} from "lucide-react";
import { NetworkBackground } from "@/components/background/NetworkBackground";
import { ModMenuSidebar } from "@/components/layout/ModMenuSidebar";
import { HUDOverlay } from "@/components/layout/HUDOverlay";
import { NeonCard } from "@/components/ui/NeonCard";
import { NeonButton } from "@/components/ui/NeonButton";

interface TableInfo {
  id: string;
  name: string;
  site: string;
  records: number;
  lastSync: Date;
  size: string;
  growth: number;
}

interface DataRecord {
  id: string;
  title: string;
  price: string;
  originalPrice?: string;
  rating: number;
  reviews: number;
  url: string;
  scraped_at: string;
  availability: "in_stock" | "low_stock" | "out_of_stock";
}

const mockTables: TableInfo[] = [
  {
    id: "1",
    name: "telegram_users",
    site: "telegram.org",
    records: 45231,
    lastSync: new Date(Date.now() - 300000),
    size: "128.4 MB",
    growth: 24,
  },
  {
    id: "2",
    name: "facebook_profiles",
    site: "facebook.com",
    records: 127843,
    lastSync: new Date(Date.now() - 600000),
    size: "456.7 MB",
    growth: 18,
  },
  {
    id: "3",
    name: "whatsapp_contacts",
    site: "whatsapp.com",
    records: 89127,
    lastSync: new Date(Date.now() - 1800000),
    size: "234.2 MB",
    growth: 15,
  },
  {
    id: "4",
    name: "instagram_data",
    site: "instagram.com",
    records: 234567,
    lastSync: new Date(Date.now() - 900000),
    size: "892.1 MB",
    growth: 32,
  },
];

const mockRecords: DataRecord[] = [
  {
    id: "1",
    title: "@marco_rossi92",
    price: "+39 348 XXX XXXX",
    rating: 4.8,
    reviews: 847,
    url: "https://t.me/marco_rossi92",
    scraped_at: "2026-01-19 14:32:00",
    availability: "in_stock",
  },
  {
    id: "2",
    title: "@giulia_bianchi",
    price: "+39 333 XXX XXXX",
    rating: 4.9,
    reviews: 1256,
    url: "https://t.me/giulia_bianchi",
    scraped_at: "2026-01-19 14:31:45",
    availability: "in_stock",
  },
  {
    id: "3",
    title: "@alessandro_ferrari",
    price: "+39 347 XXX XXXX",
    rating: 4.7,
    reviews: 523,
    url: "https://t.me/alessandro_ferrari",
    scraped_at: "2026-01-19 14:31:30",
    availability: "in_stock",
  },
  {
    id: "4",
    title: "@sara_colombo",
    price: "+39 320 XXX XXXX",
    rating: 4.6,
    reviews: 892,
    url: "https://t.me/sara_colombo",
    scraped_at: "2026-01-19 14:31:15",
    availability: "in_stock",
  },
  {
    id: "5",
    title: "@luca_rizzo",
    price: "+39 351 XXX XXXX",
    rating: 4.8,
    reviews: 1124,
    url: "https://t.me/luca_rizzo",
    scraped_at: "2026-01-19 14:31:00",
    availability: "in_stock",
  },
  {
    id: "6",
    title: "@chiara_moretti",
    price: "+39 389 XXX XXXX",
    rating: 4.9,
    reviews: 678,
    url: "https://t.me/chiara_moretti",
    scraped_at: "2026-01-19 14:30:45",
    availability: "in_stock",
  },
];

export default function DatabasePage() {
  const [selectedTable, setSelectedTable] = useState<string | null>(
    mockTables[0].id
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedTableInfo = mockTables.find((t) => t.id === selectedTable);
  const totalRecords = mockTables.reduce((acc, t) => acc + t.records, 0);
  const totalSize = "1.71 GB";

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  const formatDate = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const getAvailabilityBadge = (availability: DataRecord["availability"]) => {
    switch (availability) {
      case "in_stock":
        return <span className="px-2 py-0.5 text-xs rounded-full bg-demon-success/20 text-demon-success">Verified</span>;
      case "low_stock":
        return <span className="px-2 py-0.5 text-xs rounded-full bg-demon-warning/20 text-demon-warning">Pending</span>;
      case "out_of_stock":
        return <span className="px-2 py-0.5 text-xs rounded-full bg-demon-danger/20 text-demon-danger">Inactive</span>;
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-transparent">
      <NetworkBackground />
      <HUDOverlay />

      <div className="relative z-10 flex min-h-screen pt-14">
        <ModMenuSidebar />

        <div className="flex-1 ml-64 p-8 overflow-auto h-[calc(100vh-3.5rem)]">
          <div className="space-y-6">
            {/* Header */}
            <motion.div
              className="flex items-center justify-between"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div>
                <h1 className="text-2xl font-semibold text-demon-text">
                  Database Viewer
                </h1>
                <p className="text-sm text-demon-text-muted mt-1">
                  Browse and manage scraped data in Supabase
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
                >
                  Export
                </NeonButton>
              </div>
            </motion.div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <p className="text-2xl font-semibold text-demon-text">{mockTables.length}</p>
                    <p className="text-xs text-demon-text-muted">Tables</p>
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
                    <TrendingUp className="w-5 h-5 text-demon-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-demon-text">{totalRecords.toLocaleString()}</p>
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
                    <HardDrive className="w-5 h-5 text-demon-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-demon-text">{totalSize}</p>
                    <p className="text-xs text-demon-text-muted">Storage Used</p>
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
                    <CheckCircle className="w-5 h-5 text-demon-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-demon-text">5m</p>
                    <p className="text-xs text-demon-text-muted">Last Sync</p>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Tables List */}
              <div className="lg:col-span-1">
                <NeonCard variant="default">
                  <div className="flex items-center gap-2 mb-4">
                    <Database className="w-4 h-4 text-demon-primary" />
                    <span className="text-sm font-medium text-demon-text">
                      Tables
                    </span>
                  </div>

                  <div className="space-y-2">
                    {mockTables.map((table, index) => (
                      <motion.button
                        key={table.id}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-xl text-left
                          transition-all duration-200
                          ${
                            selectedTable === table.id
                              ? "bg-demon-primary/15 border border-demon-primary/30"
                              : "bg-demon-bg/30 border border-transparent hover:border-demon-primary/20 hover:bg-demon-bg/50"
                          }
                        `}
                        onClick={() => setSelectedTable(table.id)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Table
                          className={`w-4 h-4 ${
                            selectedTable === table.id
                              ? "text-demon-accent"
                              : "text-demon-text-muted"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-sm font-mono truncate ${
                              selectedTable === table.id
                                ? "text-demon-text"
                                : "text-demon-text"
                            }`}
                          >
                            {table.name}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-demon-text-muted mt-0.5">
                            <span>{table.records.toLocaleString()} records</span>
                            <span className={table.growth >= 0 ? "text-demon-success" : "text-demon-danger"}>
                              {table.growth >= 0 ? "+" : ""}{table.growth}%
                            </span>
                          </div>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${
                            selectedTable === table.id
                              ? "text-demon-accent rotate-90"
                              : "text-demon-text-muted"
                          }`}
                        />
                      </motion.button>
                    ))}
                  </div>

                  {/* Storage info */}
                  <div className="mt-4 pt-4 border-t border-demon-primary/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-demon-text-muted">Storage</span>
                      <span className="text-xs text-demon-text-muted">68%</span>
                    </div>
                    <div className="h-2 bg-demon-bg rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-demon-primary to-demon-accent rounded-full"
                        style={{ width: "68%" }}
                      />
                    </div>
                    <p className="text-xs text-demon-text-muted mt-2">
                      {totalSize} of 2.5 GB used
                    </p>
                  </div>
                </NeonCard>
              </div>

              {/* Data View */}
              <div className="lg:col-span-3">
                <NeonCard variant="default">
                  {/* Table Header */}
                  {selectedTableInfo && (
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-demon-primary/10">
                      <div>
                        <h2 className="text-lg font-semibold text-demon-text">
                          {selectedTableInfo.name}
                        </h2>
                        <div className="flex items-center gap-3 mt-1 text-xs text-demon-text-muted">
                          <span>{selectedTableInfo.site}</span>
                          <span>•</span>
                          <span>
                            {selectedTableInfo.records.toLocaleString()} records
                          </span>
                          <span>•</span>
                          <span>{selectedTableInfo.size}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(selectedTableInfo.lastSync)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-demon-text-muted" />
                          <input
                            type="text"
                            placeholder="Search records..."
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
                  )}

                  {/* Data Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-demon-primary/10">
                          <th className="text-left py-3 px-4 text-xs font-medium uppercase text-demon-text-muted">
                            Username
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-medium uppercase text-demon-text-muted">
                            Phone
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-medium uppercase text-demon-text-muted">
                            Activity
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
                        <AnimatePresence>
                          {mockRecords.map((record, index) => (
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
                                    {record.title}
                                  </p>
                                  <p className="text-xs text-demon-text-muted mt-0.5">
                                    {record.scraped_at}
                                  </p>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm font-mono text-demon-text">
                                  {record.price}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-demon-success">● Active</span>
                                  <span className="text-xs text-demon-text-muted">
                                    {record.reviews.toLocaleString()} msgs
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                {getAvailabilityBadge(record.availability)}
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
                                  <a
                                    href={record.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg bg-demon-accent/10 text-demon-accent 
                                             hover:bg-demon-accent/20 transition-colors"
                                    title="Open URL"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
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
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-demon-primary/10">
                    <span className="text-sm text-demon-text-muted">
                      Showing 1-6 of {selectedTableInfo?.records.toLocaleString()} records
                    </span>
                    <div className="flex items-center gap-2">
                      <button className="px-4 py-2 text-sm rounded-xl bg-demon-bg border 
                                       border-demon-primary/20 text-demon-text-muted 
                                       hover:border-demon-primary/40 hover:text-demon-text transition-colors">
                        Previous
                      </button>
                      <button className="px-4 py-2 text-sm rounded-xl bg-demon-primary/20 
                                       border border-demon-primary/40 text-demon-text">
                        1
                      </button>
                      <button className="px-4 py-2 text-sm rounded-xl bg-demon-bg border 
                                       border-demon-primary/20 text-demon-text-muted 
                                       hover:border-demon-primary/40 hover:text-demon-text transition-colors">
                        2
                      </button>
                      <button className="px-4 py-2 text-sm rounded-xl bg-demon-bg border 
                                       border-demon-primary/20 text-demon-text-muted 
                                       hover:border-demon-primary/40 hover:text-demon-text transition-colors">
                        3
                      </button>
                      <button className="px-4 py-2 text-sm rounded-xl bg-demon-bg border 
                                       border-demon-primary/20 text-demon-text-muted 
                                       hover:border-demon-primary/40 hover:text-demon-text transition-colors">
                        Next
                      </button>
                    </div>
                  </div>
                </NeonCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

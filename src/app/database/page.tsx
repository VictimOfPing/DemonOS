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
} from "lucide-react";
import { MatrixRain } from "@/components/background/MatrixRain";
import { ModMenuSidebar } from "@/components/layout/ModMenuSidebar";
import { HUDOverlay } from "@/components/layout/HUDOverlay";
import { NeonCard } from "@/components/ui/NeonCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { GlitchText } from "@/components/ui/GlitchText";

interface TableInfo {
  id: string;
  name: string;
  site: string;
  records: number;
  lastSync: Date;
  size: string;
}

interface DataRecord {
  id: string;
  title: string;
  price: string;
  url: string;
  scraped_at: string;
}

const mockTables: TableInfo[] = [
  {
    id: "1",
    name: "amazon_products",
    site: "amazon.it",
    records: 12453,
    lastSync: new Date(Date.now() - 300000),
    size: "45.2 MB",
  },
  {
    id: "2",
    name: "ebay_listings",
    site: "ebay.com",
    records: 8721,
    lastSync: new Date(Date.now() - 600000),
    size: "32.8 MB",
  },
  {
    id: "3",
    name: "target_catalog",
    site: "target.com",
    records: 3211,
    lastSync: new Date(Date.now() - 1800000),
    size: "12.4 MB",
  },
  {
    id: "4",
    name: "walmart_prices",
    site: "walmart.com",
    records: 5632,
    lastSync: new Date(Date.now() - 900000),
    size: "21.7 MB",
  },
];

const mockRecords: DataRecord[] = [
  {
    id: "1",
    title: "Apple iPhone 15 Pro 256GB",
    price: "€1,199.00",
    url: "https://amazon.it/dp/B0EXAMPLE1",
    scraped_at: "2024-01-15 14:32:00",
  },
  {
    id: "2",
    title: "Samsung Galaxy S24 Ultra",
    price: "€1,349.00",
    url: "https://amazon.it/dp/B0EXAMPLE2",
    scraped_at: "2024-01-15 14:31:45",
  },
  {
    id: "3",
    title: "Sony WH-1000XM5 Headphones",
    price: "€329.00",
    url: "https://amazon.it/dp/B0EXAMPLE3",
    scraped_at: "2024-01-15 14:31:30",
  },
  {
    id: "4",
    title: "MacBook Pro 14\" M3 Pro",
    price: "€2,499.00",
    url: "https://amazon.it/dp/B0EXAMPLE4",
    scraped_at: "2024-01-15 14:31:15",
  },
  {
    id: "5",
    title: "iPad Pro 12.9\" 256GB",
    price: "€1,219.00",
    url: "https://amazon.it/dp/B0EXAMPLE5",
    scraped_at: "2024-01-15 14:31:00",
  },
];

export default function DatabasePage() {
  const [selectedTable, setSelectedTable] = useState<string | null>(
    mockTables[0].id
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedTableInfo = mockTables.find((t) => t.id === selectedTable);

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
                  text="DATABASE VIEWER"
                  as="h1"
                  className="text-2xl font-bold text-demon-accent"
                  autoGlitch
                  neon
                />
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
                  SYNC
                </NeonButton>
                <NeonButton
                  variant="primary"
                  icon={<Download className="w-4 h-4" />}
                >
                  EXPORT
                </NeonButton>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Tables List */}
              <div className="lg:col-span-1">
                <NeonCard variant="default">
                  <div className="flex items-center gap-2 mb-4">
                    <Database className="w-4 h-4 text-demon-primary" />
                    <span className="text-xs font-mono uppercase tracking-wider text-demon-text-muted">
                      Tables
                    </span>
                  </div>

                  <div className="space-y-2">
                    {mockTables.map((table, index) => (
                      <motion.button
                        key={table.id}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-lg text-left
                          transition-all duration-200
                          ${
                            selectedTable === table.id
                              ? "bg-demon-primary/20 border border-demon-primary/50"
                              : "bg-demon-bg-light/30 border border-transparent hover:border-demon-primary/30"
                          }
                        `}
                        onClick={() => setSelectedTable(table.id)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ x: 4 }}
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
                                ? "text-demon-accent"
                                : "text-demon-text"
                            }`}
                          >
                            {table.name}
                          </div>
                          <div className="text-[10px] text-demon-text-muted">
                            {table.records.toLocaleString()} records
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
                  <div className="mt-4 pt-4 border-t border-demon-primary/20">
                    <div className="text-[10px] text-demon-text-muted uppercase mb-2">
                      Total Storage
                    </div>
                    <div className="text-lg font-mono font-bold text-demon-accent">
                      112.1 MB
                    </div>
                    <div className="text-xs text-demon-text-muted">
                      of 500 MB used
                    </div>
                    <div className="mt-2 h-1 bg-demon-bg-light rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-demon-primary to-demon-accent"
                        style={{ width: "22%" }}
                      />
                    </div>
                  </div>
                </NeonCard>
              </div>

              {/* Data View */}
              <div className="lg:col-span-3">
                <NeonCard variant="glow">
                  {/* Table Header */}
                  {selectedTableInfo && (
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-demon-primary/20">
                      <div>
                        <h2 className="text-lg font-mono font-bold text-demon-accent">
                          {selectedTableInfo.name}
                        </h2>
                        <div className="flex items-center gap-4 mt-1 text-xs text-demon-text-muted">
                          <span>{selectedTableInfo.site}</span>
                          <span>•</span>
                          <span>
                            {selectedTableInfo.records.toLocaleString()} records
                          </span>
                          <span>•</span>
                          <span>{selectedTableInfo.size}</span>
                          <span>•</span>
                          <span>
                            Synced {formatDate(selectedTableInfo.lastSync)}
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
                            className="pl-9 pr-4 py-2 text-sm bg-demon-bg border border-demon-primary/30 
                                     rounded-lg text-demon-text placeholder:text-demon-text-muted
                                     focus:border-demon-primary focus:outline-none"
                          />
                        </div>
                        <button className="p-2 rounded-lg bg-demon-bg border border-demon-primary/30 
                                         text-demon-text-muted hover:text-demon-text hover:border-demon-primary/50">
                          <Filter className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Data Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-demon-primary/20">
                          <th className="text-left py-3 px-4 text-xs font-mono uppercase text-demon-text-muted">
                            ID
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-mono uppercase text-demon-text-muted">
                            Title
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-mono uppercase text-demon-text-muted">
                            Price
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-mono uppercase text-demon-text-muted">
                            Scraped At
                          </th>
                          <th className="text-right py-3 px-4 text-xs font-mono uppercase text-demon-text-muted">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {mockRecords.map((record, index) => (
                            <motion.tr
                              key={record.id}
                              className="border-b border-demon-primary/10 hover:bg-demon-primary/5 transition-colors"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <td className="py-3 px-4 text-xs font-mono text-demon-text-muted">
                                #{record.id}
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm text-demon-text max-w-xs truncate">
                                  {record.title}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm font-mono text-demon-success">
                                  {record.price}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-xs text-demon-text-muted">
                                {record.scraped_at}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    className="p-1.5 rounded bg-demon-primary/10 text-demon-primary 
                                             hover:bg-demon-primary/20 transition-colors"
                                    title="View details"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <a
                                    href={record.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded bg-demon-accent/10 text-demon-accent 
                                             hover:bg-demon-accent/20 transition-colors"
                                    title="Open URL"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    className="p-1.5 rounded bg-demon-danger/10 text-demon-danger 
                                             hover:bg-demon-danger/20 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-demon-primary/20">
                    <span className="text-xs text-demon-text-muted">
                      Showing 1-5 of {selectedTableInfo?.records.toLocaleString()} records
                    </span>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1.5 text-xs font-mono rounded bg-demon-bg border 
                                       border-demon-primary/30 text-demon-text-muted 
                                       hover:border-demon-primary hover:text-demon-text">
                        Previous
                      </button>
                      <button className="px-3 py-1.5 text-xs font-mono rounded bg-demon-primary/20 
                                       border border-demon-primary text-demon-accent">
                        1
                      </button>
                      <button className="px-3 py-1.5 text-xs font-mono rounded bg-demon-bg border 
                                       border-demon-primary/30 text-demon-text-muted 
                                       hover:border-demon-primary hover:text-demon-text">
                        2
                      </button>
                      <button className="px-3 py-1.5 text-xs font-mono rounded bg-demon-bg border 
                                       border-demon-primary/30 text-demon-text-muted 
                                       hover:border-demon-primary hover:text-demon-text">
                        3
                      </button>
                      <button className="px-3 py-1.5 text-xs font-mono rounded bg-demon-bg border 
                                       border-demon-primary/30 text-demon-text-muted 
                                       hover:border-demon-primary hover:text-demon-text">
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

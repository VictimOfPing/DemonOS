"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Bot, 
  Database,
  Send
} from "lucide-react";
import { GlitchLogo } from "./GlitchLogo";
import { NAV_ITEMS } from "@/lib/constants";

const iconMap = {
  LayoutDashboard,
  Bot,
  Send,
  Database,
} as const;

interface SidebarStats {
  totalRecords: number;
  activeRuns: number;
  isLoading: boolean;
}

/**
 * Sidebar navigation component
 * Clean, professional design
 */
export function ModMenuSidebar() {
  const pathname = usePathname();
  const [stats, setStats] = useState<SidebarStats>({
    totalRecords: 0,
    activeRuns: 0,
    isLoading: true,
  });

  // Fetch real stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch total records
        const statsRes = await fetch("/api/scraper/stats?scraperType=telegram");
        const statsData = await statsRes.json();
        
        // Fetch active runs
        const runsRes = await fetch("/api/scraper/runs?status=running&limit=100");
        const runsData = await runsRes.json();

        setStats({
          totalRecords: statsData.success ? statsData.data.totals.totalRecords : 0,
          activeRuns: runsData.success ? runsData.data.runs.length : 0,
          isLoading: false,
        });
      } catch (error) {
        console.error("Failed to fetch sidebar stats:", error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const getHref = (id: string) => {
    switch (id) {
      case "dashboard": return "/";
      case "scraper": return "/scraper";
      case "telegram-campaigns": return "/telegram-campaigns";
      case "database": return "/database";
      default: return "/";
    }
  };

  const isActive = (id: string) => {
    if (id === "dashboard" && pathname === "/") return true;
    return pathname === `/${id}`;
  };

  return (
    <motion.aside
      className="fixed left-0 top-14 bottom-0 w-64 z-40 bg-demon-bg/80 backdrop-blur-md border-r border-demon-primary/10"
      initial={{ x: -264, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="flex flex-col h-full">
        {/* Logo section */}
        <div className="p-5 border-b border-demon-primary/10">
          <GlitchLogo />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item, index) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            const active = isActive(item.id);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={getHref(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl
                    text-sm font-medium transition-all duration-200
                    ${active 
                      ? "bg-demon-primary/20 text-demon-accent border border-demon-primary/30" 
                      : "text-demon-text-muted hover:text-demon-text hover:bg-demon-primary/10"
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${active ? "text-demon-accent" : ""}`} />
                  <span className="flex-1">{item.label}</span>
                  
                  <span className={`
                    text-[10px] px-2 py-0.5 rounded-md font-mono
                    ${active 
                      ? "bg-demon-primary/30 text-demon-accent" 
                      : "bg-demon-bg-light text-demon-text-muted"
                    }
                  `}>
                    {item.hotkey}
                  </span>
                </Link>
              </motion.div>
            );
          })}

        </nav>

        {/* Bottom section - Quick stats */}
        <div className="p-4 border-t border-demon-primary/10">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-demon-bg/50 rounded-xl p-3 border border-demon-primary/10">
              <div className="text-[10px] text-demon-text-muted uppercase mb-1">Total Data</div>
              <div className="text-lg font-semibold text-demon-text font-mono">
                {stats.isLoading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  stats.totalRecords.toLocaleString()
                )}
              </div>
            </div>
            <div className="bg-demon-bg/50 rounded-xl p-3 border border-demon-primary/10">
              <div className="text-[10px] text-demon-text-muted uppercase mb-1">Active</div>
              <div className="text-lg font-semibold font-mono">
                {stats.isLoading ? (
                  <span className="animate-pulse text-demon-text-muted">...</span>
                ) : (
                  <span className={stats.activeRuns > 0 ? "text-demon-success" : "text-demon-text-muted"}>
                    {stats.activeRuns}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

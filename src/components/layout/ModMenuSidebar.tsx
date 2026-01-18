"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Bot, 
  Database, 
  Terminal,
  ChevronDown,
  ChevronRight,
  Plus,
  Circle,
  Settings,
  Power
} from "lucide-react";
import { GlitchLogo } from "./GlitchLogo";
import { NAV_ITEMS } from "@/lib/constants";

const iconMap = {
  LayoutDashboard,
  Bot,
  Database,
  Terminal,
} as const;

interface Site {
  id: string;
  name: string;
  status: "online" | "offline" | "scraping";
  dataCount: number;
}

// Mock sites data
const mockSites: Site[] = [
  { id: "1", name: "amazon.it", status: "online", dataCount: 12453 },
  { id: "2", name: "ebay.com", status: "scraping", dataCount: 8721 },
  { id: "3", name: "target.com", status: "offline", dataCount: 3211 },
  { id: "4", name: "walmart.com", status: "online", dataCount: 15632 },
];

/**
 * Mod Menu Sidebar - GTA-style navigation
 * Features expandable categories, hotkeys, and site status
 */
export function ModMenuSidebar() {
  const [activeItem, setActiveItem] = useState("dashboard");
  const [sitesExpanded, setSitesExpanded] = useState(true);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const getStatusColor = (status: Site["status"]) => {
    switch (status) {
      case "online": return "bg-demon-success";
      case "scraping": return "bg-demon-warning animate-pulse";
      case "offline": return "bg-demon-text-muted";
    }
  };

  const getStatusText = (status: Site["status"]) => {
    switch (status) {
      case "online": return "READY";
      case "scraping": return "ACTIVE";
      case "offline": return "IDLE";
    }
  };

  return (
    <motion.aside
      className="fixed left-0 top-12 bottom-0 w-64 z-40
                 bg-demon-bg/95 backdrop-blur-md border-r border-demon-primary/30"
      initial={{ x: -264, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="flex flex-col h-full">
        {/* Logo section */}
        <div className="p-4 border-b border-demon-primary/20">
          <GlitchLogo />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {/* Main nav items */}
          {NAV_ITEMS.map((item, index) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            const isActive = activeItem === item.id;
            const isHovered = hoveredItem === item.id;

            return (
              <motion.button
                key={item.id}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded
                  text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? "bg-demon-primary/20 text-demon-accent neon-border" 
                    : "text-demon-text-muted hover:text-demon-text hover:bg-demon-primary/10"
                  }
                `}
                onClick={() => setActiveItem(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Active indicator */}
                <motion.div
                  className="w-1 h-6 rounded-full bg-demon-primary"
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ 
                    opacity: isActive ? 1 : 0, 
                    scaleY: isActive ? 1 : 0 
                  }}
                />

                <Icon className={`w-5 h-5 ${isActive ? "text-demon-accent" : ""}`} />
                
                <span className="flex-1 text-left">{item.label}</span>
                
                {/* Hotkey badge */}
                <span className={`
                  text-[10px] px-1.5 py-0.5 rounded font-mono
                  ${isActive 
                    ? "bg-demon-primary/30 text-demon-accent" 
                    : "bg-demon-bg-light text-demon-text-muted"
                  }
                `}>
                  [{item.hotkey}]
                </span>

                {/* Hover arrow */}
                <AnimatePresence>
                  {isHovered && !isActive && (
                    <motion.div
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -5 }}
                    >
                      <ChevronRight className="w-4 h-4 text-demon-primary" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}

          {/* Divider */}
          <div className="my-4 h-[1px] bg-gradient-to-r from-transparent via-demon-primary/30 to-transparent" />

          {/* Sites section */}
          <div>
            <motion.button
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold 
                         text-demon-text-muted uppercase tracking-wider
                         hover:text-demon-text transition-colors"
              onClick={() => setSitesExpanded(!sitesExpanded)}
            >
              <motion.div
                animate={{ rotate: sitesExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
              <span>CONFIGURED SITES</span>
              <span className="ml-auto text-demon-accent">{mockSites.length}</span>
            </motion.button>

            <AnimatePresence>
              {sitesExpanded && (
                <motion.div
                  className="space-y-1 mt-2"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {mockSites.map((site, index) => (
                    <motion.div
                      key={site.id}
                      className="flex items-center gap-2 px-3 py-2 rounded
                                 hover:bg-demon-primary/10 cursor-pointer group"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      {/* Status indicator */}
                      <div className="relative">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(site.status)}`} />
                        {site.status === "scraping" && (
                          <div className="absolute inset-0 w-2 h-2 rounded-full bg-demon-warning animate-ping" />
                        )}
                      </div>

                      {/* Site name */}
                      <span className="flex-1 text-sm text-demon-text-muted group-hover:text-demon-text truncate">
                        {site.name}
                      </span>

                      {/* Data count */}
                      <span className="text-[10px] font-mono text-demon-primary">
                        {site.dataCount.toLocaleString()}
                      </span>
                    </motion.div>
                  ))}

                  {/* Add site button */}
                  <motion.button
                    className="w-full flex items-center gap-2 px-3 py-2 rounded
                               text-demon-text-muted hover:text-demon-accent
                               hover:bg-demon-primary/10 transition-colors"
                    whileHover={{ x: 4 }}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add new site</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Bottom section - Stats and actions */}
        <div className="p-3 border-t border-demon-primary/20 space-y-3">
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-demon-bg-light rounded p-2 border border-demon-primary/20">
              <div className="text-[10px] text-demon-text-muted uppercase">Total Data</div>
              <div className="text-lg font-bold text-demon-accent font-mono">
                {mockSites.reduce((acc, s) => acc + s.dataCount, 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-demon-bg-light rounded p-2 border border-demon-primary/20">
              <div className="text-[10px] text-demon-text-muted uppercase">Active</div>
              <div className="text-lg font-bold text-demon-success font-mono">
                {mockSites.filter(s => s.status === "scraping").length}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 
                               rounded bg-demon-primary/20 border border-demon-primary/50
                               text-demon-text-muted hover:text-demon-text
                               hover:bg-demon-primary/30 transition-colors">
              <Settings className="w-4 h-4" />
              <span className="text-xs">Settings</span>
            </button>
            <button className="flex items-center justify-center p-2 rounded
                               bg-demon-danger/20 border border-demon-danger/50
                               text-demon-danger hover:bg-demon-danger/30 transition-colors">
              <Power className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

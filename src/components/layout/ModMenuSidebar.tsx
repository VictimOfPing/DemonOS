"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Bot, 
  Database, 
  Terminal,
  ChevronDown,
  Plus,
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

const mockSites: Site[] = [
  { id: "1", name: "telegram.org", status: "online", dataCount: 45231 },
  { id: "2", name: "facebook.com", status: "scraping", dataCount: 127843 },
  { id: "3", name: "whatsapp.com", status: "online", dataCount: 89127 },
  { id: "4", name: "instagram.com", status: "scraping", dataCount: 234567 },
];

/**
 * Sidebar navigation component
 * Clean, professional design with site status
 */
export function ModMenuSidebar() {
  const pathname = usePathname();
  const [sitesExpanded, setSitesExpanded] = useState(true);

  const getStatusColor = (status: Site["status"]) => {
    switch (status) {
      case "online": return "bg-demon-success";
      case "scraping": return "bg-demon-warning";
      case "offline": return "bg-demon-text-muted/50";
    }
  };

  const getHref = (id: string) => {
    switch (id) {
      case "dashboard": return "/";
      case "scraper": return "/scraper";
      case "database": return "/database";
      case "terminal": return "/terminal";
      default: return "/";
    }
  };

  const isActive = (id: string) => {
    if (id === "dashboard" && pathname === "/") return true;
    return pathname === `/${id}`;
  };

  return (
    <motion.aside
      className="fixed left-0 top-14 bottom-0 w-64 z-40 glass border-r border-demon-primary/10"
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

          {/* Divider */}
          <div className="my-4 h-px bg-demon-primary/10" />

          {/* Sites section */}
          <div>
            <motion.button
              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium 
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
              <span>Configured Sites</span>
              <span className="ml-auto text-demon-accent font-mono">{mockSites.length}</span>
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
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg
                                 hover:bg-demon-primary/5 cursor-pointer group transition-colors"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <div className="relative">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(site.status)}`} />
                        {site.status === "scraping" && (
                          <div className="absolute inset-0 w-2 h-2 rounded-full bg-demon-warning animate-ping opacity-75" />
                        )}
                      </div>

                      <span className="flex-1 text-sm text-demon-text-muted group-hover:text-demon-text truncate transition-colors">
                        {site.name}
                      </span>

                      <span className="text-[10px] font-mono text-demon-primary/70 group-hover:text-demon-primary transition-colors">
                        {site.dataCount.toLocaleString()}
                      </span>
                    </motion.div>
                  ))}

                  <motion.button
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg
                               text-demon-text-muted hover:text-demon-accent
                               hover:bg-demon-primary/5 transition-colors"
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

        {/* Bottom section */}
        <div className="p-4 border-t border-demon-primary/10 space-y-4">
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-demon-bg/50 rounded-xl p-3 border border-demon-primary/10">
              <div className="text-[10px] text-demon-text-muted uppercase mb-1">Total Data</div>
              <div className="text-lg font-semibold text-demon-text font-mono">
                {mockSites.reduce((acc, s) => acc + s.dataCount, 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-demon-bg/50 rounded-xl p-3 border border-demon-primary/10">
              <div className="text-[10px] text-demon-text-muted uppercase mb-1">Active</div>
              <div className="text-lg font-semibold text-demon-success font-mono">
                {mockSites.filter(s => s.status === "scraping").length}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 
                               rounded-xl bg-demon-bg/50 border border-demon-primary/10
                               text-demon-text-muted hover:text-demon-text
                               hover:bg-demon-primary/10 transition-colors">
              <Settings className="w-4 h-4" />
              <span className="text-xs font-medium">Settings</span>
            </button>
            <button className="flex items-center justify-center p-2.5 rounded-xl
                               bg-demon-danger/10 border border-demon-danger/20
                               text-demon-danger hover:bg-demon-danger/20 transition-colors">
              <Power className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

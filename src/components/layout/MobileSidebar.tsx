"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Bot, 
  Database, 
  Send,
  Menu,
  X,
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
  Send,
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
 * Mobile-responsive sidebar with hamburger menu
 * Collapses to a bottom navigation on mobile devices
 */
export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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
      default: return "/";
    }
  };

  const isActive = (id: string) => {
    if (id === "dashboard" && pathname === "/") return true;
    return pathname === `/${id}`;
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-14 left-0 right-0 z-50 h-14 bg-demon-bg/90 backdrop-blur-md border-b border-demon-primary/10 flex items-center px-4 safe-area-inset">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-xl bg-demon-primary/10 text-demon-accent hover:bg-demon-primary/20 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        <div className="flex-1 flex justify-center">
          <GlitchLogo compact />
        </div>
        
        <div className="w-10" /> {/* Spacer for balance */}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-demon-bg/95 backdrop-blur-md border-t border-demon-primary/10 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            const active = isActive(item.id);

            return (
              <Link
                key={item.id}
                href={getHref(item.id)}
                className={`
                  flex flex-col items-center justify-center gap-1 flex-1 py-2 px-3 rounded-xl
                  transition-all duration-200 min-w-0
                  ${active 
                    ? "bg-demon-primary/20 text-demon-accent" 
                    : "text-demon-text-muted active:text-demon-accent active:bg-demon-primary/10"
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${active ? "text-demon-accent" : ""}`} />
                <span className="text-[10px] font-medium truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Slide-out Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="lg:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Drawer */}
            <motion.aside
              className="lg:hidden fixed top-0 left-0 bottom-0 w-[85vw] max-w-[320px] z-[70] bg-demon-bg border-r border-demon-primary/20"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-demon-primary/10">
                  <GlitchLogo />
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-xl bg-demon-primary/10 text-demon-text-muted hover:text-demon-accent transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
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
                            w-full flex items-center gap-3 px-4 py-4 rounded-2xl
                            text-base font-medium transition-all duration-200
                            ${active 
                              ? "bg-demon-primary/20 text-demon-accent border border-demon-primary/30" 
                              : "text-demon-text-muted active:text-demon-text active:bg-demon-primary/10"
                            }
                          `}
                        >
                          <Icon className={`w-6 h-6 ${active ? "text-demon-accent" : ""}`} />
                          <span className="flex-1">{item.label}</span>
                          
                          <span className={`
                            text-xs px-2 py-1 rounded-lg font-mono
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

                  {/* Sites */}
                  <div className="text-xs font-medium text-demon-text-muted uppercase tracking-wider px-4 mb-2">
                    Configured Sites
                  </div>
                  
                  {mockSites.map((site, index) => (
                    <motion.div
                      key={site.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl
                                 active:bg-demon-primary/10 cursor-pointer transition-colors"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + index * 0.03 }}
                    >
                      <div className="relative">
                        <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(site.status)}`} />
                        {site.status === "scraping" && (
                          <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-demon-warning animate-ping opacity-75" />
                        )}
                      </div>

                      <span className="flex-1 text-sm text-demon-text truncate">
                        {site.name}
                      </span>

                      <span className="text-xs font-mono text-demon-primary">
                        {site.dataCount.toLocaleString()}
                      </span>
                    </motion.div>
                  ))}

                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
                                     text-demon-text-muted active:text-demon-accent
                                     active:bg-demon-primary/10 transition-colors">
                    <Plus className="w-5 h-5" />
                    <span className="text-sm">Add new site</span>
                  </button>
                </nav>

                {/* Footer */}
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
                    <button className="flex-1 flex items-center justify-center gap-2 px-3 py-3 
                                       rounded-xl bg-demon-bg/50 border border-demon-primary/10
                                       text-demon-text-muted active:text-demon-text
                                       active:bg-demon-primary/10 transition-colors">
                      <Settings className="w-5 h-5" />
                      <span className="text-sm font-medium">Settings</span>
                    </button>
                    <button className="flex items-center justify-center p-3 rounded-xl
                                       bg-demon-danger/10 border border-demon-danger/20
                                       text-demon-danger active:bg-demon-danger/20 transition-colors">
                      <Power className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

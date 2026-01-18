"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Activity, CheckCircle, AlertCircle, Clock, Database, Info } from "lucide-react";
import clsx from "clsx";

interface ActivityItem {
  id: string;
  type: "scrape" | "success" | "error" | "pending" | "database" | "info";
  message: string;
  site?: string;
  timestamp: Date;
  details?: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  maxItems?: number;
  className?: string;
}

const typeConfig = {
  scrape: {
    icon: Activity,
    color: "text-demon-accent",
    bgColor: "bg-demon-primary/20",
    label: "SCRAPING",
  },
  success: {
    icon: CheckCircle,
    color: "text-demon-success",
    bgColor: "bg-demon-success/20",
    label: "COMPLETE",
  },
  error: {
    icon: AlertCircle,
    color: "text-demon-danger",
    bgColor: "bg-demon-danger/20",
    label: "ERROR",
  },
  pending: {
    icon: Clock,
    color: "text-demon-warning",
    bgColor: "bg-demon-warning/20",
    label: "PENDING",
  },
  database: {
    icon: Database,
    color: "text-demon-accent",
    bgColor: "bg-demon-primary/20",
    label: "DATABASE",
  },
  info: {
    icon: Info,
    color: "text-demon-accent",
    bgColor: "bg-demon-primary/20",
    label: "INFO",
  },
};

/**
 * Real-time activity feed with animated entries
 * Shows scraping events, errors, and status updates
 */
export function ActivityFeed({
  items,
  maxItems = 10,
  className,
}: ActivityFeedProps) {
  const displayItems = items.slice(0, maxItems);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className={clsx("relative", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-demon-primary animate-pulse" />
        <span className="text-xs font-mono text-demon-text-muted uppercase tracking-wider">
          Live Activity
        </span>
        <div className="flex-1 h-[1px] bg-gradient-to-r from-demon-primary/30 to-transparent" />
        <span className="text-[10px] font-mono text-demon-primary">
          {items.length} events
        </span>
      </div>

      {/* Feed container */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
        <AnimatePresence mode="popLayout">
          {displayItems.map((item, index) => {
            const config = typeConfig[item.type];
            const Icon = config.icon;

            return (
              <motion.div
                key={item.id}
                className={clsx(
                  "relative flex items-start gap-3 p-3 rounded-lg",
                  "bg-demon-bg-light/30 border border-demon-primary/10",
                  "hover:border-demon-primary/30 transition-colors cursor-default"
                )}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                {/* Status indicator line */}
                <div
                  className={clsx(
                    "absolute left-0 top-0 bottom-0 w-[2px] rounded-l-lg",
                    config.bgColor
                  )}
                />

                {/* Icon */}
                <div
                  className={clsx(
                    "p-1.5 rounded shrink-0",
                    config.bgColor
                  )}
                >
                  <Icon className={clsx("w-3.5 h-3.5", config.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={clsx(
                        "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded",
                        config.bgColor,
                        config.color
                      )}
                    >
                      {config.label}
                    </span>
                    {item.site && (
                      <span className="text-xs text-demon-text-muted truncate">
                        {item.site}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-demon-text leading-tight">
                    {item.message}
                  </p>
                  {item.details && (
                    <p className="text-xs text-demon-text-muted mt-1">
                      {item.details}
                    </p>
                  )}
                </div>

                {/* Timestamp */}
                <span className="text-[10px] font-mono text-demon-text-muted shrink-0">
                  {formatTime(item.timestamp)}
                </span>

                {/* Active indicator for scraping */}
                {item.type === "scrape" && (
                  <motion.div
                    className="absolute right-2 top-2 w-2 h-2 rounded-full bg-demon-accent"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty state */}
        {items.length === 0 && (
          <motion.div
            className="flex flex-col items-center justify-center py-8 text-demon-text-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Activity className="w-8 h-8 mb-2 opacity-30" />
            <span className="text-sm">No activity yet</span>
            <span className="text-xs">Start scraping to see events</span>
          </motion.div>
        )}
      </div>

      {/* Gradient fade at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-demon-bg to-transparent pointer-events-none" />
    </div>
  );
}

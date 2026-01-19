"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wifi, WifiOff, Activity } from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/constants";

/**
 * Top navigation bar with system status and clock
 * Clean, professional design - Responsive for all devices
 */
export function HUDOverlay() {
  const [time, setTime] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour12: false }));
      setDate(now.toLocaleDateString("en-US", { 
        weekday: "short", 
        month: "short", 
        day: "2-digit" 
      }));
    };
    updateTime();
    const timeInterval = setInterval(updateTime, 1000);

    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      clearInterval(timeInterval);
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 h-14 z-50 bg-demon-bg/80 backdrop-blur-md border-b border-demon-primary/20 safe-area-inset pwa-standalone-header"
      initial={{ y: -56, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between h-full px-3 sm:px-6">
        {/* Left section - Logo */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-demon-primary to-demon-accent flex items-center justify-center shrink-0">
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-semibold text-demon-text">
                {APP_NAME}
              </span>
              <span className="ml-2 text-xs text-demon-primary font-mono">
                {APP_VERSION}
              </span>
            </div>
          </div>
        </div>

        {/* Center - Status indicator (hidden on mobile) */}
        <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 rounded-full glass">
          <div className="w-1.5 h-1.5 rounded-full bg-demon-success animate-pulse" />
          <span className="text-xs text-demon-text-muted font-medium">
            All systems operational
          </span>
        </div>

        {/* Right section - Time and connection */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Connection status */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {isOnline ? (
              <motion.div
                className="flex items-center gap-1.5 sm:gap-2 text-demon-success"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                <Wifi className="w-4 h-4" />
                <span className="hidden xs:inline text-xs font-medium">Online</span>
              </motion.div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 text-demon-danger">
                <WifiOff className="w-4 h-4" />
                <span className="hidden xs:inline text-xs font-medium">Offline</span>
              </div>
            )}
          </div>

          {/* Divider - hidden on very small screens */}
          <div className="hidden xs:block w-px h-6 bg-demon-primary/20" />

          {/* Date and time */}
          <div className="flex flex-col items-end">
            <span className="text-xs sm:text-sm font-mono text-demon-text">
              {time}
            </span>
            <span className="hidden xs:block text-[10px] text-demon-text-muted">
              {date}
            </span>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wifi, WifiOff, Activity, Cpu } from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/constants";

/**
 * Top HUD bar with system status, clock, and indicators
 * Military/tech aesthetic with real-time updates
 */
export function HUDOverlay() {
  const [time, setTime] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [isOnline, setIsOnline] = useState(true);
  const [cpuUsage, setCpuUsage] = useState(0);

  useEffect(() => {
    // Update time every second
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

    // Check online status
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Simulate CPU usage (for visual effect)
    const cpuInterval = setInterval(() => {
      setCpuUsage(Math.floor(Math.random() * 30) + 10);
    }, 2000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(cpuInterval);
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 h-12 z-50 
                 bg-demon-bg/80 backdrop-blur-sm border-b border-demon-primary/30"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between h-full px-4">
        {/* Left section - Logo and status */}
        <div className="flex items-center gap-6">
          {/* Animated borders */}
          <div className="relative">
            <div className="flex items-center gap-2 px-3 py-1 border border-demon-primary/50 bg-demon-bg/50">
              <Activity className="w-4 h-4 text-demon-primary animate-pulse" />
              <span className="text-xs text-demon-text-muted font-mono uppercase tracking-widest">
                {APP_NAME} <span className="text-demon-accent">{APP_VERSION}</span>
              </span>
            </div>
            {/* Corner decorations */}
            <div className="absolute -top-[2px] -left-[2px] w-2 h-2 border-l-2 border-t-2 border-demon-primary" />
            <div className="absolute -top-[2px] -right-[2px] w-2 h-2 border-r-2 border-t-2 border-demon-primary" />
            <div className="absolute -bottom-[2px] -left-[2px] w-2 h-2 border-l-2 border-b-2 border-demon-primary" />
            <div className="absolute -bottom-[2px] -right-[2px] w-2 h-2 border-r-2 border-b-2 border-demon-primary" />
          </div>

          {/* System stats */}
          <div className="flex items-center gap-4 text-xs text-demon-text-muted">
            <div className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-demon-primary" />
              <span className="font-mono">{cpuUsage}%</span>
            </div>
          </div>
        </div>

        {/* Center section - Decorative */}
        <div className="hidden md:flex items-center gap-2">
          <div className="w-20 h-[2px] bg-gradient-to-r from-transparent to-demon-primary/50" />
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 h-3 bg-demon-primary/50"
                animate={{
                  height: [12, 6 + Math.random() * 12, 12],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
          <div className="w-20 h-[2px] bg-gradient-to-l from-transparent to-demon-primary/50" />
        </div>

        {/* Right section - Time and connection */}
        <div className="flex items-center gap-6">
          {/* Connection status */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <motion.div
                className="flex items-center gap-1 text-demon-success"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                <Wifi className="w-4 h-4" />
                <span className="text-xs font-mono">ONLINE</span>
                <div className="w-2 h-2 rounded-full bg-demon-success animate-pulse" />
              </motion.div>
            ) : (
              <div className="flex items-center gap-1 text-demon-danger">
                <WifiOff className="w-4 h-4" />
                <span className="text-xs font-mono">OFFLINE</span>
              </div>
            )}
          </div>

          {/* Date and time */}
          <div className="flex flex-col items-end">
            <span className="text-sm font-mono text-demon-accent neon-text-subtle">
              {time}
            </span>
            <span className="text-[10px] text-demon-text-muted font-mono">
              {date}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom border glow */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-demon-primary to-transparent" />
    </motion.header>
  );
}

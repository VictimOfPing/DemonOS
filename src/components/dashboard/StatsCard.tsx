"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import clsx from "clsx";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  variant?: "default" | "success" | "danger" | "warning";
  animated?: boolean;
  suffix?: string;
  prefix?: string;
}

const variantStyles = {
  default: {
    icon: "text-demon-accent",
    border: "border-demon-primary/30",
    glow: "hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]",
  },
  success: {
    icon: "text-demon-success",
    border: "border-demon-success/30",
    glow: "hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]",
  },
  danger: {
    icon: "text-demon-danger",
    border: "border-demon-danger/30",
    glow: "hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]",
  },
  warning: {
    icon: "text-demon-warning",
    border: "border-demon-warning/30",
    glow: "hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]",
  },
};

/**
 * Stats card with animated counter and glow effects
 * Used for displaying key metrics on dashboard
 */
export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = "default",
  animated = true,
  suffix = "",
  prefix = "",
}: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState<number | string>(
    typeof value === "number" ? 0 : value
  );
  const styles = variantStyles[variant];

  // Animate number counting
  useEffect(() => {
    if (typeof value !== "number" || !animated) {
      setDisplayValue(value);
      return;
    }

    const duration = 1000;
    const steps = 30;
    const stepValue = value / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.floor(stepValue * currentStep));
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [value, animated]);

  const formatValue = (val: number | string) => {
    if (typeof val === "number") {
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <motion.div
      className={clsx(
        "relative p-4 rounded-lg",
        "bg-demon-bg-light/50 backdrop-blur-sm border",
        "transition-all duration-300",
        styles.border,
        styles.glow
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
    >
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-demon-primary/50" />
      <div className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 border-demon-primary/50" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 border-demon-primary/50" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-demon-primary/50" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-demon-text-muted uppercase tracking-wider">
          {title}
        </span>
        <div className={clsx("p-1.5 rounded bg-demon-bg/50", styles.icon)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1">
        {prefix && (
          <span className="text-lg text-demon-text-muted">{prefix}</span>
        )}
        <motion.span
          className={clsx(
            "text-3xl font-bold font-mono",
            styles.icon
          )}
          key={displayValue.toString()}
        >
          {formatValue(displayValue)}
        </motion.span>
        {suffix && (
          <span className="text-sm text-demon-text-muted ml-1">{suffix}</span>
        )}
      </div>

      {/* Trend indicator */}
      {trend && (
        <motion.div
          className={clsx(
            "flex items-center gap-1 mt-2 text-xs font-mono",
            trend.positive ? "text-demon-success" : "text-demon-danger"
          )}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <span>{trend.positive ? "▲" : "▼"}</span>
          <span>{Math.abs(trend.value)}%</span>
          <span className="text-demon-text-muted">vs last hour</span>
        </motion.div>
      )}

      {/* Animated background pulse */}
      <motion.div
        className="absolute inset-0 rounded-lg bg-gradient-to-br from-demon-primary/5 to-transparent pointer-events-none"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </motion.div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: "default" | "success" | "danger" | "warning";
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  striped?: boolean;
}

const variants = {
  default: {
    bar: "from-demon-primary via-demon-accent to-demon-primary",
    glow: "shadow-[0_0_10px_rgba(139,92,246,0.5)]",
    text: "text-demon-accent",
  },
  success: {
    bar: "from-demon-success via-emerald-400 to-demon-success",
    glow: "shadow-[0_0_10px_rgba(34,197,94,0.5)]",
    text: "text-demon-success",
  },
  danger: {
    bar: "from-demon-danger via-red-400 to-demon-danger",
    glow: "shadow-[0_0_10px_rgba(239,68,68,0.5)]",
    text: "text-demon-danger",
  },
  warning: {
    bar: "from-demon-warning via-amber-400 to-demon-warning",
    glow: "shadow-[0_0_10px_rgba(245,158,11,0.5)]",
    text: "text-demon-warning",
  },
};

const sizes = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

/**
 * Animated progress bar with neon glow
 * Supports multiple variants and animated/striped styles
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  variant = "default",
  size = "md",
  animated = true,
  striped = false,
}: ProgressBarProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValueRef = useRef(0);
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const variantStyles = variants[variant];

  // Animate value count-up
  useEffect(() => {
    if (!animated) {
      setDisplayValue(value);
      previousValueRef.current = value;
      return;
    }

    const startValue = previousValueRef.current;
    const duration = 500;
    const steps = 20;
    const stepValue = (value - startValue) / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(value);
        previousValueRef.current = value;
        clearInterval(interval);
      } else {
        setDisplayValue(startValue + stepValue * currentStep);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [value, animated]);

  return (
    <div className="w-full space-y-1">
      {/* Header */}
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-xs font-mono text-demon-text-muted uppercase tracking-wider">
              {label}
            </span>
          )}
          {showValue && (
            <span className={clsx("text-sm font-mono font-bold", variantStyles.text)}>
              {Math.round(displayValue)}%
            </span>
          )}
        </div>
      )}

      {/* Track */}
      <div
        className={clsx(
          "relative w-full rounded-full overflow-hidden",
          "bg-demon-bg-light border border-demon-primary/20",
          sizes[size]
        )}
      >
        {/* Progress bar */}
        <motion.div
          className={clsx(
            "absolute inset-y-0 left-0 rounded-full",
            "bg-gradient-to-r",
            variantStyles.bar,
            variantStyles.glow,
            striped && "bg-[length:20px_20px]"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: animated ? 0.5 : 0, ease: "easeOut" }}
          style={
            striped
              ? {
                  backgroundImage: `linear-gradient(
                    45deg,
                    rgba(255,255,255,0.1) 25%,
                    transparent 25%,
                    transparent 50%,
                    rgba(255,255,255,0.1) 50%,
                    rgba(255,255,255,0.1) 75%,
                    transparent 75%,
                    transparent
                  )`,
                  backgroundSize: "20px 20px",
                  animation: animated ? "progress-stripes 1s linear infinite" : "none",
                }
              : {}
          }
        />

        {/* Glow effect at the end */}
        <motion.div
          className={clsx(
            "absolute top-0 bottom-0 w-4 rounded-full blur-sm",
            "bg-gradient-to-r from-transparent",
            variant === "default" && "to-demon-accent",
            variant === "success" && "to-demon-success",
            variant === "danger" && "to-demon-danger",
            variant === "warning" && "to-demon-warning"
          )}
          initial={{ left: 0 }}
          animate={{ left: `calc(${percentage}% - 1rem)` }}
          transition={{ duration: animated ? 0.5 : 0, ease: "easeOut" }}
          style={{ opacity: percentage > 5 ? 1 : 0 }}
        />

        {/* Pulse at 100% */}
        {percentage >= 100 && (
          <motion.div
            className="absolute inset-0 rounded-full bg-white/20"
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>

      {/* Status indicator */}
      {percentage >= 100 && (
        <motion.div
          className="flex items-center gap-1 text-[10px] text-demon-success font-mono"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-demon-success animate-pulse" />
          COMPLETE
        </motion.div>
      )}
    </div>
  );
}

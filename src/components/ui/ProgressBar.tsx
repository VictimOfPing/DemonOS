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
    bar: "from-demon-primary to-demon-accent",
    text: "text-demon-accent",
  },
  success: {
    bar: "from-demon-success to-emerald-400",
    text: "text-demon-success",
  },
  danger: {
    bar: "from-demon-danger to-red-400",
    text: "text-demon-danger",
  },
  warning: {
    bar: "from-demon-warning to-amber-400",
    text: "text-demon-warning",
  },
};

const sizes = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-3",
};

/**
 * Clean progress bar with smooth animations
 * Professional design without excessive glow
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
    <div className="w-full space-y-2">
      {/* Header */}
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-sm text-demon-text-muted">
              {label}
            </span>
          )}
          {showValue && (
            <span className={clsx("text-sm font-mono", variantStyles.text)}>
              {Math.round(displayValue)}%
            </span>
          )}
        </div>
      )}

      {/* Track */}
      <div
        className={clsx(
          "relative w-full rounded-full overflow-hidden",
          "bg-demon-bg-light",
          sizes[size]
        )}
      >
        {/* Progress bar */}
        <motion.div
          className={clsx(
            "absolute inset-y-0 left-0 rounded-full",
            "bg-gradient-to-r",
            variantStyles.bar,
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
                    rgba(255,255,255,0.15) 25%,
                    transparent 25%,
                    transparent 50%,
                    rgba(255,255,255,0.15) 50%,
                    rgba(255,255,255,0.15) 75%,
                    transparent 75%,
                    transparent
                  )`,
                  backgroundSize: "20px 20px",
                  animation: animated ? "progress-stripes 1s linear infinite" : "none",
                }
              : {}
          }
        />
      </div>
    </div>
  );
}

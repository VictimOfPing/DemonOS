"use client";

import { motion } from "framer-motion";
import clsx from "clsx";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { track: "w-8 h-4", thumb: "w-3 h-3", translate: 16 },
  md: { track: "w-11 h-6", thumb: "w-5 h-5", translate: 20 },
  lg: { track: "w-14 h-7", thumb: "w-6 h-6", translate: 28 },
};

/**
 * Toggle switch with neon glow effect
 * GTA mod menu style on/off toggle
 */
export function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled = false,
  size = "md",
}: ToggleSwitchProps) {
  const sizeStyles = sizes[size];

  return (
    <label
      className={clsx(
        "inline-flex items-center gap-3 cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Track */}
      <motion.button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={clsx(
          "relative rounded-full transition-colors duration-200",
          sizeStyles.track,
          checked
            ? "bg-demon-primary/30 border border-demon-primary shadow-[0_0_10px_rgba(139,92,246,0.5)]"
            : "bg-demon-bg-light border border-demon-text-muted/30"
        )}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
      >
        {/* Thumb */}
        <motion.span
          className={clsx(
            "absolute top-0.5 left-0.5 rounded-full",
            sizeStyles.thumb,
            checked
              ? "bg-demon-accent shadow-[0_0_8px_rgba(192,132,252,0.8)]"
              : "bg-demon-text-muted"
          )}
          animate={{
            x: checked ? sizeStyles.translate : 0,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />

        {/* Glow effect when checked */}
        {checked && (
          <motion.span
            className="absolute inset-0 rounded-full bg-demon-primary/20"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          />
        )}
      </motion.button>

      {/* Label */}
      {label && (
        <span
          className={clsx(
            "text-sm font-mono transition-colors",
            checked ? "text-demon-accent" : "text-demon-text-muted"
          )}
        >
          {label}
        </span>
      )}

      {/* Status text */}
      <span
        className={clsx(
          "text-[10px] font-mono uppercase px-1.5 py-0.5 rounded",
          checked
            ? "bg-demon-primary/20 text-demon-accent"
            : "bg-demon-bg-light text-demon-text-muted"
        )}
      >
        {checked ? "ON" : "OFF"}
      </span>
    </label>
  );
}

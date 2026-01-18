"use client";

import { forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import clsx from "clsx";

interface NeonButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
  size?: "sm" | "md" | "lg";
  glowIntensity?: "none" | "subtle" | "medium" | "intense";
  children: React.ReactNode;
  icon?: React.ReactNode;
  loading?: boolean;
}

const variants = {
  primary: {
    base: "bg-demon-primary/20 border-demon-primary text-demon-accent",
    hover: "hover:bg-demon-primary/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.5)]",
    glow: "shadow-demon-primary/50",
  },
  secondary: {
    base: "bg-demon-bg-light border-demon-text-muted/30 text-demon-text",
    hover: "hover:border-demon-primary/50 hover:text-demon-accent",
    glow: "shadow-demon-primary/30",
  },
  danger: {
    base: "bg-demon-danger/20 border-demon-danger text-demon-danger",
    hover: "hover:bg-demon-danger/30 hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]",
    glow: "shadow-demon-danger/50",
  },
  success: {
    base: "bg-demon-success/20 border-demon-success text-demon-success",
    hover: "hover:bg-demon-success/30 hover:shadow-[0_0_20px_rgba(34,197,94,0.5)]",
    glow: "shadow-demon-success/50",
  },
  ghost: {
    base: "bg-transparent border-transparent text-demon-text-muted",
    hover: "hover:bg-demon-primary/10 hover:text-demon-text",
    glow: "",
  },
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

const glowStyles = {
  none: "",
  subtle: "shadow-[0_0_5px_var(--tw-shadow-color)]",
  medium: "shadow-[0_0_10px_var(--tw-shadow-color),0_0_20px_var(--tw-shadow-color)]",
  intense: "shadow-[0_0_10px_var(--tw-shadow-color),0_0_20px_var(--tw-shadow-color),0_0_40px_var(--tw-shadow-color)]",
};

/**
 * Neon-styled button with glow effects and animations
 * Supports multiple variants and sizes
 */
export const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(
  function NeonButton(
    {
      variant = "primary",
      size = "md",
      glowIntensity = "subtle",
      children,
      icon,
      loading = false,
      className,
      disabled,
      ...props
    },
    ref
  ) {
    const variantStyles = variants[variant];

    return (
      <motion.button
        ref={ref}
        className={clsx(
          "relative inline-flex items-center justify-center gap-2",
          "font-mono font-medium rounded border",
          "transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantStyles.base,
          variantStyles.hover,
          sizes[size],
          glowIntensity !== "none" && variantStyles.glow,
          glowStyles[glowIntensity],
          className
        )}
        disabled={disabled || loading}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        {...props}
      >
        {/* Corner decorations */}
        <span className="absolute -top-[1px] -left-[1px] w-2 h-2 border-l border-t border-current opacity-50" />
        <span className="absolute -top-[1px] -right-[1px] w-2 h-2 border-r border-t border-current opacity-50" />
        <span className="absolute -bottom-[1px] -left-[1px] w-2 h-2 border-l border-b border-current opacity-50" />
        <span className="absolute -bottom-[1px] -right-[1px] w-2 h-2 border-r border-b border-current opacity-50" />

        {/* Loading spinner */}
        {loading && (
          <motion.span
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        )}

        {/* Icon */}
        {icon && !loading && <span className="w-4 h-4">{icon}</span>}

        {/* Content */}
        <span className="relative z-10">{children}</span>

        {/* Hover glow effect */}
        <motion.span
          className="absolute inset-0 rounded opacity-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          whileHover={{ opacity: 1, x: ["-100%", "100%"] }}
          transition={{ duration: 0.5 }}
        />
      </motion.button>
    );
  }
);

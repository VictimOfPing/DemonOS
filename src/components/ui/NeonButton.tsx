"use client";

import { forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import clsx from "clsx";

interface NeonButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  icon?: React.ReactNode;
  loading?: boolean;
}

const variants = {
  primary: {
    base: "bg-demon-primary text-white",
    hover: "hover:bg-demon-accent hover:shadow-lg hover:shadow-demon-primary/25",
  },
  secondary: {
    base: "bg-demon-bg-light border border-demon-primary/20 text-demon-text",
    hover: "hover:border-demon-primary/40 hover:bg-demon-primary/10",
  },
  danger: {
    base: "bg-demon-danger/20 border border-demon-danger/40 text-demon-danger",
    hover: "hover:bg-demon-danger/30",
  },
  success: {
    base: "bg-demon-success/20 border border-demon-success/40 text-demon-success",
    hover: "hover:bg-demon-success/30",
  },
  ghost: {
    base: "bg-transparent text-demon-text-muted",
    hover: "hover:bg-demon-primary/10 hover:text-demon-text",
  },
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

/**
 * Clean button component with subtle hover effects
 * Professional design for actions
 */
export const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(
  function NeonButton(
    {
      variant = "primary",
      size = "md",
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
          "font-medium rounded-xl",
          "transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantStyles.base,
          !disabled && variantStyles.hover,
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <motion.span
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        )}

        {/* Icon */}
        {icon && !loading && <span className="w-4 h-4 flex items-center justify-center">{icon}</span>}

        {/* Content */}
        <span>{children}</span>
      </motion.button>
    );
  }
);

"use client";

import { forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import clsx from "clsx";

interface NeonCardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  variant?: "default" | "glow" | "intense" | "subtle";
  hover?: boolean;
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

const cardVariants = {
  default: {
    border: "border-demon-primary/30",
    bg: "bg-demon-bg-light/50",
    shadow: "",
  },
  glow: {
    border: "border-demon-primary/50",
    bg: "bg-demon-bg-light/70",
    shadow: "shadow-[0_0_15px_rgba(139,92,246,0.2)]",
  },
  intense: {
    border: "border-demon-primary",
    bg: "bg-demon-bg-light/80",
    shadow: "shadow-[0_0_20px_rgba(139,92,246,0.4),inset_0_0_20px_rgba(139,92,246,0.1)]",
  },
  subtle: {
    border: "border-demon-primary/20",
    bg: "bg-demon-bg/50",
    shadow: "",
  },
};

/**
 * Neon-bordered card component with glow effects
 * Used for content containers throughout the app
 */
export const NeonCard = forwardRef<HTMLDivElement, NeonCardProps>(
  function NeonCard(
    {
      variant = "default",
      hover = true,
      children,
      header,
      footer,
      className,
      ...props
    },
    ref
  ) {
    const styles = cardVariants[variant];

    return (
      <motion.div
        ref={ref}
        className={clsx(
          "relative rounded-lg border backdrop-blur-sm overflow-hidden",
          styles.border,
          styles.bg,
          styles.shadow,
          hover && "transition-all duration-300 hover:border-demon-primary/60 hover:shadow-[0_0_25px_rgba(139,92,246,0.3)]",
          className
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        {...props}
      >
        {/* Corner decorations */}
        <div className="absolute top-0 left-0 w-4 h-4">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-demon-primary to-transparent" />
          <div className="absolute top-0 left-0 h-full w-[2px] bg-gradient-to-b from-demon-primary to-transparent" />
        </div>
        <div className="absolute top-0 right-0 w-4 h-4">
          <div className="absolute top-0 right-0 w-full h-[2px] bg-gradient-to-l from-demon-primary to-transparent" />
          <div className="absolute top-0 right-0 h-full w-[2px] bg-gradient-to-b from-demon-primary to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 w-4 h-4">
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-demon-primary to-transparent" />
          <div className="absolute bottom-0 left-0 h-full w-[2px] bg-gradient-to-t from-demon-primary to-transparent" />
        </div>
        <div className="absolute bottom-0 right-0 w-4 h-4">
          <div className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-l from-demon-primary to-transparent" />
          <div className="absolute bottom-0 right-0 h-full w-[2px] bg-gradient-to-t from-demon-primary to-transparent" />
        </div>

        {/* Header */}
        {header && (
          <div className="px-4 py-3 border-b border-demon-primary/20">
            {header}
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-4 py-3 border-t border-demon-primary/20 bg-demon-bg/30">
            {footer}
          </div>
        )}

        {/* Scan line effect on hover */}
        {hover && (
          <motion.div
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100"
            initial={false}
          >
            <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-demon-primary/50 to-transparent animate-scanline" />
          </motion.div>
        )}
      </motion.div>
    );
  }
);

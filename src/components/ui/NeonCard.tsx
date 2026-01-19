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
    border: "border-demon-primary/15",
    bg: "bg-demon-bg/70 backdrop-blur-sm",
    shadow: "",
  },
  glow: {
    border: "border-demon-primary/25",
    bg: "bg-demon-bg/80 backdrop-blur-sm",
    shadow: "shadow-lg shadow-demon-primary/5",
  },
  intense: {
    border: "border-demon-primary/40",
    bg: "bg-demon-bg/85 backdrop-blur-sm",
    shadow: "shadow-xl shadow-demon-primary/10",
  },
  subtle: {
    border: "border-demon-primary/10",
    bg: "bg-demon-bg/50 backdrop-blur-sm",
    shadow: "",
  },
};

/**
 * Clean card component with subtle glow effects
 * Professional design for content containers
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
          "relative rounded-2xl border backdrop-blur-sm overflow-hidden",
          styles.border,
          styles.bg,
          styles.shadow,
          hover && "transition-all duration-300 hover:border-demon-primary/30 hover:shadow-lg hover:shadow-demon-primary/10",
          className
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        {...props}
      >
        {/* Header */}
        {header && (
          <div className="px-5 py-4 border-b border-demon-primary/10">
            {header}
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-demon-primary/10 bg-demon-bg/30">
            {footer}
          </div>
        )}
      </motion.div>
    );
  }
);

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

interface GlitchTextProps {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
  glitchOnHover?: boolean;
  autoGlitch?: boolean;
  neon?: boolean;
}

/**
 * Text component with glitch effect
 * Can be triggered on hover or automatically at intervals
 */
export function GlitchText({
  text,
  className = "",
  as: Component = "span",
  glitchOnHover = false,
  autoGlitch = false,
  neon = false,
}: GlitchTextProps) {
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    if (!autoGlitch) return;

    const triggerGlitch = () => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 200);
    };

    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        triggerGlitch();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [autoGlitch]);

  const handleMouseEnter = () => {
    if (glitchOnHover) {
      setIsGlitching(true);
    }
  };

  const handleMouseLeave = () => {
    if (glitchOnHover) {
      setIsGlitching(false);
    }
  };

  return (
    <Component
      className={clsx(
        "relative inline-block",
        neon && "neon-text",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main text */}
      <motion.span
        className={clsx(
          "relative z-10",
          isGlitching && "animate-glitch"
        )}
        animate={isGlitching ? {
          x: [0, -2, 2, -1, 1, 0],
          y: [0, 1, -1, 0],
        } : {}}
        transition={{ duration: 0.2 }}
      >
        {text}
      </motion.span>

      {/* Glitch layers */}
      {isGlitching && (
        <>
          <span
            className="absolute inset-0 text-demon-danger opacity-80 z-0"
            style={{
              clipPath: "inset(20% 0 60% 0)",
              transform: "translate(-3px, 0)",
            }}
            aria-hidden="true"
          >
            {text}
          </span>
          <span
            className="absolute inset-0 text-cyan-400 opacity-80 z-0"
            style={{
              clipPath: "inset(60% 0 20% 0)",
              transform: "translate(3px, 0)",
            }}
            aria-hidden="true"
          >
            {text}
          </span>
        </>
      )}
    </Component>
  );
}

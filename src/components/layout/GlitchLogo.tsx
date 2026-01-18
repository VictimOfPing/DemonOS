"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { APP_NAME, APP_VERSION } from "@/lib/constants";

/**
 * Animated logo with periodic glitch effect
 * Features RGB split and distortion animations
 */
export function GlitchLogo() {
  const [isGlitching, setIsGlitching] = useState(false);

  // Trigger glitch randomly
  useEffect(() => {
    const triggerGlitch = () => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 300);
    };

    // Initial glitch
    setTimeout(triggerGlitch, 1000);

    // Random glitches
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        triggerGlitch();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="relative select-none cursor-default"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Main logo text */}
      <div
        className={`relative font-bold text-2xl tracking-wider ${
          isGlitching ? "glitch-text" : ""
        }`}
        data-text={APP_NAME}
      >
        <span className="text-demon-accent neon-text">{APP_NAME}</span>
      </div>

      {/* Version badge */}
      <motion.div
        className="absolute -right-2 -top-1 text-[10px] font-medium px-1.5 py-0.5 
                   bg-demon-primary/20 border border-demon-primary/50 rounded
                   text-demon-accent"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
      >
        {APP_VERSION}
      </motion.div>

      {/* Glitch layers */}
      {isGlitching && (
        <>
          <div
            className="absolute inset-0 font-bold text-2xl tracking-wider text-demon-danger opacity-70"
            style={{
              clipPath: "inset(40% 0 40% 0)",
              transform: "translate(-2px, 0)",
            }}
          >
            {APP_NAME}
          </div>
          <div
            className="absolute inset-0 font-bold text-2xl tracking-wider text-cyan-400 opacity-70"
            style={{
              clipPath: "inset(60% 0 20% 0)",
              transform: "translate(2px, 0)",
            }}
          >
            {APP_NAME}
          </div>
        </>
      )}

      {/* Decorative line */}
      <motion.div
        className="h-[1px] mt-2 bg-gradient-to-r from-transparent via-demon-primary to-transparent"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      />
    </motion.div>
  );
}

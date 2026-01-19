"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface GlitchLogoProps {
  compact?: boolean;
}

/**
 * Clean logo component
 * Professional branding without glitch effects
 * Supports compact mode for mobile header
 */
export function GlitchLogo({ compact = false }: GlitchLogoProps) {
  return (
    <motion.div
      className="flex items-center gap-2 sm:gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative">
        <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-xl bg-gradient-to-br from-demon-primary to-demon-accent flex items-center justify-center`}>
          <Zap className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-white`} />
        </div>
        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-demon-primary to-demon-accent opacity-30 blur-sm -z-10" />
      </div>
      {!compact && (
        <div>
          <h1 className="text-lg font-semibold text-demon-text tracking-tight">
            DemonOS
          </h1>
          <p className="text-[10px] text-demon-text-muted uppercase tracking-widest">
            Data Extraction
          </p>
        </div>
      )}
      {compact && (
        <span className="text-base font-semibold text-demon-text tracking-tight">
          DemonOS
        </span>
      )}
    </motion.div>
  );
}

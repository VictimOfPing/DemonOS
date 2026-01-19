"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";

/**
 * Clean logo component
 * Professional branding without glitch effects
 */
export function GlitchLogo() {
  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-demon-primary to-demon-accent flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-demon-primary to-demon-accent opacity-30 blur-sm -z-10" />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-demon-text tracking-tight">
          DemonOS
        </h1>
        <p className="text-[10px] text-demon-text-muted uppercase tracking-widest">
          Data Extraction
        </p>
      </div>
    </motion.div>
  );
}

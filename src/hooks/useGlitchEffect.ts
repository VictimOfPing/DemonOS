"use client";

import { useState, useEffect, useCallback } from "react";

interface UseGlitchEffectOptions {
  /** Automatically trigger glitch at random intervals */
  autoGlitch?: boolean;
  /** Minimum interval between auto-glitches (ms) */
  minInterval?: number;
  /** Maximum interval between auto-glitches (ms) */
  maxInterval?: number;
  /** Duration of glitch effect (ms) */
  duration?: number;
  /** Probability of glitch occurring on each interval check (0-1) */
  probability?: number;
}

interface UseGlitchEffectReturn {
  /** Whether glitch is currently active */
  isGlitching: boolean;
  /** Manually trigger a glitch */
  triggerGlitch: () => void;
  /** Stop any ongoing glitch */
  stopGlitch: () => void;
}

/**
 * Hook for managing glitch effects on components
 * Provides both automatic and manual glitch triggering
 */
export function useGlitchEffect(
  options: UseGlitchEffectOptions = {}
): UseGlitchEffectReturn {
  const {
    autoGlitch = false,
    minInterval = 3000,
    maxInterval = 8000,
    duration = 300,
    probability = 0.5,
  } = options;

  const [isGlitching, setIsGlitching] = useState(false);

  const triggerGlitch = useCallback(() => {
    setIsGlitching(true);
    setTimeout(() => setIsGlitching(false), duration);
  }, [duration]);

  const stopGlitch = useCallback(() => {
    setIsGlitching(false);
  }, []);

  // Auto-glitch effect
  useEffect(() => {
    if (!autoGlitch) return;

    const scheduleNextGlitch = () => {
      const interval = Math.random() * (maxInterval - minInterval) + minInterval;
      
      return setTimeout(() => {
        if (Math.random() < probability) {
          triggerGlitch();
        }
        timeoutId = scheduleNextGlitch();
      }, interval);
    };

    let timeoutId = scheduleNextGlitch();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [autoGlitch, minInterval, maxInterval, probability, triggerGlitch]);

  return {
    isGlitching,
    triggerGlitch,
    stopGlitch,
  };
}

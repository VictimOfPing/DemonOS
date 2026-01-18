"use client";

import { useState, useEffect, useCallback } from "react";

interface UseTypingEffectOptions {
  /** Text to type */
  text: string;
  /** Typing speed in milliseconds per character */
  speed?: number;
  /** Delay before starting to type (ms) */
  startDelay?: number;
  /** Whether to start typing immediately */
  autoStart?: boolean;
  /** Callback when typing is complete */
  onComplete?: () => void;
  /** Whether to show cursor */
  showCursor?: boolean;
  /** Cursor character */
  cursorChar?: string;
}

interface UseTypingEffectReturn {
  /** Currently displayed text */
  displayText: string;
  /** Whether typing is complete */
  isComplete: boolean;
  /** Whether typing is in progress */
  isTyping: boolean;
  /** Start typing from beginning */
  start: () => void;
  /** Pause typing */
  pause: () => void;
  /** Resume typing */
  resume: () => void;
  /** Reset to beginning */
  reset: () => void;
  /** Skip to end (show full text) */
  skip: () => void;
}

/**
 * Hook for typewriter text effect
 * Animates text appearing character by character
 */
export function useTypingEffect(
  options: UseTypingEffectOptions
): UseTypingEffectReturn {
  const {
    text,
    speed = 50,
    startDelay = 0,
    autoStart = true,
    onComplete,
    showCursor = true,
    cursorChar = "▊",
  } = options;

  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const isComplete = currentIndex >= text.length;

  const start = useCallback(() => {
    setCurrentIndex(0);
    setDisplayText("");
    setIsTyping(true);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const reset = useCallback(() => {
    setCurrentIndex(0);
    setDisplayText("");
    setIsTyping(false);
    setIsPaused(false);
  }, []);

  const skip = useCallback(() => {
    setDisplayText(text);
    setCurrentIndex(text.length);
    setIsTyping(false);
    onComplete?.();
  }, [text, onComplete]);

  // Auto-start effect
  useEffect(() => {
    if (!autoStart) return;

    const timeout = setTimeout(() => {
      setIsTyping(true);
    }, startDelay);

    return () => clearTimeout(timeout);
  }, [autoStart, startDelay]);

  // Typing effect
  useEffect(() => {
    if (!isTyping || isPaused || isComplete) return;

    const timeout = setTimeout(() => {
      setDisplayText(text.slice(0, currentIndex + 1));
      setCurrentIndex((prev) => prev + 1);
    }, speed);

    return () => clearTimeout(timeout);
  }, [isTyping, isPaused, currentIndex, text, speed, isComplete]);

  // Completion callback
  useEffect(() => {
    if (isComplete && isTyping) {
      setIsTyping(false);
      onComplete?.();
    }
  }, [isComplete, isTyping, onComplete]);

  // Include cursor in display text if enabled
  const displayWithCursor = showCursor && isTyping
    ? displayText + cursorChar
    : displayText;

  return {
    displayText: displayWithCursor,
    isComplete,
    isTyping,
    start,
    pause,
    resume,
    reset,
    skip,
  };
}

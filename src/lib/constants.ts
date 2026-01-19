/**
 * DemonOS Color Palette
 * Nero/Viola theme with cyberpunk aesthetics
 */
export const COLORS = {
  BG: "#0a0a0f",
  BG_LIGHT: "#12121a",
  PRIMARY: "#8b5cf6",
  ACCENT: "#c084fc",
  GLOW: "#a855f7",
  TEXT: "#e2e8f0",
  TEXT_MUTED: "#94a3b8",
  DANGER: "#ef4444",
  SUCCESS: "#22c55e",
  WARNING: "#f59e0b",
} as const;

/**
 * Animation timing constants
 */
export const ANIMATION = {
  GLITCH_DURATION: 300,
  TYPING_SPEED: 50,
  FADE_DURATION: 200,
  PULSE_INTERVAL: 2000,
  MATRIX_SPEED: 33,
} as const;

/**
 * Navigation items for the mod menu sidebar
 */
export const NAV_ITEMS = [
  { id: "dashboard", label: "DASHBOARD", icon: "LayoutDashboard", hotkey: "F1", path: "/" },
  { id: "scraper", label: "SCRAPER", icon: "Bot", hotkey: "F2", path: "/scraper" },
  { id: "database", label: "DATABASE", icon: "Database", hotkey: "F3", path: "/database" },
] as const;

/**
 * Matrix rain characters (mix of katakana and symbols)
 */
export const MATRIX_CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%^&*()";

/**
 * Terminal prompt
 */
export const TERMINAL_PROMPT = "demon@os:~$";

/**
 * App metadata
 */
export const APP_NAME = "DEMON OS";
export const APP_VERSION = "v1.0";

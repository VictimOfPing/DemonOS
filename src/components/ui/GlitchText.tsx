"use client";

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
 * Simple text component
 * Renders styled text without glitch effects for professional look
 */
export function GlitchText({
  text,
  className = "",
  as: Component = "span",
  neon = false,
}: GlitchTextProps) {
  return (
    <Component
      className={clsx(
        "relative inline-block",
        neon && "text-glow-subtle",
        className
      )}
    >
      {text}
    </Component>
  );
}

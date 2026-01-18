"use client";

/**
 * CRT Scanlines Overlay
 * Creates vintage monitor effect with moving scanline
 */
export function Scanlines() {
  return (
    <>
      {/* Static scanlines */}
      <div
        className="fixed inset-0 pointer-events-none z-[100]"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.1) 2px,
            rgba(0, 0, 0, 0.1) 4px
          )`,
        }}
        aria-hidden="true"
      />
      
      {/* Moving scanline */}
      <div
        className="fixed left-0 w-full h-[2px] pointer-events-none z-[101] animate-scanline"
        style={{
          background: `linear-gradient(
            90deg,
            transparent,
            rgba(139, 92, 246, 0.3),
            transparent
          )`,
          boxShadow: "0 0 10px rgba(139, 92, 246, 0.5)",
        }}
        aria-hidden="true"
      />
    </>
  );
}

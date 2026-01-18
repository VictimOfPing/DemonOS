"use client";

import { useEffect, useRef } from "react";
import { MATRIX_CHARS, COLORS, ANIMATION } from "@/lib/constants";

interface Column {
  x: number;
  y: number;
  speed: number;
  chars: string[];
}

/**
 * Matrix Rain Effect - Canvas-based falling code animation
 * Creates the iconic Matrix digital rain effect with purple theme
 */
export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const fontSize = 14;
    const columnCount = Math.floor(canvas.width / fontSize);
    
    // Initialize columns
    const columns: Column[] = [];
    for (let i = 0; i < columnCount; i++) {
      columns.push({
        x: i * fontSize,
        y: Math.random() * canvas.height,
        speed: 0.5 + Math.random() * 1.5,
        chars: Array(Math.floor(canvas.height / fontSize))
          .fill("")
          .map(() => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]),
      });
    }

    // Animation loop
    let animationId: number;
    const animate = () => {
      // Semi-transparent black to create fade trail
      ctx.fillStyle = "rgba(10, 10, 15, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px JetBrains Mono, monospace`;

      columns.forEach((column) => {
        // Draw characters in column
        const charCount = Math.min(20, column.chars.length);
        
        for (let i = 0; i < charCount; i++) {
          const charY = column.y - i * fontSize;
          if (charY < 0 || charY > canvas.height) continue;

          // Calculate opacity based on position (head is brightest)
          const opacity = 1 - (i / charCount);
          
          if (i === 0) {
            // Head character - brightest
            ctx.fillStyle = COLORS.ACCENT;
            ctx.shadowColor = COLORS.GLOW;
            ctx.shadowBlur = 10;
          } else if (i < 3) {
            // Near head - bright
            ctx.fillStyle = `rgba(192, 132, 252, ${opacity})`;
            ctx.shadowBlur = 5;
          } else {
            // Trail - fading
            ctx.fillStyle = `rgba(139, 92, 246, ${opacity * 0.5})`;
            ctx.shadowBlur = 0;
          }

          // Randomly change character
          if (Math.random() > 0.95) {
            column.chars[i] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
          }

          ctx.fillText(column.chars[i], column.x, charY);
        }

        // Move column down
        column.y += column.speed * fontSize * 0.3;

        // Reset when off screen
        if (column.y > canvas.height + fontSize * 20) {
          column.y = 0;
          column.speed = 0.5 + Math.random() * 1.5;
        }
      });

      ctx.shadowBlur = 0;
      animationId = requestAnimationFrame(animate);
    };

    // Start animation with delay
    const startTimeout = setTimeout(() => {
      animate();
    }, 100);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationId);
      clearTimeout(startTimeout);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none opacity-30"
      aria-hidden="true"
    />
  );
}

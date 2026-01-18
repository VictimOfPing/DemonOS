"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { COLORS } from "@/lib/constants";
import clsx from "clsx";

interface Site {
  id: string;
  name: string;
  status: "active" | "idle" | "error";
  angle: number;
  distance: number;
}

interface RadarViewProps {
  sites: Site[];
  className?: string;
}

/**
 * Military-style radar view showing active sites
 * Rotating scan line with blip indicators
 */
export function RadarView({ sites, className }: RadarViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredSite, setHoveredSite] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 200;
    canvas.width = size;
    canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = size / 2 - 10;

    let rotation = 0;
    let animationId: number;

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // Background circles
      ctx.strokeStyle = "rgba(139, 92, 246, 0.2)";
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (maxRadius * i) / 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Cross lines
      ctx.beginPath();
      ctx.moveTo(centerX, 10);
      ctx.lineTo(centerX, size - 10);
      ctx.moveTo(10, centerY);
      ctx.lineTo(size - 10, centerY);
      ctx.strokeStyle = "rgba(139, 92, 246, 0.15)";
      ctx.stroke();

      // Rotating scan line with gradient
      const gradient = ctx.createLinearGradient(
        centerX,
        centerY,
        centerX + Math.cos(rotation) * maxRadius,
        centerY + Math.sin(rotation) * maxRadius
      );
      gradient.addColorStop(0, "rgba(139, 92, 246, 0)");
      gradient.addColorStop(0.5, "rgba(139, 92, 246, 0.3)");
      gradient.addColorStop(1, "rgba(192, 132, 252, 0.8)");

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(rotation) * maxRadius,
        centerY + Math.sin(rotation) * maxRadius
      );
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Scan sweep effect
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, maxRadius, rotation - 0.5, rotation);
      ctx.closePath();
      const sweepGradient = ctx.createConicGradient(rotation - 0.5, centerX, centerY);
      sweepGradient.addColorStop(0, "rgba(139, 92, 246, 0)");
      sweepGradient.addColorStop(1, "rgba(139, 92, 246, 0.1)");
      ctx.fillStyle = sweepGradient;
      ctx.fill();

      // Draw site blips
      sites.forEach((site) => {
        const x = centerX + Math.cos(site.angle) * (site.distance * maxRadius);
        const y = centerY + Math.sin(site.angle) * (site.distance * maxRadius);

        // Blip glow
        const blipGradient = ctx.createRadialGradient(x, y, 0, x, y, 10);
        
        let color: string;
        switch (site.status) {
          case "active":
            color = COLORS.SUCCESS;
            break;
          case "error":
            color = COLORS.DANGER;
            break;
          default:
            color = COLORS.TEXT_MUTED;
        }

        blipGradient.addColorStop(0, color);
        blipGradient.addColorStop(1, "rgba(0,0,0,0)");
        
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = blipGradient;
        ctx.fill();

        // Blip core
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Pulse effect for active sites
        if (site.status === "active") {
          const pulse = Math.sin(Date.now() / 200) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.arc(x, y, 6 + pulse * 4, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(34, 197, 94, ${0.5 - pulse * 0.3})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // Center point
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.ACCENT;
      ctx.fill();

      rotation += 0.02;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [sites]);

  const getStatusColor = (status: Site["status"]) => {
    switch (status) {
      case "active":
        return "bg-demon-success";
      case "error":
        return "bg-demon-danger";
      default:
        return "bg-demon-text-muted";
    }
  };

  return (
    <div className={clsx("relative", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-demon-primary animate-pulse" />
        <span className="text-xs font-mono text-demon-text-muted uppercase tracking-wider">
          Site Radar
        </span>
        <div className="flex-1 h-[1px] bg-gradient-to-r from-demon-primary/30 to-transparent" />
      </div>

      <div className="flex items-center gap-6">
        {/* Radar canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="rounded-full border border-demon-primary/30"
            style={{
              background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, rgba(10,10,15,0.9) 100%)",
            }}
          />
          {/* Corner markers */}
          <div className="absolute -top-1 -left-1 w-3 h-3 border-l-2 border-t-2 border-demon-primary" />
          <div className="absolute -top-1 -right-1 w-3 h-3 border-r-2 border-t-2 border-demon-primary" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 border-l-2 border-b-2 border-demon-primary" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 border-r-2 border-b-2 border-demon-primary" />
        </div>

        {/* Legend */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono text-demon-text-muted uppercase mb-3">
            Status Legend
          </div>
          {sites.map((site) => (
            <motion.div
              key={site.id}
              className="flex items-center gap-2 text-xs"
              onMouseEnter={() => setHoveredSite(site.id)}
              onMouseLeave={() => setHoveredSite(null)}
              animate={{
                scale: hoveredSite === site.id ? 1.05 : 1,
                x: hoveredSite === site.id ? 4 : 0,
              }}
            >
              <div className={clsx("w-2 h-2 rounded-full", getStatusColor(site.status))} />
              <span className="text-demon-text-muted">{site.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

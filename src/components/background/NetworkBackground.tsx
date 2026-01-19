"use client";

import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pulsePhase: number;
}

interface NetworkBackgroundProps {
  nodeCount?: number;
  connectionDistance?: number;
  nodeColor?: string;
  lineColor?: string;
  glowColor?: string;
}

/**
 * Professional network/constellation background
 * Creates an animated mesh of connected nodes with glow effects
 */
export function NetworkBackground({
  nodeCount = 50,
  connectionDistance = 200,
  nodeColor = "#a855f7",
  lineColor = "#8b5cf6",
  glowColor = "#c084fc",
}: NetworkBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animationRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initNodes = () => {
      nodesRef.current = [];
      for (let i = 0; i < nodeCount; i++) {
        nodesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2 + 1,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }
    };

    const drawNode = (node: Node, time: number) => {
      const pulse = Math.sin(time * 0.002 + node.pulsePhase) * 0.5 + 0.5;
      const glowRadius = node.radius + pulse * 8;
      
      // Outer glow
      const gradient = ctx.createRadialGradient(
        node.x, node.y, 0,
        node.x, node.y, glowRadius
      );
      gradient.addColorStop(0, glowColor + "40");
      gradient.addColorStop(0.5, glowColor + "15");
      gradient.addColorStop(1, "transparent");
      
      ctx.beginPath();
      ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Core
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = nodeColor;
      ctx.fill();
      
      // Bright center
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    };

    const drawConnection = (nodeA: Node, nodeB: Node, distance: number) => {
      const opacity = 1 - distance / connectionDistance;
      
      ctx.beginPath();
      ctx.moveTo(nodeA.x, nodeA.y);
      ctx.lineTo(nodeB.x, nodeB.y);
      ctx.strokeStyle = lineColor + Math.floor(opacity * 60).toString(16).padStart(2, "0");
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw nodes
      nodesRef.current.forEach((node) => {
        // Move node
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // Mouse interaction
        const dx = mouseRef.current.x - node.x;
        const dy = mouseRef.current.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const force = (150 - dist) / 150;
          node.vx -= (dx / dist) * force * 0.02;
          node.vy -= (dy / dist) * force * 0.02;
        }

        // Limit velocity
        const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
        if (speed > 1) {
          node.vx = (node.vx / speed) * 1;
          node.vy = (node.vy / speed) * 1;
        }
      });

      // Draw connections first (behind nodes)
      for (let i = 0; i < nodesRef.current.length; i++) {
        for (let j = i + 1; j < nodesRef.current.length; j++) {
          const nodeA = nodesRef.current[i];
          const nodeB = nodesRef.current[j];
          const dx = nodeA.x - nodeB.x;
          const dy = nodeA.y - nodeB.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            drawConnection(nodeA, nodeB, distance);
          }
        }
      }

      // Draw nodes
      nodesRef.current.forEach((node) => drawNode(node, time));

      animationRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    resizeCanvas();
    initNodes();
    animate(0);

    window.addEventListener("resize", () => {
      resizeCanvas();
      initNodes();
    });
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [nodeCount, connectionDistance, nodeColor, lineColor, glowColor]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 bg-gradient-to-br from-[#050508] via-[#0a0a12] to-[#0f0a18]"
      style={{ pointerEvents: "none" }}
    />
  );
}

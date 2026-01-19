"use client";

import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pulsePhase: number;
  brightness: number;
}

/**
 * Animated network background with connected nodes
 * Creates a constellation effect with glowing cyan nodes and lines
 */
export function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const NODE_COUNT = 80;
    const CONNECTION_DISTANCE = 180;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initNodes = () => {
      nodesRef.current = [];
      for (let i = 0; i < NODE_COUNT; i++) {
        nodesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: Math.random() * 2 + 1,
          pulsePhase: Math.random() * Math.PI * 2,
          brightness: Math.random() * 0.5 + 0.5,
        });
      }
    };

    const drawNode = (node: Node, time: number) => {
      const pulse = Math.sin(time * 0.003 + node.pulsePhase) * 0.3 + 0.7;
      const glowSize = node.radius * 8 * pulse * node.brightness;
      
      // Outer glow - cyan color
      const gradient = ctx.createRadialGradient(
        node.x, node.y, 0,
        node.x, node.y, glowSize
      );
      gradient.addColorStop(0, `rgba(0, 255, 255, ${0.4 * pulse * node.brightness})`);
      gradient.addColorStop(0.3, `rgba(0, 200, 220, ${0.2 * pulse * node.brightness})`);
      gradient.addColorStop(0.6, `rgba(0, 150, 180, ${0.05 * pulse * node.brightness})`);
      gradient.addColorStop(1, "transparent");
      
      ctx.beginPath();
      ctx.arc(node.x, node.y, glowSize, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Core - bright cyan/white
      const coreGradient = ctx.createRadialGradient(
        node.x, node.y, 0,
        node.x, node.y, node.radius * 2
      );
      coreGradient.addColorStop(0, `rgba(255, 255, 255, ${pulse * node.brightness})`);
      coreGradient.addColorStop(0.5, `rgba(0, 255, 255, ${0.8 * pulse * node.brightness})`);
      coreGradient.addColorStop(1, `rgba(0, 200, 220, ${0.3 * pulse * node.brightness})`);
      
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();
      
      // Bright center dot
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${pulse * node.brightness})`;
      ctx.fill();
    };

    const drawConnection = (nodeA: Node, nodeB: Node, distance: number) => {
      const opacity = (1 - distance / CONNECTION_DISTANCE) * 0.6;
      const avgBrightness = (nodeA.brightness + nodeB.brightness) / 2;
      
      // Create gradient line
      const gradient = ctx.createLinearGradient(nodeA.x, nodeA.y, nodeB.x, nodeB.y);
      gradient.addColorStop(0, `rgba(0, 220, 230, ${opacity * nodeA.brightness})`);
      gradient.addColorStop(0.5, `rgba(0, 180, 200, ${opacity * avgBrightness * 0.7})`);
      gradient.addColorStop(1, `rgba(0, 220, 230, ${opacity * nodeB.brightness})`);
      
      ctx.beginPath();
      ctx.moveTo(nodeA.x, nodeA.y);
      ctx.lineTo(nodeB.x, nodeB.y);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const animate = (time: number) => {
      // Clear with dark background
      ctx.fillStyle = "#050a0f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update nodes
      nodesRef.current.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        // Wrap around edges
        if (node.x < -50) node.x = canvas.width + 50;
        if (node.x > canvas.width + 50) node.x = -50;
        if (node.y < -50) node.y = canvas.height + 50;
        if (node.y > canvas.height + 50) node.y = -50;
      });

      // Draw connections
      for (let i = 0; i < nodesRef.current.length; i++) {
        for (let j = i + 1; j < nodesRef.current.length; j++) {
          const nodeA = nodesRef.current[i];
          const nodeB = nodesRef.current[j];
          const dx = nodeA.x - nodeB.x;
          const dy = nodeA.y - nodeB.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < CONNECTION_DISTANCE) {
            drawConnection(nodeA, nodeB, distance);
          }
        }
      }

      // Draw nodes on top
      nodesRef.current.forEach((node) => drawNode(node, time));

      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    initNodes();
    animate(0);

    const handleResize = () => {
      resizeCanvas();
      initNodes();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0"
    />
  );
}

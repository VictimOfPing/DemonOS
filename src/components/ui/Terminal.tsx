"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TERMINAL_PROMPT } from "@/lib/constants";
import clsx from "clsx";

interface TerminalLine {
  id: string;
  type: "input" | "output" | "error" | "success" | "info";
  content: string;
  timestamp: Date;
}

interface TerminalProps {
  initialLines?: TerminalLine[];
  onCommand?: (command: string) => void;
  className?: string;
  readOnly?: boolean;
  maxLines?: number;
}

/**
 * Terminal Emulator Component
 * Hacker-style command line interface with typing effects
 */
export function Terminal({
  initialLines = [],
  onCommand,
  className,
  readOnly = false,
  maxLines = 100,
}: TerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>(initialLines);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  // Focus input on click
  const handleContainerClick = () => {
    if (!readOnly && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newLine: TerminalLine = {
      id: Date.now().toString(),
      type: "input",
      content: input,
      timestamp: new Date(),
    };

    setLines((prev) => [...prev.slice(-maxLines + 1), newLine]);
    setCommandHistory((prev) => [...prev, input]);
    setHistoryIndex(-1);
    setInput("");

    if (onCommand) {
      onCommand(input);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  // Public method to add output lines
  const addLine = (type: TerminalLine["type"], content: string) => {
    const newLine: TerminalLine = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
    };
    setLines((prev) => [...prev.slice(-maxLines + 1), newLine]);
  };

  const getLineColor = (type: TerminalLine["type"]) => {
    switch (type) {
      case "input":
        return "text-demon-text";
      case "output":
        return "text-demon-text-muted";
      case "error":
        return "text-demon-danger";
      case "success":
        return "text-demon-success";
      case "info":
        return "text-demon-accent";
      default:
        return "text-demon-text";
    }
  };

  const getLinePrefix = (type: TerminalLine["type"]) => {
    switch (type) {
      case "input":
        return TERMINAL_PROMPT;
      case "error":
        return "[ERROR]";
      case "success":
        return "[OK]";
      case "info":
        return "[INFO]";
      default:
        return ">";
    }
  };

  return (
    <div
      className={clsx(
        "relative rounded-lg overflow-hidden",
        "bg-demon-bg border border-demon-primary/30",
        "font-mono text-sm",
        className
      )}
      onClick={handleContainerClick}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-demon-bg-light border-b border-demon-primary/20">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-demon-danger/70" />
          <div className="w-3 h-3 rounded-full bg-demon-warning/70" />
          <div className="w-3 h-3 rounded-full bg-demon-success/70" />
        </div>
        <span className="text-xs text-demon-text-muted ml-2">terminal</span>
        <div className="flex-1" />
        <span className="text-[10px] text-demon-primary font-mono">
          {lines.length} lines
        </span>
      </div>

      {/* Terminal content */}
      <div
        ref={containerRef}
        className="p-4 h-64 overflow-y-auto"
        style={{
          background: `
            linear-gradient(rgba(139, 92, 246, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      >
        {/* Lines */}
        <AnimatePresence>
          {lines.map((line, index) => (
            <motion.div
              key={line.id}
              className={clsx("flex gap-2 mb-1", getLineColor(line.type))}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
            >
              <span className="text-demon-primary shrink-0">
                {getLinePrefix(line.type)}
              </span>
              <span className="break-all">{line.content}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Input line */}
        {!readOnly && (
          <form onSubmit={handleSubmit} className="flex gap-2 items-center">
            <span className="text-demon-primary shrink-0">{TERMINAL_PROMPT}</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-demon-text caret-demon-accent"
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
            <span className="text-demon-accent animate-pulse">▊</span>
          </form>
        )}
      </div>

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-demon-primary/20 to-transparent"
          animate={{ top: ["0%", "100%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </div>
  );
}

// Export a way to add lines programmatically
export function createTerminalLine(
  type: TerminalLine["type"],
  content: string
): TerminalLine {
  return {
    id: Date.now().toString() + Math.random(),
    type,
    content,
    timestamp: new Date(),
  };
}

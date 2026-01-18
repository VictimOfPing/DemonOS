"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Terminal as TerminalIcon, Maximize2, Minimize2, Copy, Trash2 } from "lucide-react";
import { MatrixRain } from "@/components/background/MatrixRain";
import { ModMenuSidebar } from "@/components/layout/ModMenuSidebar";
import { HUDOverlay } from "@/components/layout/HUDOverlay";
import { NeonCard } from "@/components/ui/NeonCard";
import { GlitchText } from "@/components/ui/GlitchText";
import { Terminal, createTerminalLine } from "@/components/ui/Terminal";

type TerminalLine = {
  id: string;
  type: "input" | "output" | "error" | "success" | "info";
  content: string;
  timestamp: Date;
};

const initialLines: TerminalLine[] = [
  createTerminalLine("info", "Welcome to DemonOS Terminal v1.0"),
  createTerminalLine("info", "Type 'help' for available commands"),
  createTerminalLine("output", ""),
];

const COMMANDS: Record<string, { description: string; output: string[] }> = {
  help: {
    description: "Show available commands",
    output: [
      "Available commands:",
      "  help          - Show this help message",
      "  status        - Show system status",
      "  sites         - List configured sites",
      "  scrape <site> - Start scraping a site",
      "  stop <site>   - Stop scraping a site",
      "  stats         - Show scraping statistics",
      "  clear         - Clear terminal",
      "  db status     - Check database connection",
      "  db tables     - List database tables",
      "  export <site> - Export data to CSV",
      "  version       - Show version info",
    ],
  },
  status: {
    description: "Show system status",
    output: [
      "System Status:",
      "  ✓ Apify API: Connected",
      "  ✓ Supabase: Connected",
      "  ✓ Scrapers: 4 configured (2 active)",
      "  ✓ Memory: 1.2GB / 4GB",
      "  ✓ CPU: 23%",
    ],
  },
  sites: {
    description: "List configured sites",
    output: [
      "Configured Sites:",
      "  [1] amazon.it    - ACTIVE   (12,453 records)",
      "  [2] ebay.com     - ACTIVE   (8,721 records)",
      "  [3] target.com   - IDLE     (3,211 records)",
      "  [4] walmart.com  - ERROR    (5,632 records)",
    ],
  },
  stats: {
    description: "Show scraping statistics",
    output: [
      "Scraping Statistics (Last 24h):",
      "  Total Requests: 15,432",
      "  Successful: 15,127 (98.0%)",
      "  Failed: 305 (2.0%)",
      "  Data Extracted: 24.7 MB",
      "  Avg Response Time: 234ms",
    ],
  },
  version: {
    description: "Show version info",
    output: [
      "DemonOS v1.0.0",
      "Next.js 14.2.21",
      "Apify SDK 3.1.0",
      "Supabase JS 2.39.0",
    ],
  },
  "db status": {
    description: "Check database connection",
    output: [
      "Database Status:",
      "  Connection: Active",
      "  Host: db.supabase.co",
      "  Latency: 12ms",
      "  Pool Size: 10",
      "  Active Connections: 3",
    ],
  },
  "db tables": {
    description: "List database tables",
    output: [
      "Database Tables:",
      "  ├── amazon_products   (12,453 rows, 45.2 MB)",
      "  ├── ebay_listings     (8,721 rows, 32.8 MB)",
      "  ├── target_catalog    (3,211 rows, 12.4 MB)",
      "  └── walmart_prices    (5,632 rows, 21.7 MB)",
      "",
      "Total: 112.1 MB",
    ],
  },
};

export default function TerminalPage() {
  const [lines, setLines] = useState<TerminalLine[]>(initialLines);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleCommand = useCallback((command: string) => {
    const cmd = command.toLowerCase().trim();
    const newLines: TerminalLine[] = [];

    if (cmd === "clear") {
      setLines([createTerminalLine("info", "Terminal cleared")]);
      return;
    }

    if (COMMANDS[cmd]) {
      COMMANDS[cmd].output.forEach((line) => {
        newLines.push(createTerminalLine("output", line));
      });
    } else if (cmd.startsWith("scrape ")) {
      const site = cmd.replace("scrape ", "");
      newLines.push(createTerminalLine("info", `Starting scrape for ${site}...`));
      newLines.push(createTerminalLine("success", `Scraper initiated for ${site}`));
      newLines.push(createTerminalLine("output", "Run 'status' to check progress"));
    } else if (cmd.startsWith("stop ")) {
      const site = cmd.replace("stop ", "");
      newLines.push(createTerminalLine("info", `Stopping scraper for ${site}...`));
      newLines.push(createTerminalLine("success", `Scraper stopped for ${site}`));
    } else if (cmd.startsWith("export ")) {
      const site = cmd.replace("export ", "");
      newLines.push(createTerminalLine("info", `Exporting data for ${site}...`));
      newLines.push(createTerminalLine("output", "Preparing CSV file..."));
      newLines.push(createTerminalLine("success", `Export complete: ${site}_export_2024.csv`));
    } else if (cmd === "") {
      // Empty command, do nothing
      return;
    } else {
      newLines.push(
        createTerminalLine("error", `Command not found: ${command}`)
      );
      newLines.push(createTerminalLine("output", "Type 'help' for available commands"));
    }

    setLines((prev) => [...prev, ...newLines]);
  }, []);

  const clearTerminal = () => {
    setLines([createTerminalLine("info", "Terminal cleared")]);
  };

  const copyOutput = () => {
    const text = lines.map((l) => l.content).join("\n");
    navigator.clipboard.writeText(text);
  };

  return (
    <main className="relative min-h-screen w-full">
      <MatrixRain />
      <HUDOverlay />

      <div className="flex min-h-screen pt-12">
        <ModMenuSidebar />

        <div className="flex-1 ml-64 p-6 overflow-auto h-[calc(100vh-3rem)]">
          <div className="space-y-6">
            {/* Header */}
            <motion.div
              className="flex items-center justify-between"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div>
                <GlitchText
                  text="TERMINAL"
                  as="h1"
                  className="text-2xl font-bold text-demon-accent"
                  autoGlitch
                  neon
                />
                <p className="text-sm text-demon-text-muted mt-1">
                  Command-line interface for advanced operations
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyOutput}
                  className="p-2 rounded bg-demon-bg-light border border-demon-primary/30 
                           text-demon-text-muted hover:text-demon-text hover:border-demon-primary/50 
                           transition-colors"
                  title="Copy output"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={clearTerminal}
                  className="p-2 rounded bg-demon-bg-light border border-demon-primary/30 
                           text-demon-text-muted hover:text-demon-text hover:border-demon-primary/50 
                           transition-colors"
                  title="Clear terminal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 rounded bg-demon-bg-light border border-demon-primary/30 
                           text-demon-text-muted hover:text-demon-text hover:border-demon-primary/50 
                           transition-colors"
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </motion.div>

            {/* Terminal */}
            <motion.div
              layout
              className={isFullscreen ? "fixed inset-4 z-50" : ""}
            >
              <NeonCard variant="intense" className="h-full">
                {/* Custom terminal header */}
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-demon-primary/20">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-demon-danger/70" />
                    <div className="w-3 h-3 rounded-full bg-demon-warning/70" />
                    <div className="w-3 h-3 rounded-full bg-demon-success/70" />
                  </div>
                  <TerminalIcon className="w-4 h-4 text-demon-primary ml-2" />
                  <span className="text-xs text-demon-text-muted font-mono">
                    demon@os:~
                  </span>
                  <div className="flex-1" />
                  <span className="text-[10px] text-demon-primary font-mono">
                    {lines.length} lines
                  </span>
                </div>

                {/* Terminal component */}
                <Terminal
                  initialLines={lines}
                  onCommand={handleCommand}
                  className={`border-0 bg-transparent ${
                    isFullscreen ? "h-[calc(100%-4rem)]" : "h-96"
                  }`}
                />
              </NeonCard>
            </motion.div>

            {/* Quick commands */}
            {!isFullscreen && (
              <NeonCard variant="subtle">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono text-demon-text-muted uppercase tracking-wider">
                    Quick Commands
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["status", "sites", "stats", "db status", "help"].map(
                    (cmd) => (
                      <button
                        key={cmd}
                        onClick={() => handleCommand(cmd)}
                        className="px-3 py-1.5 text-xs font-mono rounded bg-demon-bg border 
                               border-demon-primary/30 text-demon-text-muted 
                               hover:border-demon-primary hover:text-demon-accent transition-colors"
                      >
                        {cmd}
                      </button>
                    )
                  )}
                </div>
              </NeonCard>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

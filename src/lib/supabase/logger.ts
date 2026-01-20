/**
 * Application Logger
 * Logs events to Supabase app_logs table
 */

import { getServerSupabase } from "./client";
import type { LogLevel } from "./types";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  source?: string;
  context?: LogContext;
  userAgent?: string;
  ipAddress?: string;
  requestId?: string;
  durationMs?: number;
  errorStack?: string;
}

/**
 * Log an event to the database
 */
export async function logToDatabase(entry: LogEntry): Promise<string | null> {
  try {
    const supabase = getServerSupabase();
    
    const { data, error } = await supabase
      .from("app_logs")
      .insert({
        level: entry.level,
        message: entry.message,
        source: entry.source,
        context: entry.context || {},
        user_agent: entry.userAgent,
        ip_address: entry.ipAddress,
        request_id: entry.requestId,
        duration_ms: entry.durationMs,
        error_stack: entry.errorStack,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to log to database:", error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error("Logger error:", err);
    return null;
  }
}

/**
 * Logger class for consistent logging
 */
export class AppLogger {
  private source: string;

  constructor(source: string) {
    this.source = source;
  }

  private async log(level: LogLevel, message: string, context?: LogContext) {
    // Always log to console
    const consoleMethod = level === "error" || level === "fatal" ? "error" : 
                         level === "warn" ? "warn" : 
                         level === "debug" ? "debug" : "log";
    console[consoleMethod](`[${this.source}] ${message}`, context || "");

    // Log to database (fire and forget in production)
    logToDatabase({
      level,
      message,
      source: this.source,
      context,
    }).catch(() => {});
  }

  debug(message: string, context?: LogContext) {
    return this.log("debug", message, context);
  }

  info(message: string, context?: LogContext) {
    return this.log("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    return this.log("warn", message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext = {
      ...context,
      errorName: error instanceof Error ? error.name : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
    
    return logToDatabase({
      level: "error",
      message,
      source: this.source,
      context: errorContext,
      errorStack: error instanceof Error ? error.stack : undefined,
    });
  }

  fatal(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext = {
      ...context,
      errorName: error instanceof Error ? error.name : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
    
    return logToDatabase({
      level: "fatal",
      message,
      source: this.source,
      context: errorContext,
      errorStack: error instanceof Error ? error.stack : undefined,
    });
  }
}

/**
 * Create a logger instance for a specific source/module
 */
export function createLogger(source: string): AppLogger {
  return new AppLogger(source);
}

/**
 * Log a scraper run event
 */
export async function logScraperEvent(
  runId: string,
  level: LogLevel,
  message: string,
  context?: LogContext
) {
  return logToDatabase({
    level,
    message,
    source: "scraper",
    context: {
      ...context,
      runId,
    },
  });
}

/**
 * Save scraper run logs to database
 */
export async function saveScraperRunLogs(
  dbRunId: string,
  logs: string
): Promise<number> {
  try {
    const supabase = getServerSupabase();
    
    // Parse logs (simple line-by-line parsing)
    const lines = logs.split("\n").filter(line => line.trim());
    const logEntries = lines.map((line, index) => {
      // Try to detect log level from the line
      let level: LogLevel = "info";
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes("error") || lowerLine.includes("exception")) level = "error";
      else if (lowerLine.includes("warn")) level = "warn";
      else if (lowerLine.includes("debug")) level = "debug";

      // Try to extract timestamp (ISO format at start of line)
      const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
      const timestamp = timestampMatch ? new Date(timestampMatch[1]).toISOString() : new Date().toISOString();
      
      return {
        run_id: dbRunId,
        level,
        message: line.substring(timestampMatch ? timestampMatch[0].length : 0).trim() || line,
        timestamp,
        line_number: index + 1,
      };
    });

    // Insert in batches
    const BATCH_SIZE = 100;
    let savedCount = 0;

    for (let i = 0; i < logEntries.length; i += BATCH_SIZE) {
      const batch = logEntries.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("scraper_run_logs")
        .insert(batch);

      if (!error) {
        savedCount += batch.length;
      }
    }

    return savedCount;
  } catch (err) {
    console.error("Failed to save scraper run logs:", err);
    return 0;
  }
}

/**
 * Get recent app logs
 */
export async function getRecentLogs(
  limit = 100,
  level?: LogLevel,
  source?: string
) {
  const supabase = getServerSupabase();
  
  let query = supabase
    .from("app_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (level) {
    query = query.eq("level", level);
  }
  if (source) {
    query = query.eq("source", source);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch logs:", error);
    return [];
  }

  return data || [];
}

/**
 * Get logs for a specific scraper run
 */
export async function getScraperRunLogs(runId: string) {
  const supabase = getServerSupabase();
  
  const { data, error } = await supabase
    .from("scraper_run_logs")
    .select("*")
    .eq("run_id", runId)
    .order("line_number", { ascending: true });

  if (error) {
    console.error("Failed to fetch scraper run logs:", error);
    return [];
  }

  return data || [];
}

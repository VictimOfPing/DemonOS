/**
 * GET /api/logs
 * Get application logs
 * 
 * POST /api/logs
 * Create a new log entry
 */

import { NextRequest, NextResponse } from "next/server";
import { getRecentLogs, logToDatabase } from "@/lib/supabase/logger";
import type { LogLevel } from "@/lib/supabase/types";
import type { ApiResponse } from "@/types/scraper";

interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  source: string | null;
  context: Record<string, unknown>;
  created_at: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<{ logs: LogEntry[] }>>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const level = searchParams.get("level") as LogLevel | null;
    const source = searchParams.get("source");

    const logs = await getRecentLogs(
      Math.min(limit, 1000),
      level || undefined,
      source || undefined
    );

    return NextResponse.json({
      success: true,
      data: { logs: logs as LogEntry[] },
    });
  } catch (error) {
    console.error("Error getting logs:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get logs",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ id: string | null }>>> {
  try {
    const body = await request.json();
    const { level, message, source, context } = body;

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error: "Message is required",
        },
        { status: 400 }
      );
    }

    // Get client info from headers
    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || 
                      request.headers.get("x-real-ip") || 
                      undefined;

    const id = await logToDatabase({
      level: level || "info",
      message,
      source,
      context,
      userAgent,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error("Error creating log:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create log",
      },
      { status: 500 }
    );
  }
}

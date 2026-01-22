/**
 * GET /api/scraper/logs/[runId]
 * Get logs for a specific scraper run
 * 
 * POST /api/scraper/logs/[runId]
 * Save logs to database
 */

import { NextRequest, NextResponse } from "next/server";
import { getTelegramRunLogs } from "@/lib/apify/telegram-actor";
import { getServerSupabase } from "@/lib/supabase/client";
import { saveScraperRunLogs, getScraperRunLogs } from "@/lib/supabase/logger";
import type { ApiResponse } from "@/types/scraper";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface LogsResponse {
  runId: string;
  logs: string;
  savedToDatabase?: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<NextResponse<ApiResponse<LogsResponse>>> {
  try {
    const { runId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get("source") || "apify"; // apify or database

    if (!runId) {
      return NextResponse.json(
        {
          success: false,
          error: "Run ID is required",
        },
        { status: 400 }
      );
    }

    // If source is database, fetch from Supabase
    if (source === "database") {
      // First get the database run ID
      const supabase = getServerSupabase();
      const { data: dbRun } = await supabase
        .from("scraper_runs")
        .select("id")
        .eq("run_id", runId)
        .single();

      if (!dbRun) {
        return NextResponse.json(
          {
            success: false,
            error: "Run not found in database",
          },
          { status: 404 }
        );
      }

      const dbLogs = await getScraperRunLogs(dbRun.id);
      const logsText = dbLogs.map(l => `[${l.level.toUpperCase()}] ${l.message}`).join("\n");

      return NextResponse.json({
        success: true,
        data: {
          runId,
          logs: logsText || "No logs saved in database",
        },
      });
    }

    // Get logs from Apify
    const logs = await getTelegramRunLogs(runId);

    return NextResponse.json({
      success: true,
      data: {
        runId,
        logs,
      },
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

/**
 * POST /api/scraper/logs/[runId]
 * Fetch logs from Apify and save to database
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<NextResponse<ApiResponse<{ saved: number }>>> {
  try {
    const { runId } = await params;

    if (!runId) {
      return NextResponse.json(
        {
          success: false,
          error: "Run ID is required",
        },
        { status: 400 }
      );
    }

    // Get logs from Apify
    const logs = await getTelegramRunLogs(runId);

    // Get the database run ID
    const supabase = getServerSupabase();
    const { data: dbRun } = await supabase
      .from("scraper_runs")
      .select("id")
      .eq("run_id", runId)
      .single();

    if (!dbRun) {
      return NextResponse.json(
        {
          success: false,
          error: "Run not found in database. Save the run first.",
        },
        { status: 404 }
      );
    }

    // Save logs to database
    const savedCount = await saveScraperRunLogs(dbRun.id, logs);

    return NextResponse.json({
      success: true,
      data: {
        saved: savedCount,
      },
    });
  } catch (error) {
    console.error("Error saving logs:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save logs",
      },
      { status: 500 }
    );
  }
}

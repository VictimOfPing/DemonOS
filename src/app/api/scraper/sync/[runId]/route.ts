/**
 * POST /api/scraper/sync/[runId]
 * Manually sync a specific run - fetch latest data from Apify and save to database
 * 
 * PATCH /api/scraper/sync/[runId]
 * Force-close a stuck run by manually setting its status
 */

import { NextRequest, NextResponse } from "next/server";
import { syncRunData } from "@/lib/scraper/monitor";
import { getServerSupabase } from "@/lib/supabase/client";
import { createLogger } from "@/lib/supabase/logger";
import type { ScraperRunStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const logger = createLogger("api/scraper/sync/[runId]");

/**
 * POST - Sync run from Apify
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<NextResponse> {
  try {
    const { runId } = await params;

    if (!runId) {
      return NextResponse.json(
        { success: false, error: "Missing runId" },
        { status: 400 }
      );
    }

    logger.info(`Manual sync requested for run: ${runId}`);
    
    const result = await syncRunData(runId);

    logger.info(`Manual sync completed for run ${runId}: ${result.itemsCount} items, ${result.dataSaved} saved`);

    // Always return details, even on partial success
    return NextResponse.json({
      success: result.success,
      data: {
        runId,
        itemsCount: result.itemsCount,
        dataSaved: result.dataSaved,
        sampleData: result.sampleData,
        message: result.dataSaved > 0 
          ? `Synced ${result.itemsCount} items, saved ${result.dataSaved} to database`
          : result.error || `Found ${result.itemsCount} items but 0 saved - check data structure`,
      },
      error: result.error,
      errorCode: result.errorCode,
      errorDetails: result.errorDetails,
      debug: {
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "missing",
      },
    }, { status: result.success ? 200 : 500 });
  } catch (error) {
    logger.error("Error in manual sync", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sync run",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Force-close a stuck run
 * Use this when Apify doesn't respond or run was deleted
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<NextResponse> {
  try {
    const { runId } = await params;
    const body = await request.json();
    const { status, errorMessage } = body as { 
      status?: ScraperRunStatus; 
      errorMessage?: string;
    };

    if (!runId) {
      return NextResponse.json(
        { success: false, error: "Missing runId" },
        { status: 400 }
      );
    }

    // Default to "failed" if no status provided
    const newStatus: ScraperRunStatus = status || "failed";
    const validStatuses: ScraperRunStatus[] = ["succeeded", "failed", "aborted", "timed_out"];
    
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    logger.info(`Force-closing run ${runId} with status: ${newStatus}`);

    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("scraper_runs")
      .update({
        status: newStatus,
        finished_at: new Date().toISOString(),
        error_message: errorMessage || `Manually closed - status set to ${newStatus}`,
      })
      .eq("run_id", runId)
      .select()
      .single();

    if (error) {
      logger.error(`Failed to force-close run ${runId}`, error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Run not found" },
        { status: 404 }
      );
    }

    logger.info(`Successfully force-closed run ${runId}`);

    return NextResponse.json({
      success: true,
      data: {
        runId,
        status: newStatus,
        message: `Run marked as ${newStatus}`,
      },
    });
  } catch (error) {
    logger.error("Error force-closing run", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to force-close run",
      },
      { status: 500 }
    );
  }
}

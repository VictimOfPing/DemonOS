/**
 * POST /api/scraper/sync/[runId]
 * Manually sync a specific run - fetch latest data from Apify and save to database
 */

import { NextRequest, NextResponse } from "next/server";
import { syncRunData } from "@/lib/scraper/monitor";
import { createLogger } from "@/lib/supabase/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const logger = createLogger("api/scraper/sync/[runId]");

export async function POST(
  request: NextRequest,
  { params }: { params: { runId: string } }
): Promise<NextResponse> {
  try {
    const { runId } = params;

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

/**
 * POST /api/scraper/sync/[runId]
 * Manually sync a specific run - fetch latest data from Apify and save to database
 */

import { NextRequest, NextResponse } from "next/server";
import { syncRunData } from "@/lib/scraper/monitor";
import { createLogger } from "@/lib/supabase/logger";

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

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    logger.info(`Manual sync completed for run ${runId}: ${result.itemsCount} items, ${result.dataSaved} saved`);

    return NextResponse.json({
      success: true,
      data: {
        runId,
        itemsCount: result.itemsCount,
        dataSaved: result.dataSaved,
        message: result.dataSaved > 0 
          ? `Synced ${result.itemsCount} items, saved ${result.dataSaved} to database`
          : `Synced ${result.itemsCount} items (already saved or no data)`,
      },
    });
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

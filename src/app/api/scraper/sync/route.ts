/**
 * Scraper Sync API
 * Endpoint for monitoring and synchronizing scraper runs
 */

import { NextRequest, NextResponse } from "next/server";
import { monitorActiveRuns, getRunsSummary, checkRunStatus } from "@/lib/scraper/monitor";
import { createLogger } from "@/lib/supabase/logger";

const logger = createLogger("api/scraper/sync");

export interface SyncResponse {
  success: boolean;
  timestamp: string;
  checked: number;
  updated: number;
  completed: number;
  dataSaved: number;
  summary: {
    pending: number;
    running: number;
    succeeded: number;
    failed: number;
    aborted: number;
    total: number;
  };
  runs: Array<{
    runId: string;
    status: string;
    apifyStatus: string;
    itemsCount: number;
    isFinished: boolean;
    wasUpdated: boolean;
    dataSaved: boolean;
  }>;
  error?: string;
}

/**
 * GET /api/scraper/sync
 * Check all active runs and sync their status
 */
export async function GET(request: NextRequest): Promise<NextResponse<SyncResponse>> {
  const startTime = Date.now();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const autoSave = searchParams.get("autoSave") !== "false"; // default true
    const runId = searchParams.get("runId"); // Optional: check single run

    // Single run check
    if (runId) {
      const result = await checkRunStatus(runId);
      const summary = await getRunsSummary();
      
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        checked: result ? 1 : 0,
        updated: result?.wasUpdated ? 1 : 0,
        completed: result?.isFinished ? 1 : 0,
        dataSaved: 0,
        summary,
        runs: result ? [{
          runId: result.runId,
          status: result.status,
          apifyStatus: result.apifyStatus,
          itemsCount: result.itemsCount,
          isFinished: result.isFinished,
          wasUpdated: result.wasUpdated,
          dataSaved: result.dataSaved,
        }] : [],
      });
    }

    // Monitor all active runs
    const monitorResult = await monitorActiveRuns({ autoSaveOnComplete: autoSave });
    const summary = await getRunsSummary();

    const duration = Date.now() - startTime;
    logger.info(`Sync completed in ${duration}ms`, { 
      checked: monitorResult.checked,
      updated: monitorResult.updated,
      completed: monitorResult.completed,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checked: monitorResult.checked,
      updated: monitorResult.updated,
      completed: monitorResult.completed,
      dataSaved: monitorResult.dataSaved,
      summary,
      runs: monitorResult.runs.map((r) => ({
        runId: r.runId,
        status: r.status,
        apifyStatus: r.apifyStatus,
        itemsCount: r.itemsCount,
        isFinished: r.isFinished,
        wasUpdated: r.wasUpdated,
        dataSaved: r.dataSaved,
      })),
    });
  } catch (error) {
    logger.error("Sync failed", error);
    
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      checked: 0,
      updated: 0,
      completed: 0,
      dataSaved: 0,
      summary: { pending: 0, running: 0, succeeded: 0, failed: 0, aborted: 0, total: 0 },
      runs: [],
      error: error instanceof Error ? error.message : "Sync failed",
    }, { status: 500 });
  }
}

/**
 * POST /api/scraper/sync
 * Force sync with options
 */
export async function POST(request: NextRequest): Promise<NextResponse<SyncResponse>> {
  try {
    const body = await request.json();
    const { autoSave = true, forceDataSave = false } = body;

    const monitorResult = await monitorActiveRuns({ 
      autoSaveOnComplete: autoSave || forceDataSave,
    });
    const summary = await getRunsSummary();

    logger.info("Force sync completed", { 
      checked: monitorResult.checked,
      forceDataSave,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checked: monitorResult.checked,
      updated: monitorResult.updated,
      completed: monitorResult.completed,
      dataSaved: monitorResult.dataSaved,
      summary,
      runs: monitorResult.runs.map((r) => ({
        runId: r.runId,
        status: r.status,
        apifyStatus: r.apifyStatus,
        itemsCount: r.itemsCount,
        isFinished: r.isFinished,
        wasUpdated: r.wasUpdated,
        dataSaved: r.dataSaved,
      })),
    });
  } catch (error) {
    logger.error("Force sync failed", error);
    
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      checked: 0,
      updated: 0,
      completed: 0,
      dataSaved: 0,
      summary: { pending: 0, running: 0, succeeded: 0, failed: 0, aborted: 0, total: 0 },
      runs: [],
      error: error instanceof Error ? error.message : "Sync failed",
    }, { status: 500 });
  }
}

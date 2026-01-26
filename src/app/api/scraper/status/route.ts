/**
 * GET /api/scraper/status
 * Get status of all active scraper runs
 */

import { NextRequest, NextResponse } from "next/server";
import { getRunStatus, getTelegramRuns } from "@/lib/apify/telegram-actor";
import { getServerSupabase } from "@/lib/supabase/client";
import type { ApiResponse, ScraperStatusResponse } from "@/types/scraper";
import type { ScraperRunStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Map Apify status to database status */
function mapApifyToDbStatus(apifyStatus: string): ScraperRunStatus {
  switch (apifyStatus) {
    case "READY":
    case "RUNNING":
      return "running";
    case "SUCCEEDED":
      return "succeeded";
    case "FAILED":
      return "failed";
    case "TIMED-OUT":
    case "TIMING-OUT":
      return "timed_out";
    case "ABORTING":
    case "ABORTED":
      return "aborted";
    default:
      return "pending";
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ScraperStatusResponse>>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const runId = searchParams.get("runId");
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // If specific runId is provided, get that run's status
    if (runId) {
      const runInfo = await getRunStatus(runId);
      
      // Update database with latest status
      const supabase = getServerSupabase();
      await supabase
        .from("scraper_runs")
        .update({
          status: mapApifyToDbStatus(runInfo.status),
          finished_at: runInfo.finishedAt,
          items_count: runInfo.itemsCount,
          duration_ms: runInfo.durationMs,
          error_message: runInfo.errorMessage,
        })
        .eq("run_id", runId);

      return NextResponse.json({
        success: true,
        data: {
          runs: [
            {
              id: runInfo.id,
              actorId: runInfo.actorId,
              status: runInfo.status,
              startedAt: runInfo.startedAt,
              finishedAt: runInfo.finishedAt,
              itemsCount: runInfo.itemsCount,
              durationMs: runInfo.durationMs,
            },
          ],
        },
      });
    }

    // Get all recent runs from Apify
    const { items: apifyRuns, total } = await getTelegramRuns(limit, offset);

    // Sync with database
    const supabase = getServerSupabase();
    for (const run of apifyRuns) {
      // Try to get full status for running/recent runs
      if (run.status === "RUNNING" || run.status === "READY") {
        try {
          const fullStatus = await getRunStatus(run.id);
          run.itemsCount = fullStatus.itemsCount;
        } catch {
          // Ignore errors for individual status checks
        }
      }

      // Update database
      await supabase
        .from("scraper_runs")
        .upsert({
          run_id: run.id,
          actor_id: run.actorId,
          actor_name: "Telegram Group Scraper",
          status: mapApifyToDbStatus(run.status),
          started_at: run.startedAt,
          finished_at: run.finishedAt,
          items_count: run.itemsCount,
          duration_ms: run.durationMs,
          dataset_id: run.datasetId,
          error_message: run.errorMessage,
        }, {
          onConflict: "run_id",
        });
    }

    return NextResponse.json({
      success: true,
      data: {
        runs: apifyRuns.map((run) => ({
          id: run.id,
          actorId: run.actorId,
          status: run.status,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
          itemsCount: run.itemsCount,
          durationMs: run.durationMs,
        })),
      },
    });
  } catch (error) {
    console.error("Error getting scraper status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get scraper status",
      },
      { status: 500 }
    );
  }
}

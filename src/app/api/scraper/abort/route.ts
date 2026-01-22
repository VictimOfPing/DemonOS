/**
 * POST /api/scraper/abort
 * Abort a running scraper
 */

import { NextRequest, NextResponse } from "next/server";
import { abortRun } from "@/lib/apify/telegram-actor";
import { getServerSupabase } from "@/lib/supabase/client";
import { AbortScraperRequestSchema, type ApiResponse } from "@/types/scraper";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface AbortResponse {
  runId: string;
  status: string;
  message: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AbortResponse>>> {
  try {
    const body = await request.json();
    
    // Validate request
    const validationResult = AbortScraperRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.issues.map(e => e.message).join(", "),
        },
        { status: 400 }
      );
    }

    const { runId } = validationResult.data;

    // Abort the run on Apify
    const runInfo = await abortRun(runId);

    // Update database
    const supabase = getServerSupabase();
    await supabase
      .from("scraper_runs")
      .update({
        status: "aborted",
        finished_at: new Date().toISOString(),
        error_message: "Manually aborted by user",
      })
      .eq("run_id", runId);

    return NextResponse.json({
      success: true,
      data: {
        runId: runInfo.id,
        status: runInfo.status,
        message: "Scraper aborted successfully",
      },
    });
  } catch (error) {
    console.error("Error aborting scraper:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to abort scraper",
      },
      { status: 500 }
    );
  }
}

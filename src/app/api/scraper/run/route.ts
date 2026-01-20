/**
 * POST /api/scraper/run
 * Start a new scraper run on Apify
 * Uses bhansalisoft/telegram-group-member-scraper
 */

import { NextRequest, NextResponse } from "next/server";
import { startTelegramScraperAsync } from "@/lib/apify/telegram-actor";
import { getServerSupabase } from "@/lib/supabase/client";
import { RunScraperRequestSchema, type ApiResponse, type RunScraperResponse } from "@/types/scraper";
import { ACTOR_IDS } from "@/lib/apify/client";

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<RunScraperResponse>>> {
  try {
    const body = await request.json();
    
    // Validate request
    const validationResult = RunScraperRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.issues.map(e => e.message).join(", "),
        },
        { status: 400 }
      );
    }

    const { scraperId, targetGroup, authToken } = validationResult.data;

    // For now, only telegram is supported
    if (scraperId !== "telegram") {
      return NextResponse.json(
        {
          success: false,
          error: `Scraper "${scraperId}" is not supported yet`,
        },
        { status: 400 }
      );
    }

    // Start the Apify actor (bhansalisoft/telegram-group-member-scraper)
    const runInfo = await startTelegramScraperAsync(targetGroup, {
      authToken,
    });

    // Save run to database
    const supabase = getServerSupabase();
    const { error: dbError } = await supabase.from("scraper_runs").insert({
      run_id: runInfo.id,
      actor_id: ACTOR_IDS.TELEGRAM_GROUP_MEMBER,
      actor_name: "Telegram Group Scraper",
      status: "running",
      started_at: runInfo.startedAt,
      dataset_id: runInfo.datasetId,
      input_config: {
        Target_Group: targetGroup,
        has_auth_token: !!authToken,
      },
    });

    if (dbError) {
      console.error("Failed to save run to database:", dbError);
      // Continue anyway, the run is already started on Apify
    }

    return NextResponse.json({
      success: true,
      data: {
        runId: runInfo.id,
        datasetId: runInfo.datasetId,
        status: runInfo.status,
        message: "Scraper started successfully",
      },
    });
  } catch (error) {
    console.error("Error starting scraper:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to start scraper",
      },
      { status: 500 }
    );
  }
}

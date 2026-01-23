/**
 * POST /api/scraper/run
 * Start a new scraper run on Apify
 * Supports: Telegram, Facebook, and Instagram scrapers
 */

import { NextRequest, NextResponse } from "next/server";
import { startTelegramScraperAsync } from "@/lib/apify/telegram-actor";
import { startFacebookScraperAsync } from "@/lib/apify/facebook-actor";
import { startInstagramScraperAsync } from "@/lib/apify/instagram-actor";
import { getServerSupabase } from "@/lib/supabase/client";
import { RunScraperRequestSchema, type ApiResponse, type RunScraperResponse } from "@/types/scraper";
import { ACTOR_IDS } from "@/lib/apify/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

    const { scraperId, targetGroup, authToken, groupUrls, maxItems, instagramUsernames, instagramType } = validationResult.data;

    const supabase = getServerSupabase();

    // Handle Telegram scraper
    if (scraperId === "telegram") {
      if (!targetGroup) {
        return NextResponse.json(
          {
            success: false,
            error: "Target group is required for Telegram scraper",
          },
          { status: 400 }
        );
      }

      const runInfo = await startTelegramScraperAsync(targetGroup, {
        authToken,
      });

      // Save run to database
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
        console.error("Failed to save Telegram run to database:", dbError);
      }

      return NextResponse.json({
        success: true,
        data: {
          runId: runInfo.id,
          datasetId: runInfo.datasetId,
          status: runInfo.status,
          message: "Telegram scraper started successfully",
        },
      });
    }

    // Handle Facebook scraper
    if (scraperId === "facebook") {
      if (!groupUrls || groupUrls.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "At least one Facebook group URL is required",
          },
          { status: 400 }
        );
      }

      const runInfo = await startFacebookScraperAsync(groupUrls, {
        maxItems: maxItems || 50,
      });

      // Save run to database
      const { error: dbError } = await supabase.from("scraper_runs").insert({
        run_id: runInfo.id,
        actor_id: ACTOR_IDS.FACEBOOK_GROUP_MEMBER,
        actor_name: "Facebook Group Scraper",
        status: "running",
        started_at: runInfo.startedAt,
        dataset_id: runInfo.datasetId,
        input_config: {
          groupUrls: groupUrls,
          maxItems: maxItems || 50,
        },
      });

      if (dbError) {
        console.error("Failed to save Facebook run to database:", dbError);
      }

      return NextResponse.json({
        success: true,
        data: {
          runId: runInfo.id,
          datasetId: runInfo.datasetId,
          status: runInfo.status,
          message: "Facebook scraper started successfully",
        },
      });
    }

    // Handle Instagram scraper
    if (scraperId === "instagram") {
      if (!instagramUsernames || instagramUsernames.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "At least one Instagram username is required",
          },
          { status: 400 }
        );
      }

      // Convert instagramType to new format (capitalize first letter)
      const dataToScrape = instagramType === "following" ? "Following" : "Followers";

      const runInfo = await startInstagramScraperAsync(instagramUsernames, {
        resultsLimit: maxItems || 200,
        dataToScrape: dataToScrape,
      });

      // Save run to database
      const { error: dbError } = await supabase.from("scraper_runs").insert({
        run_id: runInfo.id,
        actor_id: ACTOR_IDS.INSTAGRAM_FOLLOWERS,
        actor_name: "Instagram Followers/Following Scraper",
        status: "running",
        started_at: runInfo.startedAt,
        dataset_id: runInfo.datasetId,
        input_config: {
          Account: instagramUsernames,
          resultsLimit: maxItems || 200,
          dataToScrape: dataToScrape,
        },
      });

      if (dbError) {
        console.error("Failed to save Instagram run to database:", dbError);
      }

      return NextResponse.json({
        success: true,
        data: {
          runId: runInfo.id,
          datasetId: runInfo.datasetId,
          status: runInfo.status,
          message: "Instagram scraper started successfully",
        },
      });
    }

    // Unsupported scraper
    return NextResponse.json(
      {
        success: false,
        error: `Scraper "${scraperId}" is not supported`,
      },
      { status: 400 }
    );
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

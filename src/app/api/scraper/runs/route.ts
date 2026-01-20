/**
 * GET /api/scraper/runs
 * Get all scraper runs with pagination and filtering
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/client";
import type { ApiResponse } from "@/types/scraper";
import type { ScraperRunStatus } from "@/lib/supabase/types";

interface ScraperRunRow {
  id: string;
  run_id: string;
  actor_id: string;
  actor_name: string;
  status: ScraperRunStatus;
  started_at: string;
  finished_at: string | null;
  duration_ms: number;
  items_count: number;
  dataset_id: string | null;
  input_config: Record<string, unknown>;
  error_message: string | null;
  compute_units: number | null;
  usage_usd: number | null;
  created_at: string;
}

interface RunsResponse {
  runs: ScraperRunRow[];
  total: number;
  hasMore: boolean;
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<RunsResponse>>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const status = searchParams.get("status") as ScraperRunStatus | null;
    const actorId = searchParams.get("actorId");

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);

    const supabase = getServerSupabase();

    let query = supabase
      .from("scraper_runs")
      .select("*", { count: "exact" })
      .order("started_at", { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (status) {
      query = query.eq("status", status);
    }
    if (actorId) {
      query = query.eq("actor_id", actorId);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        runs: (data || []) as ScraperRunRow[],
        total: count || 0,
        hasMore: (count || 0) > safeOffset + safeLimit,
      },
    });
  } catch (error) {
    console.error("Error getting scraper runs:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get scraper runs",
      },
      { status: 500 }
    );
  }
}

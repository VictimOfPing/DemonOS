/**
 * GET /api/scraper/stats/types
 * Get distinct scraper types from the database
 */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/client";
import type { ApiResponse } from "@/types/scraper";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface TypesResponse {
  types: string[];
  counts: Record<string, number>;
}

export async function GET(): Promise<NextResponse<ApiResponse<TypesResponse>>> {
  try {
    const supabase = getServerSupabase();

    // Get distinct scraper types with counts
    const { data, error } = await supabase
      .from("scraped_data")
      .select("scraper_type")
      .not("scraper_type", "is", null);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Count occurrences of each type
    const typeCounts: Record<string, number> = {};
    (data || []).forEach((row: { scraper_type: string }) => {
      const type = row.scraper_type;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    // Get unique types sorted by count (most records first)
    const types = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type);

    return NextResponse.json({
      success: true,
      data: {
        types,
        counts: typeCounts,
      },
    });
  } catch (error) {
    console.error("Error fetching scraper types:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch scraper types",
      },
      { status: 500 }
    );
  }
}

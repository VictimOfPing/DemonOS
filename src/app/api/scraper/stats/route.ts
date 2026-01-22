/**
 * GET /api/scraper/stats
 * Get aggregated statistics for scraped data (fast, uses database aggregation)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/client";
import { createLogger } from "@/lib/supabase/logger";
import type { ScraperType } from "@/types/scraped-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const logger = createLogger("api/scraper/stats");

interface SourceStats {
  sourceIdentifier: string;
  sourceName: string | null;
  recordCount: number;
  premiumCount: number;
  verifiedCount: number;
  botCount: number;
  suspiciousCount: number;
  lastScraped: string;
}

interface StatsResponse {
  sources: SourceStats[];
  totals: {
    totalSources: number;
    totalRecords: number;
    premiumCount: number;
    verifiedCount: number;
    botCount: number;
    suspiciousCount: number;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const scraperType = searchParams.get("scraperType") || "telegram";

    const supabase = getServerSupabase();

    // Try to use the view first (faster), fall back to raw query
    let sources: SourceStats[] = [];
    let usedView = false;

    // Try the aggregated view
    const { data: viewData, error: viewError } = await supabase
      .from("scraped_data_stats")
      .select("*")
      .eq("scraper_type", scraperType);

    if (!viewError && viewData && viewData.length > 0) {
      usedView = true;
      sources = viewData.map((row: {
        source_identifier: string;
        source_name: string | null;
        record_count: number;
        premium_count: number;
        verified_count: number;
        bot_count: number;
        suspicious_count: number;
        last_scraped: string;
      }) => ({
        sourceIdentifier: row.source_identifier,
        sourceName: row.source_name,
        recordCount: Number(row.record_count),
        premiumCount: Number(row.premium_count),
        verifiedCount: Number(row.verified_count),
        botCount: Number(row.bot_count),
        suspiciousCount: Number(row.suspicious_count),
        lastScraped: row.last_scraped,
      }));
    } else {
      // Fall back to raw aggregation query (slower but works without view)
      const { data, error } = await supabase.rpc("get_scraped_data_stats", {
        p_scraper_type: scraperType,
      });

      if (error) {
        // Final fallback: do a simple count query per source
        const { data: distinctSources } = await supabase
          .from("scraped_data")
          .select("source_identifier, source_name")
          .eq("scraper_type", scraperType);

        if (distinctSources) {
          const uniqueSources: Record<string, { name: string | null }> = {};
          distinctSources.forEach((s: { source_identifier: string; source_name: string | null }) => {
            if (!uniqueSources[s.source_identifier]) {
              uniqueSources[s.source_identifier] = { name: s.source_name };
            }
          });

          // Get counts for each source
          const sourceIds = Object.keys(uniqueSources);
          for (const sourceId of sourceIds) {
            const info = uniqueSources[sourceId];
            const { count } = await supabase
              .from("scraped_data")
              .select("*", { count: "exact", head: true })
              .eq("scraper_type", scraperType)
              .eq("source_identifier", sourceId);

            const { count: premiumCount } = await supabase
              .from("scraped_data")
              .select("*", { count: "exact", head: true })
              .eq("scraper_type", scraperType)
              .eq("source_identifier", sourceId)
              .eq("is_premium", true);

            sources.push({
              sourceIdentifier: sourceId,
              sourceName: info.name,
              recordCount: count || 0,
              premiumCount: premiumCount || 0,
              verifiedCount: 0,
              botCount: 0,
              suspiciousCount: 0,
              lastScraped: new Date().toISOString(),
            });
          }
        }
      } else if (data) {
        sources = data;
      }
    }

    // Calculate totals
    const totals = {
      totalSources: sources.length,
      totalRecords: sources.reduce((acc, s) => acc + s.recordCount, 0),
      premiumCount: sources.reduce((acc, s) => acc + s.premiumCount, 0),
      verifiedCount: sources.reduce((acc, s) => acc + s.verifiedCount, 0),
      botCount: sources.reduce((acc, s) => acc + s.botCount, 0),
      suspiciousCount: sources.reduce((acc, s) => acc + s.suspiciousCount, 0),
    };

    const duration = Date.now() - startTime;
    logger.info(`Stats fetched in ${duration}ms (view: ${usedView})`, { 
      scraperType, 
      sourcesCount: sources.length,
      totalRecords: totals.totalRecords,
    });

    return NextResponse.json({
      success: true,
      data: {
        sources,
        totals,
      },
      meta: {
        duration,
        usedView,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch stats", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch stats",
      },
      { status: 500 }
    );
  }
}

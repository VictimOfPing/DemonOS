/**
 * Duplicates Management API
 * Endpoints for detecting and removing duplicate records
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/client";
import { createLogger } from "@/lib/supabase/logger";
import type { ApiResponse } from "@/types/scraper";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const logger = createLogger("api/scraper/duplicates");

interface DuplicateStats {
  scraperType: string;
  totalRecords: number;
  uniqueEntities: number;
  crossSourceDuplicates: number;
  exactDuplicates: number;
  duplicatePercentage: number;
}

interface DuplicateEntity {
  entityId: string;
  scraperType: string;
  username: string | null;
  displayName: string | null;
  sourceCount: number;
  sources: string[];
  firstSeen: string;
  lastSeen: string;
  isPremium: boolean;
  isVerified: boolean;
}

interface DuplicatesResponse {
  stats: DuplicateStats[];
  duplicates?: DuplicateEntity[];
  totalDuplicateRecords: number;
  totalUniqueEntities: number;
}

interface CleanupResponse {
  deletedCount: number;
  affectedEntities: number;
  dryRun: boolean;
}

/**
 * GET /api/scraper/duplicates
 * Get duplicate statistics and optionally list duplicate entities
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<DuplicatesResponse>>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scraperType = searchParams.get("scraperType");
    const includeDetails = searchParams.get("includeDetails") === "true";
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const supabase = getServerSupabase();

    // Get duplicate statistics using raw query
    // Since we might not have the custom functions yet, use a fallback approach
    let stats: DuplicateStats[] = [];
    let duplicates: DuplicateEntity[] = [];

    // Calculate stats directly with SQL
    const statsQuery = `
      SELECT 
        scraper_type,
        COUNT(*) as total_records,
        COUNT(DISTINCT entity_id) as unique_entities,
        COUNT(*) - COUNT(DISTINCT entity_id) as potential_duplicates
      FROM scraped_data
      ${scraperType ? `WHERE scraper_type = '${scraperType}'` : ""}
      GROUP BY scraper_type
      ORDER BY potential_duplicates DESC
    `;

    const { data: statsData, error: statsError } = await supabase.rpc(
      "exec_sql",
      { sql: statsQuery }
    );

    // Check if statsError or statsData is not an array (RPC might not exist)
    const isValidArray = Array.isArray(statsData);
    
    if (statsError || !isValidArray) {
      // Fallback: query manually
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("scraped_data")
        .select("scraper_type, entity_id")
        .limit(50000);

      if (fallbackError) {
        throw new Error(`Database error: ${fallbackError.message}`);
      }

      // Calculate stats client-side
      const typeMap = new Map<
        string,
        { total: number; entities: Set<string> }
      >();

      for (const row of fallbackData || []) {
        const type = row.scraper_type;
        if (!typeMap.has(type)) {
          typeMap.set(type, { total: 0, entities: new Set() });
        }
        const entry = typeMap.get(type)!;
        entry.total++;
        entry.entities.add(row.entity_id);
      }

      stats = Array.from(typeMap.entries())
        .map(([type, data]) => ({
          scraperType: type,
          totalRecords: data.total,
          uniqueEntities: data.entities.size,
          crossSourceDuplicates: 0, // Would need more complex query
          exactDuplicates: data.total - data.entities.size,
          duplicatePercentage:
            data.total > 0
              ? Math.round(
                  ((data.total - data.entities.size) / data.total) * 100 * 100
                ) / 100
              : 0,
        }))
        .filter((s) => !scraperType || s.scraperType === scraperType);
    } else if (statsData && Array.isArray(statsData)) {
      stats = (statsData as Record<string, unknown>[]).map((row: Record<string, unknown>) => ({
        scraperType: row.scraper_type as string,
        totalRecords: Number(row.total_records),
        uniqueEntities: Number(row.unique_entities),
        crossSourceDuplicates: 0,
        exactDuplicates: Number(row.potential_duplicates),
        duplicatePercentage:
          Number(row.total_records) > 0
            ? Math.round(
                (Number(row.potential_duplicates) /
                  Number(row.total_records)) *
                  100 *
                  100
              ) / 100
            : 0,
      }));
    }

    // Get cross-source duplicates (entities appearing in multiple sources)
    if (includeDetails) {
      const crossQuery = scraperType
        ? supabase
            .from("scraped_data")
            .select(
              "entity_id, scraper_type, username, display_name, source_identifier, created_at, is_premium, is_verified"
            )
            .eq("scraper_type", scraperType)
            .order("created_at", { ascending: false })
            .limit(10000)
        : supabase
            .from("scraped_data")
            .select(
              "entity_id, scraper_type, username, display_name, source_identifier, created_at, is_premium, is_verified"
            )
            .order("created_at", { ascending: false })
            .limit(10000);

      const { data: crossData, error: crossError } = await crossQuery;

      if (!crossError && crossData) {
        // Group by entity_id to find duplicates
        const entityMap = new Map<
          string,
          {
            entityId: string;
            scraperType: string;
            username: string | null;
            displayName: string | null;
            sources: Set<string>;
            firstSeen: string;
            lastSeen: string;
            isPremium: boolean;
            isVerified: boolean;
          }
        >();

        for (const row of crossData) {
          const key = `${row.scraper_type}:${row.entity_id}`;
          if (!entityMap.has(key)) {
            entityMap.set(key, {
              entityId: row.entity_id,
              scraperType: row.scraper_type,
              username: row.username,
              displayName: row.display_name,
              sources: new Set(),
              firstSeen: row.created_at,
              lastSeen: row.created_at,
              isPremium: row.is_premium,
              isVerified: row.is_verified,
            });
          }

          const entry = entityMap.get(key)!;
          entry.sources.add(row.source_identifier);
          entry.username = entry.username || row.username;
          entry.displayName = entry.displayName || row.display_name;
          entry.isPremium = entry.isPremium || row.is_premium;
          entry.isVerified = entry.isVerified || row.is_verified;

          if (new Date(row.created_at) < new Date(entry.firstSeen)) {
            entry.firstSeen = row.created_at;
          }
          if (new Date(row.created_at) > new Date(entry.lastSeen)) {
            entry.lastSeen = row.created_at;
          }
        }

        // Filter to only entities appearing in multiple sources
        duplicates = Array.from(entityMap.values())
          .filter((e) => e.sources.size > 1)
          .map((e) => ({
            entityId: e.entityId,
            scraperType: e.scraperType,
            username: e.username,
            displayName: e.displayName,
            sourceCount: e.sources.size,
            sources: Array.from(e.sources),
            firstSeen: e.firstSeen,
            lastSeen: e.lastSeen,
            isPremium: e.isPremium,
            isVerified: e.isVerified,
          }))
          .sort((a, b) => b.sourceCount - a.sourceCount)
          .slice(0, limit);

        // Update cross-source duplicate count in stats
        const crossSourceCounts = new Map<string, number>();
        for (const dup of duplicates) {
          const current = crossSourceCounts.get(dup.scraperType) || 0;
          crossSourceCounts.set(dup.scraperType, current + 1);
        }

        stats = stats.map((s) => ({
          ...s,
          crossSourceDuplicates: crossSourceCounts.get(s.scraperType) || 0,
        }));
      }
    }

    const totalDuplicateRecords = stats.reduce(
      (acc, s) => acc + s.exactDuplicates,
      0
    );
    const totalUniqueEntities = stats.reduce(
      (acc, s) => acc + s.uniqueEntities,
      0
    );

    logger.info("Duplicate stats fetched", {
      scraperType,
      statsCount: stats.length,
      totalDuplicates: totalDuplicateRecords,
    });

    return NextResponse.json({
      success: true,
      data: {
        stats,
        duplicates: includeDetails ? duplicates : undefined,
        totalDuplicateRecords,
        totalUniqueEntities,
      },
    });
  } catch (error) {
    logger.error("Error getting duplicate stats", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get duplicates",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scraper/duplicates
 * Remove duplicate records
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<CleanupResponse>>> {
  try {
    const body = await request.json();
    const {
      scraperType,
      dryRun = true,
      mode = "exact", // "exact" or "cross-source"
    } = body;

    const supabase = getServerSupabase();

    if (mode === "exact") {
      // Remove exact duplicates (same scraper_type, source_identifier, entity_id)
      // Keep the oldest record

      // First, find duplicates
      const findQuery = `
        WITH duplicates AS (
          SELECT 
            id,
            scraper_type,
            source_identifier,
            entity_id,
            created_at,
            ROW_NUMBER() OVER (
              PARTITION BY scraper_type, source_identifier, entity_id 
              ORDER BY created_at ASC, id ASC
            ) as rn
          FROM scraped_data
          ${scraperType ? `WHERE scraper_type = '${scraperType}'` : ""}
        )
        SELECT id, scraper_type, source_identifier, entity_id
        FROM duplicates
        WHERE rn > 1
      `;

      // Count duplicates first
      let duplicatesToDelete: string[] = [];

      // Query all records and find duplicates client-side
      const { data: allData, error: queryError } = await supabase
        .from("scraped_data")
        .select("id, scraper_type, source_identifier, entity_id, created_at")
        .order("created_at", { ascending: true });

      if (queryError) {
        throw new Error(`Database error: ${queryError.message}`);
      }

      // Group by unique key and find duplicates
      const seen = new Map<string, { id: string; createdAt: string }>();
      const duplicateIds: string[] = [];

      for (const row of allData || []) {
        if (scraperType && row.scraper_type !== scraperType) continue;

        const key = `${row.scraper_type}:${row.source_identifier}:${row.entity_id}`;

        if (seen.has(key)) {
          // This is a duplicate - add to delete list
          const existing = seen.get(key)!;
          if (new Date(row.created_at) > new Date(existing.createdAt)) {
            // Current record is newer, delete it
            duplicateIds.push(row.id);
          } else {
            // Existing record is newer, delete it and keep current
            duplicateIds.push(existing.id);
            seen.set(key, { id: row.id, createdAt: row.created_at });
          }
        } else {
          seen.set(key, { id: row.id, createdAt: row.created_at });
        }
      }

      duplicatesToDelete = duplicateIds;
      const affectedEntities = new Set(
        duplicatesToDelete.map((id) => {
          const row = allData?.find((r) => r.id === id);
          return row ? row.entity_id : "";
        })
      ).size;

      if (!dryRun && duplicatesToDelete.length > 0) {
        // Delete in batches
        const BATCH_SIZE = 500;
        for (let i = 0; i < duplicatesToDelete.length; i += BATCH_SIZE) {
          const batch = duplicatesToDelete.slice(i, i + BATCH_SIZE);
          const { error: deleteError } = await supabase
            .from("scraped_data")
            .delete()
            .in("id", batch);

          if (deleteError) {
            logger.error(`Batch delete error at ${i}`, deleteError);
          }
        }

        logger.info(`Removed ${duplicatesToDelete.length} exact duplicates`, {
          scraperType,
          affectedEntities,
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          deletedCount: duplicatesToDelete.length,
          affectedEntities,
          dryRun,
        },
      });
    }

    // Mode: cross-source - just report, don't auto-delete
    // Cross-source duplicates might be intentional (same user in multiple groups)
    return NextResponse.json({
      success: true,
      data: {
        deletedCount: 0,
        affectedEntities: 0,
        dryRun: true,
      },
    });
  } catch (error) {
    logger.error("Error cleaning duplicates", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to clean duplicates",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scraper/duplicates
 * Delete specific duplicate records by IDs
 */
export async function DELETE(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ deletedCount: number }>>> {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No IDs provided for deletion",
        },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();

    // Delete in batches
    const BATCH_SIZE = 500;
    let deletedCount = 0;

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("scraped_data")
        .delete()
        .in("id", batch);

      if (error) {
        logger.error(`Batch delete error at ${i}`, error);
      } else {
        deletedCount += batch.length;
      }
    }

    logger.info(`Deleted ${deletedCount} records by ID`);

    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
      },
    });
  } catch (error) {
    logger.error("Error deleting records", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete records",
      },
      { status: 500 }
    );
  }
}

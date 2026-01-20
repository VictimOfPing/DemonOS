/**
 * useScraperMonitor Hook
 * Polls scraper status every 30 seconds and handles state changes
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const POLL_INTERVAL_MS = 30000; // 30 seconds
const ACTIVE_POLL_INTERVAL_MS = 10000; // 10 seconds when runs are active

interface RunStatus {
  runId: string;
  status: string;
  apifyStatus: string;
  itemsCount: number;
  isFinished: boolean;
  wasUpdated: boolean;
  dataSaved: boolean;
}

interface SyncResult {
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
  runs: RunStatus[];
  error?: string;
}

interface UseScraperMonitorOptions {
  /** Enable automatic polling (default: true) */
  enabled?: boolean;
  /** Polling interval in ms (default: 30000) */
  interval?: number;
  /** Use faster polling when runs are active (default: true) */
  adaptivePolling?: boolean;
  /** Auto-save data on completion (default: true) */
  autoSave?: boolean;
  /** Callback when a run completes */
  onRunComplete?: (run: RunStatus) => void;
  /** Callback when data is saved */
  onDataSaved?: (count: number) => void;
  /** Callback on sync error */
  onError?: (error: string) => void;
}

export function useScraperMonitor(options: UseScraperMonitorOptions = {}) {
  const {
    enabled = true,
    interval = POLL_INTERVAL_MS,
    adaptivePolling = true,
    autoSave = true,
    onRunComplete,
    onDataSaved,
    onError,
  } = options;

  const [isPolling, setIsPolling] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousRunsRef = useRef<Map<string, RunStatus>>(new Map());

  /** Perform a sync request */
  const sync = useCallback(async (): Promise<SyncResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/scraper/sync?autoSave=${autoSave}`);
      const result: SyncResult = await response.json();

      if (!result.success) {
        const errorMsg = result.error || "Sync failed";
        setError(errorMsg);
        onError?.(errorMsg);
        return null;
      }

      // Check for completed runs
      result.runs.forEach((run) => {
        const previousRun = previousRunsRef.current.get(run.runId);
        
        if (run.isFinished && (!previousRun || !previousRun.isFinished)) {
          onRunComplete?.(run);
        }
        
        if (run.dataSaved) {
          onDataSaved?.(run.itemsCount);
        }

        previousRunsRef.current.set(run.runId, run);
      });

      setLastSync(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Network error";
      setError(errorMsg);
      onError?.(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [autoSave, onRunComplete, onDataSaved, onError]);

  /** Force an immediate sync */
  const forceSync = useCallback(async () => {
    return sync();
  }, [sync]);

  /** Start polling */
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsPolling(true);

    // Initial sync
    sync();

    // Set up interval
    const pollFn = async () => {
      const result = await sync();
      
      // Adaptive polling: poll faster when runs are active
      if (adaptivePolling && result) {
        const hasActiveRuns = result.summary.pending > 0 || result.summary.running > 0;
        const currentInterval = hasActiveRuns ? ACTIVE_POLL_INTERVAL_MS : interval;
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = setInterval(pollFn, currentInterval);
        }
      }
    };

    intervalRef.current = setInterval(pollFn, interval);
  }, [sync, interval, adaptivePolling]);

  /** Stop polling */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Start/stop polling based on enabled flag
  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, startPolling, stopPolling]);

  // Computed values
  const hasActiveRuns = lastSync 
    ? (lastSync.summary.pending > 0 || lastSync.summary.running > 0)
    : false;

  const activeRunsCount = lastSync
    ? lastSync.summary.pending + lastSync.summary.running
    : 0;

  return {
    // State
    isPolling,
    isLoading,
    error,
    lastSync,
    
    // Computed
    hasActiveRuns,
    activeRunsCount,
    summary: lastSync?.summary ?? null,
    runs: lastSync?.runs ?? [],
    
    // Actions
    sync: forceSync,
    startPolling,
    stopPolling,
  };
}

export default useScraperMonitor;

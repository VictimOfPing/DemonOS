/**
 * API Route: POST /api/telegram/worker
 * Controls the background worker (start, stop, status)
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleWorkerCommand } from '@/lib/telegram/worker';

export async function POST(request: NextRequest) {
  try {
    const { command } = await request.json();

    if (!command || !['start', 'stop', 'status', 'process'].includes(command)) {
      return NextResponse.json(
        { error: 'Invalid command. Use: start, stop, status, or process' },
        { status: 400 }
      );
    }

    const result = await handleWorkerCommand(command);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Worker command error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute worker command' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const result = await handleWorkerCommand('status');
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Worker status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get worker status' },
      { status: 500 }
    );
  }
}

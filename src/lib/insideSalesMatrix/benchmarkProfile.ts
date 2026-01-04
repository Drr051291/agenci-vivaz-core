// Benchmark profile application logic
// Applies FPS benchmark data to tool targets

import { Targets } from './status';
import {
  FPSChannel,
  FPSSegment,
  FPSBenchmark,
  CHANNEL_FPS_BENCHMARKS,
  SEGMENT_FPS_BENCHMARKS,
} from './benchmarksFPS';

export interface BenchmarkProfile {
  leadToMql: number; // percentage
  mqlToSql: number;
  sqlToMeeting: number; // maps to sqlToOpp
  meetingToWin: number; // maps to oppToClose
  visitorToLead?: number;
}

/**
 * Get benchmark profile based on channel and/or segment selection.
 * Priority: segment > channel > default
 */
export function getBenchmarkProfile(
  fpsChannel?: FPSChannel | string,
  fpsSegment?: FPSSegment | string
): BenchmarkProfile | null {
  let benchmark: FPSBenchmark | null = null;

  // Use segment if available
  if (fpsSegment && SEGMENT_FPS_BENCHMARKS[fpsSegment as FPSSegment]) {
    benchmark = SEGMENT_FPS_BENCHMARKS[fpsSegment as FPSSegment];
  }
  // Otherwise use channel
  else if (fpsChannel && CHANNEL_FPS_BENCHMARKS[fpsChannel as FPSChannel]) {
    benchmark = CHANNEL_FPS_BENCHMARKS[fpsChannel as FPSChannel];
  }

  if (!benchmark) return null;

  return {
    visitorToLead: benchmark.visitorToLead * 100,
    leadToMql: benchmark.leadToMql * 100,
    mqlToSql: benchmark.mqlToSql * 100,
    sqlToMeeting: benchmark.sqlToOpp * 100,
    meetingToWin: benchmark.oppToClose * 100,
  };
}

/**
 * Map stage ID to benchmark profile key
 */
export function getStageFromBenchmark(stageId: string): keyof BenchmarkProfile | null {
  const mapping: Record<string, keyof BenchmarkProfile> = {
    lead_to_mql: 'leadToMql',
    mql_to_sql: 'mqlToSql',
    sql_to_meeting: 'sqlToMeeting',
    meeting_to_win: 'meetingToWin',
  };
  return mapping[stageId] || null;
}

/**
 * Apply benchmark values as targets (optional "Use Bench as Meta" action)
 */
export function applyBenchmarkAsTargets(
  currentTargets: Targets,
  profile: BenchmarkProfile
): Targets {
  const updated = { ...currentTargets };

  if (updated.leadToMql) {
    updated.leadToMql = { ...updated.leadToMql, value: profile.leadToMql };
  }
  if (updated.mqlToSql) {
    updated.mqlToSql = { ...updated.mqlToSql, value: profile.mqlToSql };
  }
  if (updated.sqlToMeeting) {
    updated.sqlToMeeting = { ...updated.sqlToMeeting, value: profile.sqlToMeeting };
  }
  if (updated.meetingToWin) {
    updated.meetingToWin = { ...updated.meetingToWin, value: profile.meetingToWin };
  }

  return updated;
}

/**
 * Get benchmark value for a specific stage
 */
export function getBenchmarkForStage(
  stageId: string,
  profile: BenchmarkProfile | null
): number | undefined {
  if (!profile) return undefined;
  const key = getStageFromBenchmark(stageId);
  return key ? profile[key] : undefined;
}

/**
 * Calculate gap vs benchmark (current - benchmark)
 */
export function calculateBenchmarkGap(
  currentRate: number | undefined,
  benchmarkRate: number | undefined
): number | undefined {
  if (currentRate === undefined || benchmarkRate === undefined) return undefined;
  return currentRate - benchmarkRate;
}

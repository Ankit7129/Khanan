import { parseNumeric } from './analysisMetrics';

const isObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const coerceTimestamp = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value * 1000;
    const fromNumber = new Date(ms);
    return Number.isNaN(fromNumber.getTime()) ? undefined : fromNumber.toISOString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const numericCandidate = Number(trimmed);
    if (Number.isFinite(numericCandidate)) {
      const ms = numericCandidate > 1e12 ? numericCandidate : numericCandidate * 1000;
      const numericDate = new Date(ms);
      if (!Number.isNaN(numericDate.getTime())) {
        return numericDate.toISOString();
      }
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }

  return undefined;
};

const getValueByPath = (source: unknown, path: string): unknown => {
  if (!isObject(source)) {
    return undefined;
  }

  return path.split('.').reduce<unknown>((acc, key) => {
    if (isObject(acc) && Object.prototype.hasOwnProperty.call(acc, key)) {
      return acc[key];
    }
    return undefined;
  }, source);
};

const coerceDurationSeconds = (value: unknown, divisor = 1): number | undefined => {
  const numeric = coerceNumber(value);
  if (numeric === undefined || divisor === 0) {
    return undefined;
  }

  const scaled = numeric / divisor;
  return Number.isFinite(scaled) && scaled >= 0 ? scaled : undefined;
};

const countTilesWithMining = (tiles: any[]): number => (
  tiles.filter((tile) => tile?.mining_detected || tile?.miningDetected).length
);

export interface CanonicalAnalysisResults {
  summary: Record<string, unknown>;
  tiles: any[];
  detections: any[];
  totalTiles: number;
  tilesProcessed: number;
  tilesWithMining: number;
  detectionCount: number;
  totalMiningArea: {
    m2: number;
    hectares: number;
    km2: number;
    [key: string]: unknown;
  };
  mergedBlocks: any;
  blockTracking: any;
  statistics: Record<string, unknown>;
  status?: string;
  [key: string]: unknown;
}

export const normalizeAnalysisResults = <T = any>(analysis: T | null | undefined): CanonicalAnalysisResults | null => {
  if (!analysis) {
    return null;
  }

  const analysisObj = analysis as Record<string, unknown>;
  const analysisAny = analysisObj as Record<string, any>;
  const nestedResults = isObject(analysisAny.results) ? analysisAny.results : null;
  const primary = nestedResults && Object.keys(nestedResults).length > 0
    ? nestedResults as Record<string, unknown>
    : analysisObj;
  const primaryAny = primary as Record<string, any>;

  const summary = {
    ...(isObject(primary.summary) ? primary.summary : {}),
    ...(isObject(analysisObj.summary) ? analysisObj.summary : {})
  } as Record<string, unknown>;

  const tiles = Array.isArray(primaryAny.tiles)
    ? [...primaryAny.tiles]
    : Array.isArray(analysisAny.tiles)
      ? [...analysisAny.tiles]
      : [];

  const detections = Array.isArray(primaryAny.detections)
    ? [...primaryAny.detections]
    : Array.isArray(analysisAny.detections)
      ? [...analysisAny.detections]
      : [];

  const totalTiles = coerceNumber(primaryAny.totalTiles)
    ?? coerceNumber(summary.total_tiles)
    ?? tiles.length;

  const tilesProcessed = coerceNumber(primaryAny.tilesProcessed)
    ?? totalTiles;

  const tilesWithMining = coerceNumber(primaryAny.tilesWithMining)
    ?? coerceNumber(summary.tiles_with_detections)
    ?? countTilesWithMining(tiles);

  const detectionCount = coerceNumber(primaryAny.detectionCount)
    ?? coerceNumber(summary.mine_block_count)
    ?? detections.length;

  const primaryArea = isObject(primaryAny.totalMiningArea)
    ? primaryAny.totalMiningArea
    : isObject(analysisAny.totalMiningArea)
      ? analysisAny.totalMiningArea
      : {};

  const miningAreaM2Candidates = [
    coerceNumber(primaryArea.m2),
    parseNumeric(primaryArea.squareMeters),
    parseNumeric(summary.mining_area_m2)
  ];

  const miningAreaM2 = miningAreaM2Candidates.find((value) => typeof value === 'number' && Number.isFinite(value)) ?? 0;

  const totalMiningArea = {
    ...(primaryArea as Record<string, unknown>),
    m2: miningAreaM2,
    hectares: coerceNumber(primaryArea.hectares) ?? (miningAreaM2 / 10_000),
    km2: coerceNumber(primaryArea.km2) ?? (miningAreaM2 / 1_000_000)
  };

  const statistics = {
    ...(isObject(primaryAny.statistics) ? primaryAny.statistics : {}),
    ...(isObject(analysisAny.statistics) ? analysisAny.statistics : {})
  } as Record<string, unknown>;

  if (statistics.avgConfidence === undefined && typeof summary.confidence === 'number') {
    statistics.avgConfidence = (summary.confidence as number) * 100;
  }
  if (statistics.coveragePercentage === undefined && typeof summary.mining_percentage === 'number') {
    statistics.coveragePercentage = summary.mining_percentage;
  }

  const mergedBlocks = primaryAny.mergedBlocks
    ?? analysisAny.mergedBlocks
    ?? analysisAny.merged_blocks
    ?? null;

  const blockTracking = primaryAny.blockTracking
    ?? analysisAny.blockTracking
    ?? null;

  const status = primaryAny.status
    ?? analysisAny.status
    ?? undefined;

  const candidateSources = [
    primaryAny,
    analysisAny,
    isObject(primaryAny.metadata) ? primaryAny.metadata : undefined,
    isObject(analysisAny.metadata) ? analysisAny.metadata : undefined,
    isObject(primaryAny.summary) ? primaryAny.summary : undefined,
    isObject(analysisAny.summary) ? analysisAny.summary : undefined,
    isObject(primaryAny.statistics) ? primaryAny.statistics : undefined,
    isObject(analysisAny.statistics) ? analysisAny.statistics : undefined
  ].filter((source): source is Record<string, unknown> => isObject(source));

  const findTimestamp = (paths: string[]): string | undefined => {
    for (const path of paths) {
      for (const source of candidateSources) {
        const value = getValueByPath(source, path);
        const timestamp = coerceTimestamp(value);
        if (timestamp) {
          return timestamp;
        }
      }
    }
    return undefined;
  };

  const rawCreatedAt = findTimestamp([
    'createdAt',
    'created_at'
  ]);

  const rawCompletedAt = findTimestamp([
    'completedAt',
    'completed_at',
    'finishedAt',
    'finished_at'
  ]);

  const derivedStartTime = findTimestamp([
    'startTime',
    'start_time',
    'startedAt',
    'started_at',
    'analysisStart',
    'analysis_start',
    'analysisStartedAt',
    'analysis_started_at',
    'timeline.start',
    'timeline.startedAt',
    'timeline.started_at',
    'timing.startTime',
    'timing.start_time',
    'timing.startedAt',
    'timing.started_at',
    'runtime.start',
    'runtime.startedAt'
  ]) || rawCreatedAt;

  const derivedEndTime = findTimestamp([
    'endTime',
    'end_time',
    'completedAt',
    'completed_at',
    'finishedAt',
    'finished_at',
    'analysisCompletedAt',
    'analysis_completed_at',
    'timeline.end',
    'timeline.completedAt',
    'timeline.completed_at',
    'timing.endTime',
    'timing.end_time',
    'timing.completedAt',
    'timing.completed_at',
    'runtime.end'
  ]) || rawCompletedAt;

  const durationCandidates: Array<number | undefined> = [
    coerceDurationSeconds(primaryAny.durationSeconds),
    coerceDurationSeconds(primaryAny.duration),
    coerceDurationSeconds(primaryAny.runtimeSeconds),
    coerceDurationSeconds(primaryAny.processingTimeSeconds),
    coerceDurationSeconds(primaryAny.runtimeMs, 1000),
    coerceDurationSeconds(primaryAny.runtime_ms, 1000),
    coerceDurationSeconds(primaryAny.processingTimeMs, 1000),
    coerceDurationSeconds(primaryAny.processing_time_ms, 1000),
    coerceDurationSeconds(primaryAny.durationMs, 1000),
    coerceDurationSeconds(primaryAny.duration_ms, 1000),
    coerceDurationSeconds(analysisAny.durationSeconds),
    coerceDurationSeconds(analysisAny.duration),
    coerceDurationSeconds(analysisAny.runtimeSeconds),
    coerceDurationSeconds(analysisAny.processingTimeSeconds),
    coerceDurationSeconds(analysisAny.runtimeMs, 1000),
    coerceDurationSeconds(analysisAny.runtime_ms, 1000),
    coerceDurationSeconds(analysisAny.processingTimeMs, 1000),
    coerceDurationSeconds(analysisAny.processing_time_ms, 1000),
    coerceDurationSeconds(summary['durationSeconds']),
    coerceDurationSeconds(summary['duration_seconds']),
    coerceDurationSeconds(summary['runtimeSeconds']),
    coerceDurationSeconds(summary['runtime_seconds']),
    coerceDurationSeconds(summary['runtimeMs'], 1000),
    coerceDurationSeconds(summary['runtime_ms'], 1000),
    coerceDurationSeconds(statistics['durationSeconds']),
    coerceDurationSeconds(statistics['duration_seconds']),
    coerceDurationSeconds(statistics['runtimeSeconds']),
    coerceDurationSeconds(statistics['runtime_seconds']),
    coerceDurationSeconds(statistics['runtimeMs'], 1000),
    coerceDurationSeconds(statistics['runtime_ms'], 1000),
    coerceDurationSeconds(statistics['processingTimeSeconds']),
    coerceDurationSeconds(statistics['processing_time_seconds']),
    coerceDurationSeconds(statistics['processingTimeMs'], 1000),
    coerceDurationSeconds(statistics['processing_time_ms'], 1000)
  ];

  let durationSeconds = durationCandidates.find((candidate) => candidate !== undefined);

  if (!durationSeconds && derivedStartTime && derivedEndTime) {
    const diffSeconds = (new Date(derivedEndTime).getTime() - new Date(derivedStartTime).getTime()) / 1000;
    if (Number.isFinite(diffSeconds) && diffSeconds >= 0) {
      durationSeconds = diffSeconds;
    }
  }

  const roundedDuration = durationSeconds !== undefined ? Math.round(durationSeconds) : undefined;

  const baseResults = { ...(primaryAny as Record<string, unknown>) };

  const assignIfMissing = (key: string, value: unknown) => {
    if (value !== undefined && value !== null && baseResults[key] === undefined) {
      baseResults[key] = value;
    }
  };

  assignIfMissing('startTime', derivedStartTime);
  assignIfMissing('start_time', derivedStartTime);
  assignIfMissing('startedAt', derivedStartTime);
  assignIfMissing('started_at', derivedStartTime);
  assignIfMissing('createdAt', rawCreatedAt ?? derivedStartTime);
  assignIfMissing('created_at', rawCreatedAt ?? derivedStartTime);
  assignIfMissing('endTime', derivedEndTime);
  assignIfMissing('end_time', derivedEndTime);
  assignIfMissing('completedAt', rawCompletedAt ?? derivedEndTime);
  assignIfMissing('completed_at', rawCompletedAt ?? derivedEndTime);
  assignIfMissing('finishedAt', derivedEndTime);
  assignIfMissing('finished_at', derivedEndTime);
  assignIfMissing('durationSeconds', roundedDuration);
  assignIfMissing('duration_seconds', roundedDuration);
  assignIfMissing('duration', roundedDuration);
  assignIfMissing('runtimeSeconds', roundedDuration);
  assignIfMissing('runtime_seconds', roundedDuration);

  return {
    ...baseResults,
    status,
    summary,
    tiles,
    detections,
    totalTiles,
    tilesProcessed,
    tilesWithMining,
    detectionCount,
    totalMiningArea,
    mergedBlocks,
    blockTracking,
    statistics
  } as CanonicalAnalysisResults;
};

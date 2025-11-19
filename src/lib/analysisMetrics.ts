import { TileData } from '@/types/geoanalyst';

const SENTINEL_RESOLUTION_METERS = 10;
const AREA_PER_PIXEL_M2 = SENTINEL_RESOLUTION_METERS * SENTINEL_RESOLUTION_METERS;

export const parseNumeric = (value: unknown): number | undefined => {
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

export const clampPercent = (value: number): number => Math.max(0, Math.min(100, value));

const getBlockAreaM2 = (block: any): number => {
  const props = block?.properties ?? block ?? {};

  const areaM2 = parseNumeric(props.area_m2 ?? props.areaM2);
  if (areaM2 !== undefined) {
    return areaM2;
  }

  const areaHa = parseNumeric(props.area_ha ?? props.areaHa);
  if (areaHa !== undefined) {
    return areaHa * 10_000;
  }

  const areaPixels = parseNumeric(props.area_px ?? props.areaPx);
  if (areaPixels !== undefined) {
    return areaPixels * AREA_PER_PIXEL_M2;
  }

  return 0;
};

const isMosaicTile = (tile: Partial<TileData> & { status?: string; tile_id?: string; tileId?: string }): boolean => {
  const id = (tile.tile_id ?? (tile as any).tileId ?? '').toString().toLowerCase();
  const status = (tile.status ?? '').toString().toLowerCase();
  return id === 'mosaic' || status === 'mosaic';
};

const getTileAreaM2 = (tile: TileData & { total_area_m2?: unknown; totalAreaM2?: unknown; mask_shape?: [number, number]; mine_blocks?: any[]; mineBlocks?: any[]; }): number => {
  const directArea = parseNumeric((tile as any).total_area_m2 ?? (tile as any).totalAreaM2);
  if (directArea !== undefined && directArea > 0) {
    return directArea;
  }

  const maskShape = Array.isArray(tile.mask_shape) && tile.mask_shape.length >= 2
    ? tile.mask_shape
    : Array.isArray((tile as any).mask_shape) && (tile as any).mask_shape.length >= 2
      ? (tile as any).mask_shape
      : null;

  if (maskShape) {
    const height = Number(maskShape[0]);
    const width = Number(maskShape[1]);
    if (Number.isFinite(height) && Number.isFinite(width) && height > 0 && width > 0) {
      return height * width * AREA_PER_PIXEL_M2;
    }
  }

  return 0;
};

const getTileMiningAreaM2 = (
  tile: TileData & { mine_blocks?: any[]; mineBlocks?: any[]; total_area_m2?: unknown; mining_percentage?: unknown; miningPercentage?: unknown; },
  tileAreaOverride?: number,
): number => {
  const blocks = Array.isArray(tile.mine_blocks)
    ? tile.mine_blocks
    : Array.isArray((tile as any).mineBlocks)
      ? (tile as any).mineBlocks
      : [];

  const effectiveTileArea = tileAreaOverride ?? getTileAreaM2(tile as any);

  if (blocks.length > 0) {
    const seenBlockIds = new Set<string>();
    const totalBlockArea = blocks.reduce((sum: number, block: any, index: number) => {
      const area = getBlockAreaM2(block);
      if (!Number.isFinite(area) || area <= 0) {
        return sum;
      }

      const props = block?.properties ?? block ?? {};
      const rawId = props.block_id ?? props.id ?? props.tile_block_id ?? null;
      const normalizedId = rawId !== null && rawId !== undefined
        ? `id:${String(rawId)}`
        : `idx:${index}`;

      if (seenBlockIds.has(normalizedId)) {
        return sum;
      }

      seenBlockIds.add(normalizedId);
      return sum + area;
    }, 0);

    if (effectiveTileArea > 0) {
      return Math.min(totalBlockArea, effectiveTileArea);
    }

    return totalBlockArea;
  }

  const rawPercentage = parseNumeric((tile as any).mining_percentage ?? (tile as any).miningPercentage);
  if (effectiveTileArea > 0 && rawPercentage !== undefined) {
    const fraction = rawPercentage > 1 ? rawPercentage / 100 : rawPercentage;
    if (fraction >= 0) {
      const boundedFraction = Math.min(fraction, 1);
      return effectiveTileArea * boundedFraction;
    }
  }

  return 0;
};

export interface TileAreaMetrics {
  totalTileAreaM2: number;
  totalMiningAreaM2: number;
  coveragePct: number | null;
}

export const deriveTileAreaMetrics = (tiles: TileData[] | undefined | null): TileAreaMetrics => {
  if (!tiles || tiles.length === 0) {
    return {
      totalTileAreaM2: 0,
      totalMiningAreaM2: 0,
      coveragePct: null,
    };
  }

  const nonMosaicTiles = tiles.filter(tile => !isMosaicTile(tile as any));
  const candidateTiles = nonMosaicTiles.length > 0 ? nonMosaicTiles : tiles;

  let totalTileAreaM2 = 0;
  let totalMiningAreaM2 = 0;

  candidateTiles.forEach((tile) => {
    const tileArea = getTileAreaM2(tile as any);
    if (!(tileArea > 0)) {
      return;
    }

    totalTileAreaM2 += tileArea;

    const miningArea = getTileMiningAreaM2(tile as any, tileArea);
    if (miningArea > 0) {
      totalMiningAreaM2 += Math.min(miningArea, tileArea);
    }
  });

  const coveragePct = totalTileAreaM2 > 0
    ? Math.min((totalMiningAreaM2 / totalTileAreaM2) * 100, 100)
    : null;

  return {
    totalTileAreaM2,
    totalMiningAreaM2,
    coveragePct,
  };
};

export const formatHectares = (areaM2: number | null | undefined, fractionDigits = 2): string => {
  if (areaM2 === undefined || areaM2 === null || Number.isNaN(areaM2)) {
    return '--';
  }

  const hectares = areaM2 / 10_000;
  return hectares.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

export const formatPercent = (value: number | null | undefined, fractionDigits = 2): string => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '--';
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const normalizeConfidenceValueInternal = (value: unknown): number | null => {
  const numeric = parseNumeric(value);
  if (numeric === undefined) {
    return null;
  }

  const percent = numeric > 1 ? numeric : numeric * 100;
  if (!Number.isFinite(percent)) {
    return null;
  }

  return clampPercent(percent);
};

const collectBlockConfidenceSamples = (results: any): number[] => {
  if (!results) {
    return [];
  }

  const samples: number[] = [];
  const seenKeys = new Set<string>();

  const registerSample = (identifier: unknown, fallbackPrefix: string, fallbackIndex: number, rawValue: unknown) => {
    const normalized = normalizeConfidenceValueInternal(rawValue);
    if (normalized === null) {
      return;
    }

    const key = identifier !== undefined && identifier !== null && identifier !== ''
      ? `id:${String(identifier).toLowerCase()}`
      : `${fallbackPrefix}:${fallbackIndex}`;

    if (seenKeys.has(key)) {
      return;
    }

    seenKeys.add(key);
    samples.push(normalized);
  };

  const blockTrackingBlocks = results.blockTracking?.blocks
    ?? results.block_tracking?.blocks
    ?? results.trackedBlocks
    ?? results.tracked_blocks;

  if (Array.isArray(blockTrackingBlocks)) {
    blockTrackingBlocks.forEach((block: any, index: number) => {
      registerSample(
        block.persistentId ?? block.persistent_id ?? block.blockId ?? block.block_id,
        'tracked',
        index,
        block.avgConfidence ?? block.avg_confidence ?? block.confidence,
      );
    });
  }

  const mergedCollection = results.mergedBlocks
    ?? results.merged_blocks
    ?? results.merged_block_collection
    ?? results.mergedBlockGeoJson;

  const mergedFeatures = Array.isArray(mergedCollection?.features)
    ? mergedCollection.features
    : Array.isArray(mergedCollection)
      ? mergedCollection
      : [];

  mergedFeatures.forEach((feature: any, index: number) => {
    const props = feature?.properties ?? feature ?? {};
    registerSample(
      props.persistent_id ?? props.persistentId ?? props.block_id ?? props.id,
      'merged',
      index,
      props.avg_confidence ?? props.confidence ?? props.mean_confidence,
    );
  });

  const tiles = Array.isArray(results.tiles) ? results.tiles : [];
  tiles.forEach((tile: any, tileIdx: number) => {
    const tileBlocks = Array.isArray(tile.mine_blocks)
      ? tile.mine_blocks
      : Array.isArray(tile.blocks)
        ? tile.blocks
        : [];

    tileBlocks.forEach((block: any, blockIdx: number) => {
      const props = block?.properties ?? block ?? {};
      const identifier = props.persistent_id
        ?? props.persistentId
        ?? props.block_id
        ?? props.blockId
        ?? (tile.tile_id ?? tile.tileId ? `${tile.tile_id ?? tile.tileId}-${blockIdx}` : null);

      registerSample(
        identifier,
        `tile-${tileIdx}`,
        blockIdx,
        props.avg_confidence ?? props.confidence ?? props.mean_confidence,
      );
    });
  });

  return samples;
};

export interface ConfidenceMetrics {
  averagePct: number | null;
  maxPct: number | null;
  minPct: number | null;
  sampleCount: number;
  source: 'samples' | 'summary';
}

const resolveSummaryConfidenceFallback = (results: any): number | null => {
  if (!results) {
    return null;
  }

  const summary = results.summary ?? {};
  const statistics = results.statistics
    ?? results.summary_statistics
    ?? results.stats
    ?? {};

  return normalizeConfidenceValueInternal(summary.confidence)
    ?? normalizeConfidenceValueInternal((statistics as Record<string, unknown>)?.['avgConfidence'])
    ?? normalizeConfidenceValueInternal((statistics as Record<string, unknown>)?.['averageConfidence'])
    ?? normalizeConfidenceValueInternal((statistics as Record<string, unknown>)?.['confidence']);
};

export const deriveConfidenceMetrics = (results: any): ConfidenceMetrics => {
  const samples = collectBlockConfidenceSamples(results);

  if (samples.length > 0) {
    const sum = samples.reduce((acc, value) => acc + value, 0);
    return {
      averagePct: sum / samples.length,
      maxPct: Math.max(...samples),
      minPct: Math.min(...samples),
      sampleCount: samples.length,
      source: 'samples',
    };
  }

  const fallback = resolveSummaryConfidenceFallback(results);

  return {
    averagePct: fallback,
    maxPct: fallback,
    minPct: fallback,
    sampleCount: fallback !== null ? 1 : 0,
    source: 'summary',
  };
};

export const normalizeConfidenceValue = (value: unknown): number | null => normalizeConfidenceValueInternal(value);

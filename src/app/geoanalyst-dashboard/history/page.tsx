'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Cancel,
  CheckCircle,
  ContentCopy,
  DeleteSweep,
  Error as ErrorIcon,
  HourglassEmpty,
  OpenInNew,
  Search
} from '@mui/icons-material';
import { format } from 'date-fns';
import MineBlockTable from '@/components/geoanalyst/MineBlockTable';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  bulkDeleteAnalyses,
  deleteAnalysis,
  getAnalysisById,
  getAnalysisHistory,
  getAnalysisStats,
  updateAnalysis,
  type AnalysisHistoryRecord,
  type HistoryListParams,
  type HistoryStats
} from '@/services/historyService';
import {
  deriveTileAreaMetrics,
  deriveConfidenceMetrics,
  normalizeConfidenceValue,
} from '@/lib/analysisMetrics';
import { normalizeAnalysisResults } from '@/lib/normalizeAnalysisResults';

const DEFAULT_ROWS_PER_PAGE = 10;

type StatusFilter = 'all' | 'processing' | 'completed' | 'failed' | 'cancelled';

type MineBlockSource = 'Merged' | 'Tile';

interface DerivedSummary {
  totalTiles: number;
  tilesWithDetections: number;
  detectionCount: number;
  coveragePct?: number | null;
  avgConfidencePct?: number | null;
  maxConfidencePct?: number | null;
  minConfidencePct?: number | null;
  confidenceSource?: 'samples' | 'summary';
  miningAreaHa?: number | null;
  miningAreaKm2?: number | null;
}

interface MineBlockRow {
  id: string;
  label: string;
  tileId?: string;
  areaHa: number;
  confidencePct?: number | null;
  source: MineBlockSource;
  isMerged?: boolean;
  persistentId?: string;
  blockIndex?: number;
  centroidLat?: number;
  centroidLon?: number;
  bounds?: [number, number, number, number];
}

const parseNumeric = (value: unknown): number | undefined => {
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

const formatDecimal = (value: number | null | undefined, fractionDigits = 2): string => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '--';
  }

  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
};

const toPercentString = (value: number | null | undefined, fractionDigits = 1): string => {
  const normalized = normalizeConfidenceValue(value);
  if (normalized === null) {
    return '--';
  }

  return `${formatDecimal(normalized, fractionDigits)}%`;
};

const formatDuration = (seconds?: number | string | null): string => {
  if (seconds === undefined || seconds === null) {
    return 'N/A';
  }

  const totalSeconds = typeof seconds === 'string' ? Number.parseInt(seconds, 10) : seconds;
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return 'N/A';
  }

  if (totalSeconds === 0) {
    return '0s';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = Math.floor(totalSeconds % 60);

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(`${remainingSeconds}s`);
  }

  return parts.join(' ');
};

const formatAverageDuration = (seconds?: number | null): string => {
  if (seconds === undefined || seconds === null || !Number.isFinite(seconds)) {
    return '--';
  }

  if (seconds <= 0) {
    return '0.00 min';
  }

  const minutes = seconds / 60;
  return `${formatDecimal(minutes, 2)} min`;
};


const extractSummary = (analysis: AnalysisHistoryRecord | null): DerivedSummary | null => {
  if (!analysis?.results) {
    return null;
  }

  const results = normalizeAnalysisResults(analysis.results);
  if (!results) {
    return null;
  }

  const summary = (results.summary ?? {}) as Record<string, unknown>;
  const statistics = (results.statistics ?? {}) as Record<string, unknown>;
  const tiles = Array.isArray(results.tiles) ? results.tiles : [];
  const tileMetrics = deriveTileAreaMetrics(tiles);

  const detectionCount = results.detectionCount
    ?? results.detections?.length
    ?? 0;

  const totalTiles = results.totalTiles ?? tiles.length;

  const tilesWithDetections = results.tilesWithMining
    ?? tiles.filter((tile: any) => tile?.mining_detected || tile?.miningDetected).length;

  const coverageCandidate = (() => {
    const fromStats = parseNumeric(statistics['coveragePercentage'])
      ?? parseNumeric(statistics['coverage_percentage']);
    if (typeof fromStats === 'number') {
      return fromStats;
    }
    return parseNumeric(summary.mining_percentage);
  })();

  const coveragePct = tileMetrics.coveragePct
    ?? (coverageCandidate !== undefined
      ? (coverageCandidate > 1 ? coverageCandidate : coverageCandidate * 100)
      : null);

  const miningAreaM2 = tileMetrics.totalMiningAreaM2 > 0
    ? tileMetrics.totalMiningAreaM2
    : results.totalMiningArea?.m2 ?? parseNumeric(summary.mining_area_m2) ?? null;

  const miningAreaHa = typeof miningAreaM2 === 'number' ? miningAreaM2 / 10_000 : null;
  const miningAreaKm2 = typeof miningAreaM2 === 'number' ? miningAreaM2 / 1_000_000 : null;

  const confidenceMetrics = deriveConfidenceMetrics(results);

  return {
    totalTiles,
    tilesWithDetections,
    detectionCount,
    coveragePct,
    avgConfidencePct: confidenceMetrics.averagePct,
    maxConfidencePct: confidenceMetrics.maxPct,
    minConfidencePct: confidenceMetrics.minPct,
    miningAreaHa,
    miningAreaKm2,
    confidenceSource: confidenceMetrics.source,
  };
};

const buildMineBlockRows = (analysis: AnalysisHistoryRecord | null): MineBlockRow[] => {
  if (!analysis?.results) {
    return [];
  }

  const results = normalizeAnalysisResults(analysis.results);
  if (!results) {
    return [];
  }

  const rowsMap = new Map<string, MineBlockRow>();

  const registerRow = (row: MineBlockRow) => {
    const key = row.id || `${row.source}-${row.label}`;
    const existing = rowsMap.get(key);
    if (existing) {
      rowsMap.set(key, {
        ...existing,
        ...row,
        areaHa: row.areaHa ?? existing.areaHa,
        confidencePct: row.confidencePct ?? existing.confidencePct,
        tileId: row.tileId ?? existing.tileId,
        persistentId: row.persistentId ?? existing.persistentId,
        blockIndex: row.blockIndex ?? existing.blockIndex,
        centroidLat: row.centroidLat ?? existing.centroidLat,
        centroidLon: row.centroidLon ?? existing.centroidLon,
        bounds: row.bounds ?? existing.bounds,
        source: existing.source === 'Merged' || row.source === 'Merged' ? 'Merged' : existing.source,
        isMerged: existing.isMerged || row.isMerged
      });
      return;
    }

    rowsMap.set(key, row);
  };

  const blockTrackingBlocks = Array.isArray(results.blockTracking?.blocks)
    ? results.blockTracking.blocks
    : [];

  blockTrackingBlocks.forEach((block: any, index: number) => {
    const fallbackId = `tracked-${index}`;
    const rowId = block.persistentId
      ?? block.persistent_id
      ?? block.blockId
      ?? block.block_id
      ?? fallbackId;

    const centroidArray = Array.isArray(block.centroid)
      ? block.centroid
      : Array.isArray(block.label_position)
        ? block.label_position
        : undefined;

    const boundsArray = Array.isArray(block.bounds) && block.bounds.length === 4
      ? block.bounds.map((value: any) => Number(value)) as [number, number, number, number]
      : undefined;

    const areaHa = (() => {
      if (typeof block.areaHa === 'number') {
        return block.areaHa;
      }
      const areaM2 = parseNumeric(block.areaM2 ?? block.area_m2);
      if (areaM2 !== undefined) {
        return areaM2 / 10_000;
      }
      return 0;
    })();

    registerRow({
      id: String(rowId),
      label: block.name || block.label || block.blockId || block.block_id || `Block ${index + 1}`,
      tileId: block.tileId || block.tile_id || undefined,
      areaHa,
      confidencePct: normalizeConfidenceValue(block.avgConfidence ?? block.avg_confidence ?? block.confidence),
      source: 'Tile',
      persistentId: block.persistentId || block.persistent_id || undefined,
      blockIndex: typeof block.sequence === 'number' ? block.sequence : block.block_index,
      centroidLat: parseNumeric(centroidArray?.[1]),
      centroidLon: parseNumeric(centroidArray?.[0]),
      bounds: boundsArray,
      isMerged: Boolean(block.isMerged ?? block.is_merged)
    });
  });

  const mergedFeatures = Array.isArray(results.mergedBlocks?.features)
    ? results.mergedBlocks.features
    : [];

  mergedFeatures.forEach((feature: any, index: number) => {
    const props = feature?.properties ?? feature ?? {};
    const rowId = props.persistent_id
      ?? props.persistentId
      ?? props.block_id
      ?? props.id
      ?? `merged-${index}`;

    const boundsArray = Array.isArray(props.bbox) && props.bbox.length === 4
      ? props.bbox.map((value: any) => Number(value)) as [number, number, number, number]
      : undefined;

    const centroidArray = Array.isArray(props.label_position)
      ? props.label_position
      : Array.isArray(props.centroid)
        ? props.centroid
        : undefined;

    const areaHa = (() => {
      const directHa = parseNumeric(props.area_ha ?? props.areaHa);
      if (directHa !== undefined) {
        return directHa;
      }
      const areaM2 = parseNumeric(props.area_m2 ?? props.areaM2);
      if (areaM2 !== undefined) {
        return areaM2 / 10_000;
      }
      return 0;
    })();

    registerRow({
      id: `merged-${rowId}`,
      label: props.name || props.block_id || `Merged Block ${index + 1}`,
      tileId: props.tile_id ? String(props.tile_id) : undefined,
      areaHa,
      confidencePct: normalizeConfidenceValue(props.avg_confidence ?? props.confidence ?? props.mean_confidence),
      source: 'Merged',
      isMerged: true,
      persistentId: props.persistent_id || props.persistentId || undefined,
      blockIndex: props.block_index ?? props.index,
      centroidLat: parseNumeric(centroidArray?.[1] ?? props.centroid_lat),
      centroidLon: parseNumeric(centroidArray?.[0] ?? props.centroid_lon),
      bounds: boundsArray
    });
  });

  const tiles = Array.isArray(results.tiles) ? results.tiles : [];

  tiles.forEach((tile: any, tileIdx: number) => {
    const tileBlocks = Array.isArray(tile.mine_blocks) ? tile.mine_blocks : [];
    if (!tileBlocks.length) {
      return;
    }

    const tileLabel = tile.tile_label
      ?? tile.tileLabel
      ?? tile.tile_id
      ?? tile.tileId
      ?? (typeof tile.tile_index === 'number' ? `tile_${tile.tile_index}` : `Tile ${tileIdx + 1}`);

    const displayTileId = tile.tile_id ?? tile.tileId ?? tileLabel;

    tileBlocks.forEach((block: any, blockIdx: number) => {
      const props = block?.properties ?? block ?? {};
      const rowId = props.persistent_id
        ?? props.persistentId
        ?? props.block_id
        ?? props.blockId
        ?? `${displayTileId}-block-${blockIdx + 1}`;

      const centroidArray = Array.isArray(props.label_position)
        ? props.label_position
        : Array.isArray(props.centroid)
          ? props.centroid
          : undefined;

      const boundsArray = Array.isArray(props.bbox) && props.bbox.length === 4
        ? props.bbox.map((value: any) => Number(value)) as [number, number, number, number]
        : undefined;

      const areaHa = (() => {
        const directHa = parseNumeric(props.area_ha ?? props.areaHa);
        if (directHa !== undefined) {
          return directHa;
        }
        const areaM2 = parseNumeric(props.area_m2 ?? props.areaM2);
        if (areaM2 !== undefined) {
          return areaM2 / 10_000;
        }
        return 0;
      })();

      registerRow({
        id: `tile-${rowId}`,
        label: props.name || `${tileLabel} · Block ${blockIdx + 1}`,
        tileId: String(displayTileId),
        areaHa,
        confidencePct: normalizeConfidenceValue(props.avg_confidence ?? props.confidence ?? props.mean_confidence),
        source: 'Tile',
        isMerged: Boolean(props.is_merged),
        persistentId: props.persistent_id || props.persistentId || undefined,
        blockIndex: props.block_index ?? props.index,
        centroidLat: parseNumeric(centroidArray?.[1]),
        centroidLon: parseNumeric(centroidArray?.[0]),
        bounds: boundsArray
      });
    });
  });

  const rows = Array.from(rowsMap.values());
  rows.sort((a, b) => {
    if (a.blockIndex !== undefined && b.blockIndex !== undefined) {
      return a.blockIndex - b.blockIndex;
    }
    if (a.source !== b.source) {
      return a.source === 'Merged' ? -1 : 1;
    }
    return (b.areaHa ?? 0) - (a.areaHa ?? 0);
  });
  return rows;
};

const AnalysisHistoryPage: React.FC = () => {
  const [analyses, setAnalyses] = useState<AnalysisHistoryRecord[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<HistoryListParams['sortBy']>('startTime');
  const [sortOrder] = useState<HistoryListParams['sortOrder']>('desc');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisHistoryRecord | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    let ignore = false;

    const fetchStats = async () => {
      try {
        const response = await getAnalysisStats();
        if (!ignore) {
          setStats(response);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load analysis stats', err);
        }
      }
    };

    fetchStats();

    return () => {
      ignore = true;
    };
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setLoading(false);
      return;
    }

    let ignore = false;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const params: HistoryListParams = {
          page: page + 1,
          limit: rowsPerPage,
          sortBy,
          sortOrder
        };

        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        if (searchQuery.trim().length > 0) {
          params.search = searchQuery.trim();
        }

        const rawResponse: any = await getAnalysisHistory(params);
        const analysesList: AnalysisHistoryRecord[] = Array.isArray(rawResponse.analyses)
          ? rawResponse.analyses
          : Array.isArray(rawResponse.items)
            ? rawResponse.items
            : [];
        const total = rawResponse.pagination?.total
          ?? rawResponse.total
          ?? analysesList.length;

        if (ignore) {
          return;
        }

        if (!analysesList.length && total > 0 && page > 0) {
          setPage(0);
          return;
        }

        setAnalyses(analysesList);
        setTotalCount(total);
        setSelectedIds((prev) => {
          const next = new Set<string>();
          prev.forEach((id) => {
            if (analysesList.some((analysis) => analysis.analysisId === id)) {
              next.add(id);
            }
          });
          return next;
        });
      } catch (err) {
        if (ignore) {
          return;
        }

        const message = err instanceof Error ? err.message : 'Failed to load analysis history';
        setError(message);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      ignore = true;
    };
  }, [page, rowsPerPage, searchQuery, statusFilter, sortBy, sortOrder, authLoading, isAuthenticated]);

  const selectedSummary = useMemo(() => extractSummary(selectedAnalysis), [selectedAnalysis]);
  const mineBlockRows = useMemo(() => buildMineBlockRows(selectedAnalysis), [selectedAnalysis]);
  const selectedResults: any = selectedAnalysis?.results ?? null;
  const blockTrackingSummary = selectedResults?.blockTracking?.summary
    ?? selectedResults?.block_tracking?.summary
    ?? null;

  const handleCopyAnalysisId = async (analysisId: string) => {
    try {
      if (!navigator?.clipboard) {
        throw new Error('Clipboard API not available');
      }
      await navigator.clipboard.writeText(analysisId);
      setCopiedId(analysisId);
      window.setTimeout(() => {
        setCopiedId((current) => (current === analysisId ? null : current));
      }, 1500);
    } catch (err) {
      console.error('Failed to copy analysis ID', err);
    }
  };

  const handleOpenResults = (analysisId: string) => {
    setViewDialogOpen(false);
    router.push(`/geoanalyst-dashboard/results?id=${analysisId}`);
  };

  const handleViewDetails = async (analysisId: string) => {
    try {
      let retries = 0;
      const maxRetries = 3;

      const fetchWithRetry = async (): Promise<AnalysisHistoryRecord> => {
        try {
          return await getAnalysisById(analysisId, false);
        } catch (err: any) {
          const status = err?.response?.status;
          if ((status === 429 || status === 503) && retries < maxRetries) {
            retries += 1;
            const delayMs = Math.pow(2, retries) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            return fetchWithRetry();
          }
          throw err;
        }
      };

      const details = await fetchWithRetry();
      setSelectedAnalysis(details);
      setViewDialogOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load analysis details';
      setError(message);
    }
  };

  const handleEdit = (analysis: AnalysisHistoryRecord) => {
    setSelectedAnalysis(analysis);
    setEditNotes(analysis.userNotes || '');
    setEditTags(analysis.tags?.join(', ') || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedAnalysis) {
      return;
    }

    try {
      const tags = editTags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      await updateAnalysis(selectedAnalysis.analysisId, {
        userNotes: editNotes,
        tags
      });

      setEditDialogOpen(false);
      setSelectedAnalysis(null);
      setEditNotes('');
      setEditTags('');
      setPage(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update analysis';
      setError(message);
    }
  };

  const handleDelete = (analysis: AnalysisHistoryRecord) => {
    setSelectedAnalysis(analysis);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedAnalysis) {
      return;
    }

    try {
      const targetId = selectedAnalysis.analysisId;
      const { notFound } = await deleteAnalysis(targetId);
      setDeleteDialogOpen(false);
      setSelectedAnalysis(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
      setAnalyses((prev) => prev.filter((analysis) => analysis.analysisId !== targetId));
      setTotalCount((prev) => Math.max(0, prev - 1));

      if (analyses.length <= 1 && page > 0) {
        setPage((current) => Math.max(0, current - 1));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete analysis';
      setError(message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    try {
      await bulkDeleteAnalyses(Array.from(selectedIds));
      setSelectedIds(new Set());
      setPage(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete analyses';
      setError(message);
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedIds(new Set(analyses.map((analysis) => analysis.analysisId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (analysisId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(analysisId)) {
        next.delete(analysisId);
      } else {
        next.add(analysisId);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle sx={{ color: 'success.main', fontSize: 16 }} />;
      case 'failed':
        return <ErrorIcon sx={{ color: 'error.main', fontSize: 16 }} />;
      case 'processing':
        return <HourglassEmpty sx={{ color: 'warning.main', fontSize: 16 }} />;
      case 'cancelled':
        return <Cancel sx={{ color: 'text.disabled', fontSize: 16 }} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'processing':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Analysis History
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Review completed analyses, copy identifiers, and revisit detailed results.
        </Typography>
      </Box>

      {stats && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Analyses
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {stats.totalAnalyses}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {stats.completedAnalyses}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Detections
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {stats.totalDetections}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Avg. Duration
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {formatAverageDuration(stats.averageDuration)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                mean runtime (minutes)
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by analysis ID, notes, or tags"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              )
            }}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                setPage(0);
              }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Sort By</InputLabel>
            <Select
              label="Sort By"
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as HistoryListParams['sortBy']);
                setPage(0);
              }}
            >
              <MenuItem value="startTime">Date</MenuItem>
              <MenuItem value="duration">Duration</MenuItem>
              <MenuItem value="detectionCount">Detections</MenuItem>
            </Select>
          </FormControl>
          <Box>
            {selectedIds.size > 0 && (
              <Button
                fullWidth
                color="error"
                variant="outlined"
                startIcon={<DeleteSweep fontSize="small" />}
                onClick={handleBulkDelete}
              >
                Delete {selectedIds.size}
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedIds.size > 0 && selectedIds.size < analyses.length}
                  checked={analyses.length > 0 && selectedIds.size === analyses.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Analysis</TableCell>
              <TableCell>Timeline</TableCell>
              <TableCell align="right">Blocks</TableCell>
              <TableCell align="right">Coverage</TableCell>
              <TableCell align="right">Mining Area</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : analyses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No analyses found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              analyses.map((analysis) => {
                const normalizedResults = normalizeAnalysisResults(analysis.results);
                const summary = (normalizedResults?.summary ?? {}) as Record<string, unknown>;
                const tileMetrics = deriveTileAreaMetrics(normalizedResults?.tiles);

                const detectionCount = normalizedResults?.detectionCount ?? normalizedResults?.detections?.length ?? 0;

                const fallbackCoverageValue = parseNumeric(summary.mining_percentage)
                  ?? parseNumeric(normalizedResults?.statistics?.coveragePercentage)
                  ?? parseNumeric(normalizedResults?.statistics?.coverage_percentage);
                const coveragePct = tileMetrics.coveragePct
                  ?? (fallbackCoverageValue !== undefined
                    ? (fallbackCoverageValue > 1 ? fallbackCoverageValue : fallbackCoverageValue * 100)
                    : null);

                const totalMiningAreaHa = tileMetrics.totalMiningAreaM2 > 0
                  ? tileMetrics.totalMiningAreaM2 / 10_000
                  : typeof normalizedResults?.totalMiningArea?.hectares === 'number'
                    ? normalizedResults.totalMiningArea.hectares
                    : (typeof normalizedResults?.totalMiningArea?.m2 === 'number'
                      ? normalizedResults.totalMiningArea.m2 / 10_000
                      : null);

                const tilesWithDetections = normalizedResults?.tilesWithMining ?? 0;
                const totalTiles = normalizedResults?.totalTiles ?? (normalizedResults?.tiles?.length ?? 0);
                const confidenceMetrics = deriveConfidenceMetrics(normalizedResults ?? {});
                const avgConfidence = confidenceMetrics.averagePct;
                const maxConfidence = confidenceMetrics.maxPct;
                const startTime = analysis.startTime ? new Date(analysis.startTime) : null;
                const endTime = analysis.endTime ? new Date(analysis.endTime) : null;

                return (
                  <TableRow key={analysis.analysisId} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedIds.has(analysis.analysisId)}
                        onChange={() => handleSelectOne(analysis.analysisId)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(analysis.status) || undefined}
                        label={analysis.status}
                        color={getStatusColor(analysis.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.75}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography variant="body2" fontFamily="monospace">
                            {analysis.analysisId}
                          </Typography>
                          <Tooltip title={copiedId === analysis.analysisId ? 'Copied' : 'Copy ID'}>
                            <IconButton size="small" onClick={() => handleCopyAnalysisId(analysis.analysisId)}>
                              <ContentCopy fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {totalTiles > 0 && (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`${tilesWithDetections}/${totalTiles} tiles with detections`}
                            />
                          )}
                          {avgConfidence !== undefined && avgConfidence !== null && (
                            <Chip size="small" label={`Avg conf ${formatDecimal(avgConfidence, 1)}%`} />
                          )}
                          {maxConfidence !== undefined && maxConfidence !== null && maxConfidence !== avgConfidence && (
                            <Chip size="small" label={`Max conf ${formatDecimal(maxConfidence, 1)}%`} />
                          )}
                          {analysis.aoiArea?.hectares !== undefined && (
                            <Chip size="small" label={`AOI ${formatDecimal(analysis.aoiArea.hectares, 1)} ha`} />
                          )}
                        </Stack>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        {startTime && (
                          <Typography variant="body2">
                            {format(startTime, 'MMM dd, yyyy HH:mm')}
                          </Typography>
                        )}
                        {endTime && (
                          <Typography variant="caption" color="text.secondary">
                            Completed {format(endTime, 'MMM dd, yyyy HH:mm')}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {formatDuration(analysis.duration)}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {detectionCount}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {toPercentString(coveragePct)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {totalMiningAreaHa !== null && totalMiningAreaHa !== undefined
                          ? `${formatDecimal(totalMiningAreaHa, 2)} ha`
                          : '--'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {analysis.tags?.slice(0, 2).map((tag) => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" />
                        ))}
                        {analysis.tags && analysis.tags.length > 2 && (
                          <Chip label={`+${analysis.tags.length - 2}`} size="small" />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
                        <Button size="small" variant="outlined" onClick={() => handleViewDetails(analysis.analysisId)}>
                          Details
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          endIcon={<OpenInNew fontSize="small" />}
                          onClick={() => handleOpenResults(analysis.analysisId)}
                        >
                          Results
                        </Button>
                        <Button size="small" variant="outlined" onClick={() => handleEdit(analysis)}>
                          Notes
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          variant="contained"
                          onClick={() => handleDelete(analysis)}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </TableContainer>

      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">Analysis Details</Typography>
            {selectedAnalysis?.analysisId && (
              <Button
                variant="outlined"
                size="small"
                endIcon={<OpenInNew fontSize="small" />}
                onClick={() => handleOpenResults(selectedAnalysis.analysisId)}
              >
                Open Results Page
              </Button>
            )}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedAnalysis && (
            <Stack spacing={3} sx={{ pt: 1 }}>
              <Paper sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Analysis ID
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="body2" fontFamily="monospace">
                          {selectedAnalysis.analysisId}
                        </Typography>
                        <Tooltip title={copiedId === selectedAnalysis.analysisId ? 'Copied' : 'Copy ID'}>
                          <IconButton size="small" onClick={() => handleCopyAnalysisId(selectedAnalysis.analysisId)}>
                            <ContentCopy fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Status
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          icon={getStatusIcon(selectedAnalysis.status) || undefined}
                          label={selectedAnalysis.status}
                          color={getStatusColor(selectedAnalysis.status)}
                          size="small"
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Start Time
                      </Typography>
                      <Typography variant="body2">
                        {selectedAnalysis.startTime ? format(new Date(selectedAnalysis.startTime), 'PPpp') : 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Duration
                      </Typography>
                      <Typography variant="body2">
                        {formatDuration(selectedAnalysis.duration)}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider flexItem />
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
                    {selectedAnalysis.aoiArea?.hectares !== undefined && (
                      <Typography variant="body2">
                        AOI surface: <strong>{formatDecimal(selectedAnalysis.aoiArea.hectares, 2)} ha</strong>
                      </Typography>
                    )}
                    {selectedAnalysis.viewUrl && (
                      <Typography variant="body2" color="text.secondary">
                        Portal link: {selectedAnalysis.viewUrl}
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              </Paper>

              {selectedSummary && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Key Metrics
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">
                          Tiles Processed
                        </Typography>
                        <Typography variant="h5">
                          {selectedSummary.totalTiles}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {selectedSummary.tilesWithDetections} with detections
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">
                          Mine Blocks
                        </Typography>
                        <Typography variant="h5" color="error">
                          {selectedSummary.detectionCount}
                        </Typography>
                        {blockTrackingSummary && (
                          <Typography variant="caption" color="text.secondary">
                            {blockTrackingSummary.withPersistentIds || blockTrackingSummary.with_persistent_ids || 0} persistent IDs stored
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">
                          Mining Coverage
                        </Typography>
                        <Typography variant="h5">
                          {toPercentString(selectedSummary.coveragePct)}
                        </Typography>
                        {selectedSummary.avgConfidencePct !== undefined && selectedSummary.avgConfidencePct !== null && (
                          <Typography variant="caption" color="text.secondary">
                            Avg confidence {formatDecimal(selectedSummary.avgConfidencePct, 1)}%
                          </Typography>
                        )}
                        {selectedSummary.maxConfidencePct !== undefined && selectedSummary.maxConfidencePct !== null && (
                          <Typography variant="caption" color="text.secondary">
                            Peak block {formatDecimal(selectedSummary.maxConfidencePct, 1)}%{selectedSummary.confidenceSource === 'summary' ? ' (summary)' : ''}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">
                          Mining Area
                        </Typography>
                        <Typography variant="h5" color="primary">
                          {selectedSummary.miningAreaHa !== null && selectedSummary.miningAreaHa !== undefined
                            ? `${formatDecimal(selectedSummary.miningAreaHa, 2)} ha`
                            : '--'}
                        </Typography>
                        {selectedSummary.miningAreaKm2 !== null && selectedSummary.miningAreaKm2 !== undefined && (
                          <Typography variant="caption" color="text.secondary">
                            ({formatDecimal(selectedSummary.miningAreaKm2, 3)} km^2)
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Box>
                </Paper>
              )}

              {mineBlockRows.length > 0 ? (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Mine Block Footprints
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {mineBlockRows.length} blocks mapped across {selectedSummary?.tilesWithDetections ?? 0} detection tiles.
                  </Typography>
                  <MineBlockTable rows={mineBlockRows} />
                </Box>
              ) : (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    No mine blocks detected for this analysis.
                  </Typography>
                </Paper>
              )}

              {(selectedAnalysis.userNotes || (selectedAnalysis.tags && selectedAnalysis.tags.length > 0)) && (
                <Paper sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    {selectedAnalysis.userNotes && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Notes
                        </Typography>
                        <Typography variant="body2">{selectedAnalysis.userNotes}</Typography>
                      </Box>
                    )}
                    {selectedAnalysis.tags && selectedAnalysis.tags.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Tags
                        </Typography>
                        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {selectedAnalysis.tags.map((tag) => (
                            <Chip key={tag} label={tag} size="small" />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Analysis Notes</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Notes"
              multiline
              minRows={4}
              value={editNotes}
              onChange={(event) => setEditNotes(event.target.value)}
            />
            <TextField
              fullWidth
              label="Tags (comma-separated)"
              value={editTags}
              onChange={(event) => setEditTags(event.target.value)}
              helperText="e.g., mining, high-priority, region-1"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Analysis</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this analysis? This action cannot be undone.
          </Typography>
          {selectedAnalysis && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Analysis ID: {selectedAnalysis.analysisId}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AnalysisHistoryPage;

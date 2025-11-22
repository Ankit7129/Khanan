import React from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip
} from '@mui/material';
import { styled } from '@mui/material/styles';

interface MineBlockRow {
  id: string;
  label: string;
  tileId?: string;
  areaHa: number;
  confidencePct?: number | null;
  source: 'Merged' | 'Tile';
  isMerged?: boolean;
  persistentId?: string;
  blockIndex?: number;
  centroidLat?: number;
  centroidLon?: number;
  bounds?: [number, number, number, number];
  rimElevationMeters?: number | null;
  maxDepthMeters?: number | null;
  meanDepthMeters?: number | null;
  volumeCubicMeters?: number | null;
}

interface MineBlockTableProps {
  rows: MineBlockRow[];
}

const SectionHeading = styled(Typography)({
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#0f172a',
});

const formatNumber = (value: number | undefined | null, fractionDigits = 2) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '0.00';
  }

  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const formatCoordinate = (value: number | undefined, fractionDigits = 4) => {
  if (value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return value.toFixed(fractionDigits);
};

const formatBounds = (bounds?: [number, number, number, number]) => {
  if (!bounds) {
    return '—';
  }
  const [minLon, minLat, maxLon, maxLat] = bounds;
  return `SW ${formatCoordinate(minLat)}, ${formatCoordinate(minLon)} → NE ${formatCoordinate(maxLat)}, ${formatCoordinate(maxLon)}`;
};

export const MineBlockTable: React.FC<MineBlockTableProps> = ({ rows }) => {
  if (!rows.length) {
    return null;
  }

  const hasQuantMetrics = rows.some((row) =>
    row.volumeCubicMeters !== undefined
    || row.maxDepthMeters !== undefined
    || row.meanDepthMeters !== undefined
    || row.rimElevationMeters !== undefined
  );

  return (
    <Paper
      sx={{
        mt: 3,
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 2,
        boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)'
      }}
      elevation={0}
    >
      <Box sx={{ p: 2, pb: 1 }}>
        <SectionHeading>
          Mine Block Details
        </SectionHeading>
        <Typography sx={{ color: '#475569', fontSize: '0.8rem', mt: 0.75 }}>
          Consolidated GeoJSON features merged from high-confidence detections.
        </Typography>
      </Box>
      <TableContainer sx={{ maxHeight: 280 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: '#0f172a', fontWeight: 600, background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>Block</TableCell>
              <TableCell sx={{ color: '#0f172a', fontWeight: 600, background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }} align="right">
                Area (ha)
              </TableCell>
              <TableCell sx={{ color: '#0f172a', fontWeight: 600, background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }} align="right">
                Confidence
              </TableCell>
              {hasQuantMetrics && (
                <>
                  <TableCell sx={{ color: '#0f172a', fontWeight: 600, background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }} align="right">
                    Rim Elev. (m)
                  </TableCell>
                  <TableCell sx={{ color: '#0f172a', fontWeight: 600, background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }} align="right">
                    Max Depth (m)
                  </TableCell>
                  <TableCell sx={{ color: '#0f172a', fontWeight: 600, background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }} align="right">
                    Mean Depth (m)
                  </TableCell>
                  <TableCell sx={{ color: '#0f172a', fontWeight: 600, background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }} align="right">
                    Volume (m³)
                  </TableCell>
                </>
              )}
              <TableCell sx={{ color: '#0f172a', fontWeight: 600, background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }} align="right">
                Tile
              </TableCell>
              <TableCell sx={{ color: '#0f172a', fontWeight: 600, background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }} align="center">
                Source
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' } }}>
                <TableCell sx={{ color: '#0f172a' }}>
                  <Typography sx={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>
                    {row.label}
                  </Typography>
                  {row.persistentId && (
                    <Typography sx={{ color: '#475569', fontSize: '0.7rem', mt: 0.1 }}>
                      ID:{' '}
                      <Box component="span" sx={{ fontFamily: 'monospace', color: '#1d4ed8' }}>
                        {row.persistentId}
                      </Box>
                    </Typography>
                  )}
                  {row.blockIndex !== undefined && (
                    <Typography sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                      Sequence: {row.blockIndex}
                    </Typography>
                  )}
                  {row.centroidLat !== undefined && row.centroidLon !== undefined && (
                    <Typography sx={{ color: '#475569', fontSize: '0.7rem' }}>
                      Centroid: {formatCoordinate(row.centroidLat)}, {formatCoordinate(row.centroidLon)}
                    </Typography>
                  )}
                  {row.bounds && (
                    <Typography sx={{ color: '#475569', fontSize: '0.7rem' }}>
                      Bounds: {formatBounds(row.bounds)}
                    </Typography>
                  )}
                  {row.isMerged && (
                    <Typography sx={{ color: '#475569', fontSize: '0.7rem' }}>
                      Merged footprint
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ color: '#0f172a' }} align="right">
                  {formatNumber(row.areaHa, 2)}
                </TableCell>
                <TableCell sx={{ color: '#0f172a' }} align="right">
                  {row.confidencePct !== undefined && row.confidencePct !== null
                    ? `${formatNumber(row.confidencePct, 1)}%`
                    : '—'}
                </TableCell>
                {hasQuantMetrics && (
                  <>
                    <TableCell sx={{ color: '#0f172a' }} align="right">
                      {row.rimElevationMeters !== undefined && row.rimElevationMeters !== null
                        ? formatNumber(row.rimElevationMeters, 1)
                        : '—'}
                    </TableCell>
                    <TableCell sx={{ color: '#0f172a' }} align="right">
                      {row.maxDepthMeters !== undefined && row.maxDepthMeters !== null
                        ? formatNumber(row.maxDepthMeters, 2)
                        : '—'}
                    </TableCell>
                    <TableCell sx={{ color: '#0f172a' }} align="right">
                      {row.meanDepthMeters !== undefined && row.meanDepthMeters !== null
                        ? formatNumber(row.meanDepthMeters, 2)
                        : '—'}
                    </TableCell>
                    <TableCell sx={{ color: '#0f172a' }} align="right">
                      {row.volumeCubicMeters !== undefined && row.volumeCubicMeters !== null
                        ? formatNumber(row.volumeCubicMeters, 1)
                        : '—'}
                    </TableCell>
                  </>
                )}
                <TableCell sx={{ color: '#0f172a' }} align="right">
                  {row.tileId ? row.tileId : '—'}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={row.source}
                    sx={{
                      bgcolor: row.source === 'Merged' ? '#ecfdf5' : '#eef2ff',
                      color: row.source === 'Merged' ? '#047857' : '#4338ca',
                      border: '1px solid #e2e8f0',
                      fontWeight: 600,
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default MineBlockTable;

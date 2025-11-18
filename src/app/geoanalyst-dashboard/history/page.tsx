'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Tooltip,
  Stack,
  Alert,
  CircularProgress,
  Checkbox
} from '@mui/material';
import {
  Visibility,
  Edit,
  Delete,
  Search,
  CheckCircle,
  Error,
  HourglassEmpty,
  Cancel,
  DeleteSweep
} from '@mui/icons-material';
import { format } from 'date-fns';
import {
  getAnalysisHistory,
  getAnalysisStats,
  getAnalysisById,
  updateAnalysis,
  deleteAnalysis,
  bulkDeleteAnalyses,
  type AnalysisHistoryRecord,
  type HistoryStats,
  type HistoryListParams
} from '@/services/historyService';

const AnalysisHistoryPage: React.FC = () => {
  const [analyses, setAnalyses] = useState<AnalysisHistoryRecord[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'startTime' | 'duration' | 'detectionCount'>('startTime');
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Dialogs
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisHistoryRecord | null>(null);
  
  // Edit form
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState('');

  // Load data
  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, searchQuery, statusFilter, sortBy]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: HistoryListParams = {
        page: page + 1,
        limit: rowsPerPage,
        sortBy,
        sortOrder: 'desc'
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter as any;
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      const [historyData, statsData] = await Promise.all([
        getAnalysisHistory(params),
        getAnalysisStats()
      ]);

      setAnalyses(historyData.analyses);
      setTotalCount(historyData.total);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load analysis history');
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (analysisId: string) => {
    try {
      const details = await getAnalysisById(analysisId, false);
      setSelectedAnalysis(details);
      setViewDialogOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load analysis details');
    }
  };

  const handleEdit = (analysis: AnalysisHistoryRecord) => {
    setSelectedAnalysis(analysis);
    setEditNotes(analysis.userNotes || '');
    setEditTags(analysis.tags?.join(', ') || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedAnalysis) return;

    try {
      const tags = editTags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      await updateAnalysis(selectedAnalysis.analysisId, {
        userNotes: editNotes,
        tags
      });

      setEditDialogOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update analysis');
    }
  };

  const handleDelete = (analysis: AnalysisHistoryRecord) => {
    setSelectedAnalysis(analysis);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedAnalysis) return;

    try {
      await deleteAnalysis(selectedAnalysis.analysisId);
      setDeleteDialogOpen(false);
      setSelectedAnalysis(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete analysis');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    try {
      await bulkDeleteAnalyses(Array.from(selectedIds));
      setSelectedIds(new Set());
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete analyses');
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedIds(new Set(analyses.map(a => a.analysisId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (analysisId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(analysisId)) {
      newSelected.delete(analysisId);
    } else {
      newSelected.add(analysisId);
    }
    setSelectedIds(newSelected);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle sx={{ color: 'success.main', fontSize: 16 }} />;
      case 'failed':
        return <Error sx={{ color: 'error.main', fontSize: 16 }} />;
      case 'processing':
        return <HourglassEmpty sx={{ color: 'warning.main', fontSize: 16 }} />;
      case 'cancelled':
        return <Cancel sx={{ color: 'text.disabled', fontSize: 16 }} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string): "success" | "error" | "warning" | "default" => {
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

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Analysis History
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View and manage your past geospatial analyses
        </Typography>
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Analyses
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {stats.totalAnalyses}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Completed
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {stats.completedAnalyses}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Detections
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {stats.totalDetections}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Avg. Duration
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {formatDuration(stats.averageDuration)}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters and Search */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by ID or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              )
            }}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
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
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <MenuItem value="startTime">Date</MenuItem>
              <MenuItem value="duration">Duration</MenuItem>
              <MenuItem value="detectionCount">Detections</MenuItem>
            </Select>
          </FormControl>
          <Box>
            {selectedIds.size > 0 && (
              <Button
                variant="outlined"
                color="error"
                fullWidth
                startIcon={<DeleteSweep />}
                onClick={handleBulkDelete}
              >
                Delete ({selectedIds.size})
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Table */}
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
              <TableCell>Analysis ID</TableCell>
              <TableCell>Start Time</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Detections</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : analyses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No analyses found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              analyses.map((analysis) => (
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
                    <Typography variant="body2" fontFamily="monospace">
                      {analysis.analysisId.substring(0, 8)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(analysis.startTime), 'MMM dd, yyyy')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(analysis.startTime), 'HH:mm:ss')}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDuration(analysis.duration)}</TableCell>
                  <TableCell>
                    {analysis.results?.statistics?.totalDetections || 0}
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
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(analysis.analysisId)}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleEdit(analysis)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(analysis)}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </TableContainer>

      {/* View Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Analysis Details</DialogTitle>
        <DialogContent>
          {selectedAnalysis && (
            <Box sx={{ pt: 2 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Analysis ID
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {selectedAnalysis.analysisId}
                  </Typography>
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
                {selectedAnalysis.results && selectedAnalysis.results.statistics && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mt: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Total Tiles
                      </Typography>
                      <Typography variant="h6">
                        {selectedAnalysis.results.statistics.totalTiles || 0}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Detections
                      </Typography>
                      <Typography variant="h6">
                        {selectedAnalysis.results.statistics.totalDetections || 0}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Avg Confidence
                      </Typography>
                      <Typography variant="h6">
                        {selectedAnalysis.results.statistics.averageConfidence 
                          ? (selectedAnalysis.results.statistics.averageConfidence * 100).toFixed(1) 
                          : 'N/A'}%
                      </Typography>
                    </Box>
                  </Box>
                )}
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
                      {selectedAnalysis.tags.map((tag, idx) => (
                        <Chip key={idx} label={tag} size="small" />
                      ))}
                    </Box>
                  </Box>
                )}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Analysis</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={4}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />
            <TextField
              fullWidth
              label="Tags (comma-separated)"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              helperText="e.g., mining, high-priority, region-1"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
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
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AnalysisHistoryPage;

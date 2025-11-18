'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Alert,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Download,
  Map as MapIcon,
  ArrowBack,
  ZoomIn
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const GoldenText = styled(Typography)({
  background: 'linear-gradient(to right, #fbbf24, #fcd34d, #fbbf24)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  filter: 'drop-shadow(0 2px 4px rgba(251, 191, 36, 0.3))'
});

// API Base URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const ResultsPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = searchParams.get('id');
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!analysisId) {
      setError('No analysis ID provided');
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/python/analysis/${analysisId}`);
        if (!response.ok) throw new Error('Failed to fetch results');
        
        const data = await response.json();
        setResults(data);
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchResults();
  }, [analysisId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(to right, #1a1a2e, #16213e, #0f3460)' }}>
        <CircularProgress sx={{ color: '#fcd34d' }} size={60} />
      </Box>
    );
  }

  if (error || !results) {
    return (
      <Box sx={{ p: 4, background: 'linear-gradient(to right, #1a1a2e, #16213e, #0f3460)', minHeight: '100vh' }}>
        <Alert severity="error">{error || 'No results found'}</Alert>
      </Box>
    );
  }

  const miningDetected = results.mining_detected || results.total_mining_pixels > 0;
  const detectionPercentage = results.overall_mining_percentage || 0;

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(to right, #1a1a2e, #16213e, #0f3460)', minHeight: '100vh' }}>
      <Paper sx={{ p: 4, background: 'linear-gradient(to bottom, #1a1a2e, #16213e)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push('/geoanalyst-dashboard')}
            sx={{ mb: 2, color: '#fcd34d' }}
          >
            Back to Dashboard
          </Button>
          
          <GoldenText variant="h4" fontWeight="bold" gutterBottom>
            Analysis Results
          </GoldenText>
          <Typography sx={{ color: 'rgba(252, 211, 77, 0.7)' }}>
            Analysis ID: {analysisId}
          </Typography>
        </Box>

        {/* Detection Status */}
        <Card sx={{ mb: 3, background: miningDetected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', border: `2px solid ${miningDetected ? '#ef4444' : '#22c55e'}` }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {miningDetected ? (
                <Warning sx={{ fontSize: 48, color: '#ef4444' }} />
              ) : (
                <CheckCircle sx={{ fontSize: 48, color: '#22c55e' }} />
              )}
              <Box>
                <Typography variant="h5" fontWeight="bold" sx={{ color: miningDetected ? '#fca5a5' : '#86efac' }}>
                  {miningDetected ? 'Mining Activity Detected' : 'No Mining Activity Detected'}
                </Typography>
                <Typography sx={{ color: '#ffffff' }}>
                  {miningDetected 
                    ? `${detectionPercentage.toFixed(2)}% of area shows potential mining activity`
                    : 'Area appears clear of mining operations'
                  }
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Statistics Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 4 }}>
          <Card sx={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
            <CardContent>
              <Typography sx={{ color: 'rgba(252, 211, 77, 0.7)', fontSize: '0.875rem' }}>
                Total Area Analyzed
              </Typography>
              <Typography sx={{ color: '#fcd34d', fontSize: '1.5rem', fontWeight: 'bold' }}>
                {results.area_km2 || 0} km²
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
            <CardContent>
              <Typography sx={{ color: 'rgba(252, 211, 77, 0.7)', fontSize: '0.875rem' }}>
                Tiles Analyzed
              </Typography>
              <Typography sx={{ color: '#fcd34d', fontSize: '1.5rem', fontWeight: 'bold' }}>
                {results.total_tiles || 0}
              </Typography>
            </CardContent>
          </Card>

          {miningDetected && (
            <>
              <Card sx={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <CardContent>
                  <Typography sx={{ color: 'rgba(252, 165, 165, 0.9)', fontSize: '0.875rem' }}>
                    Mining Blocks Detected
                  </Typography>
                  <Typography sx={{ color: '#fca5a5', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {results.total_mine_blocks || 0}
                  </Typography>
                </CardContent>
              </Card>

              <Card sx={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <CardContent>
                  <Typography sx={{ color: 'rgba(252, 165, 165, 0.9)', fontSize: '0.875rem' }}>
                    Estimated Mining Area
                  </Typography>
                  <Typography sx={{ color: '#fca5a5', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {((results.total_mining_area_m2 || 0) / 1000000).toFixed(4)} km²
                  </Typography>
                </CardContent>
              </Card>
            </>
          )}
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<MapIcon />}
            sx={{
              color: '#fcd34d',
              borderColor: 'rgba(252, 211, 77, 0.5)',
              '&:hover': {
                borderColor: '#fbbf24',
                backgroundColor: 'rgba(251, 191, 36, 0.1)'
              }
            }}
          >
            View on Map
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            sx={{
              color: '#fcd34d',
              borderColor: 'rgba(252, 211, 77, 0.5)',
              '&:hover': {
                borderColor: '#fbbf24',
                backgroundColor: 'rgba(251, 191, 36, 0.1)'
              }
            }}
          >
            Download Report
          </Button>
        </Box>

        {/* Footer Info */}
        <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(251, 191, 36, 0.2)' }}>
          <Typography sx={{ color: 'rgba(252, 211, 77, 0.6)', fontSize: '0.875rem' }}>
            Analysis completed at: {new Date().toLocaleString()}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default ResultsPage;

'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Alert, CircularProgress } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { AnalysisProgress } from '@/components/geoanalyst/AnalysisProgress';

export default function AnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = searchParams.get('id');
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!analysisId) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">No analysis ID provided</Alert>
      </Box>
    );
  }

  const handleComplete = (results: any) => {
    // Navigate to results page
    router.push(`/geoanalyst-dashboard/results?id=${analysisId}`);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <AnalysisProgress
      analysisId={analysisId}
      onComplete={handleComplete}
      onError={handleError}
    />
  );
}

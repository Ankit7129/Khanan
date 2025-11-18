'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Alert } from '@mui/material';
import { AnalysisProgress } from '@/components/geoanalyst/AnalysisProgress';

export default function AnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = searchParams.get('id');
  const [error, setError] = useState<string | null>(null);

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

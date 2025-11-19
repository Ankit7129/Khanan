'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';
import { Box, CircularProgress } from '@mui/material';
import { AOI } from '@/types/geoanalyst';

// Dynamic import for map to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('@/components/geoanalyst/MapComponent'), {
  ssr: false,
  loading: () => (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress />
    </Box>
  ),
});

export default function GeoAnalystDashboard() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [aoi, setAoi] = useState<AOI | null>(null);

  // Check authentication
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  const handleAOICreated = (newAOI: AOI) => {
    setAoi(newAOI);
    console.log('AOI created:', newAOI);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', width: '100%', position: 'relative' }}>
      <MapComponent onAOICreated={handleAOICreated} />
    </Box>
  );
}

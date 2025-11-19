'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading, getLandingRoute } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace('/login');
    } else {
      const destination = getLandingRoute();
      router.replace(destination);
    }
  }, [isAuthenticated, getLandingRoute, router, loading]);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(to right, #1a1a2e, #16213e, #0f3460)',
      }}
    >
      <CircularProgress sx={{ color: '#fbbf24' }} />
    </Box>
  );
}

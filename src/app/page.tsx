'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      // Not logged in, redirect to login
      router.push('/login');
    } else {
      // Logged in, redirect based on user type
      if (user?.userType === 'GEO_ANALYST') {
        router.push('/geoanalyst-dashboard');
      } else {
        // Default to admin for super admins and other roles
        router.push('/admin');
      }
    }
  }, [isAuthenticated, user, router]);

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

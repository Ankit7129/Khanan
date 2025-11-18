import React from 'react';
import Image from 'next/image';
import { Box } from '@mui/material';

interface LogoProps {
  size?: number;
  withCircle?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 40, 
  withCircle = true,
  className = '' 
}) => {
  if (withCircle) {
    return (
      <Box
        className={className}
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          flexShrink: 0,
          padding: '4px'
        }}
      >
        <Image
          src="/logo.png"
          alt="KhananNetra Logo"
          width={size - 8}
          height={size - 8}
          style={{ objectFit: 'contain' }}
          priority
        />
      </Box>
    );
  }

  return (
    <Image
      src="/logo.png"
      alt="KhananNetra Logo"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
      priority
    />
  );
};

export default Logo;

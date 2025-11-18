'use client';
import { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Divider,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import Logo from '@/components/ui/Logo';

interface LoginFormProps {
  onLoginSuccess: (email: string, password: string) => Promise<void>;
  onSignUp: () => void;
  onForgotPassword: () => void;
  loading: boolean;
  showGuestOption?: boolean;
  onGuestAccess?: () => void;
}

export default function LoginForm({
  onLoginSuccess,
  onSignUp,
  onForgotPassword,
  loading,
  showGuestOption = true,
  onGuestAccess,
}: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      await onLoginSuccess(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box sx={{ 
      width: '100%',
      maxWidth: 450,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <Box sx={{ 
        width: '100%',
        background: 'linear-gradient(to bottom, #1a1a2e, #16213e)',
        border: '1px solid rgba(251, 191, 36, 0.2)',
        borderRadius: 2,
        boxShadow: '0 8px 32px rgba(251, 191, 36, 0.2)'
      }}>
      <Paper elevation={0} sx={{ 
        p: 4,
        background: 'transparent',
        border: 'none',
        boxShadow: 'none'
      }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Logo size={80} withCircle={true} />
          </Box>
          <Typography 
            variant="h5" 
            component="h1" 
            gutterBottom 
            fontWeight="bold"
            sx={{
              background: 'linear-gradient(to right, #fbbf24, #fcd34d, #fbbf24)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 4px rgba(251, 191, 36, 0.3))'
            }}
          >
            KhananNetra
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ color: 'rgba(252, 211, 77, 0.8)' }}
          >
            Government Mining Monitoring System
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5'
            }}
          >
            {error}
          </Alert>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            disabled={loading}
            placeholder="Enter your official email"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#ffffff',
                '& fieldset': {
                  borderColor: 'rgba(252, 211, 77, 0.3)'
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(252, 211, 77, 0.5)'
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#fcd34d'
                }
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(252, 211, 77, 0.7)'
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#fcd34d'
              },
              '& .MuiInputBase-input::placeholder': {
                color: 'rgba(252, 211, 77, 0.5)',
                opacity: 1
              }
            }}
          />
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            disabled={loading}
            placeholder="Enter your password"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#ffffff',
                '& fieldset': {
                  borderColor: 'rgba(252, 211, 77, 0.3)'
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(252, 211, 77, 0.5)'
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#fcd34d'
                }
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(252, 211, 77, 0.7)'
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#fcd34d'
              },
              '& .MuiInputBase-input::placeholder': {
                color: 'rgba(252, 211, 77, 0.5)',
                opacity: 1
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleTogglePassword}
                    edge="end"
                    disabled={loading}
                    sx={{ color: '#fbbf24' }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Forgot Password Link */}
          <Box sx={{ textAlign: 'right', mt: 1, mb: 2 }}>
            <Button
              onClick={onForgotPassword}
              disabled={loading}
              sx={{ 
                textTransform: 'none',
                color: 'rgba(252, 211, 77, 0.8)',
                '&:hover': {
                  color: '#fcd34d',
                  backgroundColor: 'rgba(251, 191, 36, 0.1)'
                }
              }}
            >
              Forgot Password?
            </Button>
          </Box>

          {/* Login Button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ 
              mt: 2, 
              mb: 2,
              backgroundColor: '#fbbf24',
              color: '#1a1a2e',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#fcd34d',
                boxShadow: '0 4px 12px rgba(251, 191, 36, 0.4)'
              },
              '&:disabled': {
                backgroundColor: 'rgba(251, 191, 36, 0.3)',
                color: 'rgba(26, 26, 46, 0.5)'
              }
            }}
          >
            {loading ? <CircularProgress size={24} sx={{ color: '#1a1a2e' }} /> : 'Login'}
          </Button>
        </form>

        {/* Guest Access Option */}
        {showGuestOption && onGuestAccess && (
          <>
            <Divider sx={{ 
              my: 3,
              borderColor: 'rgba(251, 191, 36, 0.2)'
            }}>
              <Typography variant="body2" sx={{ color: 'rgba(252, 211, 77, 0.6)' }}>
                OR
              </Typography>
            </Divider>
            <Button
              fullWidth
              variant="outlined"
              onClick={onGuestAccess}
              disabled={loading}
              sx={{ 
                mb: 2,
                borderColor: 'rgba(251, 191, 36, 0.5)',
                color: 'rgba(252, 211, 77, 0.8)',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  borderColor: '#fbbf24',
                  backgroundColor: 'rgba(251, 191, 36, 0.1)',
                  color: '#fbbf24'
                }
              }}
            >
              Continue as Guest
            </Button>
          </>
        )}

        {/* Footer Links */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" sx={{ color: 'rgba(252, 211, 77, 0.6)' }}>
            Don't have an account?{' '}
            <Button
              onClick={onSignUp}
              disabled={loading}
              sx={{ 
                textTransform: 'none', 
                fontWeight: 'bold',
                color: '#fbbf24',
                '&:hover': {
                  color: '#fcd34d'
                }
              }}
            >
              Contact Administrator
            </Button>
          </Typography>
        </Box>

        {/* Security Notice */}
        <Box sx={{ 
          mt: 3, 
          p: 2, 
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: 1 
        }}>
          <Typography 
            variant="caption" 
            align="center"
            sx={{ color: 'rgba(252, 211, 77, 0.8)', display: 'block' }}
          >
            🔒 Secure government portal. Access is restricted to authorized personnel only.
          </Typography>
        </Box>
      </Paper>
      </Box>
    </Box>
  );
}
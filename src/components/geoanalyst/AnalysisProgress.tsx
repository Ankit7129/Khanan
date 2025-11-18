'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Chip,
  Alert,
  Card,
  CardContent,
  Divider,
  Fade,
  Slide,
  Zoom,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  Pending,
  CloudDownload,
  ModelTraining,
  Analytics,
  Verified,
  Satellite,
  Speed,
  Timeline,
  Stop
} from '@mui/icons-material';
import { styled, keyframes } from '@mui/material/styles';
import apiClient from '@/services/apiClient';
import { stopAnalysis } from '@/services/historyService';
import { useAnalysis } from '@/contexts/AnalysisContext';

// Animations
const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(251, 191, 36, 0); }
  100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
`;

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const slideInUp = keyframes`
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

// Styled components matching dark royal blue theme
const ProgressContainer = styled(Paper)(({ theme }) => ({
  background: 'linear-gradient(to bottom, #1a1a2e, #16213e)',
  border: '1px solid rgba(251, 191, 36, 0.2)',
  padding: theme.spacing(4),
  borderRadius: theme.spacing(2),
  boxShadow: '0 8px 32px rgba(251, 191, 36, 0.2)',
  animation: `${slideInUp} 0.6s ease-out`
}));

const StyledLinearProgress = styled(LinearProgress)({
  height: 12,
  borderRadius: 6,
  backgroundColor: 'rgba(251, 191, 36, 0.1)',
  overflow: 'hidden',
  '& .MuiLinearProgress-bar': {
    background: 'linear-gradient(45deg, #fbbf24, #fcd34d, #f59e0b)',
    backgroundSize: '200% 100%',
    animation: `${shimmer} 2s infinite linear`,
    borderRadius: 6,
    boxShadow: '0 2px 8px rgba(251, 191, 36, 0.4)'
  }
});

const GoldenText = styled(Typography)({
  background: 'linear-gradient(to right, #fbbf24, #fcd34d, #fbbf24)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  filter: 'drop-shadow(0 2px 4px rgba(251, 191, 36, 0.3))'
});

const AnimatedCard = styled(Card)(({ theme }) => ({
  background: 'rgba(251, 191, 36, 0.1)',
  border: '1px solid rgba(251, 191, 36, 0.2)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 16px rgba(251, 191, 36, 0.3)'
  }
}));

const PulsingIcon = styled(Box)({
  animation: `${pulse} 2s infinite`
});

interface AnalysisStep {
  label: string;
  key: string;
  icon: React.ReactNode;
  progressRange: [number, number];
}

const ANALYSIS_STEPS: AnalysisStep[] = [
  {
    label: 'Validating AOI',
    key: 'validating',
    icon: <Verified />,
    progressRange: [0, 15]
  },
  {
    label: 'Fetching Satellite Tiles',
    key: 'preprocessing',
    icon: <CloudDownload />,
    progressRange: [15, 65]
  },
  {
    label: 'Loading ML Model',
    key: 'processing',
    icon: <ModelTraining />,
    progressRange: [65, 80]
  },
  {
    label: 'Running Inference',
    key: 'ml_inference_tiles',
    icon: <Analytics />,
    progressRange: [80, 95]
  },
  {
    label: 'Generating Results',
    key: 'completed',
    icon: <CheckCircle />,
    progressRange: [95, 100]
  }
];

interface AnalysisProgressProps {
  analysisId: string;
  onComplete: (results: any) => void;
  onError: (error: string) => void;
}

interface AnalysisStatus {
  status: string;
  progress: number;
  message: string;
  current_step: string;
  total_tiles?: number;
  tiles_fetched?: number;
  area_km2?: number;
  tiles?: any[];
  error?: string;
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  analysisId,
  onComplete,
  onError
}) => {
  const router = useRouter();
  const { setCurrentAnalysis, updateAnalysisProgress, updateAnalysisStatus, clearAnalysis } = useAnalysis();
  const [status, setStatus] = useState<AnalysisStatus>({
    status: 'processing',
    progress: 0,
    message: 'Initializing analysis...',
    current_step: 'initialization'
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [abortDialogOpen, setAbortDialogOpen] = useState(false);
  const [aborting, setAborting] = useState(false);

  useEffect(() => {
    // Initialize analysis in context
    setCurrentAnalysis({
      analysisId,
      status: 'processing',
      startTime: new Date(),
      progress: 0
    });
  }, [analysisId, setCurrentAnalysis]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let timeInterval: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const response = await apiClient.get(`/python/analysis/${analysisId}`);
        
        const data: AnalysisStatus = response.data;
        setStatus(data);
        
        // Update context
        updateAnalysisProgress(data.progress, data.message);

        // Check if analysis is complete
        if (data.status === 'completed' || data.progress >= 100) {
          clearInterval(interval);
          clearInterval(timeInterval);
          updateAnalysisStatus('completed', data);
          setTimeout(() => onComplete(data), 1000);
        } else if (data.status === 'failed' || data.error) {
          clearInterval(interval);
          clearInterval(timeInterval);
          updateAnalysisStatus('failed');
          onError(data.error || 'Analysis failed');
        }
      } catch (error: any) {
        console.error('Error polling status:', error);
        console.error('Error details:', error.response?.data || error.message);
        clearInterval(interval);
        clearInterval(timeInterval);
        onError(error.response?.data?.message || error.message || 'Failed to fetch analysis status');
      }
    };

    // Poll every 5 seconds (increased from 2 to avoid rate limiting)
    interval = setInterval(pollStatus, 5000);
    // Make initial call after a small delay
    setTimeout(() => pollStatus(), 500);

    // Update elapsed time every second
    timeInterval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, [analysisId, onComplete, onError]);

  const getCurrentStepIndex = () => {
    return ANALYSIS_STEPS.findIndex(step => step.key === status.current_step);
  };

  const getStepStatus = (index: number): 'completed' | 'active' | 'pending' => {
    const currentIndex = getCurrentStepIndex();
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'active';
    return 'pending';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAbortAnalysis = async () => {
    try {
      setAborting(true);
      
      // Call the stop API endpoint
      await stopAnalysis(analysisId);
      
      // Update context to mark as cancelled
      updateAnalysisStatus('cancelled');
      
      // Clear analysis after a brief delay
      setTimeout(() => {
        clearAnalysis();
        // Redirect to new analysis dashboard
        router.push('/geoanalyst-dashboard');
      }, 500);
    } catch (error) {
      console.error('Failed to stop analysis:', error);
      alert('Failed to stop analysis. Please try again.');
      setAborting(false);
    } finally {
      setAbortDialogOpen(false);
    }
  };

  return (
    <Box sx={{ p: 3, minHeight: '100vh', background: 'linear-gradient(to right, #1a1a2e, #16213e, #0f3460)' }}>
      <ProgressContainer>
        {/* Header with Abort Button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <GoldenText variant="h4" fontWeight="bold" gutterBottom>
              Analysis in Progress
            </GoldenText>
            <Typography sx={{ color: 'rgba(252, 211, 77, 0.7)' }}>
              Processing your Area of Interest - Analysis ID: {analysisId.slice(0, 8)}...
            </Typography>
          </Box>
          
          {/* Abort Button in Top Right */}
          <Button
            variant="contained"
            color="error"
            startIcon={<Stop />}
            onClick={() => setAbortDialogOpen(true)}
            disabled={aborting}
            sx={{
              ml: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.5,
              borderRadius: '8px',
              whiteSpace: 'nowrap',
              backgroundColor: '#ef4444',
              '&:hover': {
                backgroundColor: '#dc2626',
              }
            }}
          >
            {aborting ? 'Stopping...' : 'Abort Analysis'}
          </Button>
        </Box>

        {/* Progress Bar */}
        <Fade in={true} timeout={800}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ color: '#fcd34d', fontWeight: 600 }}>
                Overall Progress
              </Typography>
              <Zoom in={true} style={{ transitionDelay: '300ms' }}>
                <Typography sx={{ 
                  color: '#fbbf24', 
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  textShadow: '0 0 10px rgba(251, 191, 36, 0.5)'
                }}>
                  {status.progress}%
                </Typography>
              </Zoom>
            </Box>
            <StyledLinearProgress variant="determinate" value={status.progress} />
            
            {/* Progress indicator dots */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              {[0, 25, 50, 75, 100].map((milestone) => (
                <Box
                  key={milestone}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: status.progress >= milestone ? '#fbbf24' : 'rgba(251, 191, 36, 0.3)',
                    transition: 'all 0.5s ease',
                    boxShadow: status.progress >= milestone ? '0 0 8px rgba(251, 191, 36, 0.8)' : 'none'
                  }}
                />
              ))}
            </Box>
          </Box>
        </Fade>

        {/* Current Status Message */}
        <Slide direction="up" in={true} timeout={600}>
          <Alert 
            severity="info"
            icon={
              <PulsingIcon>
                <Satellite sx={{ color: '#fcd34d', animation: `${rotate} 3s linear infinite` }} />
              </PulsingIcon>
            }
            sx={{
              mb: 4,
              backgroundColor: 'rgba(252, 211, 77, 0.1)',
              border: '1px solid rgba(252, 211, 77, 0.3)',
              color: '#ffffff',
              borderRadius: 3,
              '& .MuiAlert-icon': {
                color: '#fcd34d'
              },
              transition: 'all 0.3s ease'
            }}
          >
            <Typography sx={{ fontWeight: 500 }}>
              {status.message}
            </Typography>
          </Alert>
        </Slide>

        {/* Stepper */}
        <Stepper activeStep={getCurrentStepIndex()} sx={{ mb: 4 }}>
          {ANALYSIS_STEPS.map((step, index) => {
            const stepStatus = getStepStatus(index);
            return (
              <Step key={step.key}>
                <StepLabel
                  StepIconComponent={() => (
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor:
                          stepStatus === 'completed'
                            ? '#fbbf24'
                            : stepStatus === 'active'
                            ? 'rgba(251, 191, 36, 0.3)'
                            : 'rgba(251, 191, 36, 0.1)',
                        border: `2px solid ${
                          stepStatus === 'active' ? '#fcd34d' : 'rgba(251, 191, 36, 0.3)'
                        }`,
                        color: stepStatus === 'completed' ? '#1a1a2e' : '#fcd34d'
                      }}
                    >
                      {stepStatus === 'completed' ? (
                        <CheckCircle />
                      ) : stepStatus === 'active' ? (
                        <CircularProgress size={20} sx={{ color: '#fcd34d' }} />
                      ) : (
                        <RadioButtonUnchecked />
                      )}
                    </Box>
                  )}
                  sx={{
                    '& .MuiStepLabel-label': {
                      color: stepStatus === 'completed' ? '#fbbf24' : '#ffffff',
                      fontWeight: stepStatus === 'active' ? 600 : 400
                    }
                  }}
                >
                  {step.label}
                </StepLabel>
              </Step>
            );
          })}
        </Stepper>

        {/* Statistics */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3, mb: 4 }}>
          <Fade in={true} timeout={800} style={{ transitionDelay: '200ms' }}>
            <AnimatedCard>
              <CardContent sx={{ textAlign: 'center' }}>
                <Speed sx={{ color: '#fcd34d', fontSize: '2rem', mb: 1 }} />
                <Typography sx={{ color: 'rgba(252, 211, 77, 0.7)', fontSize: '0.875rem' }}>
                  Elapsed Time
                </Typography>
                <Typography sx={{ 
                  color: '#fcd34d', 
                  fontSize: '1.8rem', 
                  fontWeight: 'bold',
                  fontFamily: 'monospace'
                }}>
                  {formatTime(elapsedTime)}
                </Typography>
              </CardContent>
            </AnimatedCard>
          </Fade>

          {status.area_km2 && (
            <Fade in={true} timeout={800} style={{ transitionDelay: '400ms' }}>
              <AnimatedCard>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Verified sx={{ color: '#fcd34d', fontSize: '2rem', mb: 1 }} />
                  <Typography sx={{ color: 'rgba(252, 211, 77, 0.7)', fontSize: '0.875rem' }}>
                    AOI Area
                  </Typography>
                  <Typography sx={{ color: '#fcd34d', fontSize: '1.8rem', fontWeight: 'bold' }}>
                    {status.area_km2} km²
                  </Typography>
                </CardContent>
              </AnimatedCard>
            </Fade>
          )}

          {status.total_tiles && (
            <Fade in={true} timeout={800} style={{ transitionDelay: '600ms' }}>
              <AnimatedCard>
                <CardContent sx={{ textAlign: 'center' }}>
                  <CloudDownload sx={{ color: '#fcd34d', fontSize: '2rem', mb: 1 }} />
                  <Typography sx={{ color: 'rgba(252, 211, 77, 0.7)', fontSize: '0.875rem' }}>
                    Total Tiles
                  </Typography>
                  <Typography sx={{ color: '#fcd34d', fontSize: '1.8rem', fontWeight: 'bold' }}>
                    {status.total_tiles}
                  </Typography>
                </CardContent>
              </AnimatedCard>
            </Fade>
          )}

          {status.tiles_fetched !== undefined && (
            <Fade in={true} timeout={800} style={{ transitionDelay: '800ms' }}>
              <AnimatedCard>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Timeline sx={{ color: '#fcd34d', fontSize: '2rem', mb: 1 }} />
                  <Typography sx={{ color: 'rgba(252, 211, 77, 0.7)', fontSize: '0.875rem' }}>
                    Tiles Progress
                  </Typography>
                  <Typography sx={{ color: '#fcd34d', fontSize: '1.8rem', fontWeight: 'bold' }}>
                    {status.tiles_fetched} / {status.total_tiles}
                  </Typography>
                  <Box sx={{ width: '100%', mt: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={status.total_tiles ? (status.tiles_fetched / status.total_tiles) * 100 : 0}
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: 'rgba(251, 191, 36, 0.2)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#fbbf24',
                          borderRadius: 2
                        }
                      }}
                    />
                  </Box>
                </CardContent>
              </AnimatedCard>
            </Fade>
          )}
        </Box>

        {/* Info */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography sx={{ color: 'rgba(252, 211, 77, 0.6)', fontSize: '0.875rem' }}>
            Please do not close this window. The analysis may take several minutes depending on the AOI size.
          </Typography>
        </Box>

        {/* Abort Confirmation Dialog */}
        <Dialog
          open={abortDialogOpen}
          onClose={() => !aborting && setAbortDialogOpen(false)}
        >
          <DialogTitle sx={{ fontSize: '1.2rem', fontWeight: 600, color: '#dc2626' }}>
            Abort Analysis?
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ mt: 2, color: '#555' }}>
              Are you sure you want to stop this analysis? Any progress will be lost and cannot be recovered.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setAbortDialogOpen(false)}
              disabled={aborting}
              sx={{ textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAbortAnalysis}
              variant="contained"
              color="error"
              disabled={aborting}
              sx={{ textTransform: 'none' }}
            >
              {aborting ? 'Stopping...' : 'Stop Analysis'}
            </Button>
          </DialogActions>
        </Dialog>
      </ProgressContainer>
    </Box>
  );
};

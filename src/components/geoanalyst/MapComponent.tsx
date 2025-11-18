'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  IconButton, 
  Divider, 
  Chip, 
  Alert,
  Stack,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress
} from '@mui/material';
import { 
  Edit, 
  CheckCircle, 
  Cancel, 
  Info, 
  PlayArrow, 
  DeleteOutline,
  Map as MapIcon,
  Search,
  MyLocation,
  Refresh
} from '@mui/icons-material';
import { AOI } from '@/types/geoanalyst';
import { createAOI, startAnalysis as startBackendAnalysis } from '@/services/geoanalyst/api';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { AnalysisProgress } from './AnalysisProgress';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LocationResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

interface EnhancedMapComponentProps {
  onAOICreated?: (aoi: AOI) => void;
}

const EnhancedMapComponent: React.FC<EnhancedMapComponentProps> = ({ onAOICreated }) => {
  const router = useRouter();
  const { currentAnalysis } = useAnalysis();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const currentPolygonRef = useRef<L.Polygon | null>(null);
  const tempMarkersRef = useRef<L.CircleMarker[]>([]);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  
  // State management
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Array<[number, number]>>([]);
  const [aoiBounds, setAoiBounds] = useState({ north: 0, south: 0, east: 0, west: 0 });
  const [aoiArea, setAoiArea] = useState<string>('0');
  const [aoiLocked, setAoiLocked] = useState(false);
  const [analysisStarted, setAnalysisStarted] = useState(false);
  
  // Location search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const mapInstance = L.map(mapRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
    });

    // Satellite imagery
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri',
      maxZoom: 19,
    }).addTo(mapInstance);

    // Reference labels
    L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri',
      maxZoom: 19,
    }).addTo(mapInstance);

    const featureGroup = L.featureGroup().addTo(mapInstance);
    drawnItemsRef.current = featureGroup;
    mapInstanceRef.current = mapInstance;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Location search with debounce
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const delaySearch = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`,
          {
            headers: {
              'Accept': 'application/json',
            }
          }
        );
        const data = await response.json();
        setSearchResults(data);
        setShowResults(data.length > 0);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const handleLocationSelect = (result: LocationResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (mapInstanceRef.current) {
      // Remove previous marker
      if (searchMarkerRef.current) {
        searchMarkerRef.current.remove();
      }

      // Create custom marker icon
      const customIcon = L.divIcon({
        className: 'custom-search-marker',
        html: `
          <div style="position: relative;">
            <div style="
              width: 30px;
              height: 30px;
              background: linear-gradient(135deg, #f59e0b, #d97706);
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 4px 12px rgba(245,158,11,0.4);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(mapInstanceRef.current);
      marker.bindPopup(`<b>${result.display_name}</b>`).openPopup();
      searchMarkerRef.current = marker;

      // Zoom to location
      mapInstanceRef.current.setView([lat, lng], 13, { animate: true });
    }

    setSearchQuery(result.display_name.split(',')[0]);
    setShowResults(false);
  };

  const startDrawing = () => {
    if (!mapInstanceRef.current) return;

    setIsDrawing(true);
    setDrawingPoints([]);
    setAoiLocked(false);
    
    // Clear existing polygon and markers
    if (currentPolygonRef.current) {
      currentPolygonRef.current.remove();
      currentPolygonRef.current = null;
    }
    tempMarkersRef.current.forEach(m => m.remove());
    tempMarkersRef.current = [];

    const map = mapInstanceRef.current;
    map.getContainer().style.cursor = 'crosshair';

    const onMapClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setDrawingPoints(prev => {
        const newPoints = [...prev, [lat, lng] as [number, number]];
        
        // Add visible marker for this point
        const marker = L.circleMarker([lat, lng], {
          radius: 6,
          fillColor: '#f59e0b',
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(map);
        tempMarkersRef.current.push(marker);

        // Draw/update polygon if we have at least 2 points
        if (newPoints.length >= 2) {
          if (currentPolygonRef.current) {
            currentPolygonRef.current.setLatLngs(newPoints);
          } else {
            const polygon = L.polygon(newPoints, {
              color: '#f59e0b',
              weight: 3,
              fillColor: '#f59e0b',
              fillOpacity: 0.2
            }).addTo(map);
            currentPolygonRef.current = polygon;
          }

          // Calculate and update area in real-time
          if (newPoints.length >= 3) {
            const area = calculatePolygonArea(newPoints);
            setAoiArea(area.toFixed(2));
          }
        }

        return newPoints;
      });
    };

    const onMapRightClick = () => {
      finishDrawing();
    };

    map.on('click', onMapClick);
    map.on('contextmenu', onMapRightClick);

    // Store cleanup function
    (map as any)._drawingCleanup = () => {
      map.off('click', onMapClick);
      map.off('contextmenu', onMapRightClick);
      map.getContainer().style.cursor = '';
    };
  };

  const finishDrawing = () => {
    if (!mapInstanceRef.current || drawingPoints.length < 3) {
      alert('Please draw at least 3 points to create a polygon');
      return;
    }

    const map = mapInstanceRef.current;
    if ((map as any)._drawingCleanup) {
      (map as any)._drawingCleanup();
    }

    setIsDrawing(false);

    // Calculate bounds
    const lats = drawingPoints.map(p => p[0]);
    const lngs = drawingPoints.map(p => p[1]);
    const bounds = {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    };
    setAoiBounds(bounds);

    // Calculate area
    const area = calculatePolygonArea(drawingPoints);
    setAoiArea(area.toFixed(2));
  };

  const calculatePolygonArea = (points: Array<[number, number]>): number => {
    if (points.length < 3) return 0;

    // Shoelace formula for area calculation
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i][1] * points[j][0];
      area -= points[j][1] * points[i][0];
    }
    area = Math.abs(area / 2);

    // Convert to km² (rough approximation: 1 degree ≈ 111 km)
    return area * 111 * 111;
  };

  const lockAOI = () => {
    if (drawingPoints.length < 3) {
      alert('Please complete drawing before locking AOI');
      return;
    }
    setAoiLocked(true);
  };

  const clearAOI = () => {
    // Clear polygon
    if (currentPolygonRef.current) {
      currentPolygonRef.current.remove();
      currentPolygonRef.current = null;
    }

    // Clear markers
    tempMarkersRef.current.forEach(m => m.remove());
    tempMarkersRef.current = [];

    // Reset state
    setDrawingPoints([]);
    setIsDrawing(false);
    setAoiLocked(false);
    setAnalysisStarted(false);
    setAoiBounds({ north: 0, south: 0, east: 0, west: 0 });
    setAoiArea('0');

    if (mapInstanceRef.current && (mapInstanceRef.current as any)._drawingCleanup) {
      (mapInstanceRef.current as any)._drawingCleanup();
    }
  };

  const startAnalysis = async () => {
    if (!aoiLocked) {
      alert('Please lock the AOI before starting analysis');
      return;
    }

    try {
      setAnalysisStarted(true);

      // Create AOI object
      // GeoJSON polygon must be closed (first point = last point)
      const closedCoordinates = drawingPoints.map(p => [p[1], p[0]]); // [lng, lat]
      closedCoordinates.push(closedCoordinates[0]); // Close the polygon
      
      const aoiData: AOI = {
        id: `aoi-${Date.now()}`,
        geometry: {
          type: 'Polygon',
          coordinates: [closedCoordinates]
        },
        properties: {
          name: `AOI ${new Date().toLocaleDateString()}`,
          created_at: new Date().toISOString(),
          area_km2: parseFloat(aoiArea)
        },
        bounding_box: aoiBounds
      };

      console.log('📍 Creating AOI...', aoiData);

      // Step 1: Create AOI in backend
      // Note: Don't send created_at - let Python backend generate it
      const createResponse = await createAOI(
        aoiData.geometry, 
        {
          name: aoiData.properties.name,
          description: 'User-drawn AOI from map',
          area_km2: aoiData.properties.area_km2
        }
      );
      console.log('✅ AOI created:', createResponse);

      const aoiId = createResponse.id;

      // Step 2: Start analysis
      console.log('🚀 Starting analysis for AOI:', aoiId);
      const analysisResponse = await startBackendAnalysis(aoiId);
      console.log('✅ Analysis started:', analysisResponse);

      // Callback to parent component
      if (onAOICreated) {
        onAOICreated({
          ...aoiData,
          id: aoiId
        });
      }

      // Navigate to analysis progress page
      router.push(`/geoanalyst-dashboard/analysis?id=${analysisResponse.analysis_id}`);

    } catch (error: any) {
      console.error('❌ Analysis error:', error);
      setAnalysisStarted(false);
      alert(`Failed to start analysis:\n${error.message}\n\nPlease ensure the Python backend is running.`);
    }
  };

  // Show ongoing analysis if one exists
  if (currentAnalysis?.status === 'processing') {
    return (
      <AnalysisProgress
        analysisId={currentAnalysis.analysisId}
        onComplete={(results) => {
          // Analysis completed, context will be updated by AnalysisProgress
          // User will see results and can navigate to history
        }}
        onError={(error) => {
          // Analysis failed, context will be updated by AnalysisProgress
          console.error('Analysis error:', error);
        }}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100%' }}>
      {/* Control Panel */}
      <Paper 
        elevation={3} 
        sx={{ 
          width: 380, 
          height: '100%', 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0
        }}
      >
        <Box sx={{ p: 2 }}>
          {/* Header */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <MapIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              AOI Selection
            </Typography>
          </Stack>

          {/* Location Search */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Search Location
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Type city, state, or landmark..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: isSearching ? (
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                ) : (
                  <Search sx={{ mr: 1, color: 'text.secondary' }} />
                ),
              }}
            />
            
            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <Paper 
                elevation={3} 
                sx={{ 
                  position: 'absolute', 
                  zIndex: 1000, 
                  width: 348,
                  maxHeight: 300, 
                  overflowY: 'auto',
                  mt: 0.5
                }}
              >
                <List dense>
                  {searchResults.map((result) => (
                    <ListItem key={result.place_id} disablePadding>
                      <ListItemButton onClick={() => handleLocationSelect(result)}>
                        <ListItemText 
                          primary={result.display_name.split(',')[0]}
                          secondary={result.display_name.split(',').slice(1, 3).join(',')}
                          primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                          secondaryTypographyProps={{ fontSize: '0.75rem' }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Instructions */}
          <Alert severity="info" icon={<Info />} sx={{ mb: 2, fontSize: '0.75rem' }}>
            <Typography variant="caption" display="block">
              <strong>1.</strong> Search for a location (optional)
            </Typography>
            <Typography variant="caption" display="block">
              <strong>2.</strong> Click "Draw AOI" and mark points on map
            </Typography>
            <Typography variant="caption" display="block">
              <strong>3.</strong> Right-click to finish drawing (min 3 points)
            </Typography>
            <Typography variant="caption" display="block">
              <strong>4.</strong> Click "Lock AOI" then "Start Analysis"
            </Typography>
          </Alert>

          {/* Drawing Controls */}
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            {!isDrawing && !aoiLocked && (
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<Edit />}
                onClick={startDrawing}
              >
                Draw Area of Interest
              </Button>
            )}

            {isDrawing && (
              <>
                <Chip 
                  label={`Drawing: ${drawingPoints.length} points`}
                  color="warning"
                  icon={<Edit />}
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircle />}
                    onClick={finishDrawing}
                    disabled={drawingPoints.length < 3}
                  >
                    Finish
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    startIcon={<Cancel />}
                    onClick={clearAOI}
                  >
                    Cancel
                  </Button>
                </Stack>
              </>
            )}

            {!isDrawing && drawingPoints.length >= 3 && !aoiLocked && (
              <Button
                fullWidth
                variant="contained"
                color="success"
                startIcon={<CheckCircle />}
                onClick={lockAOI}
              >
                Lock AOI Selection
              </Button>
            )}
          </Stack>

          {/* AOI Info Display */}
          {drawingPoints.length >= 3 && (
            <>
              <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  GEOGRAPHIC BOUNDS
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Box sx={{ display: 'flex', gap: 2, mb: 0.5 }}>
                    <Typography variant="body2" fontSize="0.75rem" sx={{ flex: 1 }}>
                      <strong>North:</strong> {aoiBounds.north.toFixed(6)}°
                    </Typography>
                    <Typography variant="body2" fontSize="0.75rem" sx={{ flex: 1 }}>
                      <strong>South:</strong> {aoiBounds.south.toFixed(6)}°
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, mb: 0.5 }}>
                    <Typography variant="body2" fontSize="0.75rem" sx={{ flex: 1 }}>
                      <strong>East:</strong> {aoiBounds.east.toFixed(6)}°
                    </Typography>
                    <Typography variant="body2" fontSize="0.75rem" sx={{ flex: 1 }}>
                      <strong>West:</strong> {aoiBounds.west.toFixed(6)}°
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 0.5 }} />
                  <Typography variant="body2" fontSize="0.75rem" color="primary">
                    <strong>Area:</strong> {aoiArea} km²
                  </Typography>
                </Box>
              </Paper>

              {aoiLocked && (
                <Chip 
                  label="AOI Locked ✓"
                  color="success"
                  sx={{ mb: 2, width: '100%' }}
                />
              )}
            </>
          )}

          {/* Action Buttons */}
          <Stack spacing={1}>
            {aoiLocked && (
              <Button
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                startIcon={<PlayArrow />}
                onClick={startAnalysis}
                disabled={analysisStarted}
              >
                {analysisStarted ? 'Analysis Started...' : 'Start Analysis'}
              </Button>
            )}

            {(drawingPoints.length > 0 || aoiLocked) && (
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<Refresh />}
                onClick={clearAOI}
              >
                Redraw AOI
              </Button>
            )}
          </Stack>
        </Box>
      </Paper>

      {/* Map Container */}
      <Box ref={mapRef} sx={{ flex: 1, height: '100%' }} />
    </Box>
  );
};

export default EnhancedMapComponent;

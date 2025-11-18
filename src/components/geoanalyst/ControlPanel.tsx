'use client';

import React, { useState } from 'react';
import { Search, Edit3, Play, User } from 'lucide-react';
import { AOI } from '@/types/geoanalyst';
import { searchLocation } from '@/services/geoanalyst/api';
import { useAuth } from '@/contexts/AuthContext';

interface ControlPanelProps {
  onAOICreated: (aoi: AOI) => void;
  onStartAnalysis: () => void;
  canStartAnalysis: boolean;
  onLocationSearch?: (lat: number, lng: number) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  onAOICreated,
  onStartAnalysis,
  canStartAnalysis,
  onLocationSearch,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchLocation(searchQuery);
      setSearchResults(results);

      // Auto-select first result
      if (results.length > 0 && onLocationSearch) {
        const { latitude, longitude } = results[0].coordinates;
        onLocationSearch(latitude, longitude);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* User Info */}
      {user && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500 rounded-full p-2">
              <User className="text-white" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Logged in as</p>
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search Box */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          <Search className="inline mr-2" size={16} />
          Search Location
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter city, state, or coordinates..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSearching}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors font-semibold"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {searchResults.slice(0, 3).map((result, index) => (
              <button
                key={index}
                onClick={() => {
                  if (onLocationSearch) {
                    onLocationSearch(
                      result.coordinates.latitude,
                      result.coordinates.longitude
                    );
                  }
                  setSearchResults([]);
                }}
                className="w-full text-left p-2 hover:bg-gray-50 rounded border border-gray-200 text-sm"
              >
                <p className="font-medium text-gray-900">{result.name}</p>
                <p className="text-xs text-gray-500">{result.displayName}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* AOI Tools */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Area of Interest (AOI)
        </h3>
        <div className="space-y-2">
          <button
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-semibold"
          >
            <Edit3 size={18} />
            <span>Draw Polygon on Map</span>
          </button>
        </div>
      </div>

      {/* Analysis */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Run Analysis
        </h3>
        <button
          onClick={onStartAnalysis}
          disabled={!canStartAnalysis}
          className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-semibold transition-colors ${
            canStartAnalysis
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Play size={18} />
          <span>Start Mining Detection</span>
        </button>
        {!canStartAnalysis && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Please create an AOI first
          </p>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;

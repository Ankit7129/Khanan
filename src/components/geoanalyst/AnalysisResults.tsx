'use client';

import React, { useState } from 'react';
import { X, MapPin, BarChart3, Download, CheckCircle } from 'lucide-react';
import { AnalysisData, AOI } from '@/types/geoanalyst';

interface AnalysisResultsProps {
  analysisData: AnalysisData;
  aoi: AOI | null;
  onClose: () => void;
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  analysisData,
  aoi,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'detections' | 'map'>('overview');

  const tiles = analysisData?.tiles || [];
  const totalTiles = tiles.length;
  const detectedTiles = tiles.filter((t) => t.miningDetected).length;
  const totalArea = tiles.reduce((sum, t) => sum + (t.total_area_m2 || 0), 0) / 10000; // Convert to hectares

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 flex justify-between items-center">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <CheckCircle size={32} />
              <h2 className="text-3xl font-bold">Analysis Complete</h2>
            </div>
            <p className="text-green-100">Mining detection analysis finished successfully</p>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {['overview', 'detections', 'map'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-4 px-6 font-semibold transition-colors capitalize ${activeTab === tab
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                  : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <MapPin className="text-slate-700" size={24} />
                    <h3 className="font-semibold text-gray-700">Total Tiles</h3>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">{totalTiles}</p>
                  <p className="text-sm text-gray-600">Analyzed regions</p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <BarChart3 className="text-red-600" size={24} />
                    <h3 className="font-semibold text-gray-700">Detections</h3>
                  </div>
                  <p className="text-3xl font-bold text-red-600">{detectedTiles}</p>
                  <p className="text-sm text-gray-600">Mining activity detected</p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <MapPin className="text-amber-600" size={24} />
                    <h3 className="font-semibold text-gray-700">Total Area</h3>
                  </div>
                  <p className="text-3xl font-bold text-amber-600">{totalArea.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Hectares detected</p>
                </div>
              </div>

              {/* AOI Info */}
              {aoi && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">Area of Interest</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <p className="font-semibold">{aoi.properties.name || 'Unnamed'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Area:</span>
                      <p className="font-semibold">{aoi.properties.area_km2?.toFixed(2)} km²</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Created:</span>
                      <p className="font-semibold">
                        {new Date(aoi.properties.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'detections' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Detected Mining Sites</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tiles
                  .filter((tile) => tile.miningDetected)
                  .map((tile) => (
                    <div
                      key={tile.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900">Tile #{tile.index}</h4>
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          Mining Detected
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Coverage:</span>
                          <span className="ml-2 font-semibold">
                            {tile.miningPercentage?.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Confidence:</span>
                          <span className="ml-2 font-semibold">
                            {((tile.confidence || 0) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Area:</span>
                          <span className="ml-2 font-semibold">
                            {((tile.total_area_m2 || 0) / 10000).toFixed(2)} ha
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'map' && (
            <div className="text-center py-12">
              <MapPin className="mx-auto text-gray-400 mb-4" size={64} />
              <p className="text-gray-600">Map visualization coming soon...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-end space-x-3">
          <button
            className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors font-semibold"
          >
            <Download size={18} />
            <span>Download Report</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResults;

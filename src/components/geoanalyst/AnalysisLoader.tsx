'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { LoadingStep } from '@/types/geoanalyst';

interface AnalysisLoaderProps {
  currentStep: LoadingStep;
  progress: number;
  message?: string;
}

const AnalysisLoader: React.FC<AnalysisLoaderProps> = ({
  currentStep,
  progress,
  message,
}) => {
  const steps = [
    { id: 'validating', label: 'Validating AOI', description: 'Checking area boundaries' },
    { id: 'connecting', label: 'Connecting to Satellite', description: 'Establishing connection' },
    { id: 'requesting', label: 'Requesting Imagery', description: 'Fetching satellite data' },
    { id: 'preprocessing', label: 'Preprocessing', description: 'Preparing images for analysis' },
    { id: 'processing', label: 'AI Detection', description: 'Running mining detection models' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <Loader2 className="animate-spin text-blue-500 mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Analyzing Mining Activity
          </h2>
          <p className="text-gray-600">{message || 'Please wait...'}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;

            return (
              <div
                key={step.id}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-50 border-2 border-blue-500'
                    : isCompleted
                    ? 'bg-green-50 border border-green-300'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                <div className="flex-1">
                  <p
                    className={`font-semibold ${
                      isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-600'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {isActive && <Loader2 className="animate-spin text-blue-500" size={20} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AnalysisLoader;

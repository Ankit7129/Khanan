'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

export interface CurrentAnalysis {
  analysisId: string;
  aoiId?: string;
  status: 'processing' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  progress: number;
  message?: string;
  results?: any;
}

interface AnalysisContextType {
  currentAnalysis: CurrentAnalysis | null;
  setCurrentAnalysis: (analysis: CurrentAnalysis | null) => void;
  updateAnalysisProgress: (progress: number, message?: string) => void;
  updateAnalysisStatus: (status: CurrentAnalysis['status'], results?: any) => void;
  clearAnalysis: () => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [currentAnalysis, setCurrentAnalysis] = useState<CurrentAnalysis | null>(null);

  // Persist analysis to localStorage on change
  useEffect(() => {
    if (currentAnalysis) {
      try {
        localStorage.setItem('currentAnalysis', JSON.stringify({
          ...currentAnalysis,
          startTime: new Date(currentAnalysis.startTime).toISOString(),
          endTime: currentAnalysis.endTime ? new Date(currentAnalysis.endTime).toISOString() : null
        }));
      } catch (error) {
        console.error('Failed to save analysis to localStorage:', error);
      }
    } else {
      try {
        localStorage.removeItem('currentAnalysis');
      } catch (error) {
        console.error('Failed to clear analysis from localStorage:', error);
      }
    }
  }, [currentAnalysis]);

  // Load analysis from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentAnalysis');
      if (stored) {
        const analysis = JSON.parse(stored);
        // Only restore if analysis is still processing
        if (analysis.status === 'processing') {
          setCurrentAnalysis({
            ...analysis,
            startTime: new Date(analysis.startTime),
            endTime: analysis.endTime ? new Date(analysis.endTime) : undefined
          });
        }
      }
    } catch (error) {
      console.error('Failed to load analysis from localStorage:', error);
    }
  }, []);

  const updateAnalysisProgress = (progress: number, message?: string) => {
    setCurrentAnalysis(prev => {
      if (!prev) return null;
      return {
        ...prev,
        progress,
        message: message || prev.message
      };
    });
  };

  const updateAnalysisStatus = (status: CurrentAnalysis['status'], results?: any) => {
    setCurrentAnalysis(prev => {
      if (!prev) return null;
      const endTime = new Date();
      return {
        ...prev,
        status,
        endTime,
        duration: Math.floor((endTime.getTime() - new Date(prev.startTime).getTime()) / 1000),
        results
      };
    });
  };

  const clearAnalysis = () => {
    setCurrentAnalysis(null);
  };

  return (
    <AnalysisContext.Provider
      value={{
        currentAnalysis,
        setCurrentAnalysis,
        updateAnalysisProgress,
        updateAnalysisStatus,
        clearAnalysis
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
}

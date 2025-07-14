"use client";

import React from 'react';
import { useAudio } from '@/contexts/AudioContext';

interface HeaderProps {
  currentUrl: string | null;
  onBack: () => void;
  onStartOver: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUrl, onBack, onStartOver }) => {
  const { cacheStats, handleClearCache } = useAudio();

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-300 hover:scale-105 group"
          >
            <svg className="w-5 h-5 group-hover:transform group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-mono-enhanced text-sm font-medium">Back</span>
          </button>
          
          <div className="flex items-center gap-4">
            {/* Development Cache Stats */}
            {process.env.NODE_ENV === 'development' && cacheStats?.enabled && (
              <div className="flex items-center gap-3 text-xs">
                <div className="glass-card px-3 py-1 rounded-lg">
                  <span className="text-white/70 font-mono-enhanced">
                    TTS Cache: {cacheStats.count} items ({cacheStats.size})
                  </span>
                </div>
                {cacheStats.count > 0 && (
                  <button
                    onClick={handleClearCache}
                    className="text-white/50 hover:text-red-400 transition-colors duration-300 font-mono-enhanced"
                    title="Clear TTS cache"
                  >
                    🗑️
                  </button>
                )}
              </div>
            )}
            
            <div className="text-sm text-white/50 hidden sm:block font-mono-enhanced">
              {currentUrl && new URL(currentUrl).hostname}
            </div>
            <button
              onClick={onStartOver}
              className="btn-premium px-6 py-2 rounded-lg font-mono-enhanced text-sm"
            >
              New Site
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 
"use client";

import React from 'react';
import { ArrowLeft, RotateCcw, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  currentUrl: string | null;
  onBack: () => void;
  onStartOver: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUrl, onBack, onStartOver }) => {
  const router = useRouter();

  const handleMaximizedPlayer = () => {
    router.push('/read/player');
  };

  return (
    <div className="flex-shrink-0 px-3 lg:px-4 py-3 border-b border-white/10 bg-black/20 backdrop-blur-sm">
      <div className="max-w-none">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Navigation and Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              title="Back to home"
            >
              <ArrowLeft size={16} />
              <span className="text-sm">Back</span>
            </button>
            
            <button
              onClick={onStartOver}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              title="Start over"
            >
              <RotateCcw size={16} />
              <span className="text-sm">Start Over</span>
            </button>
          </div>

          {/* Right side with URL and Play Button */}
          <div className="flex items-center gap-4">
            {/* URL Display */}
            {currentUrl && (
              <div className="flex items-center gap-2 text-xs text-white/60 group hover:text-white/80 transition-colors min-w-0">
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <a 
                  href={currentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-mono hover:text-white transition-all duration-300 truncate"
                >
                  {currentUrl}
                </a>
              </div>
            )}

            {/* Play Button - Made more prominent */}
            <button
              onClick={handleMaximizedPlayer}
              className="flex items-center justify-center w-12 h-12 bg-white/15 hover:bg-white/30 text-white rounded-full transition-all duration-300 hover:scale-110 border border-white/20 shadow-lg"
              title="Open maximized player"
            >
              <Play size={20} fill="currentColor" className="ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header; 
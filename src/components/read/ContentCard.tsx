"use client";

import React from 'react';
import { useAudio } from '@/contexts/AudioContext';

interface ContentCardProps {
  id: string;
  title: string;
  content: string;
  type: 'section' | 'summary' | 'more-sections';
  index?: number;
  isAnimating?: boolean;
  hasAnimated?: boolean;
  isCurrentlyPlaying?: boolean;
  additionalSectionsCount?: number;
  onClick?: () => void;
}

// Helper function to truncate text at word boundaries
const truncateAtWordBoundary = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  
  // Find the last space within the limit
  let truncated = text.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  // If we found a space, truncate there
  if (lastSpaceIndex > 0) {
    truncated = truncated.substring(0, lastSpaceIndex);
  }
  
  return truncated + '...';
};

const ContentCard: React.FC<ContentCardProps> = ({
  id,
  title,
  content,
  type,
  index = 0,
  isAnimating = false,
  hasAnimated = false,
  additionalSectionsCount = 0,
  onClick
}) => {
  const { currentPlayingSection, playSectionDirectly, isGeneratingAudio, setIsMaximized } = useAudio();

  const isPlaying = currentPlayingSection === id;

  const handleDirectPlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (content && !isGeneratingAudio) {
      await playSectionDirectly(id, content);
      // Automatically open maximized player view
      setIsMaximized(true);
    }
  };

  const handleAddToQueue = () => {
    if (onClick) {
      onClick();
    }
  };

  // Special handling for "more sections" card
  if (type === 'more-sections') {
    return (
      <div className={`relative overflow-hidden bg-black/40 backdrop-blur-sm border border-white/15 rounded-xl transition-all duration-500 hover:border-white/30 hover:bg-black/30 hover:shadow-lg hover:shadow-white/5 group cursor-pointer
        ${isAnimating ? `card-animate-enter card-animate-delay-${Math.min(index, 5)}` : ''} 
        ${hasAnimated ? 'animate-visible' : ''}`}
        onClick={handleAddToQueue}
      >
        <div className="p-4">
          <div className="flex items-center justify-center h-16">
            <div className="text-center">
              <div className="text-white/80 text-sm font-medium mb-1">
                +{additionalSectionsCount} more sections
              </div>
              <div className="text-white/50 text-xs">
                Click to view all
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-black/40 backdrop-blur-sm border border-white/15 rounded-xl transition-all duration-500 hover:border-white/30 hover:bg-black/30 hover:shadow-lg hover:shadow-white/10 group
      ${isAnimating ? `card-animate-enter card-animate-delay-${Math.min(index, 5)}` : ''} 
      ${hasAnimated ? 'animate-visible' : ''}
      ${isPlaying ? 'border-white/50 bg-black/30 shadow-white/20' : ''}`}
    >
      <div className="p-4">
        {/* Header with title and play button */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white line-clamp-2 leading-tight mb-1">
              {title}
            </h3>
            {type === 'summary' && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                <span className="text-xs text-blue-400 font-medium">Summary</span>
              </div>
            )}
          </div>
          
          {/* Direct Play Button */}
          <button
            onClick={handleDirectPlay}
            disabled={isGeneratingAudio}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white text-white hover:text-black transition-all duration-200 flex items-center justify-center group-hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 hover:border-white hover:scale-105"
            title="Play in maximized view"
          >
            {isGeneratingAudio && currentPlayingSection === id ? (
              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
            ) : isPlaying ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>
        </div>

        {/* Content Preview */}
        <div className="text-xs text-white/70 line-clamp-3 leading-relaxed mb-4">
          {truncateAtWordBoundary(content, 150)}
        </div>

        {/* Footer with stats and add button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span>{content.split(' ').length} words</span>
            <span>•</span>
            <span>~{Math.ceil(content.split(' ').length / 200)}m</span>
          </div>
          
          {/* Add to Queue Button */}
          <button
            onClick={handleAddToQueue}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-lg text-xs text-white transition-all duration-200 hover:scale-105"
          >
            Add to Queue
          </button>
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl" />
      
      {/* Subtle glow effect when playing */}
      {isPlaying && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 rounded-xl pointer-events-none" />
      )}
    </div>
  );
};

export default ContentCard; 
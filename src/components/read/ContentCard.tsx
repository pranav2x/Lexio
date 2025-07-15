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
  isCurrentlyPlaying = false,
  additionalSectionsCount = 0,
  onClick
}) => {
  const { currentPlayingSection } = useAudio();

  const isPlaying = currentPlayingSection === id;

  // Different card content based on type
  const renderCardContent = () => {
    if (type === 'more-sections') {
      return (
        <div className="w-full h-44 flex flex-col justify-center items-center text-center px-4 py-6">
          <div className="w-14 h-14 glass-card rounded-full flex items-center justify-center mb-4 neon-glow bg-gradient-to-br from-white/10 to-white/5">
            <svg className="w-7 h-7 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-white mb-2 font-mono-enhanced">More Sections</h3>
          <p className="text-xs text-white/70 font-mono-enhanced">
            +{additionalSectionsCount} additional sections available
          </p>
        </div>
      );
    }

    // Get gradient based on type and index - all white/gray now
    const getGradient = () => {
      if (type === 'summary') {
        return 'from-white/10 to-white/5';
      }
      const gradients = [
        'from-white/8 to-white/4',
        'from-white/12 to-white/6',
        'from-white/9 to-white/4',
        'from-white/11 to-white/5',
        'from-white/7 to-white/3',
        'from-white/10 to-white/4'
      ];
      return gradients[index % gradients.length];
    };

    // Get accent color based on type and index - all white variants now
    const getAccentColor = () => {
      if (type === 'summary') {
        return 'bg-gradient-to-r from-white/90 to-white/70';
      }
      const colors = [
        'bg-gradient-to-r from-white/80 to-white/60',
        'bg-gradient-to-r from-white/85 to-white/65',
        'bg-gradient-to-r from-white/90 to-white/70',
        'bg-gradient-to-r from-white/75 to-white/55',
        'bg-gradient-to-r from-white/88 to-white/68',
        'bg-gradient-to-r from-white/82 to-white/62'
      ];
      return colors[index % colors.length];
    };

    return (
      <div className="w-full h-44 flex flex-col px-4 py-5 relative">
        {/* Background gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${getGradient()} opacity-30 rounded-xl`}></div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
              <div className={`w-3 h-3 rounded-full ${getAccentColor()} shadow-lg flex-shrink-0`}></div>
              <h3 className="text-sm font-bold text-white truncate font-mono-enhanced">
                {title}
              </h3>
            </div>
            {type === 'summary' && (
              <div className="flex-shrink-0">
                <div className="bg-white/10 border border-white/20 rounded-full px-2 py-1">
                  <span className="text-xs text-white/80 font-mono-enhanced font-medium">Summary</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-hidden pr-1">
            <p className={`text-sm text-white/90 leading-relaxed font-mono-enhanced ${
              type === 'summary' 
                ? 'summary-text-container' 
                : 'line-clamp-4 break-words'
            }`}>
              {type === 'summary' ? truncateAtWordBoundary(content, 150) : truncateAtWordBoundary(content, 160)}
            </p>
          </div>
          
          {/* Bottom action hint */}
          <div className="mt-4 flex items-center gap-2 text-xs text-white/60">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            <span className="font-mono-enhanced">Click to add to queue</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`w-full glass-card rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] overflow-hidden ${
        isPlaying
          ? 'border-white/40 bg-white/8 shadow-2xl shadow-white/20 ring-2 ring-white/20' 
          : 'hover:bg-white/6 hover:border-white/15 hover:shadow-xl hover:shadow-white/10'
      } ${
        isAnimating || !hasAnimated 
          ? `card-animate-enter card-animate-delay-${index} ${hasAnimated ? 'animate-visible' : ''}` 
          : ''
      }`}
      onClick={onClick}
    >
      {/* Subtle sparkle effect during entrance */}
      {(isAnimating || !hasAnimated) && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
          {[...Array(type === 'summary' ? 6 : 4)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-70"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
                animationName: 'sparkle',
                animationDuration: '2s',
                animationTimingFunction: 'ease-out',
                animationFillMode: 'forwards',
                animationDelay: `${index * 200 + i * 300}ms`
              }}
            />
          ))}
        </div>
      )}
      
      {/* Playing indicator */}
      {isPlaying && (
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-xs text-white/80 font-mono-enhanced">Playing</span>
        </div>
      )}
      
      {renderCardContent()}
    </div>
  );
};

export default ContentCard; 
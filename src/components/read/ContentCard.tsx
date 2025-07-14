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
        <div className="w-full h-40 flex flex-col justify-center items-center text-center">
          <div className="w-10 h-10 glass-card rounded-full flex items-center justify-center mb-3 neon-glow">
            <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-xs font-semibold text-white mb-2 font-mono-enhanced">More Sections</h3>
          <p className="text-xs text-white/70 font-mono-enhanced">
            +{additionalSectionsCount} additional sections available
          </p>
        </div>
      );
    }

    return (
      <div className="w-full h-40 flex flex-col neon-glow shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-md ${
              type === 'summary' 
                ? 'bg-gradient-to-r from-white/90 to-white/60'
                : index % 3 === 0 
                  ? 'bg-gradient-to-r from-white/90 to-white/60' 
                  : index % 3 === 1 
                    ? 'bg-gradient-to-r from-white/80 to-white/50' 
                    : 'bg-gradient-to-r from-white/85 to-white/55'
            }`}></div>
            <h3 className="text-xs font-semibold text-white truncate font-mono-enhanced">
              {title}
            </h3>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-sm text-white/80 leading-[1.4] font-mono-enhanced line-clamp-4">
            {content.length > 120 ? content.substring(0, 120) + '...' : content}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`w-full glass-card rounded-xl p-4 cursor-pointer ${
        isPlaying
          ? 'border-white/40 bg-white/8 animate-pulse shadow-white/20' 
          : 'hover:bg-white/5'
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
          {[...Array(type === 'summary' ? 4 : 3)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-70"
              style={{
                left: `${15 + Math.random() * 70}%`,
                top: `${15 + Math.random() * 70}%`,
                animationName: 'sparkle',
                animationDuration: '1.5s',
                animationTimingFunction: 'ease-out',
                animationFillMode: 'forwards',
                animationDelay: `${index * 150 + i * 200}ms`
              }}
            />
          ))}
        </div>
      )}
      
      {renderCardContent()}
    </div>
  );
};

export default ContentCard; 
"use client";

import React from 'react';

interface ContentCardProps {
  id: string;
  title: string;
  content: string;
  type: 'section' | 'summary' | 'more-sections';
  index?: number;
  isAnimating?: boolean;
  hasAnimated?: boolean;
  additionalSectionsCount?: number;
}

const truncateAtWordBoundary = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  let truncated = text.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  if (lastSpaceIndex > 0) truncated = truncated.substring(0, lastSpaceIndex);
  return truncated + '...';
};

const ContentCard: React.FC<ContentCardProps> = ({
  title,
  content,
  type,
  index = 0,
  isAnimating = false,
  hasAnimated = false,
  additionalSectionsCount = 0
}) => {

  if (type === 'more-sections') {
    return (
      <div
        className={`relative overflow-hidden bg-black/40 backdrop-blur-sm border border-white/15 rounded-xl transition-all duration-500 hover:border-white/30 hover:bg-black/30 hover:shadow-lg hover:shadow-white/5 group ${isAnimating ? `card-animate-enter card-animate-delay-${Math.min(index, 5)}` : ''} ${hasAnimated ? 'animate-visible' : ''}`}
      >
        <div className="p-4">
          <div className="flex items-center justify-center h-16">
            <div className="text-center">
              <div className="text-white/80 text-sm font-medium mb-1">
                +{additionalSectionsCount} more sections
              </div>
              <div className="text-white/50 text-xs">Click to view all</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-black/40 backdrop-blur-sm border border-white/15 rounded-xl transition-all duration-500 hover:border-white/30 hover:bg-black/30 hover:shadow-lg hover:shadow-white/10 group ${isAnimating ? `card-animate-enter card-animate-delay-${Math.min(index, 5)}` : ''} ${hasAnimated ? 'animate-visible' : ''}`}>
      <div className="p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-white line-clamp-2 leading-tight mb-1">{title}</h3>
          {type === 'summary' && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
              <span className="text-xs text-blue-400 font-medium">Summary</span>
            </div>
          )}
        </div>

        <div className="text-xs text-white/70 line-clamp-3 leading-relaxed mb-4">
          {truncateAtWordBoundary(content, 150)}
        </div>

        <div className="flex items-center gap-2 text-xs text-white/50">
          <span>{content.split(' ').length} words</span>
          <span>•</span>
          <span>~{Math.ceil(content.split(' ').length / 200)}m</span>
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-white/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl" />
    </div>
  );
};

export default ContentCard;
"use client";

import React, { useEffect, useRef } from 'react';

interface WordData {
  word: string;
  index: number;
  startTime: number;
  endTime: number;
}

interface WordHighlighterProps {
  wordsData: WordData[];
  currentWordIndex: number;
  isPlaying: boolean;
  content: string;
  onWordClick: (index: number) => void;
  highlightedWordRef?: React.RefObject<HTMLSpanElement | null>;
  textSize?: 'sm' | 'md' | 'lg';
  compact?: boolean;
}

const WordHighlighter: React.FC<WordHighlighterProps> = ({
  wordsData,
  currentWordIndex,
  isPlaying,
  content,
  onWordClick,
  highlightedWordRef,
  textSize = 'md',
  compact = false
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Fallback mode: show static text when wordsData is empty but content exists
  const isFallbackMode = !wordsData.length && content.length > 0;

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const lineHeightClasses = {
    sm: 'leading-6',
    md: 'leading-7',
    lg: 'leading-9'
  };

  // Auto-scroll to highlighted word
  useEffect(() => {
    if (highlightedWordRef?.current && scrollContainerRef.current && !isFallbackMode) {
      const container = scrollContainerRef.current;
      const highlighted = highlightedWordRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const highlightedRect = highlighted.getBoundingClientRect();
      
      if (highlightedRect.bottom > containerRect.bottom || highlightedRect.top < containerRect.top) {
        highlighted.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [currentWordIndex, isFallbackMode]);

  if (isFallbackMode) {
    // Fallback mode: render static text without highlighting
    return (
      <div 
        ref={scrollContainerRef}
        className={`text-white/90 ${textSizeClasses[textSize]} ${lineHeightClasses[textSize]} font-mono-enhanced text-left select-text ${
          compact ? 'max-h-32 overflow-y-auto' : ''
        }`}
      >
        <div className="text-white/60 text-xs mb-2 font-mono-enhanced">
          {isPlaying ? '🎵 Loading word timing data...' : '📝 Ready to play'}
        </div>
        {content.split(/(\s+)/).map((part, idx) => (
          <span 
            key={idx} 
            className="text-white/80 hover:text-white/90 transition-colors cursor-text"
          >
            {part}
          </span>
        ))}
      </div>
    );
  }

  // Normal mode: render with word highlighting
  return (
    <div 
      ref={scrollContainerRef}
      className={`text-white/90 ${textSizeClasses[textSize]} ${lineHeightClasses[textSize]} font-mono-enhanced text-left select-text ${
        compact ? 'max-h-32 overflow-y-auto' : ''
      }`}
    >
      {wordsData.map((wordData, index) => {
        const isCurrentWord = index === currentWordIndex && isPlaying;
        const isClickable = !compact;
        
        return (
          <span
            key={index}
            ref={isCurrentWord ? highlightedWordRef : undefined}
            className={`transition-all duration-150 ${
              isCurrentWord
                ? 'bg-white/20 text-white shadow-sm rounded-sm px-1 neon-glow'
                : 'text-white/80 hover:text-white/90'
            } ${
              isClickable ? 'cursor-pointer hover:bg-white/10 rounded-sm px-0.5' : ''
            }`}
            onClick={() => isClickable && onWordClick(index)}
          >
            {wordData.word}
          </span>
        );
      })}
    </div>
  );
};

export default WordHighlighter;

"use client";

import React, { useEffect, useRef } from 'react';

export interface WordData {
  text: string;
  start: number;
  end: number;
}

interface WordHighlighterProps {
  words: WordData[];
  currentWordIndex: number;
  onWordClick?: (index: number) => void;
  textSize?: 'sm' | 'md' | 'lg';
  compact?: boolean;
  fallbackText?: string; // Text to show when words are not available
}

const WordHighlighter: React.FC<WordHighlighterProps> = ({
  words,
  currentWordIndex,
  onWordClick,
  textSize = 'md',
  compact = false,
  fallbackText
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const highlightedWordRef = useRef<HTMLSpanElement>(null);

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

  // Enhanced auto-scroll to highlighted word with optimized centering
  useEffect(() => {
    if (highlightedWordRef.current && scrollContainerRef.current && currentWordIndex >= 0) {
      const container = scrollContainerRef.current;
      const highlighted = highlightedWordRef.current;
      
      // Use requestAnimationFrame for smooth scrolling
      requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect();
        const highlightedRect = highlighted.getBoundingClientRect();
        
        // More generous margin for triggering scroll (better UX)
        const margin = 80; // pixels of margin before triggering scroll
        const isAbove = highlightedRect.top < containerRect.top + margin;
        const isBelow = highlightedRect.bottom > containerRect.bottom - margin;
        
        if (isAbove || isBelow) {
          // Enhanced scrolling with better positioning
          highlighted.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
          
          // Optional: Fine-tune position after scroll for perfect centering
          setTimeout(() => {
            const newRect = highlighted.getBoundingClientRect();
            const containerCenter = containerRect.top + containerRect.height / 2;
            const wordCenter = newRect.top + newRect.height / 2;
            const offset = wordCenter - containerCenter;
            
            // Only adjust if offset is significant (> 20px)
            if (Math.abs(offset) > 20) {
              container.scrollBy({
                top: offset,
                behavior: 'smooth'
              });
            }
          }, 300); // Wait for initial scroll to complete
        }
      });
    }
  }, [currentWordIndex]);

  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 WordHighlighter Debug:', {
        totalWords: words.length,
        currentWordIndex,
        currentWord: words[currentWordIndex]?.text || 'none',
        currentWordTiming: words[currentWordIndex] ? {
          start: words[currentWordIndex].start.toFixed(2),
          end: words[currentWordIndex].end.toFixed(2)
        } : 'none'
      });
    }
  }, [words, currentWordIndex]);

  // Enhanced fallback state - show content while word timings are being prepared
  if (words.length === 0) {
    return (
      <div 
        ref={scrollContainerRef}
        className={`${textSizeClasses[textSize]} ${lineHeightClasses[textSize]} font-mono-enhanced text-left select-text ${
          compact ? 'max-h-32 overflow-y-auto custom-scrollbar' : ''
        }`}
      >
        {/* Status indicator */}
        <div className="text-white/50 text-xs mb-3 font-mono-enhanced flex items-center gap-2 border-b border-white/10 pb-2">
          <div className="w-3 h-3 border border-white/30 border-t-white/60 rounded-full animate-spin"></div>
          <span>Preparing synchronized highlighting...</span>
        </div>
        
        {/* Show static content with dimmed styling if available */}
        {fallbackText ? (
          <div className="text-white/70 leading-relaxed">
            {fallbackText.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-3 last:mb-0 opacity-80 hover:opacity-90 transition-opacity">
                {paragraph.trim()}
              </p>
            ))}
            
            {/* Subtle indication that this is static content */}
            <div className="text-white/40 text-xs mt-4 pt-2 border-t border-white/5 italic">
              Text will be highlighted word-by-word once synchronization is ready
            </div>
          </div>
        ) : (
          <div className="text-white/50 text-center py-8">
            <div className="text-lg mb-2">⏳</div>
            <div>Preparing content for synchronized reading...</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={scrollContainerRef}
      className={`text-white/90 ${textSizeClasses[textSize]} ${lineHeightClasses[textSize]} font-mono-enhanced text-left select-text ${
        compact ? 'max-h-32 overflow-y-auto custom-scrollbar' : ''
      }`}
    >
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-white/40 mb-2 font-mono">
          Words: {words.length} | Current: {currentWordIndex} | 
          {words[currentWordIndex] && ` "${words[currentWordIndex].text}" (${words[currentWordIndex].start.toFixed(1)}s-${words[currentWordIndex].end.toFixed(1)}s)`}
        </div>
      )}
      
      {words.map((word, index) => {
        const isCurrentWord = index === currentWordIndex;
        const isClickable = !compact && onWordClick;
        
        return (
          <span key={`${index}-${word.start}`}>
            <span
              ref={isCurrentWord ? highlightedWordRef : undefined}
              className={`transition-all duration-200 ${
                isCurrentWord
                  ? 'bg-white/25 text-white shadow-md rounded-sm px-1.5 py-0.5 neon-glow-soft transform scale-105 font-semibold'
                  : 'text-white/85 hover:text-white/95'
              } ${
                isClickable ? 'cursor-pointer hover:bg-white/10 rounded-sm px-0.5 py-0.5' : ''
              }`}
              onClick={() => isClickable && onWordClick(index)}
              title={isClickable ? `${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s` : undefined}
            >
              {word.text}
            </span>
            {/* Add space after each word except the last */}
            {index < words.length - 1 && ' '}
          </span>
        );
      })}
    </div>
  );
};

export default WordHighlighter;

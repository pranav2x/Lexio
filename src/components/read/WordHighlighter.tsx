"use client";

import React, { useEffect, useRef } from 'react';

interface WordData {
  word: string;
  index: number;
  startTime: number;
  endTime: number;
  isWhitespace: boolean;
}

interface WordHighlighterProps {
  wordsData: WordData[];
  currentWordIndex: number;
  isPlaying: boolean;
  content: string;
  onWordClick: (wordIndex: number) => void;
  compact?: boolean;
  textSize?: 'sm' | 'lg';
}

const WordHighlighter: React.FC<WordHighlighterProps> = ({
  wordsData,
  currentWordIndex,
  isPlaying,
  content,
  onWordClick,
  compact = false,
  textSize = 'sm'
}) => {
  const activeWordRef = useRef<HTMLSpanElement>(null);

  const baseClasses = compact 
    ? "text-sm leading-relaxed font-mono-enhanced" 
    : textSize === 'lg' 
      ? "text-lg leading-9 font-mono-enhanced text-left space-y-2" 
      : "text-sm leading-relaxed font-mono-enhanced";

  useEffect(() => {
    if (activeWordRef.current && currentWordIndex !== -1) {
      activeWordRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [currentWordIndex]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && currentWordIndex !== -1 && wordsData[currentWordIndex]) {
      console.log(`🎯 WordHighlighter: highlighting word ${currentWordIndex}: "${wordsData[currentWordIndex].word}" (playing: ${isPlaying})`);
    }
  }, [currentWordIndex, isPlaying, wordsData]);

  return (
    <div className={baseClasses} style={textSize === 'lg' ? { wordSpacing: '0.2em' } : {}}>
      {wordsData.length > 0 ? (
        wordsData.map((wordData, index) => {
          const isActive = currentWordIndex === index;
          if (wordData.isWhitespace) {
            return (
              <span
                key={index}
                className="inline-block opacity-50 select-none"
              >
                {wordData.word}
              </span>
            );
          }
          return (
            <span
              key={index}
              ref={isActive ? activeWordRef : null}
              className={`inline-block cursor-pointer rounded transition-all duration-150 px-${compact ? '1' : '1'} py-${compact ? '0.5' : '1'} ${compact ? '' : 'mx-0.5'}
                ${isActive
                  ? 'text-white font-bold bg-white/30 px-2 py-1 rounded-md shadow-lg transform scale-105 animate-highlight border-2 border-white/50'
                  : currentWordIndex > index
                    ? 'text-white/60'
                    : 'text-white/80 hover:text-white/90 hover:bg-white/10'
                }`}
              onClick={() => onWordClick(index)}
            >
              {wordData.word}
            </span>
          );
        })
      ) : (
        <div className="text-white/80">
          {content.split(/(\s+)/).map((part, index) => (
            <span
              key={index}
              className={part.trim() ? `cursor-pointer rounded transition-all duration-150 px-${compact ? '1' : '1'} py-${compact ? '0.5' : '1'} ${compact ? '' : 'mx-0.5'} hover:text-white/90 hover:bg-white/10` : 'inline-block opacity-50 select-none'}
            >
              {part}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default WordHighlighter; 
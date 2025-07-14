"use client";

import React from 'react';

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
  highlightedWordRef?: React.RefObject<HTMLSpanElement>;
  compact?: boolean;
  textSize?: 'sm' | 'lg';
}

const WordHighlighter: React.FC<WordHighlighterProps> = ({
  wordsData,
  currentWordIndex,
  isPlaying,
  content,
  onWordClick,
  highlightedWordRef,
  compact = false,
  textSize = 'sm'
}) => {
  const baseClasses = compact 
    ? "text-sm leading-relaxed font-mono-enhanced" 
    : textSize === 'lg' 
      ? "text-lg leading-9 font-mono-enhanced text-left space-y-2" 
      : "text-sm leading-relaxed font-mono-enhanced";

  return (
    <div className={baseClasses} style={textSize === 'lg' ? { wordSpacing: '0.2em' } : {}}>
      {wordsData.length > 0 ? (
        wordsData.map((wordData, index) => (
          <span
            key={index}
            ref={currentWordIndex === index ? highlightedWordRef : null}
            className={`word-highlight inline-block ${
              wordData.isWhitespace 
                ? '' 
                : currentWordIndex === index && isPlaying
                  ? 'active'
                  : currentWordIndex > index
                    ? 'text-white/60'
                    : 'text-white/80 hover:text-white/90'
            } ${!wordData.isWhitespace ? `cursor-pointer px-${compact ? '0.5' : '1'} py-${compact ? '0.5' : '1'} rounded transition-all duration-75 ${compact ? '' : 'mx-0.5'}` : ''}`}
            onClick={() => !wordData.isWhitespace && onWordClick(index)}
          >
            {wordData.word}
          </span>
        ))
      ) : (
        // Show all text immediately while word timings are being prepared
        <div className="text-white/80">
          {content.split(/(\s+)/).map((part, index) => (
            <span
              key={index}
              className={part.trim() ? `hover:text-white/90 cursor-pointer px-${compact ? '0.5' : '1'} py-${compact ? '0.5' : '1'} rounded transition-all duration-75 ${compact ? '' : 'mx-0.5'}` : ''}
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
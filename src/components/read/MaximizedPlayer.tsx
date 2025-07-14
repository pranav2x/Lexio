"use client";

import React, { useRef } from 'react';
import { useAudio } from '@/contexts/AudioContext';
import { useQueue } from '@/contexts/QueueContext';
import WordHighlighter from './WordHighlighter';

const MaximizedPlayer: React.FC = () => {
  const {
    isMaximized,
    setIsMaximized,
    wordsData,
    currentWordIndex,
    isPlaying,
    currentTime,
    duration,
    currentPlayingText,
    playbackRate,
    formatTime,
    handleSeek,
    handleSpeedChange,
  } = useAudio();

  const {
    listeningQueue,
    currentQueueIndex,
    isQueuePlaying,
    controlsPlaying,
    handleControlsPlayPause,
    handleControlsPrevious,
    handleControlsNext,
    handleControlsRepeat,
    controlsRepeat,
  } = useQueue();

  const highlightedWordRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const speedOptions = [0.75, 1, 1.25, 1.5];

  if (!isMaximized) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex flex-col">
      {/* Header with Close Button */}
      <div className="flex justify-between items-center p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-white/90 rounded-full animate-pulse shadow-lg"></div>
          <span className="text-lg font-semibold font-mono-enhanced text-gradient">Narrate Player</span>
        </div>
        <button
          onClick={() => setIsMaximized(false)}
          className="w-10 h-10 rounded-full glass-card hover:bg-white/10 transition-all duration-300 hover:scale-110 neon-glow flex items-center justify-center"
          aria-label="Close maximized player"
        >
          <svg className="w-5 h-5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto p-6 text-center">
          {/* Now Playing Info - Compact */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-1 font-mono-enhanced">
              {isQueuePlaying && listeningQueue.length > 0 && currentQueueIndex !== -1 
                ? listeningQueue[currentQueueIndex]?.title 
                : 'Now Playing'
              }
            </h2>
            <p className="text-white/60 text-xs font-mono-enhanced">
              {isQueuePlaying && listeningQueue.length > 0 
                ? `${currentQueueIndex + 1} of ${listeningQueue.length} in queue`
                : 'Single track playback'
              }
            </p>
          </div>

          {/* Large Progress Bar - Compact */}
          <div className="mb-6">
            <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              ></div>
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                aria-label="Audio progress"
              />
            </div>
            <div className="flex justify-between text-xs text-white/70 mt-1 font-mono-enhanced">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Large Controls - Always Visible */}
          <div className="flex items-center justify-center gap-6 mb-6">
            {/* Restart */}
            <button
              onClick={() => handleSeek(0)}
              disabled={!duration}
              className="flex items-center justify-center w-12 h-12 rounded-full glass-card hover:bg-white/10 transition-all duration-300 hover:scale-110 micro-bounce disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Restart from beginning"
            >
              <svg className="w-6 h-6 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            {/* Previous */}
            <button
              onClick={handleControlsPrevious}
              disabled={!isQueuePlaying || currentQueueIndex <= 0 || listeningQueue.length <= 1}
              className="flex items-center justify-center w-12 h-12 rounded-full glass-card hover:bg-white/10 transition-all duration-300 hover:scale-110 micro-bounce disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous track"
            >
              <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Play/Pause - Perfectly Centered */}
            <button
              onClick={handleControlsPlayPause}
              disabled={!duration && listeningQueue.length === 0}
              className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 hover:scale-110 neon-glow ${
                (isQueuePlaying ? controlsPlaying : isPlaying)
                  ? 'bg-red-500/20 text-red-400 border border-red-400/30'
                  : 'btn-premium'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={(isQueuePlaying ? controlsPlaying : isPlaying) ? 'Pause' : 'Play'}
            >
              {(isQueuePlaying ? controlsPlaying : isPlaying) ? (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6" />
                </svg>
              ) : (
                <svg className="w-8 h-8 absolute" fill="currentColor" viewBox="0 0 24 24" style={{ left: '50%', top: '50%', transform: 'translate(-47%, -50%)' }}>
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Next */}
            <button
              onClick={handleControlsNext}
              disabled={!isQueuePlaying || currentQueueIndex >= listeningQueue.length - 1 || listeningQueue.length <= 1}
              className="flex items-center justify-center w-12 h-12 rounded-full glass-card hover:bg-white/10 transition-all duration-300 hover:scale-110 micro-bounce disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next track"
            >
              <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Loop/Repeat */}
            <button
              onClick={handleControlsRepeat}
              disabled={listeningQueue.length === 0}
              className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 hover:scale-110 micro-bounce disabled:opacity-30 disabled:cursor-not-allowed ${
                controlsRepeat ? 'bg-white/20 text-white neon-glow border border-white/30' : 'glass-card text-white/60 hover:bg-white/10 hover:text-white'
              }`}
              aria-label="Loop current track"
            >
              <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Speed Controls - Compact */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-xs text-white/50 font-mono-enhanced">Speed:</span>
            <div className="flex items-center gap-1">
              {speedOptions.map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150 hover:scale-105 font-mono-enhanced border ${
                    playbackRate === speed
                      ? 'bg-white/20 text-white border-white/30 shadow-sm'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white/90 hover:border-white/20'
                  }`}
                  role="button"
                  aria-pressed={playbackRate === speed}
                  aria-label={`Set playback speed to ${speed}x${playbackRate === speed ? ' (currently selected)' : ''}`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* All Words Display with Real-time Highlighting */}
          <div className="glass-card p-8 rounded-lg mb-20 min-h-[400px]" ref={contentRef}>
            <div className="text-sm text-white/60 mb-6 font-mono-enhanced text-center">
              Word {wordsData.filter((word, index) => !word.isWhitespace && index <= currentWordIndex).length} of {wordsData.filter(word => !word.isWhitespace).length}
            </div>
            
            <WordHighlighter
              wordsData={wordsData}
              currentWordIndex={currentWordIndex}
              isPlaying={isPlaying}
              content={currentPlayingText}
              onWordClick={(wordIndex) => {
                if (wordsData[wordIndex] && !wordsData[wordIndex].isWhitespace) {
                  handleSeek(wordsData[wordIndex].startTime);
                }
              }}
              highlightedWordRef={highlightedWordRef}
              compact={false}
              textSize="lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaximizedPlayer; 
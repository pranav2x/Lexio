"use client";

import React from 'react';
import { useAudio } from '@/contexts/AudioContext';
import { useQueue } from '@/contexts/QueueContext';
import VoiceSelector from '@/components/VoiceSelector';

const AudioPlayer: React.FC = () => {
  const {
    audioUrl,
    duration,
    currentTime,
    isPlaying,
    playbackRate,
    currentPlayingSection,
    formatTime,
    handleSeek,
    handleStop,
    handleSpeedChange,
    setIsMaximized,
  } = useAudio();

  const {
    listeningQueue,
    currentQueueIndex,
    isQueuePlaying,
    controlsPlaying,
    handleControlsPlayPause,
    handleControlsPrevious,
    handleControlsNext,
    handleControlsShuffle,
    handleControlsRepeat,
    controlsShuffle,
    controlsRepeat,
  } = useQueue();

  const speedOptions = [0.75, 1, 1.25, 1.5];

  // Don't render if no audio and no queue
  if (!audioUrl && listeningQueue.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-white/10 backdrop-blur-xl">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col gap-1">
            {/* Progress Bar */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/70 min-w-[3rem] text-right font-mono-enhanced">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 relative">
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-white/90 to-white/60 transition-all duration-300 shadow-lg"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={currentTime}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  className="absolute inset-0 w-full h-1.5 opacity-0 cursor-pointer"
                  aria-label="Audio progress"
                />
              </div>
              <span className="text-xs text-white/70 min-w-[3rem] font-mono-enhanced">
                {formatTime(duration)}
              </span>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-6">
              {/* Left & Center Group */}
              <div className="flex items-center gap-4">
                {/* Left Side - Queue Navigation & Playback Controls */}
                <div className="flex items-center gap-1">
                  {/* Shuffle - Only show when queue has items */}
                  {listeningQueue.length > 1 && (
                    <button
                      onClick={handleControlsShuffle}
                      className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-150 hover:scale-105 micro-bounce ${
                        controlsShuffle ? 'bg-white/20 text-white neon-glow' : 'glass-card text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                      aria-label="Shuffle queue"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4h6l4 4-4 4H4m16-8v8a4 4 0 01-8 0V8a4 4 0 018 0zM4 20h6l4-4-4-4H4" />
                      </svg>
                    </button>
                  )}

                  {/* Previous - Only show when queue is playing */}
                  {isQueuePlaying && listeningQueue.length > 1 && (
                    <button
                      onClick={handleControlsPrevious}
                      disabled={currentQueueIndex <= 0}
                      className="flex items-center justify-center w-8 h-8 rounded-full glass-card hover:bg-white/10 transition-all duration-150 hover:scale-105 micro-bounce disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Previous track"
                    >
                      <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                      </svg>
                    </button>
                  )}

                  {/* Play/Pause - Main control */}
                  <button
                    onClick={handleControlsPlayPause}
                    disabled={!audioUrl && listeningQueue.length === 0}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-150 hover:scale-105 neon-glow ${
                      (isQueuePlaying ? controlsPlaying : isPlaying)
                        ? 'bg-red-500/20 text-red-400 border border-red-400/30'
                        : 'btn-premium'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    aria-label={(isQueuePlaying ? controlsPlaying : isPlaying) ? 'Pause' : 'Play'}
                  >
                    {(isQueuePlaying ? controlsPlaying : isPlaying) ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  {/* Next - Only show when queue is playing */}
                  {isQueuePlaying && listeningQueue.length > 1 && (
                    <button
                      onClick={handleControlsNext}
                      disabled={currentQueueIndex >= listeningQueue.length - 1}
                      className="flex items-center justify-center w-8 h-8 rounded-full glass-card hover:bg-white/10 transition-all duration-150 hover:scale-105 micro-bounce disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Next track"
                    >
                      <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                      </svg>
                    </button>
                  )}

                  {/* Repeat - Only show when queue has items */}
                  {listeningQueue.length > 0 && (
                    <button
                      onClick={handleControlsRepeat}
                      className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-150 hover:scale-105 micro-bounce ${
                        controlsRepeat ? 'bg-white/20 text-white neon-glow' : 'glass-card text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                      aria-label="Repeat queue"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  )}
                  
                  <button
                    onClick={handleStop}
                    disabled={!audioUrl && !isQueuePlaying}
                    className="flex items-center justify-center w-8 h-8 rounded-full glass-card hover:bg-white/10 transition-all duration-150 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Stop"
                  >
                    <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10h6v4H9z" />
                    </svg>
                  </button>

                  {/* Maximize Button - Only show when queue is playing */}
                  {isQueuePlaying && (
                    <button
                      onClick={() => setIsMaximized(true)}
                      className="flex items-center justify-center w-8 h-8 rounded-full glass-card hover:bg-white/10 transition-all duration-150 hover:scale-105 neon-glow"
                      aria-label="Maximize Player"
                    >
                      <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Center - Status & Speed Control */}
                <div className="flex items-center gap-2">
                  {/* Status Display */}
                  <div className="flex items-center gap-1.5 text-sm text-white/70">
                    {/* Queue Status */}
                    {isQueuePlaying && listeningQueue.length > 0 && currentQueueIndex !== -1 && (
                      <div className="flex items-center gap-2 glass-card px-2.5 py-1 rounded-lg">
                        <div className="w-1.5 h-1.5 bg-white/90 rounded-full animate-pulse"></div>
                        <span className="font-medium text-xs font-mono-enhanced text-white/70">
                          {currentQueueIndex + 1} of {listeningQueue.length}
                        </span>
                      </div>
                    )}
                    
                    {/* Individual Section Status */}
                    {currentPlayingSection && !isQueuePlaying && (
                      <div className="flex items-center gap-2 glass-card px-2.5 py-1 rounded-lg">
                        <div className="w-1.5 h-1.5 bg-white/90 rounded-full animate-pulse"></div>
                        <span className="font-medium text-xs font-mono-enhanced">
                          Playing: {
                            currentPlayingSection === 'summary' ? 'Summary' :
                            currentPlayingSection?.startsWith('section-') ? 
                              `Section ${parseInt(currentPlayingSection.replace('section-', '')) + 1}` : 
                              currentPlayingSection
                          }
                        </span>
                      </div>
                    )}

                    {/* Queue Available Indicator */}
                    {!isQueuePlaying && !currentPlayingSection && listeningQueue.length > 0 && (
                      <div className="flex items-center gap-2 glass-card px-2.5 py-1 rounded-lg">
                        <div className="w-1.5 h-1.5 bg-blue-400/90 rounded-full animate-pulse"></div>
                        <span className="font-medium text-xs font-mono-enhanced">
                          {listeningQueue.length} items ready to play
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Speed Control */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-white/50 hidden lg:block font-mono-enhanced">Speed:</span>
                    <div className="flex items-center gap-0.5">
                      {speedOptions.map((speed) => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedChange(speed)}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-all duration-150 font-mono-enhanced ${
                            playbackRate === speed
                              ? 'bg-white/15 text-white border border-white/30'
                              : 'bg-white/5 text-white/70 border border-transparent hover:bg-white/10 hover:text-white/90 hover:border-white/20'
                          }`}
                          role="button"
                          aria-pressed={playbackRate === speed}
                          aria-label={`Set playback speed to ${speed}x${playbackRate === speed ? ' (currently selected)' : ''}`}
                        >
                          {speed}×
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Voice Selector */}
              <div className="flex items-center">
                <VoiceSelector />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer; 
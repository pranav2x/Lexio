"use client";

import React, { useEffect } from 'react';
import { useAudio } from '@/contexts/AudioContext';
import { useQueue } from '@/contexts/QueueContext';

const AudioPlayer: React.FC = () => {
  const {
    duration,
    currentTime,
    isPlaying,
    playbackRate,
    currentPlayingSection,
    formatTime,
    handlePlayPause,
    handleStop,
    handleSpeedChange,
    isMaximized,
    setIsMaximized,
    isGeneratingAudio,
    playQueueItem,
    generateAudioForSection,
    setOnQueueItemComplete,
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
    setCurrentQueueIndex,
    setIsQueuePlaying,
    setControlsPlaying,
  } = useQueue();

  const speedOptions = [0.75, 1, 1.25, 1.5, 2];

  // Set up auto-advance callback when component mounts
  useEffect(() => {
    const handleQueueItemComplete = () => {
      console.log('🔄 Queue item completed, advancing...');
      
      // ONLY auto-advance if the user is actively playing
      if (!controlsPlaying || !isQueuePlaying) {
        console.log('🔄 Not auto-advancing - user is not actively playing');
        return;
      }
      
      // Defer state updates to avoid updating during render
      setTimeout(() => {
        // Auto-advance to next item in queue
        if (currentQueueIndex < listeningQueue.length - 1) {
          console.log('🔄 Auto-advancing to next queue item');
          const nextIndex = currentQueueIndex + 1;
          setCurrentQueueIndex(nextIndex);
          
          // Start playing the next item automatically
          setTimeout(() => {
            const nextItem = listeningQueue[nextIndex];
            if (nextItem) {
              playQueueItem(nextItem);
            }
          }, 100);
        } else if (controlsRepeat && listeningQueue.length > 0) {
          // Repeat queue from beginning
          console.log('🔄 Repeating queue from beginning');
          setCurrentQueueIndex(0);
          setTimeout(() => {
            const firstItem = listeningQueue[0];
            if (firstItem) {
              playQueueItem(firstItem);
            }
          }, 100);
        } else {
          // End of queue
          console.log('✅ Queue completed');
          setIsQueuePlaying(false);
          setControlsPlaying(false);
        }
      }, 0);
    };

    setOnQueueItemComplete(handleQueueItemComplete);

    // Cleanup
    return () => {
      setOnQueueItemComplete(undefined);
    };
  }, [currentQueueIndex, listeningQueue, controlsRepeat, controlsPlaying, isQueuePlaying, setCurrentQueueIndex, setIsQueuePlaying, setControlsPlaying, playQueueItem, setOnQueueItemComplete]);

  // Don't render if no audio and no queue
  if (!currentPlayingSection && listeningQueue.length === 0) {
    return null;
  }

  const currentQueueItem = currentQueueIndex >= 0 ? listeningQueue[currentQueueIndex] : null;

  // Enhanced play/pause that starts queue or handles individual playback
  const handleEnhancedPlayPause = () => {
    if (listeningQueue.length > 0) {
      // Queue mode
      if (controlsPlaying || isPlaying) {
        // Pause current queue item
        handlePlayPause();
        setControlsPlaying(false);
        setIsQueuePlaying(false);
      } else {
        // Prepare queue for playback and load first item content
        console.log('🎯 User opening queue - loading first item content');
        
        // Always start from the beginning of the queue (index 0) like Spotify
        if (currentQueueIndex < 0 && listeningQueue.length > 0) {
          console.log('🎵 Setting queue to start from beginning (index 0)');
          setCurrentQueueIndex(0);
        }
        
        // Load the first queue item's content (but don't auto-play)
        const firstItem = listeningQueue[currentQueueIndex >= 0 ? currentQueueIndex : 0];
        if (firstItem) {
          console.log('📄 Loading first queue item content:', firstItem.title);
          // Load content without auto-playing - this just prepares the text and word timings
          setTimeout(() => {
            generateAudioForSection(firstItem.id as any, firstItem.content);
          }, 100);
        }
        
        // Open maximized player for user to manually control playback
        setIsMaximized(true);
        
        console.log('📱 Maximized player opened with loaded content - ready for manual play');
      }
    } else {
      // Direct playback mode
      handlePlayPause();
      
      // Open maximized player when user starts playback
      if (!isPlaying) {
        setIsMaximized(true);
      }
    }
  };

  // Enhanced previous function
  const handleEnhancedPrevious = () => {
    if (listeningQueue.length > 1 && currentQueueIndex > 0) {
      const prevIndex = currentQueueIndex - 1;
      setCurrentQueueIndex(prevIndex);
      
      // Stop current playback and play the previous item
      handleStop();
      setTimeout(() => {
        const prevItem = listeningQueue[prevIndex];
        if (prevItem) {
          console.log('⏮️ Playing previous queue item:', prevItem.title);
          playQueueItem(prevItem);
        }
      }, 100);
    }
  };

  // Enhanced next function
  const handleEnhancedNext = () => {
    if (listeningQueue.length > 1 && currentQueueIndex < listeningQueue.length - 1) {
      const nextIndex = currentQueueIndex + 1;
      setCurrentQueueIndex(nextIndex);
      
      // Stop current playback and play the next item
      handleStop();
      setTimeout(() => {
        const nextItem = listeningQueue[nextIndex];
        if (nextItem) {
          console.log('⏭️ Playing next queue item:', nextItem.title);
          playQueueItem(nextItem);
        }
      }, 100);
    }
  };

  return (
    <>
      {/* Compact Bottom Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-white/20 overflow-hidden transition-all duration-300">
        <div className="px-6 py-2.5">
          <div className="max-w-6xl mx-auto">
            
            {/* Progress Bar - Top */}
            <div className="mb-2.5">
              <div className="w-full bg-white/20 rounded-full h-1">
                <div 
                  className="bg-white h-1 rounded-full transition-all duration-200"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Main Controls */}
            <div className="flex items-center justify-center w-full">
              
              {/* Left: Track Info */}
              <div className="flex items-center gap-4 min-w-0 flex-shrink-0">
                {/* Album Art / Icon */}
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                
                {/* Track Details */}
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate mb-0.5 max-w-48">
                    {currentQueueItem?.title || 'Direct Play'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-white/60">
                    {currentQueueItem && (
                      <>
                        <span>#{currentQueueIndex + 1} of {listeningQueue.length}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                    <span>•</span>
                    <span>{playbackRate}x speed</span>
                  </div>
                </div>
              </div>

              {/* Center: Playback Controls */}
              <div className="flex items-center gap-2 mx-6">
                {/* Previous */}
                <button
                  onClick={handleEnhancedPrevious}
                  disabled={listeningQueue.length <= 1 || currentQueueIndex <= 0}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 flex items-center justify-center transition-all duration-200 border border-white/20 hover:border-white/30"
                  title="Previous"
                >
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                  </svg>
                </button>

                {/* Play/Pause - Main Button */}
                <button
                  onClick={handleEnhancedPlayPause}
                  disabled={isGeneratingAudio}
                  className="w-12 h-12 rounded-full bg-white text-black hover:bg-white/90 hover:scale-105 flex items-center justify-center transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isPlaying || controlsPlaying ? "Pause" : "Play in Full Screen"}
                >
                  {isGeneratingAudio ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying || controlsPlaying ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>

                {/* Next */}
                <button
                  onClick={handleEnhancedNext}
                  disabled={listeningQueue.length <= 1 || currentQueueIndex >= listeningQueue.length - 1}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 flex items-center justify-center transition-all duration-200 border border-white/20 hover:border-white/30"
                  title="Next"
                >
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                  </svg>
                </button>
              </div>

              {/* Right: Speed & Options */}
              <div className="flex items-center gap-2 flex-shrink-0">
               
                {/* Speed Control */}
                <div className="flex items-center gap-0.5">
                  {speedOptions.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                        playbackRate === speed
                          ? 'bg-white text-black border border-white'
                          : 'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/30'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>

                {/* Queue Controls */}
                <div className="flex items-center gap-1 ml-3">
                  <button
                    onClick={handleControlsShuffle}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 border ${
                      controlsShuffle 
                        ? 'bg-white/20 text-white border-white/30' 
                        : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border-white/20 hover:border-white/30'
                    }`}
                    title="Shuffle"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </button>

                  <button
                    onClick={handleControlsRepeat}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 border ${
                      controlsRepeat 
                        ? 'bg-white/20 text-white border-white/30' 
                        : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border-white/20 hover:border-white/30'
                    }`}
                    title="Repeat"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>

                  {/* Maximize Button */}
                  <button
                    onClick={() => setIsMaximized(true)}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 border border-white/20 hover:border-white/30 ml-1"
                    title="Open full screen player"
                  >
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AudioPlayer; 
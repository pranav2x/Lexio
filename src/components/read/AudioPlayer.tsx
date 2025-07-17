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
    setCurrentQueueIndex,
    setIsQueuePlaying,
    setControlsPlaying,
  } = useQueue();

  // Set up auto-advance callback when component mounts
  useEffect(() => {
    const handleQueueItemComplete = () => {
      console.log('🔄 Queue item completed, checking for auto-advance...');
      
      // ONLY auto-advance if the user is actively playing and this completion is legitimate
      if (!controlsPlaying || !isQueuePlaying) {
        console.log('🔄 Not auto-advancing - user is not actively playing');
        return;
      }

      // Add additional check to prevent multiple rapid completions
      if (currentQueueIndex < 0) {
        console.log('🔄 Not auto-advancing - invalid current index');
        return;
      }
      
      // Defer state updates to avoid updating during render
      setTimeout(() => {
        // Auto-advance to next item in queue only if we're not at the end
        if (currentQueueIndex < listeningQueue.length - 1) {
          console.log('🔄 Auto-advancing from index', currentQueueIndex, 'to', currentQueueIndex + 1);
          const nextIndex = currentQueueIndex + 1;
          setCurrentQueueIndex(nextIndex);
          
          // Start playing the next item automatically
          setTimeout(() => {
            const nextItem = listeningQueue[nextIndex];
            if (nextItem && controlsPlaying && isQueuePlaying) {
              console.log('🔄 Playing next item:', nextItem.title);
              playQueueItem(nextItem);
            }
          }, 100);
        } else {
          // End of queue
          console.log('✅ Queue completed - reached end');
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
  }, [currentQueueIndex, listeningQueue.length, controlsPlaying, isQueuePlaying, setCurrentQueueIndex, setIsQueuePlaying, setControlsPlaying, playQueueItem, setOnQueueItemComplete]);

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
        console.log('⏸️ Pausing queue playback');
        handlePlayPause();
        setControlsPlaying(false);
        setIsQueuePlaying(false);
      } else {
        // Start queue playback
        console.log('🎯 User clicked play - starting queue playback');
        
        // Determine which item to play
        let targetIndex = currentQueueIndex;
        
        // If no item is selected OR current index is invalid, start from the beginning
        if (currentQueueIndex < 0 || currentQueueIndex >= listeningQueue.length) {
          console.log('🎵 No valid item selected, starting from first item (index 0)');
          targetIndex = 0;
          setCurrentQueueIndex(0);
        }
        
        // Play the selected/target item
        const targetItem = listeningQueue[targetIndex];
        if (targetItem) {
          console.log('📄 Starting queue with item:', targetItem.title, 'at index:', targetIndex);
          
          // Set playing states BEFORE playing to ensure consistency
          setControlsPlaying(true);
          setIsQueuePlaying(true);
          
          // Play the selected item
          setTimeout(() => {
            playQueueItem(targetItem);
          }, 100);
        }
        
        // Open maximized player when user starts playback
        setIsMaximized(true);
      }
    } else {
      // Direct playback mode (no queue)
      handlePlayPause();
      
      // Open maximized player when user starts playback
      if (!isPlaying) {
        setIsMaximized(true);
      }
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
                  </div>
                </div>
              </div>

              {/* Center: Playback Controls */}
              <div className="flex items-center gap-3 mx-6">
                {/* Restart Button */}
                <button
                  onClick={() => {
                    handleStop();
                    if (currentQueueItem) {
                      setTimeout(() => playQueueItem(currentQueueItem), 100);
                    }
                  }}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 border border-white/20 hover:border-white/30"
                  title="Restart current item"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
              </div>

              {/* Right: Maximize Button */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Maximize Button */}
                <button
                  onClick={() => setIsMaximized(true)}
                  className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 border border-white/20 hover:border-white/30"
                  title="Open full screen player"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AudioPlayer; 
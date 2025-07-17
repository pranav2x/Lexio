"use client";

import React from 'react';
import { useAudio } from '@/contexts/AudioContext';
import { useQueue } from '@/contexts/QueueContext';
import { X, RotateCcw, SkipBack, SkipForward, FastForward, Play, Pause } from 'lucide-react';

const MaximizedPlayer: React.FC = () => {
  const {
    isMaximized,
    setIsMaximized,
    currentPlayingText,
    words,
    currentWordIndex,
    currentTime,
    duration,
    isPlaying,
    playbackRate,
    handlePlayPause,
    handleSpeedChange,
    formatTime,
    handleWordClick,
    handleStop,
    isGeneratingAudio,
    currentPlayingSection,
    playQueueItem,
  } = useAudio();

  const {
    listeningQueue,
    currentQueueIndex,
    setCurrentQueueIndex,
    isQueuePlaying,
    controlsPlaying,
    setControlsPlaying,
    setIsQueuePlaying,
  } = useQueue();

  if (!isMaximized) return null;

  const speedOptions = [0.75, 1, 1.25, 1.5, 2];
  const currentQueueItem = currentQueueIndex >= 0 ? listeningQueue[currentQueueIndex] : null;
  const queuePosition = currentQueueItem ? `${currentQueueIndex + 1} of ${listeningQueue.length}` : "Direct Play";

  // Skip back 10 seconds
  const skipBack = () => {
    const newTime = Math.max(0, currentTime - 10);
    if (words.length > 0) {
      const newWordIndex = words.findIndex(timing => 
        newTime >= timing.start && newTime < timing.end
      );
      if (newWordIndex !== -1) {
        handleWordClick(newWordIndex);
      }
    }
  };

  // Skip forward 10 seconds  
  const skipForward = () => {
    const newTime = Math.min(duration, currentTime + 10);
    if (words.length > 0) {
      const newWordIndex = words.findIndex(timing => 
        newTime >= timing.start && newTime < timing.end
      );
      if (newWordIndex !== -1) {
        handleWordClick(newWordIndex);
      }
    }
  };

  // Reset to beginning
  const resetAudio = () => {
    handleStop();
  };

  // Change playback speed
  const cycleSpeed = () => {
    const currentIndex = speedOptions.indexOf(playbackRate);
    const nextSpeed = speedOptions[(currentIndex + 1) % speedOptions.length];
    handleSpeedChange(nextSpeed);
  };

  // Enhanced queue navigation - Previous
  const handleQueuePrevious = () => {
    if (listeningQueue.length > 1 && currentQueueIndex > 0) {
      const prevIndex = currentQueueIndex - 1;
      console.log('⏮️ MaxPlayer: Going to previous item at index', prevIndex);
      
      // Stop current playback first
      handleStop();
      
      // Update queue state
      setCurrentQueueIndex(prevIndex);
      setControlsPlaying(true);
      setIsQueuePlaying(true);
      
      // Play the previous item
      setTimeout(() => {
        const prevItem = listeningQueue[prevIndex];
        if (prevItem && controlsPlaying) {
          console.log('⏮️ MaxPlayer: Playing previous item:', prevItem.title);
          playQueueItem(prevItem);
        }
      }, 100);
    }
  };

  // Enhanced queue navigation - Next  
  const handleQueueNext = () => {
    if (listeningQueue.length > 1 && currentQueueIndex < listeningQueue.length - 1) {
      const nextIndex = currentQueueIndex + 1;
      console.log('⏭️ MaxPlayer: Going to next item at index', nextIndex);
      
      // Stop current playback first
      handleStop();
      
      // Update queue state
      setCurrentQueueIndex(nextIndex);
      setControlsPlaying(true);
      setIsQueuePlaying(true);
      
      // Play the next item
      setTimeout(() => {
        const nextItem = listeningQueue[nextIndex];
        if (nextItem && controlsPlaying) {
          console.log('⏭️ MaxPlayer: Playing next item:', nextItem.title);
          playQueueItem(nextItem);
        }
      }, 100);
    }
  };

  // Handle clicking on a specific queue item
  const handleQueueItemClick = (index: number) => {
    if (index >= 0 && index < listeningQueue.length && index !== currentQueueIndex) {
      console.log('🎯 MaxPlayer: Clicked on queue item at index', index);
      
      // Stop current playback first
      handleStop();
      
      // Update queue state
      setCurrentQueueIndex(index);
      setControlsPlaying(true);
      setIsQueuePlaying(true);
      
      // Play the selected item
      setTimeout(() => {
        const item = listeningQueue[index];
        if (item && controlsPlaying) {
          console.log('🎯 MaxPlayer: Playing selected item:', item.title);
          playQueueItem(item);
        }
      }, 100);
    }
  };

  // Handle play/pause for queue mode in maximized player
  const handleMaximizedPlayPause = () => {
    if (listeningQueue.length > 0 && currentQueueIndex >= 0) {
      // Queue mode
      if (isPlaying) {
        // Pause current queue item
        console.log('⏸️ MaxPlayer: Pausing queue item');
        handlePlayPause();
        setControlsPlaying(false);
        setIsQueuePlaying(false);
      } else {
        // Start playing current queue item
        const currentItem = listeningQueue[currentQueueIndex];
        if (currentItem) {
          console.log('🎵 MaxPlayer: Starting queue item:', currentItem.title);
          setControlsPlaying(true);
          setIsQueuePlaying(true);
          playQueueItem(currentItem);
        }
      }
    } else {
      // Direct playback mode - use regular handlePlayPause
      handlePlayPause();
    }
  };

  // Get the title for display
  const displayTitle = currentQueueItem?.title || 
                      (currentPlayingSection?.startsWith('section-') ? `Section ${parseInt(currentPlayingSection.split('-')[1]) + 1}` : 'Content');

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col">
      
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-white/10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-light mb-2">
                {displayTitle}
              </h1>
              <p className="text-white/60 text-sm">{queuePosition}</p>
            </div>
            <button
              onClick={() => setIsMaximized(false)}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              title="Exit reading mode"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-white/10">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between text-sm text-white/60 mb-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-1">
            <div 
              className="bg-white h-1 rounded-full transition-all duration-100"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex-shrink-0 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center gap-4 mb-6">
            <button
              onClick={resetAudio}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              title="Reset to beginning"
            >
              <RotateCcw size={20} />
            </button>
            
            <button
              onClick={skipBack}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              title="Skip back 10 seconds"
            >
              <SkipBack size={20} />
            </button>

            {/* Previous button (queue control) */}
            <button
              onClick={handleQueuePrevious}
              disabled={listeningQueue.length <= 1 || currentQueueIndex <= 0}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 disabled:opacity-50 disabled:hover:bg-white/10 transition-colors"
              title="Previous in queue"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            <button
              onClick={handleMaximizedPlayPause}
              disabled={isGeneratingAudio}
              className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/90 transition-colors disabled:opacity-50"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isGeneratingAudio ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause size={24} />
              ) : (
                <Play size={24} className="ml-1" />
              )}
            </button>

            {/* Next button (queue control) */}
            <button
              onClick={handleQueueNext}
              disabled={listeningQueue.length <= 1 || currentQueueIndex >= listeningQueue.length - 1}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 disabled:opacity-50 disabled:hover:bg-white/10 transition-colors"
              title="Next in queue"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>

            <button
              onClick={skipForward}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              title="Skip forward 10 seconds"
            >
              <SkipForward size={20} />
            </button>

            <button
              onClick={cycleSpeed}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              title={`Current speed: ${playbackRate}x`}
            >
              <FastForward size={20} />
            </button>
          </div>

          {/* Speed Controls */}
          <div className="flex justify-center gap-2 mb-8">
            <span className="text-white/60 text-sm mr-4">Playback Speed:</span>
            {speedOptions.map((speedOption) => (
              <button
                key={speedOption}
                onClick={() => handleSpeedChange(speedOption)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  playbackRate === speedOption
                    ? 'bg-white text-black'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {speedOption}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="max-w-5xl mx-auto">
          {currentPlayingText ? (
            <div className="space-y-6">
              {/* Queue Overview */}
              {listeningQueue.length > 0 && (
                <div className="bg-black/40 border border-white/15 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-white/80 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-white">Reading Queue</h3>
                      <span className="text-sm text-white/60 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                        {currentQueueIndex + 1} of {listeningQueue.length}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {listeningQueue.map((item, index) => (
                      <div
                        key={item.id}
                        onClick={() => handleQueueItemClick(index)}
                        className={`relative p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                          index === currentQueueIndex
                            ? 'bg-white/10 border-white/30 shadow-lg'
                            : 'bg-black/30 border-white/15 hover:border-white/25 hover:bg-black/40'
                        }`}
                        title={`Click to play: ${item.title}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                            index === currentQueueIndex
                              ? 'bg-white text-black'
                              : 'bg-white/10 text-white/70'
                          }`}>
                            #{index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-white truncate mb-1">
                              {item.title}
                            </h4>
                            <p className="text-xs text-white/60 line-clamp-2">
                              {item.content.substring(0, 120)}...
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-white/50">
                              <span>{item.content.split(' ').length} words</span>
                              <span>•</span>
                              <span>~{Math.ceil(item.content.split(' ').length / 200)}m</span>
                            </div>
                          </div>
                        </div>
                        
                        {index === currentQueueIndex && (
                          <div className="absolute top-2 right-2">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          </div>
                        )}

                        {/* Play button overlay for non-current items */}
                        {index !== currentQueueIndex && (
                          <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-xl">
                            <div className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center">
                              <Play size={16} className="ml-0.5" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Content Display */}
              <div className="bg-black/40 border border-white/15 rounded-2xl overflow-hidden">
                {/* Content Header */}
                <div className="px-6 py-4 border-b border-white/15 bg-black/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                      <h3 className="text-lg font-semibold text-white">
                        {displayTitle}
                      </h3>
                      {currentQueueItem && (
                        <span className="text-sm text-white/60 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                          Currently Playing
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm text-white/60">
                      <span>{currentPlayingText.length} characters</span>
                      <span>•</span>
                      <span>Web Speech API</span>
                    </div>
                  </div>
                </div>

                {/* Content Body with Word Highlighting */}
                <div className="p-6">
                  {isGeneratingAudio && (
                    <div className="flex items-center gap-2 text-white/80 text-sm mb-6 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Preparing speech synthesis...</span>
                    </div>
                  )}

                  <div className="prose prose-invert prose-lg max-w-none">
                    <div className="text-white/90 leading-relaxed text-lg">
                      {words.map((word, index) => (
                        <span
                          key={index}
                          onClick={() => handleWordClick(index)}
                          className={`cursor-pointer transition-all duration-200 hover:bg-white/10 hover:px-1 hover:rounded ${
                            index === currentWordIndex
                              ? 'bg-white text-black px-1.5 py-0.5 rounded font-medium shadow-lg'
                              : index < currentWordIndex
                              ? 'text-white/50'
                              : 'text-white/90 hover:text-white'
                          }`}
                        >
                          {word.text}{' '}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Reading Progress */}
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between text-sm text-white/60">
                      <div className="flex items-center gap-4">
                        <span>
                          Word {currentWordIndex + 1} of {words.length}
                        </span>
                        <span>•</span>
                        <span>
                          Progress: {Math.round((currentWordIndex / Math.max(words.length - 1, 1)) * 100)}%
                        </span>
                      </div>
                      <div className="italic">
                        {words.length > 0 
                          ? 'Click any word to jump to that position' 
                          : 'Text highlighting synchronized with speech synthesis'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/20">
                <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-white mb-3">No Content Playing</h3>
              <p className="text-white/60 max-w-md leading-relaxed">
                Select content from the main interface or add items to your queue to start reading
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaximizedPlayer; 
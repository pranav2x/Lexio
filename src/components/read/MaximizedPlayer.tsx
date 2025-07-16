"use client";

import React, { useState } from 'react';
import { useAudio } from '@/contexts/AudioContext';
import { useQueue } from '@/contexts/QueueContext';
import WordHighlighter from './WordHighlighter';

const MaximizedPlayer: React.FC = () => {
  const {
    audioUrl,
    audioRef,
    isPlaying,
    currentTime,
    duration,
    currentPlayingText,
    words,
    currentWordIndex,
    isMaximized,
    isGeneratingAudio,
    isPreloading,
    setIsMaximized,
    handleSeek,
    formatTime,
    playbackRate,
    handleSpeedChange,
    handlePlayPause,
  } = useAudio();

  const {
    listeningQueue,
    currentQueueIndex,
    isQueuePlaying,
    lastKnownContent,
    handleControlsPlayPause,
    handleControlsPrevious,
    handleControlsNext,
    retryCurrentItem,
  } = useQueue();

  const handlePlayPauseClick = async () => {
    console.log('🔥🎮 MAXIMIZED PLAYER - Play button clicked!', {
      queueLength: listeningQueue.length,
      hasHandleControlsPlayPause: !!handleControlsPlayPause,
      isQueuePlaying,
      isPlaying
    });
    
    if (listeningQueue.length > 0 && handleControlsPlayPause) {
      console.log('🔥🎮 MAXIMIZED PLAYER - Calling handleControlsPlayPause');
      await handleControlsPlayPause();
    } else {
      console.log('🔥🎮 MAXIMIZED PLAYER - Calling handlePlayPause');
      handlePlayPause();
    }
  };

  // const contentRef = useRef<HTMLDivElement>(null);
  const [speedOptions] = useState([0.75, 1, 1.25, 1.5]);

  if (!isMaximized) return null;

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      <div className="flex justify-between items-center p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-white/90 rounded-full animate-pulse"></div>
          <span className="text-lg font-semibold font-mono-enhanced text-gradient">Narrate Player</span>
        </div>
        <button onClick={() => setIsMaximized(false)} className="w-10 h-10 rounded-full glass-card hover:bg-white/10 transition-colors">
          <svg className="w-5 h-5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto p-6 text-center">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-1 font-mono-enhanced">
              {isQueuePlaying && listeningQueue[currentQueueIndex]?.title || 'Now Playing'}
            </h2>
            <p className="text-white/60 text-xs font-mono-enhanced">
              {isQueuePlaying ? `${currentQueueIndex + 1} of ${listeningQueue.length} in queue` : 'Single track playback'}
            </p>
          </div>

          <div className="mb-6">
            <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-white/90 to-white/70 transition-all duration-300" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-xs text-white/70 mt-1 font-mono-enhanced">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mb-6">
            {/* Restart Button */}
            <button 
              onClick={() => handleSeek(0)} 
              className="w-12 h-12 rounded-full glass-card hover:bg-white/10 transition-colors flex items-center justify-center"
            >
              <svg className="w-5 h-5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
              </svg>
            </button>

            {/* Previous Button */}
            <button 
              onClick={handleControlsPrevious} 
              className="w-12 h-12 rounded-full glass-card hover:bg-white/10 transition-colors flex items-center justify-center"
              disabled={!isQueuePlaying || currentQueueIndex <= 0}
            >
              <svg className="w-5 h-5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>

            {/* Play/Pause Button */}
            <button 
               onClick={handlePlayPauseClick} 
               className={`w-16 h-16 rounded-full neon-glow flex items-center justify-center transition-all ${
                 isPlaying ? 'bg-white/15 hover:bg-white/20' : 'btn-premium hover:bg-white/10'
               }`}
            >
              {isPlaying ? (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6"/>
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <polygon points="5,3 19,12 5,21"/>
                </svg>
              )}
            </button>

            {/* Next Button */}
            <button 
              onClick={handleControlsNext} 
              className="w-12 h-12 rounded-full glass-card hover:bg-white/10 transition-colors flex items-center justify-center"
              disabled={!isQueuePlaying || currentQueueIndex >= listeningQueue.length - 1}
            >
              <svg className="w-5 h-5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>

            {/* Skip Forward 10s Button */}
            <button 
              onClick={() => handleSeek(Math.min(currentTime + 10, duration))} 
              className="w-12 h-12 rounded-full glass-card hover:bg-white/10 transition-colors flex items-center justify-center relative"
            >
              <svg className="w-5 h-5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7M4 12h16"/>
              </svg>
              <span className="absolute -bottom-1 text-xs text-white/60">+10s</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="text-sm text-white/60 font-mono-enhanced">Playback Speed:</span>
            {speedOptions.map(speed => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-4 py-2 rounded-lg text-sm font-bold font-mono-enhanced transition-all hover:scale-105 ${
                  playbackRate === speed 
                    ? 'bg-white text-black shadow-md' 
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {speed}×
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 custom-scrollbar">
            {/* Show content from queue if available, fallback to currentPlayingText, then lastKnownContent */}
            {(() => {
              // Get content from current queue item if available
              const queueItem = isQueuePlaying && currentQueueIndex >= 0 ? listeningQueue[currentQueueIndex] : null;
              const contentToShow = queueItem?.content || currentPlayingText || lastKnownContent;
              
              // Enhanced debug logging to help identify content issues
              if (process.env.NODE_ENV === 'development') {
                console.log('🔍 MaximizedPlayer content check:', {
                  timestamp: new Date().toISOString(),
                  isQueuePlaying,
                  currentQueueIndex,
                  hasQueueItem: Boolean(queueItem),
                  queueItemId: queueItem?.id || 'none',
                  queueItemTitle: queueItem?.title || 'none',
                  queueItemContentLength: queueItem?.content?.length || 0,
                  currentPlayingTextLength: currentPlayingText?.length || 0,
                  lastKnownContentLength: lastKnownContent?.length || 0,
                  contentToShowLength: contentToShow?.length || 0,
                  contentToShowPreview: contentToShow?.substring(0, 100) || 'none',
                  wordsLength: words.length,
                  currentWordIndex,
                  isGeneratingAudio,
                  isPreloading,
                  isPlaying,
                  audioUrl: audioUrl ? 'present' : 'none',
                  hasAudioRef: Boolean(audioRef.current),
                  audioReadyState: audioRef.current?.readyState || 'no-audio-element',
                  queueLength: listeningQueue.length
                });
              }
              
              if (!contentToShow || contentToShow.trim().length === 0) {
                // Enhanced error state with more debugging info and retry option
                return (
                  <div className="text-white/60 text-center font-mono-enhanced">
                    {isGeneratingAudio || isPreloading ? (
                      <>
                        <div className="animate-spin h-6 w-6 border-b-2 border-white/30 mx-auto mb-2"></div>
                        <div>Loading content...</div>
                        <div className="text-xs text-white/40 mt-1">
                          {isGeneratingAudio ? 'Generating audio...' : 'Preparing playback...'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="h-6 w-6 border-2 border-white/30 mx-auto mb-2 rounded"></div>
                        <div className="mb-2">No content available</div>
                        <div className="text-xs text-white/40 mb-3">
                          This might be a loading issue. Try playing again.
                        </div>
                        <button 
                          onClick={() => {
                            console.log('🔄 Retry button clicked from MaximizedPlayer');
                            retryCurrentItem();
                          }}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                        >
                          Retry
                        </button>
                        {process.env.NODE_ENV === 'development' && (
                          <div className="text-xs mt-2 text-white/40 p-2 bg-black/20 rounded">
                            Debug: queueItem={queueItem?.id || 'none'}<br/>
                            currentText={currentPlayingText?.substring(0, 50) || 'none'}<br/>
                            lastKnown={lastKnownContent?.substring(0, 50) || 'none'}<br/>
                            queueLength={listeningQueue.length}<br/>
                            currentIndex={currentQueueIndex}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              }
              
              return (
                <>
                  <div className="mb-4 text-white/60 text-sm font-mono-enhanced">
                    {queueItem && (
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span>📖 {queueItem.title}</span>
                        {isQueuePlaying && (
                          <span className="text-white/40">• {currentQueueIndex + 1} of {listeningQueue.length}</span>
                        )}
                      </div>
                    )}
                    {words.length > 0 && isPlaying && (
                      <div className="text-center">
                        <span>Following along: {Math.max(0, currentWordIndex + 1)} of {words.length} words</span>
                      </div>
                    )}
                    {words.length === 0 && contentToShow && (
                      <div className="text-center text-white/40">
                        Content loaded • {contentToShow.length} characters
                        {isGeneratingAudio && " • Generating audio..."}
                        {isPlaying && !isGeneratingAudio && audioUrl && " • Playing without word sync"}
                        {!isPlaying && !isGeneratingAudio && audioUrl && " • Audio ready"}
                        {!audioUrl && !isGeneratingAudio && !isPreloading && (
                          <span className="text-orange-400"> • Text-only mode (audio failed)</span>
                        )}
                      </div>
                    )}
                    {contentToShow && !queueItem && (
                      <div className="text-center text-white/40 text-xs">
                        Showing backup content
                      </div>
                    )}
                  </div>
                  {words.length > 0 ? (
                    <WordHighlighter
                      words={words}
                      currentWordIndex={currentWordIndex}
                      onWordClick={(index) => handleSeek(words[index]?.start || 0)}
                      textSize="lg"
                    />
                  ) : contentToShow ? (
                    <WordHighlighter
                      words={[]} // Empty words array triggers fallback state
                      currentWordIndex={-1}
                      textSize="lg"
                      fallbackText={contentToShow}
                    />
                  ) : (
                    <div className="text-white/90 text-lg leading-relaxed text-center max-w-4xl mx-auto">
                      {contentToShow.split('\n').map((paragraph, index) => (
                        <p key={index} className="mb-4 last:mb-0">
                          {paragraph.trim()}
                        </p>
                      )).filter(p => p.props.children)} {/* Filter out empty paragraphs */}
                      
                      {/* Show a fallback message if content appears to be corrupted */}
                      {contentToShow.length < 20 && (
                        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <p className="text-yellow-400 text-sm">
                            Content seems incomplete. This might be a loading issue.
                          </p>
                          <button 
                            onClick={() => retryCurrentItem()}
                            className="mt-2 px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 rounded text-xs"
                          >
                            Try reloading
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaximizedPlayer;
"use client";

import React, { useRef } from 'react';
import { useQueue } from '@/contexts/QueueContext';
import { useAudio } from '@/contexts/AudioContext';
import WordHighlighter from './WordHighlighter';

const ListeningQueue: React.FC = () => {
  const {
    listeningQueue,
    currentQueueIndex,
    isQueuePlaying,
    removeFromQueue,
    clearQueue,
  } = useQueue();

  const {
    wordsData,
    currentWordIndex,
    isPlaying,
    currentTime,
    duration,
    formatTime,
    handleWordClick,
  } = useAudio();

  const highlightedWordRef = useRef<HTMLSpanElement>(null);

  return (
    <div className="w-full min-h-[350px] lg:min-h-[450px] xl:min-h-[450px] queue-zone-enhanced rounded-xl p-4 gpu-accelerated flex flex-col overflow-hidden shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg text-gradient font-mono-enhanced">🎧 Listening Queue</h3>
        {listeningQueue.length > 0 && (
          <button
            onClick={clearQueue}
            className="text-xs text-white/50 hover:text-red-400 transition-all duration-300 btn-premium px-2 py-1 rounded font-mono-enhanced"
          >
            Clear
          </button>
        )}
      </div>

      {listeningQueue.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-sm transition-all duration-500 text-white/60">
          <div className="text-4xl mb-4">📥</div>
          <div className="text-base font-semibold mb-2 text-center font-mono-enhanced text-gradient">Your Listening Queue</div>
          <div className="text-xs text-white/50 text-center px-4 font-mono-enhanced leading-relaxed">Use the Smart Learning Assistant above to tell me what you want to learn!</div>
        </div>
      ) : (
        <>
          {/* Currently Playing Item - Compact */}
          {currentQueueIndex !== -1 && isQueuePlaying && listeningQueue[currentQueueIndex] && (
            <div className="mb-4 glass-card rounded-xl p-3 shadow-lg shadow-white/20 border-2 border-white/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 bg-white/90 rounded-full animate-pulse shadow-lg"></div>
                <span className="text-xs font-semibold font-mono-enhanced text-gradient">Now Playing</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-3 font-mono-enhanced truncate">
                {listeningQueue[currentQueueIndex].title}
              </h3>
              
              {/* Word-by-word highlighting display */}
              <div className="glass-card p-3 rounded-lg mb-4 max-h-32 overflow-y-auto">
                <WordHighlighter
                  wordsData={wordsData}
                  currentWordIndex={currentWordIndex}
                  isPlaying={isPlaying}
                  content={listeningQueue[currentQueueIndex].content}
                  onWordClick={handleWordClick}
                  highlightedWordRef={highlightedWordRef}
                  compact={true}
                />
              </div>
              
              {/* Progress for current item */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-white/70 text-xs mb-2 font-mono-enhanced">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-white/90 to-white/60 rounded-full transition-all duration-300"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Queue List */}
          <div className="flex-1 space-y-2 mb-6 overflow-y-auto overflow-x-hidden px-1 py-1">
            <h4 className="text-sm font-semibold text-white/70 mb-3 font-mono-enhanced">Queue ({listeningQueue.length} items)</h4>
            {listeningQueue.map((item, index) => (
              <div
                key={item.id}
                className={`glass-card p-3 rounded-xl text-sm transition-all duration-300 flex items-start justify-between shadow-md hover:shadow-lg ${
                  currentQueueIndex === index && isQueuePlaying
                    ? 'bg-white/10 text-white border border-white/40 shadow-lg shadow-white/10'
                    : 'text-white/80 hover:bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-white/50 font-mono-enhanced">#{index + 1}</span>
                    {currentQueueIndex === index && isQueuePlaying && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-white/90 rounded-full animate-pulse"></div>
                        <span className="text-xs text-white/90 font-medium font-mono-enhanced">Playing</span>
                      </div>
                    )}
                  </div>
                  <div className="font-semibold text-xs truncate mb-1 font-mono-enhanced">{item.title}</div>
                  <div className="text-xs text-white/60 leading-relaxed font-mono-enhanced">
                    {item.content.slice(0, 70)}...
                  </div>
                </div>
                <button
                  onClick={() => removeFromQueue(item.id)}
                  className="ml-4 btn-premium p-2 rounded-lg transition-all duration-300 flex-shrink-0 hover:bg-red-500/20 hover:border-red-400/30 text-white/60 hover:text-red-400"
                  disabled={currentQueueIndex === index && isQueuePlaying}
                  title="Remove from queue (returns to main content)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Queue Status - Simple and Clean */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-center text-sm text-white/60 font-mono-enhanced">
              {isQueuePlaying ? (
                <div className="flex items-center justify-center gap-2 text-white/80">
                  <div className="w-2 h-2 bg-white/90 rounded-full animate-pulse"></div>
                  <span>Playing: {currentQueueIndex + 1} of {listeningQueue.length}</span>
                </div>
              ) : (
                <span>{listeningQueue.length} items ready to play</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ListeningQueue; 
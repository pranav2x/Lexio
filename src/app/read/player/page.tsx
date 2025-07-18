"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useLexioState } from "@/lib/store";
import { useQueue } from "@/contexts/QueueContext";

// Main MaximizedPlayer Content Component
const MaximizedPlayerContent: React.FC = () => {
  const router = useRouter();
  const { scrapedData } = useLexioState();
  const { 
    listeningQueue, 
    currentQueueIndex, 
    handleControlsNext, 
    handleControlsPrevious, 
    removeFromQueue,
    setCurrentQueueIndex,
    setIsQueuePlaying
  } = useQueue();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [wordTimings, setWordTimings] = useState<Array<{word: string; start: number; end: number}>>([]);
  const [timeOffset, setTimeOffset] = useState(0);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startTimeRef = useRef(0);
  const pausedTimeRef = useRef(0);
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const actualStartTimeRef = useRef(0);

  const currentItem = listeningQueue[currentQueueIndex];
  const words = currentItem ? currentItem.content.split(' ') : [];

  // Debug logging
  useEffect(() => {
    console.log('MaximizedPlayer Debug:', {
      queueLength: listeningQueue.length,
      currentIndex: currentQueueIndex,
      hasCurrentItem: !!currentItem,
      queue: listeningQueue
    });
  }, [listeningQueue, currentQueueIndex, currentItem]);

  // Generate word timings based on text analysis
  const generateWordTimings = () => {
    if (!currentItem) return [];
    
    const baseWPM = 160;
    const adjustedWPM = baseWPM * 1; // speed is always 1 for now
    const charsPerSecond = (adjustedWPM * 5) / 60;
    
    let currentTime = 0;
    const timings = words.map((word) => {
      const wordComplexity = word.length > 6 ? 1.2 : word.length < 3 ? 0.8 : 1;
      const baseDuration = (word.length + 1) / charsPerSecond;
      const wordDuration = baseDuration * wordComplexity;
      
      const timing = {
        word: word,
        start: currentTime,
        end: currentTime + wordDuration
      };
      currentTime += wordDuration;
      return timing;
    });
    
    setWordTimings(timings);
    setDuration(currentTime);
    return timings;
  };

  // Update current word based on elapsed time
  const updateCurrentWord = () => {
    if (wordTimings.length > 0 && isPlaying && !isPaused) {
      const now = Date.now();
      const elapsedTime = (now - actualStartTimeRef.current) / 1000;
      const adjustedTime = elapsedTime + timeOffset;
      
      setCurrentTime(adjustedTime);
      
      const currentWordIdx = wordTimings.findIndex(timing => 
        adjustedTime >= (timing.start - 0.1) && adjustedTime < (timing.end + 0.1)
      );
      
      if (currentWordIdx !== -1 && currentWordIdx !== currentWordIndex) {
        setCurrentWordIndex(currentWordIdx);
      }
      
      if (adjustedTime >= duration) {
        stopSpeech();
      }
    }
  };

  // Stop speech synthesis
  const stopSpeech = () => {
    speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentWordIndex(-1);
    setCurrentTime(0);
    startTimeRef.current = 0;
    actualStartTimeRef.current = 0;
    pausedTimeRef.current = 0;
    setTimeOffset(0);
  };

  useEffect(() => {
    if (!scrapedData) {
      router.push("/");
      return;
    }
  }, [scrapedData, router]);

  // Auto-select first item if queue has items but no current selection
  useEffect(() => {
    if (listeningQueue.length > 0 && currentQueueIndex === -1) {
      setCurrentQueueIndex(0);
    }
  }, [listeningQueue.length, currentQueueIndex, setCurrentQueueIndex]);

  // Set up interval for updating current word
  useEffect(() => {
    if (isPlaying && !isPaused) {
      timeUpdateInterval.current = setInterval(updateCurrentWord, 100);
    } else {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
    }

    return () => {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
    };
  }, [isPlaying, isPaused, wordTimings, currentWordIndex, duration]);

  // Reset state when current item changes
  useEffect(() => {
    stopSpeech();
  }, [currentQueueIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
    };
  }, []);

  const handleBack = () => {
    router.push("/read");
  };

  // Start speech synthesis
  const startSpeech = () => {
    if (!currentItem) return;
    
    try {
      speechSynthesis.cancel();
      
      const timings = generateWordTimings();
      
      const utterance = new SpeechSynthesisUtterance(currentItem.content);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = volume;
      
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Alex') || 
        voice.name.includes('Daniel') || 
        voice.name.includes('Samantha') ||
        voice.lang.includes('en')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.onstart = () => {
        const now = Date.now();
        startTimeRef.current = now;
        actualStartTimeRef.current = now;
        pausedTimeRef.current = 0;
        setIsPlaying(true);
        setIsPaused(false);
        
        setTimeout(() => {
          if (isPlaying && currentWordIndex < 2) {
            setTimeOffset(prev => prev - 0.3);
          }
        }, 1000);
      };
      
      utterance.onend = () => {
        stopSpeech();
        handleControlsNext();
      };
      
      utterance.onerror = (event) => {
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          console.error(`Speech error: ${event.error}`);
        }
        setIsPlaying(false);
      };
      
      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
      
    } catch (err) {
      console.error(`Failed to start speech: ${(err as Error).message}`);
    }
  };

  // Pause speech synthesis
  const pauseSpeech = () => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      setIsPaused(true);
      setIsPlaying(false);
      pausedTimeRef.current = Date.now();
    }
  };

  // Resume speech synthesis from current position
  const resumeSpeech = () => {
    if (isPaused && wordTimings.length > 0 && currentItem) {
      try {
        speechSynthesis.cancel();
        
        // Find the current word position
        const startWordIndex = Math.max(0, currentWordIndex);
        
        // Create text starting from current position
        const remainingWords = words.slice(startWordIndex);
        const remainingText = remainingWords.join(' ');
        
        if (remainingText.trim()) {
          const utterance = new SpeechSynthesisUtterance(remainingText);
          utterance.rate = 1;
          utterance.pitch = 1;
          utterance.volume = volume;
          
          const voices = speechSynthesis.getVoices();
          const preferredVoice = voices.find(voice => 
            voice.name.includes('Alex') || 
            voice.name.includes('Daniel') || 
            voice.name.includes('Samantha') ||
            voice.lang.includes('en')
          );
          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }
          
          utterance.onstart = () => {
            const now = Date.now();
            actualStartTimeRef.current = now - (currentTime * 1000);
            startTimeRef.current = actualStartTimeRef.current;
            setIsPlaying(true);
            setIsPaused(false);
            pausedTimeRef.current = 0;
          };
          
          utterance.onend = () => {
            stopSpeech();
            handleControlsNext();
          };
          
          utterance.onerror = (event) => {
            if (event.error !== 'interrupted' && event.error !== 'canceled') {
              console.error(`Speech error: ${event.error}`);
            }
            setIsPlaying(false);
          };
          
          utteranceRef.current = utterance;
          speechSynthesis.speak(utterance);
        } else {
          setIsPaused(false);
        }
        
      } catch (err) {
        console.error(`Failed to resume speech: ${(err as Error).message}`);
        setIsPaused(false);
      }
    }
  };

  const handlePlayPause = () => {
    if (!currentItem) return;
    
    if (isPlaying) {
      pauseSpeech();
    } else if (isPaused) {
      resumeSpeech();
    } else {
      startSpeech();
    }
  };

  const handleNext = () => {
    stopSpeech();
    handleControlsNext();
  };

  const handlePrevious = () => {
    stopSpeech();
    handleControlsPrevious();
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    // Note: Web Speech API volume change requires recreation of utterance
  };

  if (!scrapedData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading content...</p>
        </div>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="flex-shrink-0 px-4 py-3 border-b border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <ArrowLeft size={16} />
              <span className="text-sm">Back to Reading</span>
            </button>
            
            {/* Debug button */}
            <button
              onClick={() => console.log('Queue Debug:', { listeningQueue, currentQueueIndex })}
              className="px-3 py-1 bg-red-500/20 text-white text-xs rounded"
            >
              Debug Queue
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Play size={24} className="text-white/60" />
            </div>
            <p className="text-white/60 text-lg mb-2">No content in queue</p>
            <p className="text-white/40 text-sm">Add content from the reading page to start listening</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">Back to Reading</span>
          </button>
          
          <div className="text-center">
            <p className="text-sm text-white/60">Now Playing</p>
            <p className="text-lg font-semibold">{scrapedData?.title}</p>
          </div>
          
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Main Player Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full">
        {/* Content Display */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">{currentItem.title}</h1>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-h-96 overflow-y-auto">
            <div className="text-white/80 leading-relaxed text-lg text-left">
              {words.map((word, index) => (
                <span
                  key={index}
                  className={`transition-colors duration-200 ${
                    index === currentWordIndex
                      ? 'bg-white text-black px-1 rounded'
                      : index < currentWordIndex
                      ? 'text-white/50'
                      : 'text-white/80'
                  }`}
                >
                  {word}{' '}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-2xl mb-8">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white/80 transition-all duration-300"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-white/60 mt-2">
            <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
            <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 mb-8">
          <button
            onClick={handlePrevious}
            disabled={currentQueueIndex === 0}
            className="p-3 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 text-white rounded-full transition-colors"
            title="Previous"
          >
            <SkipBack size={24} />
          </button>
          
          <button
            onClick={handlePlayPause}
            className="p-4 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all duration-300 hover:scale-105"
            title={isPlaying ? "Pause" : isPaused ? "Resume" : "Play"}
          >
            {isPlaying ? <Pause size={32} /> : <Play size={32} fill="currentColor" />}
          </button>
          
          <button
            onClick={handleNext}
            disabled={currentQueueIndex >= listeningQueue.length - 1}
            className="p-3 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 text-white rounded-full transition-colors"
            title="Next"
          >
            <SkipForward size={24} />
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-3 mb-8">
          <Volume2 size={20} className="text-white/60" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-32 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
          />
          <span className="text-sm text-white/60 w-8">{Math.round(volume * 100)}%</span>
        </div>

        {/* Queue Info */}
        <div className="text-center text-white/60">
          <p className="text-sm">
            {currentQueueIndex >= 0 ? currentQueueIndex + 1 : 1} of {listeningQueue.length} in queue
          </p>
          {listeningQueue.length > 1 && currentQueueIndex >= 0 && (
            <p className="text-xs mt-1">
              Next: {listeningQueue[currentQueueIndex + 1]?.title || "End of queue"}
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default function MaximizedPlayerPage() {
  return <MaximizedPlayerContent />;
} 
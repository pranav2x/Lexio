"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, FastForward } from 'lucide-react';

interface WebSpeechReaderProps {
  title: string;
  text: string;
  queuePosition?: string;
  contentType?: string;
}

const WebSpeechReader: React.FC<WebSpeechReaderProps> = ({
  title,
  text,
  queuePosition = "1 of 1",
  contentType = "Article"
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [wordTimings, setWordTimings] = useState<Array<{word: string; start: number; end: number}>>([]);
  const [error, setError] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [timeOffset, setTimeOffset] = useState(0);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startTimeRef = useRef(0);
  const pausedTimeRef = useRef(0);
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const actualStartTimeRef = useRef(0);

  const words = text.split(' ');

  // Check if speech synthesis is supported
  const checkSpeechSupport = () => {
    if (!('speechSynthesis' in window)) {
      setError('Speech synthesis not supported in this browser');
      return false;
    }
    return true;
  };

  // Generate word timings based on text analysis
  const generateWordTimings = () => {
    const baseWPM = 160;
    const adjustedWPM = baseWPM * speed;
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

  // Start speech synthesis
  const startSpeech = () => {
    if (!checkSpeechSupport()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      speechSynthesis.cancel();
      
      generateWordTimings();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speed;
      utterance.pitch = 1;
      utterance.volume = 1;
      
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
        setIsLoading(false);
        
        setTimeout(() => {
          if (isPlaying && currentWordIndex < 2) {
            setTimeOffset(prev => prev - 0.3);
          }
        }, 1000);
      };
      
      utterance.onend = () => {
        stopSpeech();
      };
      
      utterance.onerror = (event) => {
        // Only set error for serious errors, not normal interruptions
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          setError(`Speech error: ${event.error}`);
        }
        setIsLoading(false);
        setIsPlaying(false);
      };
      
      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
      
    } catch (err) {
      setError(`Failed to start speech: ${(err as Error).message}`);
      setIsLoading(false);
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
    if (isPaused && wordTimings.length > 0) {
      setIsLoading(true);
      setError('');
      
      try {
        speechSynthesis.cancel();
        
        // Find the current word position
        const currentTimeInSeconds = currentTime;
        const startWordIndex = Math.max(0, currentWordIndex);
        
        // Create text starting from current position
        const remainingWords = words.slice(startWordIndex);
        const remainingText = remainingWords.join(' ');
        
        if (remainingText.trim()) {
          const utterance = new SpeechSynthesisUtterance(remainingText);
          utterance.rate = speed;
          utterance.pitch = 1;
          utterance.volume = 1;
          
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
            // Calculate the offset time so timing continues from where we paused
            actualStartTimeRef.current = now - (currentTimeInSeconds * 1000);
            startTimeRef.current = actualStartTimeRef.current;
            setIsPlaying(true);
            setIsPaused(false);
            setIsLoading(false);
            pausedTimeRef.current = 0;
          };
          
          utterance.onend = () => {
            stopSpeech();
          };
          
          utterance.onerror = (event) => {
            // Only set error for serious errors, not normal interruptions
            if (event.error !== 'interrupted' && event.error !== 'canceled') {
              setError(`Speech error: ${event.error}`);
            }
            setIsLoading(false);
            setIsPlaying(false);
          };
          
          utteranceRef.current = utterance;
          speechSynthesis.speak(utterance);
        } else {
          setIsLoading(false);
          setIsPaused(false);
        }
        
      } catch (err) {
        setError(`Failed to resume speech: ${(err as Error).message}`);
        setIsLoading(false);
        setIsPaused(false);
      }
    }
  };

  // Main play/pause toggle
  const togglePlayPause = () => {
    if (isPlaying) {
      pauseSpeech();
    } else if (isPaused) {
      resumeSpeech();
    } else {
      startSpeech();
    }
  };

  // Reset to beginning
  const resetAudio = () => {
    stopSpeech();
    setCurrentTime(0);
    setCurrentWordIndex(-1);
  };

  // Skip back 10 seconds
  const skipBack = () => {
    if (isPlaying || isPaused) {
      const newTime = Math.max(0, currentTime - 10);
      const newWordIndex = wordTimings.findIndex(timing => 
        newTime >= timing.start && newTime < timing.end
      );
      
      if (newWordIndex !== -1) {
        setCurrentWordIndex(newWordIndex);
        setCurrentTime(newTime);
        actualStartTimeRef.current = Date.now() - (newTime * 1000);
        startTimeRef.current = actualStartTimeRef.current;
      }
    }
  };

  // Skip forward 10 seconds
  const skipForward = () => {
    if (isPlaying || isPaused) {
      const newTime = Math.min(duration, currentTime + 10);
      const newWordIndex = wordTimings.findIndex(timing => 
        newTime >= timing.start && newTime < timing.end
      );
      
      if (newWordIndex !== -1) {
        setCurrentWordIndex(newWordIndex);
        setCurrentTime(newTime);
        startTimeRef.current = Date.now() - (newTime * 1000);
      }
    }
  };

  // Change playback speed
  const changeSpeed = (newSpeed: number) => {
    const wasPlaying = isPlaying;
    if (wasPlaying) {
      stopSpeech();
    }
    setSpeed(newSpeed);
    if (wasPlaying) {
      setTimeout(() => startSpeech(), 100);
    }
  };

  // Handle speed button cycling
  const cycleSpeed = () => {
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(speed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    changeSpeed(nextSpeed);
  };

  // Format time display
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

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

  // Initialize voices when component mounts
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        speechSynthesis.getVoices();
      };
      
      if (speechSynthesis.getVoices().length === 0) {
        speechSynthesis.addEventListener('voiceschanged', loadVoices);
      }
      
      return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-light mb-2">
            {title}
          </h1>
          <p className="text-gray-400 text-sm">{queuePosition} in queue</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1">
            <div 
              className="bg-white h-1 rounded-full transition-all duration-100"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center items-center gap-4 mb-6">
          <button
            onClick={resetAudio}
            className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-600 transition-colors"
            title="Reset to beginning"
          >
            <RotateCcw size={20} />
          </button>
          
          <button
            onClick={skipBack}
            className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-600 transition-colors"
            title="Skip back 10 seconds"
          >
            <SkipBack size={20} />
          </button>

          <button
            onClick={togglePlayPause}
            disabled={isLoading}
            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50"
            title={isPlaying ? "Pause" : isPaused ? "Resume" : "Play"}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause size={24} />
            ) : (
              <Play size={24} className="ml-1" />
            )}
          </button>

          <button
            onClick={skipForward}
            className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-600 transition-colors"
            title="Skip forward 10 seconds"
          >
            <SkipForward size={20} />
          </button>

          <button
            onClick={cycleSpeed}
            className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-600 transition-colors"
            title={`Current speed: ${speed}x`}
          >
            <FastForward size={20} />
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex justify-center gap-2 mb-8">
          <span className="text-gray-400 text-sm mr-4">Playback Speed:</span>
          {[0.75, 1, 1.25, 1.5, 2].map((speedOption) => (
            <button
              key={speedOption}
              onClick={() => changeSpeed(speedOption)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                speed === speedOption
                  ? 'bg-white text-black'
                  : 'bg-gray-800 hover:bg-gray-600'
              }`}
            >
              {speedOption}x
            </button>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-100 text-sm">
            {error}
          </div>
        )}

        {/* Text Content */}
        <div className="bg-gray-900 p-6 rounded-lg">
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
            <div className="w-3 h-3 bg-white rounded-full"></div>
            <span>{contentType} • {queuePosition}</span>
          </div>
          
          <div className="text-sm text-gray-500 mb-4">
            Content loaded • {text.length} characters • Using Web Speech API
          </div>

          {isLoading && (
            <div className="text-white text-sm mb-4">
              🔄 Preparing speech synthesis...
            </div>
          )}

          <div className="text-gray-300 leading-relaxed">
            {words.map((word, index) => (
              <span
                key={index}
                className={`transition-colors duration-200 ${
                  index === currentWordIndex
                    ? 'bg-white text-black px-1 rounded'
                    : index < currentWordIndex
                    ? 'text-gray-400'
                    : 'text-gray-300'
                }`}
              >
                {word}{' '}
              </span>
            ))}
          </div>

          <div className="text-xs text-gray-500 mt-4 italic">
            {wordTimings.length > 0 
              ? 'Text highlighting synchronized with speech synthesis' 
              : 'Click play to start synchronized highlighting'
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebSpeechReader; 
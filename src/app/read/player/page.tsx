"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useLexioState } from "@/lib/store";
import { useQueue } from "@/contexts/QueueContext";
import { VoiceSelector } from "@/components/read/VoiceSelector";
import { SpeedSelector } from "@/components/read/SpeedSelector";

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
  const [isLoading, setIsLoading] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [wordTimings, setWordTimings] = useState<Array<{word: string; start: number; end: number}>>([]);
  const [timeOffset, setTimeOffset] = useState(0);
  const [error, setError] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState('4tRn1lSkEn13EVTuqb0g'); // Default voice
  const [selectedSpeed, setSelectedSpeed] = useState(1.0); // Default speed
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef(0);
  const pausedTimeRef = useRef(0);
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const actualStartTimeRef = useRef(0);
  const audioUrlRef = useRef<string | null>(null);

  const currentItem = listeningQueue[currentQueueIndex];
  const words = currentItem ? currentItem.content.split(' ') : [];

  // Load voice and speed preferences from localStorage
  useEffect(() => {
    const savedVoiceId = localStorage.getItem('lexio-selected-voice');
    if (savedVoiceId) {
      setSelectedVoiceId(savedVoiceId);
    }
    
    const savedSpeed = localStorage.getItem('lexio-selected-speed');
    if (savedSpeed) {
      const speed = parseFloat(savedSpeed);
      // Validate speed is within ElevenLabs range (0.7 - 1.2)
      const validSpeed = Math.max(0.7, Math.min(1.2, speed));
      setSelectedSpeed(validSpeed);
      // Update localStorage if speed was invalid
      if (validSpeed !== speed) {
        localStorage.setItem('lexio-selected-speed', validSpeed.toString());
      }
    }
  }, []);

  // Handle voice selection change
  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    localStorage.setItem('lexio-selected-voice', voiceId);
    
    // Stop current playback if playing
    if (isPlaying || isPaused) {
      stopAudio();
    }
    
    // Clear cached audio when voice changes so it regenerates with new voice
    audioUrlRef.current = null;
  };

  // Handle speed selection change
  const handleSpeedChange = (speed: number) => {
    setSelectedSpeed(speed);
    localStorage.setItem('lexio-selected-speed', speed.toString());
    
    // Stop current playback if playing
    if (isPlaying || isPaused) {
      stopAudio();
    }
    
    // Clear cached audio when speed changes so it regenerates with new speed
    audioUrlRef.current = null;
  };

  // Auto-generate audio when item changes
  useEffect(() => {
    if (currentItem && !audioUrlRef.current) {
      // Pre-generate audio for better UX when user clicks play
      // Use chunking for long texts for faster initial generation
      const shouldPreGenerate = currentItem.content.length < 5000; // Only pre-generate for shorter texts
      
      if (shouldPreGenerate) {
        generateAudio(false).then(audioUrl => {
          if (audioUrl) {
            audioUrlRef.current = audioUrl;
          }
        });
      }
    }
  }, [currentItem]);

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
        stopAudio();
      }
    }
  };

  // Stop audio playback
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentWordIndex(-1);
    setCurrentTime(0);
    startTimeRef.current = 0;
    actualStartTimeRef.current = 0;
    pausedTimeRef.current = 0;
    setTimeOffset(0);
    setError('');
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
    stopAudio();
    // Clear cached audio URL for new item
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, [currentQueueIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
    };
  }, []);

  const handleBack = () => {
    router.push("/read");
  };

  // Generate audio using ElevenLabs with optimizations
  const generateAudio = async (useStreaming: boolean = false) => {
    if (!currentItem) return null;
    
    setIsLoading(true);
    setError('');
    
    try {
      const textLength = currentItem.content.length;
      const shouldUseChunking = textLength > 2000;
      
      console.log(`Generating audio for ${textLength} characters, chunking: ${shouldUseChunking}, streaming: ${useStreaming}`);
      
      const response = await fetch('/api/elevenlabs-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: currentItem.content,
          voiceId: selectedVoiceId,
          stream: useStreaming,
          useChunking: shouldUseChunking && !useStreaming,
          speed: selectedSpeed
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('TTS API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate audio`);
      }

      // Handle streaming response
      if (useStreaming) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        return audioUrl;
      }

      const responseData = await response.json();
      
      // Handle chunked response
      if (responseData.chunks) {
        return await handleChunkedAudio(responseData.chunks);
      }

      // Handle regular response
      const { audio, contentType } = responseData;
      
      // Convert base64 to blob URL
      const audioBlob = new Blob(
        [Uint8Array.from(atob(audio), c => c.charCodeAt(0))], 
        { type: contentType }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      
      return audioUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate audio';
      setError(errorMessage);
      console.error('ElevenLabs TTS error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle chunked audio by combining chunks
  const handleChunkedAudio = async (chunks: Array<{index: number, audio: string, text: string}>) => {
    try {
      // Sort chunks by index to ensure correct order
      chunks.sort((a, b) => a.index - b.index);
      
      // Convert all base64 chunks to audio buffers
      const audioBuffers = chunks.map(chunk => {
        const binaryString = atob(chunk.audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      });
      
      // Calculate total length
      const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
      
      // Combine all audio buffers
      const combinedBuffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const buffer of audioBuffers) {
        combinedBuffer.set(buffer, offset);
        offset += buffer.length;
      }
      
      // Create blob and URL
      const audioBlob = new Blob([combinedBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      return audioUrl;
    } catch (error) {
      console.error('Error combining chunked audio:', error);
      throw new Error('Failed to combine audio chunks');
    }
  };

  // Start audio playback
  const startAudio = async () => {
    if (!currentItem) return;
    
    try {
      // Generate word timings first
      const timings = generateWordTimings();
      
      // Get or generate audio with streaming for faster perceived performance
      let audioUrl = audioUrlRef.current;
      if (!audioUrl) {
        // Try streaming first for faster start, fallback to regular if needed
        const textLength = currentItem.content.length;
        const useStreaming = textLength < 3000; // Use streaming for shorter texts
        
        audioUrl = await generateAudio(useStreaming);
        if (!audioUrl) return;
        audioUrlRef.current = audioUrl;
      }
      
      // Create audio element if it doesn't exist
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      
      const audio = audioRef.current;
      audio.src = audioUrl;
      audio.volume = volume;
      
      audio.onloadedmetadata = () => {
        const now = Date.now();
        startTimeRef.current = now;
        actualStartTimeRef.current = now;
        pausedTimeRef.current = 0;
        setIsPlaying(true);
        setIsPaused(false);
        
        // Slight timing adjustment for better synchronization
        setTimeout(() => {
          if (isPlaying && currentWordIndex < 2) {
            setTimeOffset(prev => prev - 0.2);
          }
        }, 500);
      };
      
      audio.onended = () => {
        stopAudio();
        handleControlsNext();
      };
      
      audio.onerror = () => {
        setError('Failed to play audio');
        setIsPlaying(false);
      };
      
      await audio.play();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start audio';
      setError(errorMessage);
      console.error('Failed to start audio:', err);
    }
  };

  // Pause audio playback
  const pauseAudio = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPaused(true);
      setIsPlaying(false);
      pausedTimeRef.current = Date.now();
    }
  };

  // Resume audio playback
  const resumeAudio = async () => {
    if (isPaused && audioRef.current) {
      try {
        const now = Date.now();
        // Adjust timing to account for pause duration
        actualStartTimeRef.current = now - (currentTime * 1000);
        startTimeRef.current = actualStartTimeRef.current;
        
        await audioRef.current.play();
        setIsPlaying(true);
        setIsPaused(false);
        pausedTimeRef.current = 0;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to resume audio';
        setError(errorMessage);
        console.error('Failed to resume audio:', err);
        setIsPaused(false);
      }
    }
  };

  const handlePlayPause = async () => {
    if (!currentItem) return;
    
    if (isPlaying) {
      pauseAudio();
    } else if (isPaused) {
      await resumeAudio();
    } else {
      await startAudio();
    }
  };

  const handleNext = () => {
    stopAudio();
    handleControlsNext();
  };

  const handlePrevious = () => {
    stopAudio();
    handleControlsPrevious();
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
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
          
          {/* Voice and Speed Selectors */}
          <div className="flex gap-3">
            <VoiceSelector
              selectedVoiceId={selectedVoiceId}
              onVoiceChange={handleVoiceChange}
              selectedSpeed={selectedSpeed}
            />
            <SpeedSelector
              selectedSpeed={selectedSpeed}
              onSpeedChange={handleSpeedChange}
            />
          </div>
        </div>
      </div>

      {/* Main Player Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full">
        {/* Content Display */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">{currentItem.title}</h1>
          
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700/50 rounded-lg text-red-100 text-sm">
              {error}
            </div>
          )}
          
          {/* Loading Display */}
          {isLoading && (
            <div className="mb-4 p-3 bg-blue-900/50 border border-blue-700/50 rounded-lg text-blue-100 text-sm flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
              Lexio is generating audio...
            </div>
          )}
          
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
            disabled={isLoading}
            className="p-4 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed text-white rounded-full transition-all duration-300 hover:scale-105"
            title={isLoading ? "Loading..." : isPlaying ? "Pause" : isPaused ? "Resume" : "Play"}
          >
            {isLoading ? (
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause size={32} />
            ) : (
              <Play size={32} fill="currentColor" />
            )}
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
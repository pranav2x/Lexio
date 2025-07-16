"use client";

import React, { useState, useRef, useEffect } from 'react';
import { cleanupAudioUrl } from '@/lib/tts';
import { useLexioState } from '@/lib/store';
import VoiceSelector from './VoiceSelector';

interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  index: number;
}

interface AudioHighlighterProps {
  content?: string;
  title?: string;
  queueInfo?: string;
  className?: string;
}

const AudioHighlighter: React.FC<AudioHighlighterProps> = ({
  content = "Trade networks expanded dramatically during the period 1200-1450, connecting Europe, Asia, and Africa in complex commercial relationships. The Silk Road continued as the primary overland trade route, reaching peak efficiency under Mongol protection through the Pax Mongolica. Maritime trade in the Indian Ocean basin flourished, linking East Africa, the Middle East, India, Southeast Asia, and China.",
  title = "Trade Networks and Economic Development",
  queueInfo = "1 of 3 in queue",
  className = ""
}) => {
  const { selectedVoiceId } = useLexioState();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [wordTimings, setWordTimings] = useState<WordTiming[]>([]);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const scrollViewRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const timeoutIds = useRef<NodeJS.Timeout[]>([]);
  const intervalId = useRef<NodeJS.Timeout | null>(null);

  // Split content into words
  const words = content.split(/(\s+)/);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (audio) {
        audio.pause();
        cleanupAudioUrl(audio.src);
      }
      timeoutIds.current.forEach(id => clearTimeout(id));
      if (intervalId.current) clearInterval(intervalId.current);
    };
  }, [audio]);

     // Generate word timings based on estimated speech duration
   const generateWordTimings = (textContent: string, audioDuration: number): WordTiming[] => {
     const allWords = textContent.split(/(\s+)/);
     const speechWords = allWords.filter(word => word.trim() !== '');
     
     if (speechWords.length === 0) return [];

    const timings: WordTiming[] = [];
    const totalSpeechTime = audioDuration * 0.92; // Account for silence at start/end
    const averageTimePerWord = totalSpeechTime / speechWords.length;
    
    let currentTime = audioDuration * 0.04; // Start after 4% silence

    allWords.forEach((word, index) => {
      if (word.trim() === '') {
        // Whitespace - small pause
        const pauseDuration = 0.05;
        timings.push({
          word,
          startTime: currentTime,
          endTime: currentTime + pauseDuration,
          index
        });
        currentTime += pauseDuration;
      } else {
        // Calculate word duration based on length and punctuation
        let wordDuration = averageTimePerWord;
        
        // Adjust for word length
        if (word.length > 8) wordDuration *= 1.2;
        if (word.length < 4) wordDuration *= 0.8;
        
        // Add pause after punctuation
        let pauseAfter = 0.1;
        if (/[.!?]$/.test(word)) pauseAfter = 0.5;
        else if (/[,;:]$/.test(word)) pauseAfter = 0.3;
        
        timings.push({
          word,
          startTime: currentTime,
          endTime: currentTime + wordDuration,
          index
        });
        
        currentTime += wordDuration + pauseAfter;
        wordIndex++;
      }
    });

    // Normalize to fit actual audio duration
    const totalCalculated = currentTime;
    if (totalCalculated > audioDuration) {
      const scale = (audioDuration * 0.98) / totalCalculated;
      timings.forEach(timing => {
        timing.startTime *= scale;
        timing.endTime *= scale;
      });
    }

    return timings;
  };

  const startWordHighlighting = () => {
    if (!audio || wordTimings.length === 0) return;

    // Clear existing timeouts
    timeoutIds.current.forEach(id => clearTimeout(id));
    timeoutIds.current = [];

    // Start real-time tracking
    if (intervalId.current) clearInterval(intervalId.current);
    
    intervalId.current = setInterval(() => {
      if (!audio) return;
      
      const time = audio.currentTime;
      let foundIndex = -1;

      // Find current word based on timing
      for (let i = 0; i < wordTimings.length; i++) {
        const timing = wordTimings[i];
        if (time >= timing.startTime && time <= timing.endTime && timing.word.trim() !== '') {
          foundIndex = i;
          break;
        }
      }

      if (foundIndex !== currentWordIndex) {
        setCurrentWordIndex(foundIndex);
        
        // Auto-scroll to current word
        if (foundIndex >= 0 && wordRefs.current[foundIndex]) {
          wordRefs.current[foundIndex]?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }

      setCurrentTime(time);
    }, 50); // Update every 50ms for smooth highlighting
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      // Stop playback
      if (audio) {
        audio.pause();
      }
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
      setIsPlaying(false);
      setCurrentWordIndex(-1);
      return;
    }

    try {
      setIsLoading(true);
      
      let audioToPlay = audio;
      
      // Generate speech if we don't have audio yet
      if (!audioToPlay) {
        console.log('🗣️ Generating speech with voice:', selectedVoiceId);
        const result = await generateSpeech(content, {}, selectedVoiceId);
        
        const newAudio = new Audio(result.audioUrl);
        newAudio.playbackRate = playbackRate;
        
        newAudio.onended = () => {
          setIsPlaying(false);
          setCurrentWordIndex(-1);
          if (intervalId.current) {
            clearInterval(intervalId.current);
            intervalId.current = null;
          }
        };

        newAudio.onloadedmetadata = () => {
          setDuration(newAudio.duration);
          // Generate word timings once we know the audio duration
          const timings = generateWordTimings(content, newAudio.duration);
          setWordTimings(timings);
        };
        
        setAudio(newAudio);
        audioToPlay = newAudio;
      }
      
      await audioToPlay.play();
      setIsPlaying(true);
      
      // Start word highlighting
      startWordHighlighting();
      
    } catch (error) {
      console.error('TTS Error:', error);
      alert('Failed to generate or play speech. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeedChange = (newRate: number) => {
    setPlaybackRate(newRate);
    if (audio) {
      audio.playbackRate = newRate;
    }
  };

  const handleSeek = (seekTime: number) => {
    if (audio) {
      audio.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderWord = (word: string, index: number) => {
    const isCurrentWord = index === currentWordIndex;
    const isWhitespace = word.trim() === '';
    
    if (isWhitespace) {
      return <span key={index}>{word}</span>;
    }
    
    return (
      <span
        key={index}
        ref={(ref) => {
          wordRefs.current[index] = ref;
        }}
        className={`transition-all duration-200 px-0.5 py-0.5 rounded ${
          isCurrentWord 
            ? 'bg-white/20 text-white shadow-sm neon-glow font-semibold' 
            : 'text-white/80 hover:text-white/90 hover:bg-white/5'
        }`}
      >
        {word}
      </span>
    );
  };

  return (
    <div className={`flex flex-col h-screen bg-black ${className}`}>
      {/* Header */}
      <div className="bg-black pt-12 pb-6 px-4 border-b border-white/10">
        <h1 className="text-white text-xl font-bold text-center font-mono-enhanced">
          {title}
        </h1>
        <p className="text-white/60 text-sm text-center mt-1 font-mono-enhanced">
          {queueInfo}
        </p>
      </div>

      {/* Content Area */}
      <div 
        ref={scrollViewRef}
        className="flex-1 px-4 py-6 overflow-y-auto custom-scrollbar"
      >
        <div className="text-lg leading-relaxed max-w-4xl mx-auto font-mono-enhanced">
          {words.map((word, index) => renderWord(word, index))}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-black border-t border-white/10 px-4 py-6">
        {/* Voice Selector */}
        <div className="flex justify-center mb-4">
          <VoiceSelector />
        </div>

        {/* Timeline */}
        <div className="flex items-center mb-4">
          <span className="text-white/60 text-sm font-mono-enhanced min-w-[3rem]">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 mx-4">
            <div 
              className="h-1 bg-white/20 rounded-full cursor-pointer"
              onClick={(e) => {
                if (duration > 0) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const width = rect.width;
                  const newTime = (x / width) * duration;
                  handleSeek(newTime);
                }
              }}
            >
              <div 
                className="h-full bg-white rounded-full transition-all duration-100"
                style={{ 
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` 
                }}
              />
            </div>
          </div>
          <span className="text-white/60 text-sm font-mono-enhanced min-w-[3rem]">
            {formatTime(duration)}
          </span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center space-x-6 mb-4">
          <button 
            className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-lg transition-all duration-200 hover:scale-105 border border-white/20"
            onClick={() => handleSeek(Math.max(0, currentTime - 10))}
            disabled={!audio}
          >
            ⏪
          </button>
          
          <button 
            className="w-16 h-16 bg-white hover:bg-white/90 rounded-full flex items-center justify-center text-black text-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
            onClick={handlePlayPause}
            disabled={isLoading}
          >
            {isLoading ? '⏳' : isPlaying ? '⏸' : '▶'}
          </button>
          
          <button 
            className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-lg transition-all duration-200 hover:scale-105 border border-white/20"
            onClick={() => handleSeek(Math.min(duration, currentTime + 10))}
            disabled={!audio}
          >
            ⏩
          </button>
        </div>

        {/* Playback Speed */}
        <div className="flex items-center justify-center space-x-2">
          <span className="text-white/60 text-sm font-mono-enhanced">Playback Speed:</span>
          {[0.75, 1, 1.25, 1.5].map((speed) => (
            <button
              key={speed}
              className={`px-3 py-1 rounded transition-all duration-200 font-mono-enhanced text-sm hover:scale-105 ${
                speed === playbackRate 
                  ? 'bg-white text-black font-semibold' 
                  : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white/80 border border-white/20'
              }`}
              onClick={() => handleSpeedChange(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          transition: background 0.15s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
};

export default AudioHighlighter; 
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLexioState, useLexioActions } from "@/lib/store";
import { extractSummary } from "@/lib/firecrawl";
import { generateSpeech, cleanupAudioUrl, estimateTextDuration } from "@/lib/tts";
import { 
  DndContext, 
  DragEndEvent, 
  DragStartEvent,
  DragOverlay,
  useDraggable, 
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from "@dnd-kit/core";

interface WordData {
  word: string;
  index: number;
  startTime: number;
  endTime: number;
  isWhitespace: boolean;
}

interface QueueItem {
  id: string;
  title: string;
  content: string;
}

type PlayingSection = 'summary' | `section-${number}` | null;

export default function ReadPage() {
  const router = useRouter();
  const { scrapedData, currentUrl } = useLexioState();
  const { clearAll } = useLexioActions();
  
  // Audio state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [wordsData, setWordsData] = useState<WordData[]>([]);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  // Section-specific playback state
  const [currentPlayingSection, setCurrentPlayingSection] = useState<PlayingSection>(null);
  const [currentPlayingText, setCurrentPlayingText] = useState<string>('');
  
  // Expandable boxes state
  const [expandedBoxes, setExpandedBoxes] = useState<Set<string>>(new Set());
  
  // Listening Queue state
  const [listeningQueue, setListeningQueue] = useState<QueueItem[]>([]);
  const [isQueuePlaying, setIsQueuePlaying] = useState(false);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  
  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ id: string; title: string; content: string } | null>(null);
  
  // Playback control state (demo purposes)
  const [controlsPlaying, setControlsPlaying] = useState(false);
  const [controlsProgress, setControlsProgress] = useState(0);
  const [controlsShuffle, setControlsShuffle] = useState(false);
  const [controlsRepeat, setControlsRepeat] = useState(false);
  const [controlsCurrentTime, setControlsCurrentTime] = useState(0);
  const [controlsTotalTime] = useState(180); // 3 minutes demo duration
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const highlightedWordRef = useRef<HTMLSpanElement>(null);

  // Drag sensors for smooth performance
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before drag starts
      },
    })
  );

  // Fake progress simulation for demo
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (controlsPlaying) {
      interval = setInterval(() => {
        setControlsCurrentTime(prev => {
          const newTime = prev + 1;
          if (newTime >= controlsTotalTime) {
            setControlsPlaying(false);
            return 0;
          }
          return newTime;
        });
        setControlsProgress(prev => {
          const newProgress = prev + (100 / controlsTotalTime);
          return newProgress >= 100 ? 0 : newProgress;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [controlsPlaying, controlsTotalTime]);

  // Toggle expand/collapse for a specific box
  const toggleBoxExpansion = (boxId: string) => {
    setExpandedBoxes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(boxId)) {
        newSet.delete(boxId);
      } else {
        newSet.add(boxId);
      }
      return newSet;
    });
  };

  // Check if content needs expansion (more than 300 characters)
  const needsExpansion = (content: string) => content.length > 300;

  // Queue management functions
  const addToQueue = (item: QueueItem) => {
    setListeningQueue(prev => {
      // Prevent duplicates
      if (prev.find(qItem => qItem.id === item.id)) return prev;
      return [...prev, item];
    });
  };

  const removeFromQueue = (id: string) => {
    setListeningQueue(prev => prev.filter(item => item.id !== id));
  };

  const clearQueue = () => {
    setListeningQueue([]);
    setIsQueuePlaying(false);
    setCurrentQueueIndex(-1);
  };

  // Playback control functions (demo purposes)
  const handleControlsPlayPause = () => {
    setControlsPlaying(!controlsPlaying);
  };

  const handleControlsPrevious = () => {
    if (listeningQueue.length > 0) {
      setCurrentQueueIndex(prev => prev <= 0 ? listeningQueue.length - 1 : prev - 1);
      setControlsCurrentTime(0);
      setControlsProgress(0);
    }
  };

  const handleControlsNext = () => {
    if (listeningQueue.length > 0) {
      setCurrentQueueIndex(prev => prev >= listeningQueue.length - 1 ? 0 : prev + 1);
      setControlsCurrentTime(0);
      setControlsProgress(0);
    }
  };

  const handleControlsShuffle = () => {
    setControlsShuffle(!controlsShuffle);
  };

  const handleControlsRepeat = () => {
    setControlsRepeat(!controlsRepeat);
  };

  const formatControlsTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const draggedId = active.id.toString();
    
    setActiveId(draggedId);
    
    if (!scrapedData) return;
    
    if (draggedId === 'summary') {
      setDraggedItem({
        id: 'summary',
        title: 'Summary',
        content: extractSummary(scrapedData.cleanText || scrapedData.text, 1000)
      });
    } else if (draggedId.startsWith('section-')) {
      const sectionIndex = parseInt(draggedId.replace('section-', ''));
      const section = scrapedData.sections[sectionIndex];
      if (section) {
        setDraggedItem({
          id: draggedId,
          title: section.title,
          content: section.content
        });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setDraggedItem(null);
    
    if (!over || over.id !== 'listening-queue' || !scrapedData) return;

    const draggedId = active.id.toString();
    
    if (draggedId === 'summary') {
      addToQueue({
        id: 'summary',
        title: 'Summary',
        content: extractSummary(scrapedData.cleanText || scrapedData.text, 1000)
      });
    } else if (draggedId.startsWith('section-')) {
      const sectionIndex = parseInt(draggedId.replace('section-', ''));
      const section = scrapedData.sections[sectionIndex];
      if (section) {
        addToQueue({
          id: draggedId,
          title: section.title,
          content: section.content
        });
      }
    }
  };

  // Queue playback functionality
  const playQueue = async () => {
    if (listeningQueue.length === 0) return;
    
    setIsQueuePlaying(true);
    setCurrentQueueIndex(0);
    
    for (let i = 0; i < listeningQueue.length; i++) {
      setCurrentQueueIndex(i);
      const item = listeningQueue[i];
      
      try {
        const result = await generateSpeech(item.content);
        setAudioUrl(result.audioUrl);
        setCurrentPlayingText(item.content);
        setCurrentPlayingSection(item.id as PlayingSection);
        
        // Wait for audio to finish
        await new Promise<void>((resolve) => {
          if (audioRef.current) {
            const handleEnded = () => {
              audioRef.current?.removeEventListener('ended', handleEnded);
              resolve();
            };
            audioRef.current.addEventListener('ended', handleEnded);
            audioRef.current.play();
          } else {
            resolve();
          }
        });
        
        // Cleanup audio
        if (result.audioUrl) {
          cleanupAudioUrl(result.audioUrl);
        }
      } catch (error) {
        console.error('Error playing queue item:', error);
      }
    }
    
    setIsQueuePlaying(false);
    setCurrentQueueIndex(-1);
    setCurrentPlayingSection(null);
    setCurrentPlayingText('');
  };

  // Optimized Draggable Card Component
  const DraggableCard = React.memo(({ id, children }: { id: string; children: React.ReactNode }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
      id,
    });

    const isActive = activeId === id;

    const style: React.CSSProperties = {
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      opacity: isActive ? 0.4 : 1,
      willChange: 'transform',
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`
          draggable-item gpu-accelerated
          transition-all duration-200 ease-out
          ${isActive 
            ? 'scale-105 rotate-2 cursor-grabbing z-50' 
            : 'cursor-grab hover:scale-[1.01] hover:shadow-lg drag-smooth'
          }
        `}
      >
        {children}
      </div>
    );
  });
  DraggableCard.displayName = 'DraggableCard';

  // Drag Overlay Component for smooth dragging
  const DragOverlayCard = ({ item }: { item: { id: string; title: string; content: string } }) => {
    return (
      <div className="w-full bg-white border-2 border-black rounded-2xl p-6 h-64 flex flex-col shadow-2xl transform rotate-3 scale-110 gpu-accelerated">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              item.id === 'summary' ? 'bg-blue-500' : 'bg-green-500'
            }`}></div>
            <h3 className="text-lg font-semibold text-black truncate">
              {item.title}
            </h3>
          </div>
          <div className="p-3 bg-neutral-100 rounded-xl">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-sm text-neutral-600 leading-relaxed line-clamp-8">
            {item.content.length > 300 ? item.content.substring(0, 300) + '...' : item.content}
          </p>
        </div>
      </div>
    );
  };

  // Optimized Droppable Queue Zone
  const ListeningQueueDropZone = React.memo(() => {
    const { setNodeRef, isOver } = useDroppable({
      id: 'listening-queue',
    });

    const isDragActive = activeId !== null;

    return (
      <div
        ref={setNodeRef}
        className={`
          w-full h-[850px] bg-white border-2 rounded-2xl p-6 
          gpu-accelerated transition-all duration-300 ease-out flex flex-col
          ${isOver 
            ? 'border-black bg-gradient-to-br from-blue-50 to-green-50 scale-[1.02] shadow-xl' 
            : isDragActive
              ? 'border-blue-300 bg-blue-25 scale-[1.01]'
              : 'border-neutral-200 hover:border-neutral-300'
          }
        `}
        style={{ willChange: 'transform, background-color, border-color' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-black">🎧 Listening Queue</h3>
          {listeningQueue.length > 0 && (
            <button
              onClick={clearQueue}
              className="text-sm text-neutral-400 hover:text-red-500 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {listeningQueue.length === 0 ? (
          <div className={`flex flex-col items-center justify-center flex-1 text-sm transition-all duration-200 ${
            isOver ? 'text-black' : 'text-neutral-400'
          }`}>
            <div className="text-6xl mb-6">📥</div>
            <div className="text-xl font-semibold mb-3 text-center">Drag sections here to queue them</div>
            <div className="text-sm text-neutral-500 text-center px-4">Build your custom listening experience by dragging any section from the left</div>
            {isOver && <div className="text-lg mt-6 text-neutral-600 font-semibold animate-pulse">Drop to add to queue</div>}
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 mb-6 overflow-y-auto">
              {listeningQueue.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl text-sm transition-all duration-200 flex items-start justify-between ${
                    currentQueueIndex === index && isQueuePlaying
                      ? 'bg-neutral-100 text-black border border-neutral-200'
                      : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    {currentQueueIndex === index && isQueuePlaying && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">Now playing...</span>
                      </div>
                    )}
                    <div className="font-semibold text-lg truncate mb-2">{item.title}</div>
                    <div className="text-sm text-neutral-500 leading-relaxed">
                      {item.content.slice(0, 120)}...
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromQueue(item.id)}
                    className="ml-3 p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={playQueue}
              disabled={isQueuePlaying}
              className="w-full bg-neutral-100 text-black rounded-xl py-5 px-6 text-xl font-bold transition-all duration-200 hover:bg-neutral-200 active:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isQueuePlaying ? '⏸️ Playing Queue...' : '▶️ Play Queue'}
            </button>
          </>
        )}

        {/* Playback Control Bar */}
        <div className="mt-6 bg-neutral-50 border border-neutral-200 rounded-xl p-4">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-neutral-600 text-xs mb-2">
              <span>{formatControlsTime(controlsCurrentTime)}</span>
              <span>{formatControlsTime(controlsTotalTime)}</span>
            </div>
            <div className="w-full h-1 bg-neutral-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-black rounded-full transition-all duration-200"
                style={{ width: `${controlsProgress}%` }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-6">
            {/* Shuffle */}
            <button
              onClick={handleControlsShuffle}
              className={`p-2 rounded-full transition-all duration-200 ${
                controlsShuffle ? 'bg-neutral-300 text-black' : 'text-neutral-600 hover:bg-neutral-200 hover:text-black active:bg-neutral-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4h6l4 4-4 4H4m16-8v8a4 4 0 01-8 0V8a4 4 0 018 0zM4 20h6l4-4-4-4H4" />
              </svg>
            </button>

            {/* Previous */}
            <button
              onClick={handleControlsPrevious}
              className="p-2 text-neutral-600 hover:bg-neutral-200 hover:text-black active:bg-neutral-300 rounded-full transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={handleControlsPlayPause}
              className="p-3 bg-neutral-100 text-black rounded-full hover:bg-neutral-200 active:bg-neutral-300 transition-all duration-200"
            >
              {controlsPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Next */}
            <button
              onClick={handleControlsNext}
              className="p-2 text-neutral-600 hover:bg-neutral-200 hover:text-black active:bg-neutral-300 rounded-full transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
              </svg>
            </button>

            {/* Repeat */}
            <button
              onClick={handleControlsRepeat}
              className={`p-2 rounded-full transition-all duration-200 ${
                controlsRepeat ? 'bg-neutral-300 text-black' : 'text-neutral-600 hover:bg-neutral-200 hover:text-black active:bg-neutral-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  });
  ListeningQueueDropZone.displayName = 'ListeningQueueDropZone';

  // Generate word timing data based on text and audio duration with improved accuracy
  const generateWordTimings = useCallback((text: string, audioDuration: number): WordData[] => {
    const words = text.split(/(\s+)/);
    const nonWhitespaceWords = words.filter(word => word.trim() !== '');
    const totalWords = nonWhitespaceWords.length;
    
    // More realistic speech rates: average 150-200 words per minute
    const estimatedSpeechRate = Math.max(120, Math.min(totalWords / (audioDuration / 60), 200));
    const baseWordDuration = 60 / estimatedSpeechRate; // seconds per word
    
    let currentTime = 0;
    const wordTimings: WordData[] = [];
    
    words.forEach((word, index) => {
      const isWhitespace = word.trim() === '';
      
      if (isWhitespace) {
        // Small pause for whitespace
        const pauseDuration = word.includes('\n') ? 0.3 : 0.1;
        wordTimings.push({
          word,
          index,
          startTime: currentTime,
          endTime: currentTime + pauseDuration,
          isWhitespace: true,
        });
        currentTime += pauseDuration;
      } else {
        // Calculate word duration based on various factors
        let wordDuration = baseWordDuration;
        
        // Adjust for word length (longer words take more time)
        const wordLength = word.length;
        if (wordLength > 10) wordDuration *= 1.4;
        else if (wordLength > 7) wordDuration *= 1.2;
        else if (wordLength > 4) wordDuration *= 1.1;
        else if (wordLength <= 2) wordDuration *= 0.8;
        
        // Adjust for punctuation (pauses after sentences)
        if (/[.!?]$/.test(word)) wordDuration *= 1.5; // Sentence endings
        else if (/[,;:]$/.test(word)) wordDuration *= 1.2; // Clause endings
        
        // Adjust for complexity (technical terms, numbers, etc.)
        if (/\d/.test(word)) wordDuration *= 1.3; // Numbers
        if (/[A-Z]{2,}/.test(word)) wordDuration *= 1.2; // Acronyms
        
        wordTimings.push({
          word,
          index,
          startTime: currentTime,
          endTime: currentTime + wordDuration,
          isWhitespace: false,
        });
        
        currentTime += wordDuration;
      }
    });
    
    // Normalize timings to match actual audio duration
    const totalCalculatedTime = currentTime;
    const scaleFactor = audioDuration / totalCalculatedTime;
    
    wordTimings.forEach(timing => {
      timing.startTime *= scaleFactor;
      timing.endTime *= scaleFactor;
    });
    
    return wordTimings;
  }, []);

  // Find current word based on audio time
  const findCurrentWordIndex = useCallback((currentTime: number): number => {
    if (wordsData.length === 0) return -1;
    
    for (let i = 0; i < wordsData.length; i++) {
      const word = wordsData[i];
      if (!word.isWhitespace && currentTime >= word.startTime && currentTime <= word.endTime) {
        return i;
      }
    }
    
    // If not found, find the closest word
    let closestIndex = -1;
    let closestDistance = Infinity;
    
    wordsData.forEach((word, index) => {
      if (!word.isWhitespace) {
        const distance = Math.abs(word.startTime - currentTime);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      }
    });
    
    return closestIndex;
  }, [wordsData]);

  // Auto-scroll to current word
  const scrollToCurrentWord = useCallback(() => {
    if (highlightedWordRef.current && contentRef.current) {
      const wordElement = highlightedWordRef.current;
      const container = contentRef.current;
      
      // Get the position of the word relative to the container
      const wordRect = wordElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Calculate if we need to scroll
      const wordTop = wordRect.top - containerRect.top;
      const wordBottom = wordRect.bottom - containerRect.top;
      const containerHeight = containerRect.height;
      
      // Only scroll if the word is not visible or near the edges
      if (wordTop < 100 || wordBottom > containerHeight - 100) {
        wordElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, []);

  const generateAudioForSection = useCallback(async (sectionType: PlayingSection, customText?: string) => {
    if (!scrapedData || !sectionType) return;

    setIsGeneratingAudio(true);
    setAudioError(null);
    setCurrentPlayingSection(sectionType);

    try {
      let textToSpeak = '';

      // Get the text based on section type
      if (customText) {
        textToSpeak = customText;
      } else if (sectionType === 'summary') {
        textToSpeak = extractSummary(scrapedData.cleanText || scrapedData.text, 1000);
      } else if (sectionType.startsWith('section-')) {
        const sectionIndex = parseInt(sectionType.replace('section-', ''));
        const section = scrapedData.sections[sectionIndex];
        if (section) {
          textToSpeak = section.content;
        }
      }

      setCurrentPlayingText(textToSpeak);
      const result = await generateSpeech(textToSpeak);
      setAudioUrl(result.audioUrl);
    } catch (error) {
      console.error('Failed to generate audio:', error);
      setAudioError(error instanceof Error ? error.message : 'Failed to generate audio');
      setCurrentPlayingSection(null);
      setCurrentPlayingText('');
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [scrapedData]);

  // Legacy function for backward compatibility
  const generateAudioFromText = useCallback(async () => {
    await generateAudioForSection('summary');
  }, [generateAudioForSection]);

  // Update current word index based on audio time
  useEffect(() => {
    if (isPlaying && wordsData.length > 0) {
      const newWordIndex = findCurrentWordIndex(currentTime);
      if (newWordIndex !== currentWordIndex && newWordIndex !== -1) {
        setCurrentWordIndex(newWordIndex);
      }
    }
  }, [currentTime, isPlaying, wordsData, findCurrentWordIndex, currentWordIndex]);

  // Auto-scroll when current word changes
  useEffect(() => {
    if (currentWordIndex !== -1 && isPlaying) {
      // Small delay to ensure DOM is updated
      setTimeout(scrollToCurrentWord, 100);
    }
  }, [currentWordIndex, isPlaying, scrollToCurrentWord]);

  // Generate word timings when audio loads
  useEffect(() => {
    if (audioRef.current && duration > 0 && currentPlayingText) {
      const timings = generateWordTimings(currentPlayingText, duration);
      setWordsData(timings);
    }
  }, [duration, currentPlayingText, generateWordTimings]);

  // Set playback rate when audio loads
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [audioUrl, playbackRate]);

  useEffect(() => {
    // Redirect to home if no data is available
    if (!scrapedData) {
      router.push("/");
      return;
    }

    // Cleanup function - removed auto audio generation
    return () => {
      if (audioUrl) {
        cleanupAudioUrl(audioUrl);
      }
    };
  }, [scrapedData, router, audioUrl]);

  const handleBack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (audioUrl) {
      cleanupAudioUrl(audioUrl);
    }
    clearAll();
    router.push("/");
  };

  const handleStartOver = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (audioUrl) {
      cleanupAudioUrl(audioUrl);
    }
    clearAll();
    router.push("/");
  };

  const handlePlayPause = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleStop = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setCurrentWordIndex(-1);
    setCurrentPlayingSection(null);
    setCurrentPlayingText('');
    if (audioUrl) {
      cleanupAudioUrl(audioUrl);
      setAudioUrl(null);
    }
  };

  const handleSeek = (newTime: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = newTime;
  };

  // Handle word click to seek to that position
  const handleWordClick = (wordIndex: number) => {
    if (!audioRef.current || wordIndex >= wordsData.length) return;
    
    const wordData = wordsData[wordIndex];
    if (!wordData.isWhitespace) {
      audioRef.current.currentTime = wordData.startTime;
      setCurrentWordIndex(wordIndex);
    }
  };

  // Handle playback speed change
  const handleSpeedChange = (newRate: number) => {
    if (!audioRef.current) return;
    
    setPlaybackRate(newRate);
    audioRef.current.playbackRate = newRate;
  };

  // Speed options
  const speedOptions = [0.75, 1, 1.25, 1.5];

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };



  // Enhanced text preparation with section-specific highlighting
  const prepareTextForTTS = (text: string, sectionType: PlayingSection) => {
    // Only show highlighting if this section is currently playing and matches the current playing text
    const shouldHighlight = currentPlayingSection === sectionType && 
                           currentPlayingText && 
                           text === currentPlayingText;
    
    const words = text.split(/(\s+)/);
    
    return words.map((word, index) => {
      const isWhitespace = word.trim() === '';
      const isHighlighted = shouldHighlight && currentWordIndex === index;
      
      if (isWhitespace) {
        return word; // Return whitespace as-is
      }
      
      return (
        <span
          key={index}
          ref={isHighlighted ? highlightedWordRef : undefined}
          className={`inline-block cursor-pointer transition-all duration-200 ${
            isHighlighted 
              ? 'bg-yellow-300 dark:bg-yellow-600 text-black dark:text-white px-1 py-0.5 rounded-sm shadow-md scale-105' 
              : shouldHighlight 
                ? 'hover:bg-secondary/50 px-0.5 py-0.5 rounded-sm' 
                : 'px-0.5 py-0.5'
          }`}
          onClick={() => shouldHighlight && handleWordClick(index)}
          title={shouldHighlight ? "Click to jump to this word" : undefined}
        >
          {word}
        </span>
      );
    });
  };

  if (!scrapedData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading content...</p>
        </div>
      </div>
    );
  }

      return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-white text-black [&_*]:text-black">
      {/* Hidden Audio Element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration);
              // Removed auto-play - user now controls playback
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentWordIndex(-1);
            // Keep the section and text state so user can replay if needed
          }}
          preload="auto"
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground hidden sm:block">
                {currentUrl && new URL(currentUrl).hostname}
              </div>
              <button
                onClick={handleStartOver}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent transition-colors"
              >
                New Site
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Audio Controls */}
      <div className="sticky top-16 z-30 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-4xl mx-auto">
            {isGeneratingAudio && (
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                <span className="text-muted-foreground">Generating audio...</span>
              </div>
            )}

            {audioError && (
              <div className="flex items-center justify-center gap-2 mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-red-800 dark:text-red-200 text-sm">{audioError}</span>
                <button
                  onClick={generateAudioFromText}
                  className="text-red-600 hover:text-red-800 text-sm underline ml-2"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Generate Audio Button - Show when no audio is generated yet */}
            {!audioUrl && !isGeneratingAudio && !audioError && (
              <div className="flex items-center justify-center mb-4">
                <button
                  onClick={generateAudioFromText}
                  className="flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  <span>Generate Audio</span>
                </button>
              </div>
            )}

            {audioUrl && !isGeneratingAudio && (
              <div className="space-y-4">
                {/* Play Controls */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={handlePlayPause}
                    disabled={!audioUrl}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                      isPlaying
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isPlaying ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6" />
                        </svg>
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span>Play Audio</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleStop}
                    disabled={!audioUrl}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium bg-secondary text-secondary-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10h6v4H9z" />
                    </svg>
                    <span>Stop</span>
                  </button>

                  <button
                    onClick={generateAudioFromText}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Regenerate</span>
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <div className="relative">
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-200"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      value={currentTime}
                      onChange={(e) => handleSeek(Number(e.target.value))}
                      className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main ref={contentRef} className="w-full pl-6 pr-6 py-8">
        <div className="w-full">
          {/* Article Header */}
          <div className="mb-8">
            <div className="max-w-none">
              <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-black">
                {scrapedData.title}
              </h1>
            </div>
            
            {currentUrl && (
              <div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <a 
                  href={currentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-black transition-colors"
                >
                  {currentUrl}
                </a>
              </div>
            )}

            {/* Content Stats */}
            <div className="flex flex-wrap gap-4 text-sm text-neutral-500 mb-8">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{scrapedData.text.split(' ').length} words</span>
                {scrapedData.cleanText && scrapedData.cleanText !== scrapedData.text && (
                  <span className="text-blue-600 text-xs">
                    ({scrapedData.cleanText.split(' ').length} optimized)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>~{Math.ceil(scrapedData.text.split(' ').length / 200)} min read</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                <span>~{Math.ceil(estimateTextDuration(scrapedData.text) / 60)} min listen</span>
              </div>
              {audioUrl && (
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12 7-12 6z" />
                  </svg>
                  <span>Audio ready</span>
                </div>
              )}
            </div>

            {/* How to Listen Instructions */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How to Listen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-neutral-600">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-blue-600">1</span>
                  </div>
                  <p>Click any play button to start listening to that section</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-green-600">2</span>
                  </div>
                  <p>Words highlight in yellow as they're spoken</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-purple-600">3</span>
                  </div>
                  <p>Use the bottom controls to pause, adjust speed, and navigate</p>
                </div>
              </div>
            </div>
          </div>

          {/* Left-aligned Layout - No columns, pure left alignment */}
          <div className="flex gap-10">
            {/* Content Cards - Left-aligned with no centering */}
            <div className="flex-1 max-w-4xl">
              {/* Content Grid - Left-aligned with even spacing */}
              <div className="grid grid-cols-2 gap-10 auto-rows-min">
                
                {/* Section Cards */}
                {scrapedData.sections.slice(0, 5).map((section, index) => (
                  <DraggableCard key={index} id={`section-${index}`}>
                    <div 
                      className={`w-full bg-white border-2 rounded-2xl p-6 flex flex-col transition-all duration-300 ease-in-out ${
                        expandedBoxes.has(`section-${index}`) ? 'h-auto min-h-64' : 'h-64'
                      } ${
                        currentPlayingSection === `section-${index}` 
                          ? 'border-black bg-neutral-50' 
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          index % 3 === 0 ? 'bg-green-500' : 
                          index % 3 === 1 ? 'bg-purple-500' : 'bg-orange-500'
                        }`}></div>
                        <h3 className="text-lg font-semibold text-black truncate">
                          {section.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {needsExpansion(section.content) && (
                          <button
                            onClick={() => toggleBoxExpansion(`section-${index}`)}
                            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors duration-200"
                          >
                            <svg 
                              className={`w-4 h-4 text-neutral-600 transition-transform duration-300 ${
                                expandedBoxes.has(`section-${index}`) ? 'rotate-180' : ''
                              }`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => generateAudioForSection(`section-${index}` as PlayingSection)}
                          disabled={isGeneratingAudio}
                          className={`play-button relative p-3 rounded-xl transition-all duration-300 transform active:scale-95 hover:scale-105 shadow-sm hover:shadow-md ${
                            currentPlayingSection === `section-${index}`
                              ? 'bg-neutral-300 text-black shadow-lg'
                              : 'bg-neutral-100 text-black hover:bg-neutral-200 active:bg-neutral-300'
                          } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none`}
                          onMouseDown={(e) => {
                            e.currentTarget.classList.add('play-button-clicked');
                            setTimeout(() => {
                              e.currentTarget.classList.remove('play-button-clicked');
                            }, 400);
                          }}
                        >
                          {isGeneratingAudio && currentPlayingSection === `section-${index}` ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                          {/* Click ripple effect */}
                          <div className="absolute inset-0 rounded-xl opacity-0 bg-white/20 transition-opacity duration-200"></div>
                        </button>
                      </div>
                    </div>
                    <div className={`flex-1 overflow-hidden transition-all duration-300 ${
                      expandedBoxes.has(`section-${index}`) ? 'overflow-visible' : ''
                    }`}>
                      <p className={`text-sm text-neutral-600 leading-relaxed ${
                        expandedBoxes.has(`section-${index}`) ? '' : 'line-clamp-8'
                      }`}>
                        {expandedBoxes.has(`section-${index}`)
                          ? section.content
                          : (section.content.length > 300 ? section.content.substring(0, 300) + '...' : section.content)
                        }
                      </p>
                    </div>
                  </div>
                  </DraggableCard>
                ))}



                                 

                {/* Additional Sections (if more than 5) */}
                {scrapedData.sections.length > 5 && (
                  <div className="w-full bg-white border-2 border-neutral-200 rounded-2xl p-6 h-64 flex flex-col justify-center items-center text-center hover:border-neutral-300 transition-all duration-200">
                    <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-black mb-2">More Sections</h3>
                    <p className="text-sm text-neutral-600">
                      +{scrapedData.sections.length - 5} additional sections available
                    </p>
                  </div>
                )}

                {/* Summary Card - Moved to bottom */}
                {scrapedData.text && (
                  <DraggableCard id="summary">
                    <div className={`w-full bg-white border-2 rounded-2xl p-6 flex flex-col transition-all duration-300 ease-in-out ${
                      expandedBoxes.has('summary') ? 'h-auto min-h-64' : 'h-64'
                    } ${
                      currentPlayingSection === 'summary' 
                        ? 'border-black bg-neutral-50' 
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-black">Summary</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Always show expand for summary since it's truncated content */}
                        <button
                          onClick={() => toggleBoxExpansion('summary')}
                          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors duration-200"
                        >
                          <svg 
                            className={`w-4 h-4 text-neutral-600 transition-transform duration-300 ${
                              expandedBoxes.has('summary') ? 'rotate-180' : ''
                            }`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => generateAudioForSection('summary')}
                          disabled={isGeneratingAudio}
                          className={`play-button relative p-3 rounded-xl transition-all duration-300 transform active:scale-95 hover:scale-105 shadow-sm hover:shadow-md ${
                            currentPlayingSection === 'summary'
                              ? 'bg-neutral-300 text-black shadow-lg'
                              : 'bg-neutral-100 text-black hover:bg-neutral-200 active:bg-neutral-300'
                          } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none`}
                          onMouseDown={(e) => {
                            e.currentTarget.classList.add('play-button-clicked');
                            setTimeout(() => {
                              e.currentTarget.classList.remove('play-button-clicked');
                            }, 400);
                          }}
                        >
                          {isGeneratingAudio && currentPlayingSection === 'summary' ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                          {/* Click ripple effect */}
                          <div className="absolute inset-0 rounded-xl opacity-0 bg-white/20 transition-opacity duration-200 animate-pulse-once"></div>
                        </button>
                      </div>
                    </div>
                    <div className={`flex-1 overflow-hidden transition-all duration-300 ${
                      expandedBoxes.has('summary') ? 'overflow-visible' : ''
                    }`}>
                      <p className={`text-sm text-neutral-600 leading-relaxed ${
                        expandedBoxes.has('summary') ? '' : 'line-clamp-8'
                      }`}>
                        {expandedBoxes.has('summary') 
                          ? (scrapedData.cleanText || scrapedData.text)
                          : extractSummary(scrapedData.text, 200)
                        }
                      </p>
                    </div>
                  </div>
                  </DraggableCard>
                )}
              </div>
            </div>

            {/* Listening Queue - Integrated into layout */}
            <div className="w-96 flex-shrink-0">
              <div className="sticky top-24">
                <ListeningQueueDropZone />
              </div>
            </div>

            {/* Right Side - Currently Playing Info & Controls (4/12 columns) */}
            <div className="w-80 flex-shrink-0">
              <div className="sticky top-8">
                {/* Currently Playing Card */}
                {currentPlayingSection && audioUrl && (
                  <div className="bg-neutral-50 border border-neutral-200 text-black rounded-2xl p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">Now Playing</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {currentPlayingSection === 'summary' ? 'Summary' :
                       currentPlayingSection?.startsWith('section-') ? 
                         scrapedData.sections[parseInt(currentPlayingSection.replace('section-', ''))]?.title || 'Section' : 
                         currentPlayingSection}
                    </h3>
                    {currentWordIndex !== -1 && wordsData[currentWordIndex] && (
                      <p className="text-sm text-neutral-600">
                        Word {wordsData.filter((word, index) => !word.isWhitespace && index <= currentWordIndex).length} of {wordsData.filter(word => !word.isWhitespace).length}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Audio Control Bar */}
      {audioUrl && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border/40">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col gap-3">
                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground min-w-[3rem] text-right">
                    {formatTime(currentTime)}
                  </span>
                  <div className="flex-1 relative">
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-200"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      value={currentTime}
                      onChange={(e) => handleSeek(Number(e.target.value))}
                      className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                      aria-label="Audio progress"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground min-w-[3rem]">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  {/* Left Side - Play/Pause/Stop */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePlayPause}
                      disabled={!audioUrl}
                      className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                        isPlaying
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    
                    <button
                      onClick={handleStop}
                      disabled={!audioUrl}
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Stop"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10h6v4H9z" />
                      </svg>
                    </button>
                  </div>

                  {/* Center - Current Section and Word Indicator */}
                  <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
                    {currentPlayingSection && (
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="font-medium text-xs">
                          Playing: {
                            currentPlayingSection === 'summary' ? 'Summary' :
                            currentPlayingSection?.startsWith('section-') ? 
                              `Section ${parseInt(currentPlayingSection.replace('section-', '')) + 1}` : 
                              currentPlayingSection
                          }
                        </span>
                      </span>
                    )}
                    {currentWordIndex !== -1 && wordsData[currentWordIndex] && (
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                        <span className="font-medium text-xs">
                          Word {wordsData.filter((word, index) => !word.isWhitespace && index <= currentWordIndex).length} / {wordsData.filter(word => !word.isWhitespace).length}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Right Side - Speed Control */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:block">Speed:</span>
                    <div className="flex items-center gap-1">
                      {speedOptions.map((speed) => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedChange(speed)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            playbackRate === speed
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground hover:bg-accent'
                          }`}
                          aria-label={`Set speed to ${speed}x`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drag Overlay for smooth dragging */}
      <DragOverlay>
        {draggedItem ? <DragOverlayCard item={draggedItem} /> : null}
      </DragOverlay>
    </div>
    </DndContext>
  );
} 
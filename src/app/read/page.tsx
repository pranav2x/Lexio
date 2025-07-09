"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLexioState, useLexioActions } from "@/lib/store";
import { extractSummary } from "@/lib/firecrawl";
import { generateSpeech, cleanupAudioUrl, estimateTextDuration, clearTTSCache, getTTSCacheStats } from "@/lib/tts";
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
  closestCenter,
  rectIntersection
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
  

  
  // Listening Queue state
  const [listeningQueue, setListeningQueue] = useState<QueueItem[]>([]);
  const [isQueuePlaying, setIsQueuePlaying] = useState(false);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  
  // Track which cards are moved to queue (to hide from original position)
  const [movedToQueue, setMovedToQueue] = useState<Set<string>>(new Set());
  
  // Maximized player state with smooth transitions
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  
  // Development cache state
  const [cacheStats, setCacheStats] = useState<{ count: number; size: string; enabled: boolean } | null>(null);
  
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

  // Drag sensors for smooth performance with stricter activation
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 12, // Require 12px of movement before drag starts (more deliberate)
        delay: 100, // Small delay to prevent accidental drags
        tolerance: 8, // Allow some tolerance for small movements
      },
    })
  );

  // Sync control progress with actual audio playback (debounced)
  useEffect(() => {
    // Debounce rapid updates to prevent UI flashing
    const timeoutId = setTimeout(() => {
      if (isQueuePlaying && audioRef.current && !isNaN(currentTime) && !isNaN(duration)) {
        // Sync controls with actual audio time
        setControlsCurrentTime(currentTime);
        setControlsProgress(duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0);
        setControlsPlaying(isPlaying);
      } else if (!isQueuePlaying) {
        // Reset controls when not playing queue
        setControlsCurrentTime(0);
        setControlsProgress(0);
        setControlsPlaying(false);
      }
    }, 50); // Small debounce to prevent rapid updates

    return () => clearTimeout(timeoutId);
  }, [isQueuePlaying, currentTime, duration, isPlaying]);



  // Queue management functions
  const addToQueue = (item: QueueItem) => {
    setListeningQueue(prev => {
      // Prevent duplicates
      if (prev.find(qItem => qItem.id === item.id)) return prev;
      return [...prev, item];
    });
    
    // Mark as moved to queue (hide from original position)
    setMovedToQueue(prev => new Set([...prev, item.id]));
  };

  const removeFromQueue = (id: string) => {
    setListeningQueue(prev => prev.filter(item => item.id !== id));
    
    // Restore to original position (show in original position)
    setMovedToQueue(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const clearQueue = () => {
    setListeningQueue([]);
    setIsQueuePlaying(false);
    setCurrentQueueIndex(-1);
    
    // Restore all cards to original positions
    setMovedToQueue(new Set());
  };

  // Enhanced queue control functions with smooth state management
  const handleControlsPlayPause = () => {
    // Prevent rapid clicks during loading or transitions
    if (isPreloading) {
      console.log('⏸️ Play/Pause ignored: Audio is still loading');
      return;
    }
    
    // If there are items in the queue and nothing is currently playing, start the queue
    if (listeningQueue.length > 0 && !audioUrl && !isQueuePlaying) {
      playQueue();
      return;
    }

    // If queue is playing, pause/resume the current audio
    if (isQueuePlaying && audioRef.current) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
      } catch (error) {
        console.debug('Audio control action skipped:', error);
      }
      return;
    }

    // Fallback for individual audio
    if (audioRef.current && audioUrl) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
      } catch (error) {
        console.debug('Audio control action skipped:', error);
      }
    }
  };

  const handleControlsPrevious = async () => {
    if (!isQueuePlaying || currentQueueIndex <= 0) return;
    
    // Go to previous item in queue
    const prevIndex = currentQueueIndex - 1;
    setCurrentQueueIndex(prevIndex);
    const prevItem = listeningQueue[prevIndex];
    
    try {
      // Cleanup current audio
      if (audioUrl) {
        cleanupAudioUrl(audioUrl);
      }
      
      const result = await generateSpeech(prevItem.content);
      setAudioUrl(result.audioUrl);
      setCurrentPlayingText(prevItem.content);
      setCurrentPlayingSection(prevItem.id as PlayingSection);
      setCurrentWordIndex(-1);
      
      // Auto-play previous item
      if (audioRef.current) {
        audioRef.current.load();
        audioRef.current.play();
        setControlsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing previous queue item:', error);
    }
  };

  const handleControlsNext = async () => {
    if (!isQueuePlaying || currentQueueIndex >= listeningQueue.length - 1) return;
    
    // Go to next item in queue (same as playNextInQueue but manual)
    const nextIndex = currentQueueIndex + 1;
    setCurrentQueueIndex(nextIndex);
    const nextItem = listeningQueue[nextIndex];
    
    try {
      // Cleanup current audio
      if (audioUrl) {
        cleanupAudioUrl(audioUrl);
      }
      
      const result = await generateSpeech(nextItem.content);
      setAudioUrl(result.audioUrl);
      setCurrentPlayingText(nextItem.content);
      setCurrentPlayingSection(nextItem.id as PlayingSection);
      setCurrentWordIndex(-1);
      
      // Auto-play next item
      if (audioRef.current) {
        audioRef.current.load();
        audioRef.current.play();
        setControlsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing next queue item:', error);
    }
  };

  const handleControlsShuffle = () => {
    if (listeningQueue.length === 0) return;
    
    setControlsShuffle(!controlsShuffle);
    
    // If shuffle is being turned on, shuffle the queue
    if (!controlsShuffle) {
      const currentItem = listeningQueue[currentQueueIndex];
      const otherItems = listeningQueue.filter((_, index) => index !== currentQueueIndex);
      
      // Fisher-Yates shuffle for the remaining items
      for (let i = otherItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherItems[i], otherItems[j]] = [otherItems[j], otherItems[i]];
      }
      
      // Create new shuffled queue with current item first
      const shuffledQueue = currentQueueIndex !== -1 ? [currentItem, ...otherItems] : otherItems;
      setListeningQueue(shuffledQueue);
      if (currentQueueIndex !== -1) {
        setCurrentQueueIndex(0); // Current item is now first
      }
    }
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
    
    // Always clear the drag state first
    setActiveId(null);
    setDraggedItem(null);
    
    // Only proceed if we have both active item and valid drop target
    if (!over || !scrapedData) {
      return;
    }
    
    // Strictly check that the drop target is exactly the listening queue
    if (over.id !== 'listening-queue') {
      return;
    }

    const draggedId = active.id.toString();
    
    if (draggedId === 'summary') {
      const summaryContent = extractSummary(scrapedData.cleanText || scrapedData.text, 1000);
      addToQueue({
        id: 'summary',
        title: 'Summary',
        content: summaryContent
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

  // Ultra-smooth queue playback with reliable loading completion
  const playQueue = async () => {
    if (listeningQueue.length === 0) return;
    
    const firstItem = listeningQueue[0];
    
    console.log('🚀 Queue: Starting playback for:', firstItem.title);
    
    // Set initial states - preloading will stay true until everything is ready
    setIsPreloading(true);
    setIsQueuePlaying(true);
    setCurrentQueueIndex(0);
    setIsMaximized(true); // Set maximized immediately to prevent flashing
    setIsTransitioning(false);
    
    try {
      console.log('📡 Queue: Generating audio...');
      
      // Generate audio first
      const result = await generateSpeech(firstItem.content);
      
      console.log('✅ Queue: Audio generated, setting up player...');
      
      // Set audio state
      setAudioUrl(result.audioUrl);
      setCurrentPlayingText(firstItem.content);
      setCurrentPlayingSection(firstItem.id as PlayingSection);
      setCurrentWordIndex(-1);
      
      // Update cache stats after generating audio
      if (process.env.NODE_ENV === 'development') {
        setCacheStats(getTTSCacheStats());
      }
      
      // Generate word timings immediately with estimated duration
      console.log('⏱️ Queue: Generating word timings...');
      const estimatedDuration = estimateTextDuration(firstItem.content);
      const timings = generateWordTimings(firstItem.content, estimatedDuration);
      setWordsData(timings);
      
      // Set up audio element
      if (result.audioUrl && audioRef.current) {
        console.log('🎵 Queue: Setting up audio element...');
        audioRef.current.load();
        
        // Wait a short moment for audio to be ready, but don't hang forever
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Update word timings with actual duration when available
        const updateTimingsWhenReady = () => {
          if (audioRef.current && audioRef.current.duration > 0 && !isNaN(audioRef.current.duration)) {
            console.log(`🎵 Queue: Updating timings with actual duration: ${audioRef.current.duration}s`);
            const actualTimings = generateWordTimings(firstItem.content, audioRef.current.duration);
            setWordsData(actualTimings);
          }
        };
        
        // Try to get actual duration immediately
        if (audioRef.current.readyState >= 1) {
          updateTimingsWhenReady();
        } else {
          // Listen for when metadata loads to update timings
          audioRef.current.addEventListener('loadedmetadata', updateTimingsWhenReady, { once: true });
        }
      }
      
      console.log('🎯 Queue: Completing loading state...');
      
      // Complete the loading state
      setIsPreloading(false);
      
      console.log('▶️ Queue: Starting playback...');
      
      // Start playback
      if (audioRef.current) {
        try {
          await audioRef.current.play();
          setControlsPlaying(true);
          console.log('✅ Queue: Playback started successfully');
        } catch (playError) {
          console.log('⚠️ Queue: Playback will start when user interacts');
          setControlsPlaying(false);
        }
      }
      
    } catch (error) {
      console.error('❌ Queue: Error during playback setup:', error);
      
      // Always clear loading state on error
      setIsQueuePlaying(false);
      setCurrentQueueIndex(-1);
      setIsMaximized(false);
      setIsTransitioning(false);
      setIsPreloading(false);
    }
  };

  // Handle automatic queue progression
  const playNextInQueue = useCallback(async () => {
    if (!isQueuePlaying || currentQueueIndex === -1) return;
    
    // Handle repeat functionality
    if (controlsRepeat) {
      // Repeat current item
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        setControlsPlaying(true);
      }
      return;
    }
    
    const nextIndex = currentQueueIndex + 1;
    if (nextIndex >= listeningQueue.length) {
      // Queue finished - stop everything
      setIsQueuePlaying(false);
      setCurrentQueueIndex(-1);
      setCurrentPlayingSection(null);
      setCurrentPlayingText('');
      setCurrentWordIndex(-1);
      setIsMaximized(false);
      setControlsPlaying(false);
      setControlsProgress(0);
      setControlsCurrentTime(0);
      return;
    }
    
    // Move to next item
    setCurrentQueueIndex(nextIndex);
    const nextItem = listeningQueue[nextIndex];
    
    try {
      // Cleanup previous audio
      if (audioUrl) {
        cleanupAudioUrl(audioUrl);
      }
      
      const result = await generateSpeech(nextItem.content);
      setAudioUrl(result.audioUrl);
      setCurrentPlayingText(nextItem.content);
      setCurrentPlayingSection(nextItem.id as PlayingSection);
      setCurrentWordIndex(-1); // Reset word highlighting
      
      // Update cache stats after generating audio
      if (process.env.NODE_ENV === 'development') {
        setCacheStats(getTTSCacheStats());
      }
      
      // Reset controls for new track
      setControlsCurrentTime(0);
      setControlsProgress(0);
      
      // Auto-play next item
      if (audioRef.current) {
        audioRef.current.load();
        audioRef.current.play();
        setControlsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing next queue item:', error);
      setIsQueuePlaying(false);
      setCurrentQueueIndex(-1);
      setControlsPlaying(false);
    }
  }, [isQueuePlaying, currentQueueIndex, listeningQueue, audioUrl, controlsRepeat, cleanupAudioUrl, generateSpeech]);

  // Optimized Draggable Card Component
  const DraggableCard = React.memo(({ id, children }: { id: string; children: React.ReactNode }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id,
    });

    const isActive = activeId === id;

    const style: React.CSSProperties = {
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      opacity: isDragging ? 0 : 1, // Make original completely invisible when dragging
      willChange: 'transform',
      zIndex: isDragging ? 1000 : 'auto',
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
          ${isDragging 
            ? 'cursor-grabbing' 
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
      <div className="w-full drag-overlay-enhanced rounded-xl p-6 h-48 flex flex-col shadow-2xl gpu-accelerated">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 shadow-lg ${
              item.id === 'summary' ? 'bg-gradient-to-r from-white/90 to-white/60' : 'bg-gradient-to-r from-white/80 to-white/50'
            }`}></div>
            <h3 className="text-sm font-semibold text-white truncate font-mono-enhanced">
              {item.title}
            </h3>
          </div>
          <div className="p-2 glass-card rounded-lg neon-glow">
            <svg className="w-4 h-4 text-white/90" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-base text-white/80 leading-[1.5] line-clamp-3 font-mono-enhanced">
            {item.content.length > 150 ? item.content.substring(0, 150) + '...' : item.content}
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
          w-full min-h-[600px] lg:min-h-[700px] xl:min-h-[737px] queue-zone-enhanced rounded-xl p-6 
          gpu-accelerated flex flex-col
          ${isOver 
            ? 'drag-over scale-105' 
            : isDragActive
              ? 'scale-102 border-white/30'
              : ''
          }
        `}
        style={{ willChange: 'transform, background-color, border-color' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-headline text-gradient font-mono-enhanced">🎧 Listening Queue</h3>
          {listeningQueue.length > 0 && (
            <button
              onClick={clearQueue}
              className="text-sm text-white/50 hover:text-red-400 transition-all duration-300 btn-premium px-3 py-1 rounded font-mono-enhanced"
            >
              Clear
            </button>
          )}
        </div>

        {listeningQueue.length === 0 ? (
          <div className={`flex flex-col items-center justify-center flex-1 text-sm transition-all duration-500 ${
            isOver ? 'text-white scale-110' : 'text-white/60'
          }`}>
            <div className="text-5xl mb-6">📥</div>
            <div className="text-lg font-semibold mb-3 text-center font-mono-enhanced text-gradient">Drag sections here to queue them</div>
            <div className="text-sm text-white/50 text-center px-6 font-mono-enhanced leading-relaxed">Build your custom listening experience by dragging any section from the left</div>
            {isOver && (
              <div className="text-base mt-6 text-white font-bold animate-pulse font-mono-enhanced neon-glow">
                ✨ Drop to add to queue ✨
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Currently Playing Item - Compact */}
            {currentQueueIndex !== -1 && isQueuePlaying && listeningQueue[currentQueueIndex] && (
              <div className="mb-6 glass-card rounded-xl p-4 neon-glow animate-float-gentle border-2 border-white/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 bg-white/90 rounded-full animate-pulse shadow-lg"></div>
                  <span className="text-sm font-semibold font-mono-enhanced text-gradient">Now Playing</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-4 font-mono-enhanced truncate">
                  {listeningQueue[currentQueueIndex].title}
                </h3>
                
                {/* Word-by-word highlighting display */}
                <div className="glass-card p-3 rounded-lg mb-4 max-h-32 overflow-y-auto">
                  <div className="text-sm leading-relaxed font-mono-enhanced">
                    {wordsData.length > 0 ? (
                      wordsData.map((wordData, index) => (
                        <span
                          key={index}
                          ref={currentWordIndex === index ? highlightedWordRef : null}
                          className={`word-highlight inline-block ${
                            wordData.isWhitespace 
                              ? '' 
                              : currentWordIndex === index && isPlaying
                                ? 'active'
                                : currentWordIndex > index
                                  ? 'text-white/60'
                                  : 'text-white/80 hover:text-white/90'
                          } ${!wordData.isWhitespace ? 'cursor-pointer px-0.5 py-0.5 rounded' : ''}`}
                          onClick={() => !wordData.isWhitespace && handleWordClick(index)}
                        >
                          {wordData.word}
                        </span>
                      ))
                    ) : (
                      <span className="text-white/80">
                        {listeningQueue[currentQueueIndex].content.substring(0, 100)}...
                      </span>
                    )}
                  </div>
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
            <div className="flex-1 space-y-3 mb-8 overflow-y-auto">
              <h4 className="text-lg font-semibold text-white/70 mb-4 font-mono-enhanced">Queue ({listeningQueue.length} items)</h4>
              {listeningQueue.map((item, index) => (
                <div
                  key={item.id}
                  className={`glass-card p-4 rounded-xl text-sm transition-all duration-300 flex items-start justify-between micro-bounce ${
                    currentQueueIndex === index && isQueuePlaying
                      ? 'bg-white/10 text-white border border-white/40 neon-glow scale-105'
                      : 'text-white/80 hover:bg-white/5'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-white/50 font-mono-enhanced">#{index + 1}</span>
                      {currentQueueIndex === index && isQueuePlaying && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-white/90 rounded-full animate-pulse"></div>
                          <span className="text-xs text-white/90 font-medium font-mono-enhanced">Playing</span>
                        </div>
                      )}
                    </div>
                    <div className="font-semibold text-sm truncate mb-2 font-mono-enhanced">{item.title}</div>
                    <div className="text-sm text-white/60 leading-relaxed font-mono-enhanced">
                      {item.content.slice(0, 80)}...
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromQueue(item.id)}
                    className="ml-4 btn-premium p-2 rounded-lg transition-all duration-300 flex-shrink-0 hover:scale-110 micro-bounce text-white/60 hover:text-red-400"
                    disabled={currentQueueIndex === index && isQueuePlaying}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>


          </>
        )}

        {/* Playback Control Bar */}
        <div className="mt-6 glass-card rounded-xl p-4 neon-glow">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-white/70 text-xs mb-2 font-mono-enhanced">
              <span>{formatControlsTime(controlsCurrentTime)}</span>
              <span>{formatControlsTime(duration || 0)}</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden progress-enhanced relative cursor-pointer"
                 onClick={(e) => {
                   if (audioRef.current && duration > 0) {
                     const rect = e.currentTarget.getBoundingClientRect();
                     const clickX = e.clientX - rect.left;
                     const percentage = clickX / rect.width;
                     const seekTime = percentage * duration;
                     audioRef.current.currentTime = seekTime;
                   }
                 }}>
              <div 
                className="h-full bg-gradient-to-r from-white/90 to-white/60 rounded-full transition-all duration-300 shadow-lg"
                style={{ width: `${controlsProgress}%` }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-4">
            {/* Shuffle */}
            <button
              onClick={handleControlsShuffle}
              disabled={listeningQueue.length === 0}
              className={`p-2 rounded-full transition-all duration-300 hover:scale-110 micro-bounce disabled:opacity-30 disabled:cursor-not-allowed ${
                controlsShuffle ? 'bg-white/20 text-white neon-glow' : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4h6l4 4-4 4H4m16-8v8a4 4 0 01-8 0V8a4 4 0 018 0zM4 20h6l4-4-4-4H4" />
              </svg>
            </button>

            {/* Previous */}
            <button
              onClick={handleControlsPrevious}
              disabled={!isQueuePlaying || currentQueueIndex <= 0}
              className="p-2 text-white/60 hover:bg-white/10 hover:text-white rounded-full transition-all duration-300 hover:scale-110 micro-bounce disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={handleControlsPlayPause}
              disabled={listeningQueue.length === 0 && !audioUrl}
              className="p-3 btn-premium rounded-full transition-all duration-300 hover:scale-110 neon-glow shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {controlsPlaying || isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Next */}
            <button
              onClick={handleControlsNext}
              disabled={!isQueuePlaying || currentQueueIndex >= listeningQueue.length - 1}
              className="p-2 text-white/60 hover:bg-white/10 hover:text-white rounded-full transition-all duration-300 hover:scale-110 micro-bounce disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
              </svg>
            </button>

            {/* Repeat */}
            <button
              onClick={handleControlsRepeat}
              disabled={listeningQueue.length === 0}
              className={`p-2 rounded-full transition-all duration-300 hover:scale-110 micro-bounce disabled:opacity-30 disabled:cursor-not-allowed ${
                controlsRepeat ? 'bg-white/20 text-white neon-glow' : 'text-white/60 hover:bg-white/10 hover:text-white'
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

  // Maximized Player Component
  const MaximizedPlayer = () => {
    // Show maximized player when queue is active
    if (!isMaximized || currentQueueIndex === -1 || !listeningQueue[currentQueueIndex]) {
      return null;
    }

    const currentItem = listeningQueue[currentQueueIndex];
    
    console.log(`🖥️ MaximizedPlayer: Rendering - preloading: ${isPreloading}, item: ${currentItem.title}`);

    const handleClose = () => {
      // Simple close without complex animations to prevent flashing
      setIsMaximized(false);
      setIsTransitioning(false);
      setIsPreloading(false);
    };

    // Static loading state - no animations to prevent flashing
    if (isPreloading) {
      return (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
            <div className="text-white text-2xl font-mono-enhanced mb-2">
              Preparing Audio Experience
            </div>
            <div className="text-white/70 text-sm font-mono-enhanced">
              {currentItem.title}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8 gpu-accelerated">
        {/* Close/Minimize Button */}
        <button
          onClick={handleClose}
          className="absolute top-8 right-8 z-10 w-14 h-14 rounded-full glass-card hover:bg-white/20 transition-all duration-300 hover:scale-110 neon-glow"
        >
          <svg className="w-7 h-7 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Maximized Content */}
        <div className="w-full max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse shadow-lg neon-glow"></div>
              <span className="text-lg font-semibold font-mono-enhanced text-gradient">Now Playing</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4 font-mono-enhanced leading-tight max-w-4xl mx-auto truncate">
              {currentItem.title}
            </h1>
            <div className="flex items-center justify-center gap-6 text-sm text-white/70">
              <span className="glass-card px-3 py-2 rounded-lg font-mono-enhanced neon-glow">
                Track {currentQueueIndex + 1} of {listeningQueue.length}
              </span>
              <span className="glass-card px-3 py-2 rounded-lg font-mono-enhanced neon-glow">
                {Math.ceil(currentItem.content.split(' ').length / 200)} min read
              </span>
              <span className="glass-card px-3 py-2 rounded-lg font-mono-enhanced neon-glow">
                {wordsData.length > 0 && currentWordIndex !== -1 
                  ? `${Math.round((currentWordIndex / wordsData.length) * 100)}% complete`
                  : 'Loading...'
                }
              </span>
            </div>
          </div>

          {/* Word-by-word Text Display */}
          <div className="glass-card rounded-2xl p-6 mb-8 max-h-[45vh] overflow-y-auto neon-glow stable-ui" ref={contentRef}>
            <div className="text-xl leading-[1.6] font-mono-enhanced text-center">
              {wordsData.length > 0 ? (
                wordsData.map((wordData, index) => (
                  <span
                    key={index}
                    ref={currentWordIndex === index ? highlightedWordRef : null}
                    className={`word-highlight inline-block mx-0.5 ${
                      wordData.isWhitespace 
                        ? '' 
                        : currentWordIndex === index && isPlaying
                          ? 'active'
                          : currentWordIndex > index
                            ? 'text-white/40'
                            : 'text-white/80 hover:text-white/90'
                    } ${!wordData.isWhitespace ? 'cursor-pointer px-1 py-0.5 rounded' : ''}`}
                    onClick={() => !wordData.isWhitespace && handleWordClick(index)}
                  >
                    {wordData.word}
                  </span>
                ))
              ) : (
                <span className="text-white/80">
                  {currentItem.content.substring(0, 200)}...
                </span>
              )}
            </div>
          </div>

          {/* Enhanced Control Center */}
          <div className="glass-card rounded-2xl p-6 neon-glow">
            {/* Progress Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-white/70 text-sm mb-3 font-mono-enhanced">
                <span className="glass-card px-3 py-1.5 rounded-lg">{formatTime(currentTime)}</span>
                <span className="text-white font-semibold text-base">
                  {wordsData.length > 0 && currentWordIndex !== -1 
                    ? `Word ${wordsData.filter((word, index) => !word.isWhitespace && index <= currentWordIndex).length} / ${wordsData.filter(word => !word.isWhitespace).length}`
                    : 'Audio Loading...'
                  }
                </span>
                <span className="glass-card px-3 py-1.5 rounded-lg">{formatTime(duration)}</span>
              </div>
              
              <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer group"
                   onClick={(e) => {
                     if (audioRef.current && duration > 0) {
                       const rect = e.currentTarget.getBoundingClientRect();
                       const clickX = e.clientX - rect.left;
                       const percentage = clickX / rect.width;
                       const seekTime = percentage * duration;
                       audioRef.current.currentTime = seekTime;
                     }
                   }}>
                <div 
                  className="h-full bg-gradient-to-r from-white via-white/90 to-white/80 rounded-full transition-all duration-300 shadow-lg"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-full"></div>
              </div>
            </div>

            {/* Enhanced Control Buttons */}
            <div className="flex items-center justify-center gap-6">
              {/* Shuffle */}
              <button
                onClick={handleControlsShuffle}
                disabled={listeningQueue.length === 0}
                className={`w-10 h-10 rounded-full transition-all duration-300 hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed ${
                  controlsShuffle ? 'bg-white/20 text-white neon-glow' : 'glass-card text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4h6l4 4-4 4H4m16-8v8a4 4 0 01-8 0V8a4 4 0 018 0zM4 20h6l4-4-4-4H4" />
                </svg>
              </button>

              {/* Previous */}
              <button
                onClick={handleControlsPrevious}
                disabled={!isQueuePlaying || currentQueueIndex <= 0}
                className="w-12 h-12 rounded-full glass-card hover:bg-white/20 transition-all duration-300 hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-6 h-6 text-white mx-auto" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>

              {/* Play/Pause - Center Button */}
              <button
                onClick={handleControlsPlayPause}
                disabled={listeningQueue.length === 0 && !audioUrl}
                className="w-16 h-16 rounded-full btn-premium transition-all duration-300 hover:scale-105 neon-glow shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isPlaying ? (
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Next */}
              <button
                onClick={handleControlsNext}
                disabled={!isQueuePlaying || currentQueueIndex >= listeningQueue.length - 1}
                className="w-12 h-12 rounded-full glass-card hover:bg-white/20 transition-all duration-300 hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-6 h-6 text-white mx-auto" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                </svg>
              </button>

              {/* Repeat */}
              <button
                onClick={handleControlsRepeat}
                disabled={listeningQueue.length === 0}
                className={`w-10 h-10 rounded-full transition-all duration-300 hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed ${
                  controlsRepeat ? 'bg-white/20 text-white neon-glow' : 'glass-card text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {/* Additional Info */}
            <div className="mt-4 flex items-center justify-center gap-4 text-white/60">
              <span className="glass-card px-3 py-1.5 rounded-lg text-xs font-mono-enhanced">
                Speed: {playbackRate}x
              </span>
              {controlsShuffle && (
                <span className="glass-card px-3 py-1.5 rounded-lg text-xs font-mono-enhanced text-blue-400">
                  🔀 Shuffled
                </span>
              )}
              {controlsRepeat && (
                <span className="glass-card px-3 py-1.5 rounded-lg text-xs font-mono-enhanced text-green-400">
                  🔁 Repeat On
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Handle audio end for queue progression
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handleAudioEnd = () => {
      setIsPlaying(false);
      setCurrentWordIndex(-1);
      // If queue is playing, move to next item automatically
      if (isQueuePlaying) {
        playNextInQueue();
      }
    };

    audioElement.addEventListener('ended', handleAudioEnd);
    return () => audioElement.removeEventListener('ended', handleAudioEnd);
  }, [isQueuePlaying, playNextInQueue]);

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

  // Enhanced word finding with precise timing and lookahead
  const findCurrentWordIndex = useCallback((currentTime: number): number => {
    if (wordsData.length === 0 || currentTime < 0) return -1;
    
    // First, try to find exact match with small tolerance
    for (let i = 0; i < wordsData.length; i++) {
      const word = wordsData[i];
      if (!word.isWhitespace) {
        // Use a small lookahead for better sync (100ms ahead)
        const lookaheadTime = currentTime + 0.1;
        if (lookaheadTime >= word.startTime && currentTime <= word.endTime) {
          return i;
        }
      }
    }
    
    // If no exact match, find the most appropriate word
    let bestIndex = -1;
    let smallestDistance = Infinity;
    
    for (let i = 0; i < wordsData.length; i++) {
      const word = wordsData[i];
      if (!word.isWhitespace) {
        // Calculate distance with preference for upcoming words
        let distance;
        if (currentTime < word.startTime) {
          // Upcoming word - prefer closer ones
          distance = word.startTime - currentTime;
        } else if (currentTime > word.endTime) {
          // Past word - penalize more
          distance = (currentTime - word.endTime) * 2;
        } else {
          // We're in the word timing - this should be the current word
          distance = 0;
        }
        
        if (distance < smallestDistance) {
          smallestDistance = distance;
          bestIndex = i;
        }
      }
    }
    
    return bestIndex;
  }, [wordsData]);

  // Auto-scroll to current word with improved performance
  const scrollToCurrentWord = useCallback(() => {
    if (highlightedWordRef.current && contentRef.current && isMaximized) {
      const wordElement = highlightedWordRef.current;
      const container = contentRef.current;
      
      // Only scroll in maximized mode and if element is available
      try {
        const wordRect = wordElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate scroll position with better thresholds
        const wordTop = wordRect.top - containerRect.top;
        const wordBottom = wordRect.bottom - containerRect.top;
        const containerHeight = containerRect.height;
        
        // Only scroll if the word is significantly out of view (larger buffer)
        if (wordTop < 150 || wordBottom > containerHeight - 150) {
          // Use requestAnimationFrame for smoother scrolling
          requestAnimationFrame(() => {
            wordElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
          });
        }
      } catch (error) {
        // Silently handle any scrolling errors to prevent UI issues
        console.debug('Auto-scroll skipped:', error);
      }
    }
  }, [isMaximized]);

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
      
      // Update cache stats after generating audio
      if (process.env.NODE_ENV === 'development') {
        setCacheStats(getTTSCacheStats());
      }
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

  // Ultra-responsive word index updates with zero delay
  useEffect(() => {
    if (isPlaying && wordsData.length > 0 && currentTime >= 0 && !isNaN(currentTime)) {
      // Use requestAnimationFrame for the smoothest possible updates
      const updateWordIndex = () => {
        const newWordIndex = findCurrentWordIndex(currentTime);
        
        // Update immediately if we have a valid new index
        if (newWordIndex !== currentWordIndex && 
            newWordIndex !== -1 && 
            newWordIndex < wordsData.length &&
            !wordsData[newWordIndex]?.isWhitespace) {
          setCurrentWordIndex(newWordIndex);
        }
      };
      
      // Use both immediate update and RAF for maximum responsiveness
      updateWordIndex();
      const rafId = requestAnimationFrame(updateWordIndex);
      
      return () => cancelAnimationFrame(rafId);
    }
  }, [currentTime, isPlaying, wordsData, findCurrentWordIndex, currentWordIndex]);

  // Update cache stats in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const updateCacheStats = () => {
        const stats = getTTSCacheStats();
        setCacheStats(stats);
      };
      
      updateCacheStats();
      
      // Update cache stats after TTS operations
      const interval = setInterval(updateCacheStats, 2000);
      return () => clearInterval(interval);
    }
  }, []);

  // Auto-scroll when current word changes with debouncing
  useEffect(() => {
    if (currentWordIndex !== -1 && isPlaying && isMaximized) {
      // Use requestAnimationFrame for better performance
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(scrollToCurrentWord);
      }, 50); // Reduced delay for better responsiveness
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentWordIndex, isPlaying, isMaximized, scrollToCurrentWord]);

  // Generate word timings when audio loads
  useEffect(() => {
    if (audioRef.current && duration > 0 && currentPlayingText) {
      const timings = generateWordTimings(currentPlayingText, duration);
      setWordsData(timings);
    }
  }, [duration, currentPlayingText, generateWordTimings]);

  // Set playback rate when audio loads with error handling
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      try {
        // Only set playback rate if audio is ready
        if (audioRef.current.readyState >= 1) {
          audioRef.current.playbackRate = playbackRate;
        } else {
          // Wait for audio to be ready
          const handleCanPlay = () => {
            if (audioRef.current) {
              audioRef.current.playbackRate = playbackRate;
            }
          };
          audioRef.current.addEventListener('canplay', handleCanPlay, { once: true });
          return () => {
            if (audioRef.current) {
              audioRef.current.removeEventListener('canplay', handleCanPlay);
            }
          };
        }
      } catch (error) {
        console.debug('Playback rate setting skipped:', error);
      }
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
    // If there are items in the queue and nothing is currently playing, start the queue
    if (listeningQueue.length > 0 && !audioUrl && !isQueuePlaying) {
      playQueue();
      return;
    }

    // If queue is playing, pause/resume the current audio
    if (isQueuePlaying && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      return;
    }

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
    
    // Stop queue playback if active
    if (isQueuePlaying) {
      setIsQueuePlaying(false);
      setCurrentQueueIndex(-1);
      setIsMaximized(false); // Close maximized view
      setControlsPlaying(false);
      setControlsProgress(0);
      setControlsCurrentTime(0);
    }
    
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

  // Handle cache clearing (development only)
  const handleClearCache = () => {
    if (clearTTSCache()) {
      setCacheStats(getTTSCacheStats());
    }
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
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen text-white">
        <style jsx>{`
          .line-clamp-3 {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `}</style>
      {/* Hidden Audio Element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration);
              // Set playback rate immediately when metadata loads
              try {
                audioRef.current.playbackRate = playbackRate;
              } catch (error) {
                console.debug('Playback rate setting skipped during load:', error);
              }
            }
          }}
          onLoadedData={() => {
            // Audio is fully loaded and ready to play
            if (audioRef.current && audioRef.current.duration > 0 && !isNaN(audioRef.current.duration)) {
              // Update word timings with actual duration if we have text
              if (currentPlayingText) {
                const actualTimings = generateWordTimings(currentPlayingText, audioRef.current.duration);
                setWordsData(actualTimings);
              }
            }
          }}
          onCanPlay={() => {
            // Audio can start playing - ensure playback rate is set
            if (audioRef.current) {
              try {
                audioRef.current.playbackRate = playbackRate;
              } catch (error) {
                console.debug('Playback rate setting skipped during canplay:', error);
              }
            }
          }}
          onPlay={() => {
            setIsPlaying(true);
            // Reset word index to start fresh
            if (currentWordIndex === -1 && wordsData.length > 0) {
              setCurrentWordIndex(0);
            }
          }}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={() => {
            if (audioRef.current && !isNaN(audioRef.current.currentTime)) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onEnded={() => {
            // Audio end is handled by useEffect above for better queue management
          }}
          preload="auto"
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-300 hover:scale-105 group"
            >
              <svg className="w-5 h-5 group-hover:transform group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-mono-enhanced text-sm font-medium">Back</span>
            </button>
            
            <div className="flex items-center gap-4">
              {/* Development Cache Stats */}
              {process.env.NODE_ENV === 'development' && cacheStats?.enabled && (
                <div className="flex items-center gap-3 text-xs">
                  <div className="glass-card px-3 py-1 rounded-lg">
                    <span className="text-white/70 font-mono-enhanced">
                      TTS Cache: {cacheStats.count} items ({cacheStats.size})
                    </span>
                  </div>
                  {cacheStats.count > 0 && (
                    <button
                      onClick={handleClearCache}
                      className="text-white/50 hover:text-red-400 transition-colors duration-300 font-mono-enhanced"
                      title="Clear TTS cache"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              )}
              
              <div className="text-sm text-white/50 hidden sm:block font-mono-enhanced">
                {currentUrl && new URL(currentUrl).hostname}
              </div>
              <button
                onClick={handleStartOver}
                className="btn-premium px-6 py-2 rounded-lg font-mono-enhanced text-sm"
              >
                New Site
              </button>
            </div>
          </div>
        </div>
      </header>



      {/* Main Content */}
      <main ref={contentRef} className="min-h-screen">
        {/* Container with proper margins */}
        <div className="max-w-[1800px] mx-auto px-8 lg:px-12 py-12">
          
          {/* Article Header - Full Width */}
          <div className="mb-16">
            <div className="max-w-5xl">
              <h1 className="text-display text-gradient mb-8 leading-tight">
                {scrapedData.title}
              </h1>
            
              {currentUrl && (
                <div className="flex items-center gap-3 text-sm text-white/60 mb-8 group hover:text-white/80 transition-colors duration-300">
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <a 
                    href={currentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-mono-enhanced hover:text-white neon-glow transition-all duration-300"
                  >
                    {currentUrl}
                  </a>
                </div>
              )}

              {/* Content Stats */}
                              <div className="flex flex-wrap gap-8 text-sm text-white/70 mb-8">
                  <div className="flex items-center gap-3 micro-bounce glass-card px-4 py-2 rounded-lg">
                    <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-mono-enhanced">{scrapedData.text.split(' ').length.toLocaleString()} words</span>
                    {scrapedData.cleanText && scrapedData.cleanText !== scrapedData.text && (
                      <span className="text-white/60 text-xs font-mono-enhanced">
                        ({scrapedData.cleanText.split(' ').length.toLocaleString()} optimized)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 micro-bounce glass-card px-4 py-2 rounded-lg">
                    <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-mono-enhanced">~{Math.ceil(scrapedData.text.split(' ').length / 200)} min read</span>
                  </div>
                  <div className="flex items-center gap-3 micro-bounce glass-card px-4 py-2 rounded-lg">
                    <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                    <span className="font-mono-enhanced">~{Math.ceil(estimateTextDuration(scrapedData.text) / 60)} min listen</span>
                  </div>
                  {audioUrl && (
                    <div className="flex items-center gap-3 micro-bounce glass-card px-4 py-2 rounded-lg neon-glow animate-pulse">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12 7-12 6z" />
                      </svg>
                      <span className="font-mono-enhanced text-white">Audio ready</span>
                    </div>
                  )}
                </div>

            </div>
          </div>

          {/* Main 3-Column Layout Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 xl:gap-12 items-start">
            
            {/* Content Cards Section - Takes up 8/12 columns */}
            <div className="xl:col-span-8">
              {/* Cards Grid - 2 columns of cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                
                {/* Section Cards */}
                {scrapedData.sections.slice(0, 5).map((section, index) => (
                  !movedToQueue.has(`section-${index}`) && (
                    <DraggableCard key={index} id={`section-${index}`}>
                    <div 
                      className={`w-full glass-card rounded-xl p-6 flex flex-col neon-glow h-48 ${
                        currentPlayingSection === `section-${index}` 
                          ? 'border-white/40 bg-white/8 animate-pulse' 
                          : ''
                      }`}
                    >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 shadow-lg ${
                          index % 3 === 0 ? 'bg-gradient-to-r from-white/90 to-white/60' : 
                          index % 3 === 1 ? 'bg-gradient-to-r from-white/80 to-white/50' : 'bg-gradient-to-r from-white/85 to-white/55'
                        }`}></div>
                        <h3 className="text-sm font-semibold text-white truncate font-mono-enhanced">
                          {section.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => generateAudioForSection(`section-${index}` as PlayingSection)}
                          disabled={isGeneratingAudio}
                          className={`btn-premium relative p-2 rounded-lg transition-all duration-300 hover:scale-110 micro-bounce ${
                            currentPlayingSection === `section-${index}`
                              ? 'bg-white/20 text-white animate-pulse'
                              : ''
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isGeneratingAudio && currentPlayingSection === `section-${index}` ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-base text-white/80 leading-[1.5] font-mono-enhanced line-clamp-3">
                        {section.content.length > 150 ? section.content.substring(0, 150) + '...' : section.content}
                      </p>
                    </div>
                  </div>
                  </DraggableCard>
                  )
                ))}



                                 

                {/* Additional Sections (if more than 5) */}
                {scrapedData.sections.length > 5 && (
                  <div className="w-full glass-card rounded-xl p-6 h-48 flex flex-col justify-center items-center text-center neon-glow micro-bounce">
                    <div className="w-12 h-12 glass-card rounded-full flex items-center justify-center mb-4 neon-glow">
                      <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-3 font-mono-enhanced">More Sections</h3>
                    <p className="text-sm text-white/70 font-mono-enhanced">
                      +{scrapedData.sections.length - 5} additional sections available
                    </p>
                  </div>
                )}

                {/* Summary Card - Moved to bottom */}
                {scrapedData.text && !movedToQueue.has('summary') && (
                  <DraggableCard id="summary">
                                        <div className={`w-full glass-card rounded-xl p-6 flex flex-col neon-glow h-48 ${
                      currentPlayingSection === 'summary' 
                        ? 'border-white/40 bg-white/8 animate-pulse' 
                        : ''
                    }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-gradient-to-r from-white/90 to-white/60 rounded-full shadow-lg"></div>
                                                  <h3 className="text-sm font-semibold text-white font-mono-enhanced">Summary</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => generateAudioForSection('summary')}
                          disabled={isGeneratingAudio}
                          className={`btn-premium relative p-2 rounded-lg transition-all duration-300 hover:scale-110 micro-bounce ${
                            currentPlayingSection === 'summary'
                              ? 'bg-white/20 text-white animate-pulse'
                              : ''
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isGeneratingAudio && currentPlayingSection === 'summary' ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-base text-white/80 leading-[1.5] font-mono-enhanced line-clamp-3">
                        {extractSummary(scrapedData.text, 120)}
                      </p>
                    </div>
                  </div>
                  </DraggableCard>
                )}
              </div>
            </div>

            {/* Listening Queue - Takes up 4/12 columns */}
            <div className="xl:col-span-4">
              <div className="xl:sticky xl:top-24">
                <ListeningQueueDropZone />
              </div>
            </div>
          </div>

          {/* Currently Playing Info & Controls - Separate section below */}
          <div className="mt-12 xl:mt-16">
            <div className="max-w-2xl">
              {/* Currently Playing Card */}
              {currentPlayingSection && audioUrl && (
                <div className="glass-card rounded-xl p-4 neon-glow">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 bg-white/90 rounded-full animate-pulse shadow-lg"></div>
                    <span className="text-xs font-medium font-mono-enhanced text-gradient">Now Playing</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-3 text-white font-mono-enhanced truncate">
                    {currentPlayingSection === 'summary' ? 'Summary' :
                     currentPlayingSection?.startsWith('section-') ? 
                       scrapedData.sections[parseInt(currentPlayingSection.replace('section-', ''))]?.title || 'Section' : 
                       currentPlayingSection}
                  </h3>
                  {currentWordIndex !== -1 && wordsData[currentWordIndex] && (
                    <div className="glass-card px-3 py-1.5 rounded-lg inline-block">
                      <p className="text-xs text-white/70 font-mono-enhanced">
                        Word {wordsData.filter((word, index) => !word.isWhitespace && index <= currentWordIndex).length} of {wordsData.filter(word => !word.isWhitespace).length}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Audio Control Bar */}
      {(audioUrl || listeningQueue.length > 0) && !isMaximized && (
        <div className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-white/10 backdrop-blur-xl">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col gap-3">
                {/* Progress Bar */}
                <div className="flex items-center gap-4">
                  <span className="text-xs text-white/70 min-w-[3rem] text-right font-mono-enhanced">
                    {formatTime(currentTime)}
                  </span>
                  <div className="flex-1 relative">
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-white/90 to-white/60 transition-all duration-300 shadow-lg"
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
                  <span className="text-xs text-white/70 min-w-[3rem] font-mono-enhanced">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  {/* Left Side - Play/Pause/Stop/Maximize */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePlayPause}
                      disabled={!audioUrl && listeningQueue.length === 0}
                      className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 hover:scale-110 neon-glow ${
                        (isQueuePlaying ? controlsPlaying : isPlaying)
                          ? 'bg-red-500/20 text-red-400 border border-red-400/30'
                          : 'btn-premium'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      aria-label={(isQueuePlaying ? controlsPlaying : isPlaying) ? 'Pause' : 'Play'}
                    >
                      {(isQueuePlaying ? controlsPlaying : isPlaying) ? (
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
                      disabled={!audioUrl && !isQueuePlaying}
                      className="flex items-center justify-center w-8 h-8 rounded-full glass-card hover:bg-white/10 transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Stop"
                    >
                      <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10h6v4H9z" />
                      </svg>
                    </button>

                    {/* Maximize Button - Only show when queue is playing and not maximized */}
                    {isQueuePlaying && !isMaximized && (
                      <button
                        onClick={() => setIsMaximized(true)}
                        className="flex items-center justify-center w-8 h-8 rounded-full glass-card hover:bg-white/10 transition-all duration-300 hover:scale-110 neon-glow"
                        aria-label="Maximize Player"
                      >
                        <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Center - Current Section and Word Indicator */}
                  <div className="flex flex-col items-center gap-2 text-sm text-white/70">
                    {/* Queue Status */}
                    {isQueuePlaying && listeningQueue.length > 0 && currentQueueIndex !== -1 && (
                      <span className="flex items-center gap-2 glass-card px-3 py-1 rounded-lg">
                        <div className="w-2 h-2 bg-white/90 rounded-full animate-pulse"></div>
                        <span className="font-medium text-xs font-mono-enhanced">
                          Queue: {currentQueueIndex + 1} / {listeningQueue.length} - {listeningQueue[currentQueueIndex]?.title}
                        </span>
                      </span>
                    )}
                    
                    {/* Individual Section Status */}
                    {currentPlayingSection && !isQueuePlaying && (
                      <span className="flex items-center gap-2 glass-card px-3 py-1 rounded-lg">
                        <div className="w-2 h-2 bg-white/90 rounded-full animate-pulse"></div>
                        <span className="font-medium text-xs font-mono-enhanced">
                          Playing: {
                            currentPlayingSection === 'summary' ? 'Summary' :
                            currentPlayingSection?.startsWith('section-') ? 
                              `Section ${parseInt(currentPlayingSection.replace('section-', '')) + 1}` : 
                              currentPlayingSection
                          }
                        </span>
                      </span>
                    )}
                    
                    {/* Word Progress */}
                    {currentWordIndex !== -1 && wordsData[currentWordIndex] && (
                      <span className="flex items-center gap-2 glass-card px-3 py-1 rounded-lg">
                        <div className="w-2 h-2 bg-white/80 rounded-full animate-pulse"></div>
                        <span className="font-medium text-xs font-mono-enhanced">
                          Word {wordsData.filter((word, index) => !word.isWhitespace && index <= currentWordIndex).length} / {wordsData.filter(word => !word.isWhitespace).length}
                        </span>
                      </span>
                    )}

                    {/* Queue Available Indicator */}
                    {!isQueuePlaying && !currentPlayingSection && listeningQueue.length > 0 && (
                      <span className="flex items-center gap-2 glass-card px-3 py-1 rounded-lg">
                        <div className="w-2 h-2 bg-blue-400/90 rounded-full animate-pulse"></div>
                        <span className="font-medium text-xs font-mono-enhanced">
                          {listeningQueue.length} items ready to play
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Right Side - Speed Control */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/50 hidden sm:block font-mono-enhanced">Speed:</span>
                    <div className="flex items-center gap-1">
                      {speedOptions.map((speed) => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedChange(speed)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 font-mono-enhanced ${
                            playbackRate === speed
                              ? 'btn-premium'
                              : 'glass-card text-white/70 hover:bg-white/10'
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

        {/* Maximized Player Overlay */}
        <MaximizedPlayer />
      </div>
    </DndContext>
  );
} 
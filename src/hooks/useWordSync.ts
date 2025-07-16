"use client";

import { useState, useEffect, RefObject, useCallback } from 'react';

export interface WordData {
  text: string;
  start: number;
  end: number;
}

interface UseWordSyncProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  words: WordData[];
}

export const useWordSync = ({ audioRef, words }: UseWordSyncProps) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);

  // Enhanced word finding function with resilient timing logic
  const findCurrentWordIndex = useCallback((currentTime: number, words: WordData[]): number => {
    if (words.length === 0) return -1;

    // First try: Binary search for exact word containing current time
    let left = 0;
    let right = words.length - 1;
    let exactMatch = -1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const word = words[mid];
      
      if (currentTime >= word.start && currentTime <= word.end) {
        exactMatch = mid;
        break;
      } else if (currentTime < word.start) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
    
    // Return exact match if found
    if (exactMatch !== -1) return exactMatch;
    
    // Second try: Find closest word with tolerance for timing imperfections
    let closestIndex = -1;
    let smallestDistance = Infinity;
    const tolerance = 0.1; // 100ms tolerance for timing imperfections
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Check if within tolerance of word boundaries
      if (currentTime >= word.start - tolerance && currentTime <= word.end + tolerance) {
        const distance = Math.min(
          Math.abs(currentTime - word.start),
          Math.abs(currentTime - word.end),
          word.start <= currentTime && currentTime <= word.end ? 0 : Infinity
        );
        
        if (distance < smallestDistance) {
          smallestDistance = distance;
          closestIndex = i;
        }
      }
    }
    
    // Return closest match if found within tolerance
    if (closestIndex !== -1) return closestIndex;
    
    // Third try: Find the most recent word that has started (for gaps between words)
    for (let i = words.length - 1; i >= 0; i--) {
      if (currentTime >= words[i].start) {
        // Don't highlight words that ended more than 0.5s ago
        if (currentTime - words[i].end <= 0.5) {
          return i;
        }
        break;
      }
    }
    
    // Fourth try: If we're before the first word but close, highlight it
    if (words.length > 0 && currentTime < words[0].start && words[0].start - currentTime <= 1.0) {
      return 0;
    }
    
    return -1;
  }, []);

  useEffect(() => {
    if (!audioRef.current || words.length === 0) {
      setCurrentWordIndex(-1);
      return;
    }

    const audio = audioRef.current;
    let animationFrameId: number;
    let lastUpdateTime = 0;

    const updateCurrentWord = () => {
      const currentTime = audio.currentTime;
      
      // Only update if enough time has passed (throttle to ~60fps)
      const now = performance.now();
      if (now - lastUpdateTime < 16) {
        animationFrameId = requestAnimationFrame(updateCurrentWord);
        return;
      }
      lastUpdateTime = now;
      
      // Find the word that contains the current time using optimized search
      const wordIndex = findCurrentWordIndex(currentTime, words);
      
      setCurrentWordIndex(prevIndex => {
        // Only update if the index actually changed to avoid unnecessary re-renders
        return prevIndex !== wordIndex ? wordIndex : prevIndex;
      });
      
      // Continue updating while audio is playing
      if (!audio.paused && !audio.ended) {
        animationFrameId = requestAnimationFrame(updateCurrentWord);
      }
    };

    // Start the update loop
    updateCurrentWord();
    
    // Listen for play/pause events to start/stop the update loop
    const handlePlay = () => {
      updateCurrentWord();
    };
    
    const handlePause = () => {
      // Update one last time when paused
      const wordIndex = findCurrentWordIndex(audio.currentTime, words);
      setCurrentWordIndex(prevIndex => prevIndex !== wordIndex ? wordIndex : prevIndex);
    };
    
    const handleTimeUpdate = () => {
      // Fallback for browsers that don't fire play/pause reliably
      if (!animationFrameId) {
        updateCurrentWord();
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioRef, words, findCurrentWordIndex]);

  // Reset word index when words change
  useEffect(() => {
    setCurrentWordIndex(-1);
  }, [words]);

  return {
    currentWordIndex,
  };
}; 
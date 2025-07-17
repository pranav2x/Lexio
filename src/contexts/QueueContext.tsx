"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface QueueItem {
  id: string;
  title: string;
  content: string;
  duration?: number;
}

interface QueueContextType {
  listeningQueue: QueueItem[];
  currentQueueIndex: number;
  isQueuePlaying: boolean;
  controlsPlaying: boolean;
  controlsShuffle: boolean;
  controlsRepeat: boolean;
  addToQueue: (item: QueueItem) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
  playFromQueue: (index: number) => void;
  handleControlsPlayPause: () => void;
  handleControlsPrevious: () => void;
  handleControlsNext: () => void;
  handleControlsShuffle: () => void;
  handleControlsRepeat: () => void;
  isInQueue: (id: string) => boolean;
  setCurrentQueueIndex: (index: number) => void;
  setIsQueuePlaying: (playing: boolean) => void;
  setControlsPlaying: (playing: boolean) => void;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (context === undefined) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return context;
};

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [listeningQueue, setListeningQueue] = useState<QueueItem[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  const [isQueuePlaying, setIsQueuePlaying] = useState(false);
  const [controlsPlaying, setControlsPlaying] = useState(false);
  const [controlsShuffle, setControlsShuffle] = useState(false);
  const [controlsRepeat, setControlsRepeat] = useState(false);

  const addToQueue = useCallback((item: QueueItem) => {
    setListeningQueue(prev => {
      // Check if item already exists
      if (prev.some(queueItem => queueItem.id === item.id)) {
        return prev;
      }
      
      console.log('📥 Adding item to queue (no auto-play):', item.title);
      
      // Add item but DO NOT auto-start playback
      // The user must explicitly click play to start
      return [...prev, item];
    });
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setListeningQueue(prev => {
      const newQueue = prev.filter(item => item.id !== id);
      // Adjust current index if needed
      const removedIndex = prev.findIndex(item => item.id === id);
      if (removedIndex !== -1 && removedIndex <= currentQueueIndex) {
        setCurrentQueueIndex(Math.max(0, currentQueueIndex - 1));
      }
      return newQueue;
    });
  }, [currentQueueIndex]);

  const clearQueue = useCallback(() => {
    setListeningQueue([]);
    setCurrentQueueIndex(-1);
    setIsQueuePlaying(false);
    setControlsPlaying(false);
  }, []);

  const reorderQueue = useCallback((startIndex: number, endIndex: number) => {
    setListeningQueue(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      
      // Adjust current index if the currently playing item was moved
      if (currentQueueIndex === startIndex) {
        setCurrentQueueIndex(endIndex);
      } else if (startIndex < currentQueueIndex && endIndex >= currentQueueIndex) {
        setCurrentQueueIndex(currentQueueIndex - 1);
      } else if (startIndex > currentQueueIndex && endIndex <= currentQueueIndex) {
        setCurrentQueueIndex(currentQueueIndex + 1);
      }
      
      return result;
    });
  }, [currentQueueIndex]);

  const playFromQueue = useCallback((index: number) => {
    if (index >= 0 && index < listeningQueue.length) {
      setCurrentQueueIndex(index);
      setIsQueuePlaying(true);
      setControlsPlaying(true);
    }
  }, [listeningQueue.length]);

  const handleControlsPlayPause = useCallback(() => {
    setControlsPlaying(prev => !prev);
    setIsQueuePlaying(prev => !prev);
  }, []);

  const handleControlsPrevious = useCallback(() => {
    if (currentQueueIndex > 0) {
      setCurrentQueueIndex(currentQueueIndex - 1);
    } else if (controlsRepeat && listeningQueue.length > 0) {
      setCurrentQueueIndex(listeningQueue.length - 1);
    }
  }, [currentQueueIndex, controlsRepeat, listeningQueue.length]);

  const handleControlsNext = useCallback(() => {
    if (currentQueueIndex < listeningQueue.length - 1) {
      setCurrentQueueIndex(currentQueueIndex + 1);
    } else if (controlsRepeat && listeningQueue.length > 0) {
      setCurrentQueueIndex(0);
    } else {
      setIsQueuePlaying(false);
      setControlsPlaying(false);
    }
  }, [currentQueueIndex, listeningQueue.length, controlsRepeat]);

  const handleControlsShuffle = useCallback(() => {
    setControlsShuffle(prev => !prev);
  }, []);

  const handleControlsRepeat = useCallback(() => {
    setControlsRepeat(prev => !prev);
  }, []);

  const isInQueue = useCallback((id: string) => {
    return listeningQueue.some(item => item.id === id);
  }, [listeningQueue]);

  const value: QueueContextType = {
    listeningQueue,
    currentQueueIndex,
    isQueuePlaying,
    controlsPlaying,
    controlsShuffle,
    controlsRepeat,
    addToQueue,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    playFromQueue,
    handleControlsPlayPause,
    handleControlsPrevious,
    handleControlsNext,
    handleControlsShuffle,
    handleControlsRepeat,
    isInQueue,
    setCurrentQueueIndex,
    setIsQueuePlaying,
    setControlsPlaying,
  };

  return (
    <QueueContext.Provider value={value}>
      {children}
    </QueueContext.Provider>
  );
}; 
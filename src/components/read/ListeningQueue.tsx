"use client";

import React, { useState } from 'react';
import { useQueue } from '@/contexts/QueueContext';
import { useAudio } from '@/contexts/AudioContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable queue item component
const SortableQueueItem: React.FC<{
  id: string;
  title: string;
  content: string;
  index: number;
  isCurrentlyPlaying: boolean;
  onPlay: () => void;
  onRemove: () => void;
}> = ({ id, title, content, index, isCurrentlyPlaying, onPlay, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onPlay}
      className={`group relative bg-black/40 border rounded-lg transition-all duration-300 hover:bg-black/30 hover:border-white/30 cursor-pointer ${
        isCurrentlyPlaying 
          ? 'border-white/50 bg-black/20' 
          : 'border-white/20'
      } ${isDragging ? 'z-50' : ''}`}
    >
      <div className="p-3">
        {/* Header with drag handle, title, and controls */}
        <div className="flex items-start gap-2 mb-2">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()} // Prevent card click when dragging
            className="flex-shrink-0 mt-0.5 w-4 h-4 opacity-50 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
            </svg>
          </button>

          {/* Queue Position */}
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-xs text-white font-medium">{index + 1}</span>
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-white line-clamp-2 leading-tight">
              {title}
            </h4>
          </div>

          {/* Remove button */}
          <div className="flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click when removing
                onRemove();
              }}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors group"
              title="Remove from queue"
            >
              <svg className="w-3 h-3 text-white group-hover:text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Preview */}
        <div className="text-xs text-white/60 line-clamp-2 leading-relaxed ml-8">
          {truncateText(content, 100)}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 text-xs text-white/40 mt-2 ml-8">
          <span>{content.split(' ').length} words</span>
          <span>•</span>
          <span>~{Math.ceil(content.split(' ').length / 200)}m</span>
        </div>
      </div>

      {/* Playing indicator */}
      {isCurrentlyPlaying && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-l-lg" />
      )}
    </div>
  );
};

const ListeningQueue: React.FC = () => {
  const { 
    listeningQueue, 
    currentQueueIndex, 
    removeFromQueue, 
    clearQueue, 
    reorderQueue,
    setCurrentQueueIndex,
    setControlsPlaying,
    setIsQueuePlaying
  } = useQueue();
  
  const { currentPlayingSection, playQueueItem, handleStop } = useAudio();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = listeningQueue.findIndex(item => item.id === active.id);
      const newIndex = listeningQueue.findIndex(item => item.id === over?.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderQueue(oldIndex, newIndex);
      }
    }
  };

  const handlePlayItem = async (index: number) => {
    const item = listeningQueue[index];
    if (item) {
      console.log('🎯 Queue: Playing item at index', index, ':', item.title);
      
      // Stop current playback first
      handleStop();
      
      // Update queue state
      setCurrentQueueIndex(index);
      setControlsPlaying(true);
      setIsQueuePlaying(true);
      
      // Small delay to ensure state updates are processed
      setTimeout(async () => {
        await playQueueItem(item);
      }, 100);
    }
  };

  const handleClearQueue = () => {
    if (showClearConfirm) {
      clearQueue();
      setShowClearConfirm(false);
    } else {
      setShowClearConfirm(true);
      setTimeout(() => setShowClearConfirm(false), 3000);
    }
  };

  if (listeningQueue.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <div className="text-4xl mb-3 opacity-50">🎵</div>
        <h3 className="text-sm font-semibold text-white mb-2">Queue Empty</h3>
        <p className="text-xs text-white/60 max-w-48 leading-relaxed">
          Add content from the cards to start building your listening queue.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Queue Header */}
      <div className="flex-shrink-0 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">
              Queue ({listeningQueue.length})
            </h3>
            {currentQueueIndex >= 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-xs text-white/70">Playing #{currentQueueIndex + 1}</span>
              </div>
            )}
          </div>
          
          <button
            onClick={handleClearQueue}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              showClearConfirm 
                ? 'bg-white/20 text-white border border-white/30' 
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            }`}
            title={showClearConfirm ? "Click again to confirm" : "Clear all items"}
          >
            {showClearConfirm ? 'Confirm Clear' : 'Clear All'}
          </button>
        </div>
      </div>

      {/* Queue Items - Scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 min-h-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={listeningQueue.map(item => item.id)} strategy={verticalListSortingStrategy}>
            {listeningQueue.map((item, index) => (
              <SortableQueueItem
                key={item.id}
                id={item.id}
                title={item.title}
                content={item.content}
                index={index}
                isCurrentlyPlaying={currentQueueIndex === index}
                onPlay={() => handlePlayItem(index)}
                onRemove={() => removeFromQueue(item.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Queue Stats */}
      <div className="flex-shrink-0 mt-3 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>
            {listeningQueue.reduce((total, item) => total + item.content.split(' ').length, 0).toLocaleString()} words total
          </span>
          <span>
            ~{Math.ceil(listeningQueue.reduce((total, item) => total + item.content.split(' ').length, 0) / 200)}m est.
          </span>
        </div>
      </div>
    </div>
  );
};

export default ListeningQueue; 
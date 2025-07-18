"use client";

import React, { useState } from 'react';
import { useQueue } from '@/contexts/QueueContext';
import { X } from 'lucide-react';
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Item Component
const SortableQueueItem: React.FC<{
  id: string;
  title: string;
  content: string;
  index: number;
  onRemove: () => void;
}> = ({ id, title, content, index, onRemove }) => {
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

  // Calculate reading time estimate (average 200 words per minute)
  const wordCount = content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  // Truncate content for preview (first 200 characters)
  const contentPreview = content.length > 200 
    ? content.substring(0, 200) + "..." 
    : content;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative border rounded-xl transition-all duration-300 ease-out border-white/25 bg-black/50 hover:bg-black/35 hover:border-white/35 ${isDragging ? 'z-50 shadow-2xl' : ''}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button
            {...attributes}
            {...listeners}
            className="flex-shrink-0 mt-1 w-6 h-6 opacity-50 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
            </svg>
          </button>
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-sm text-white font-medium">{index + 1}</span>
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <h4 className="text-sm font-semibold text-white line-clamp-2 leading-tight">
              {title}
            </h4>
            <p className="text-xs text-white/70 line-clamp-3 leading-relaxed">
              {contentPreview}
            </p>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span>{wordCount.toLocaleString()} words</span>
              <span>•</span>
              <span>{readingTime} min read</span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              title="Remove from queue"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// Main ListeningQueue Component
const ListeningQueue: React.FC = () => {
  const { 
    listeningQueue, 
    removeFromQueue, 
    clearQueue, 
    reorderQueue
  } = useQueue();
  
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = listeningQueue.findIndex(item => item.id === active.id);
      const newIndex = listeningQueue.findIndex(item => item.id === over?.id);
      if (oldIndex !== -1 && newIndex !== -1) reorderQueue(oldIndex, newIndex);
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

  return (
    <div className="h-full flex flex-col">
      {/* --- Queue List --- */}
      {listeningQueue.length > 0 ? (
        <>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">
                    Queue ({listeningQueue.length})
                </h3>
                <button
                    onClick={handleClearQueue}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                    showClearConfirm 
                        ? 'bg-red-500/80 text-white' 
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                >
                    {showClearConfirm ? 'Confirm Clear' : 'Clear All'}
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 min-h-0">
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
                            onRemove={() => removeFromQueue(item.id)}
                        />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
        </>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="text-4xl mb-3 opacity-50">📄</div>
            <h3 className="text-sm font-semibold text-white mb-2">Queue is Empty</h3>
            <p className="text-xs text-white/60 max-w-48 leading-relaxed">
            Add content from the cards on the left to build your listening queue.
            </p>
        </div>
      )}
    </div>
  );
};

export default ListeningQueue;
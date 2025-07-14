"use client";

import React from 'react';
import SmartChat from '@/components/SmartChat';

interface SectionInfo {
  title: string;
  content: string;
  index: number;
}

interface SmartChatPanelProps {
  availableSections: SectionInfo[];
  onAddToQueue: (sectionIndices: number[], explanation: string) => void;
  onAddSummary: () => void;
  isProcessing?: boolean;
}

const SmartChatPanel: React.FC<SmartChatPanelProps> = ({
  availableSections,
  onAddToQueue,
  onAddSummary,
  isProcessing = false
}) => {
  return (
    <div className="w-full queue-zone-enhanced rounded-xl p-3 gpu-accelerated shadow-lg">
      <SmartChat
        availableSections={availableSections}
        onAddToQueue={onAddToQueue}
        onAddSummary={onAddSummary}
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default SmartChatPanel; 
"use client";

import { QueueProvider } from "@/contexts/QueueContext";

interface QueueProviderWrapperProps {
  children: React.ReactNode;
}

export function QueueProviderWrapper({ children }: QueueProviderWrapperProps) {
  return (
    <QueueProvider>
      {children}
    </QueueProvider>
  );
} 
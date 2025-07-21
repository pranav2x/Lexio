"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLexioState, useLexioActions } from "@/lib/store";
import { extractSummary } from "@/lib/firecrawl";

// Context Providers
// QueueProvider is now in layout.tsx

// Components
import Header from "@/components/read/Header";
import ContentCard from "@/components/read/ContentCard";
import SmartChatPanel from "@/components/read/SmartChatPanel";
import ListeningQueue from "@/components/read/ListeningQueue";

// Hooks
import { useQueue } from "@/contexts/QueueContext";

// Main ReadPage Content Component
const ReadPageContent: React.FC = () => {
  const router = useRouter();
  const { scrapedData, currentUrl } = useLexioState();
  const { clearAll } = useLexioActions();
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (scrapedData && !hasAnimated) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setHasAnimated(true);
        setTimeout(() => setIsAnimating(false), 2200);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [scrapedData, hasAnimated]);

  useEffect(() => {
    if (!scrapedData) {
      router.push("/");
      return;
    }
  }, [scrapedData, router]);

  const { addToQueue, isInQueue } = useQueue();

  const handleBack = () => {
    clearAll();
    router.push("/");
  };

  const handleStartOver = () => {
    clearAll();
    router.push("/");
  };

  const getAvailableSections = () => {
    if (!scrapedData?.sections) return [];
    return scrapedData.sections.filter((_, index) => !isInQueue(`section-${index}`));
  };

  const isSummaryAvailable = () => !isInQueue('summary');

  const handleAddSectionToQueue = (index: number) => {
    if (!scrapedData?.sections) return;
    const section = scrapedData.sections[index];
    if (section) addToQueue({ id: `section-${index}`, title: section.title, content: section.content });
  };

  const handleAddSummaryToQueue = () => {
    if (!scrapedData) return;
    const summaryContent = extractSummary(scrapedData.cleanText || scrapedData.text, 1000);
    addToQueue({ id: 'summary', title: 'Summary', content: summaryContent });
  };
  
  const handleSmartAddToQueue = (sectionIndices: number[]) => {
    if (!scrapedData?.sections) return;
    sectionIndices.forEach(index => {
      if (index < scrapedData.sections.length) handleAddSectionToQueue(index);
    });
  };

  const handleSmartAddSummary = () => handleAddSummaryToQueue();
  
  const getAvailableSectionsForChat = () => {
    if (!scrapedData) return [];
    return scrapedData.sections
      .map((section, index) => ({ title: section.title, content: section.content, index }))
      .filter((_, index) => !isInQueue(`section-${index}`));
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

  return (
    <div className="h-screen text-white overflow-y-auto flex flex-col">
       <style jsx>{`
        /* All existing styles remain the same */
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .card-animate-enter { opacity: 0; transform: translateY(60px) scale(0.92) rotateX(8deg); filter: blur(4px); transition: all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .card-animate-enter.animate-visible { opacity: 1; transform: translateY(0) scale(1) rotateX(0deg); filter: blur(0px); }
        /* ...etc. */
      `}</style>

      <Header currentUrl={currentUrl} onBack={handleBack} onStartOver={handleStartOver} />

      <main className="flex-1 flex flex-col min-h-0">
        <div className={`flex-shrink-0 px-4 lg:px-6 py-4 border-b border-white/10 bg-black/20 backdrop-blur-sm ${!hasAnimated ? 'content-container' : ''}`}>
          <div className="max-w-none">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg lg:text-xl text-white font-bold truncate mb-2">{scrapedData.title}</h1>
                {currentUrl && (
                  <div className="flex items-center gap-2 text-xs text-white/60 group hover:text-white/80">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="font-mono truncate">{currentUrl}</a>
                  </div>
                )}
              </div>
              <div className="flex items-center flex-wrap gap-2 text-xs text-white/70">
                {/* --- The Play All button has been removed from here --- */}
                <div className="flex items-center gap-2 bg-white/8 px-3 py-1.5 rounded-lg border border-white/10">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span>{scrapedData.text.split(' ').length.toLocaleString()} words</span>
                </div>
                <div className="flex items-center gap-2 bg-white/8 px-3 py-1.5 rounded-lg border border-white/10">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>~{Math.ceil(scrapedData.text.split(' ').length / 200)}m read</span>
                </div>

              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 lg:px-6 py-4 min-h-0">
          <div className="h-full">
            <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              <div className="h-full flex flex-col min-h-0">
                <div className="bg-black/30 backdrop-blur-sm border border-white/15 rounded-2xl shadow-2xl h-full flex flex-col">
                  <div className="flex-shrink-0 px-4 py-3 border-b border-white/15">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-white/80 rounded-full"></div>
                      <h2 className="text-sm font-semibold text-white">Content Cards</h2>
                      <span className="text-xs text-white/70 bg-white/15 px-2.5 py-1 rounded-full ml-auto border border-white/20">
                        {getAvailableSections().length + (isSummaryAvailable() ? 1 : 0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {getAvailableSections().length === 0 && !isSummaryAvailable() ? (
                      <div className="p-6 text-center text-white/60">All content is in the queue.</div>
                    ) : (
                      <div className="p-3 space-y-3 pb-4">
                        {scrapedData.sections.map((section, index) => {
                          if (isInQueue(`section-${index}`)) return null;
                          return (
                            <ContentCard
                              key={`section-${index}`}
                              id={`section-${index}`}
                              title={section.title}
                              content={section.content}
                              type="section"
                              index={index}
                              isAnimating={isAnimating}
                              hasAnimated={hasAnimated}
                              
                            />
                          );
                        })}
                        {scrapedData.text && isSummaryAvailable() && (
                          <ContentCard
                            key="summary"
                            id="summary"
                            title="Summary"
                            content={extractSummary(scrapedData.text, 200)}
                            type="summary"
                            index={scrapedData.sections.length}
                            isAnimating={isAnimating}
                            hasAnimated={hasAnimated}
                        
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="h-full flex flex-col min-h-0">
                <div className="bg-black/30 backdrop-blur-sm border border-white/15 rounded-2xl shadow-2xl h-full flex flex-col">
                  <div className="flex-shrink-0 px-4 py-3 border-b border-white/15">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-white/70 rounded-full"></div>
                      <h2 className="text-sm font-semibold text-white">Listening Queue</h2>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col min-h-0 p-3">
                    <ListeningQueue />
                  </div>
                </div>
              </div>
              <div className="h-full flex flex-col min-h-0">
                 <div className="bg-black/30 backdrop-blur-sm border border-white/15 rounded-2xl shadow-2xl h-full flex flex-col">
                  <div className="flex-shrink-0 px-4 py-3 border-b border-white/15">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-white/60 rounded-full"></div>
                      <h2 className="text-sm font-semibold text-white">Smart Assistant</h2>
                      <div className="ml-auto w-2 h-2 bg-white/80 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col min-h-0 p-3">
                      <SmartChatPanel
                        availableSections={getAvailableSectionsForChat()}
                        onAddToQueue={handleSmartAddToQueue}
                        onAddSummary={handleSmartAddSummary}
                      />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default function ReadPage() {
  return <ReadPageContent />;
}
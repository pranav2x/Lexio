"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLexioState, useLexioActions } from "@/lib/store";
import { extractSummary } from "@/lib/firecrawl";
import { estimateTextDuration } from "@/lib/tts";

// Context Providers
import { AudioProvider } from "@/contexts/AudioContext";
import { QueueProvider } from "@/contexts/QueueContext";

// Components
import Header from "@/components/read/Header";
import ContentCard from "@/components/read/ContentCard";
import SmartChatPanel from "@/components/read/SmartChatPanel";
import ListeningQueue from "@/components/read/ListeningQueue";
import AudioPlayer from "@/components/read/AudioPlayer";
import MaximizedPlayer from "@/components/read/MaximizedPlayer";

// Hooks
import { useQueue } from "@/contexts/QueueContext";
import { useAudio } from "@/contexts/AudioContext";



// Main ReadPage Content Component
const ReadPageContent: React.FC = () => {
  const router = useRouter();
  const { scrapedData, currentUrl } = useLexioState();
  const { clearAll } = useLexioActions();
  
  // Animation state for cards
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  
  // Get queue and audio functions
  const { addToQueue, isInQueue } = useQueue();
  const { clearAudio } = useAudio();

  // Handle initial card animations
  useEffect(() => {
    if (scrapedData && !hasAnimated) {
      setIsAnimating(true);
      
      const timer = setTimeout(() => {
        setHasAnimated(true);
        setTimeout(() => {
          setIsAnimating(false);
        }, 2200);
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [scrapedData, hasAnimated]);

  useEffect(() => {
    console.log('📊 Read page loaded, scrapedData status:', {
      hasData: !!scrapedData,
      title: scrapedData?.title,
      textLength: scrapedData?.text?.length || 0,
      cleanTextLength: scrapedData?.cleanText?.length || 0,
      sectionsCount: scrapedData?.sections?.length || 0
    });
    
    // Redirect to home if no data is available
    if (!scrapedData) {
      console.log('❌ No scraped data found, redirecting to home');
      router.push("/");
      return;
    }

    // Cleanup function
    return () => {
      clearAudio();
    };
  }, [scrapedData, router, clearAudio]);

  const handleBack = () => {
    clearAudio();
    clearAll();
    router.push("/");
  };

  const handleStartOver = () => {
    clearAudio();
    clearAll();
    router.push("/");
  };

  // Helper function to get available sections (not in queue)
  const getAvailableSections = () => {
    if (!scrapedData?.sections) return [];
    return scrapedData.sections.filter((_, index) => !isInQueue(`section-${index}`));
  };

  // Helper function to check if summary is available (not in queue)
  const isSummaryAvailable = () => {
    return !isInQueue('summary');
  };

  // Add to queue functions for buttons
  const handleAddSectionToQueue = (index: number) => {
    if (!scrapedData) return;
    
    const section = scrapedData.sections[index];
    if (!section) return;
    
    console.log('🔍 Adding section to queue:', {
      index,
      title: section.title,
      contentLength: section.content?.length || 0,
      hasContent: Boolean(section.content && section.content.trim().length > 0)
    });
    
    addToQueue({
      id: `section-${index}`,
      title: section.title,
      content: section.content
    });
  };

  const handleAddSummaryToQueue = () => {
    if (!scrapedData) return;
    
    const summaryContent = extractSummary(scrapedData.cleanText || scrapedData.text, 1000);
    
    console.log('🔍 Adding summary to queue:', {
      title: 'Summary',
      contentLength: summaryContent?.length || 0,
      hasContent: Boolean(summaryContent && summaryContent.trim().length > 0)
    });
    
    addToQueue({
      id: 'summary',
      title: 'Summary',
      content: summaryContent
    });
  };

  // Smart chat handlers
  const handleSmartAddToQueue = (sectionIndices: number[], explanation: string) => {
    if (!scrapedData) return;
    console.log(`🤖 Smart AI adding sections: ${sectionIndices.join(', ')} - ${explanation}`);
    sectionIndices.forEach(index => {
      if (index < scrapedData.sections.length) {
        handleAddSectionToQueue(index);
      }
    });
  };

  const handleSmartAddSummary = () => {
    console.log('🤖 Smart AI adding summary');
    handleAddSummaryToQueue();
  };

  // Get available sections for the chat component
  const getAvailableSectionsForChat = () => {
    if (!scrapedData) return [];
    return scrapedData.sections
      .map((section, index) => ({
        title: section.title,
        content: section.content,
        index: index
      }))
      .filter((_, index) => !isInQueue(`section-${index}`));
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
    <div className="h-screen text-white overflow-y-auto flex flex-col">
      <style jsx>{`
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        /* Card entrance animations - BEAUTIFUL & CLEAN */
        .card-animate-enter {
          opacity: 0;
          transform: translateY(60px) scale(0.92) rotateX(8deg);
          filter: blur(4px);
          box-shadow: 0 0 0 rgba(255, 255, 255, 0);
          transition: all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          will-change: transform, opacity, filter, box-shadow;
        }
        
        .card-animate-enter.animate-visible {
          opacity: 1;
          transform: translateY(0) scale(1) rotateX(0deg);
          filter: blur(0px);
          box-shadow: 0 20px 60px rgba(255, 255, 255, 0.15);
        }
        
        /* Elegant staggered animation delays */
        .card-animate-delay-0 { transition-delay: 150ms; }
        .card-animate-delay-1 { transition-delay: 300ms; }
        .card-animate-delay-2 { transition-delay: 450ms; }
        .card-animate-delay-3 { transition-delay: 600ms; }
        .card-animate-delay-4 { transition-delay: 750ms; }
        .card-animate-delay-5 { transition-delay: 900ms; }
        
        /* Beautiful shimmer effect during entrance */
        .card-animate-enter::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.4),
            transparent
          );
          transition: left 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          z-index: 1;
          border-radius: inherit;
        }
        
        .card-animate-enter.animate-visible::before {
          left: 100%;
        }
        
        /* Smooth hover effect */
        .card-animate-enter:hover {
          transform: translateY(-4px) scale(1.02) rotateX(-2deg);
          box-shadow: 0 25px 70px rgba(255, 255, 255, 0.25);
          filter: brightness(1.05);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        /* Gentle floating animation after entrance */
        .card-animate-enter.animate-visible {
          animation: gentle-float 6s ease-in-out infinite 2s;
        }
        
        @keyframes gentle-float {
          0%, 100% {
            transform: translateY(0) scale(1) rotateX(0deg);
            box-shadow: 0 20px 60px rgba(255, 255, 255, 0.15);
          }
          50% {
            transform: translateY(-3px) scale(1.005) rotateX(0.5deg);
            box-shadow: 0 25px 70px rgba(255, 255, 255, 0.2);
          }
        }
        
        /* Ensure cards are visible once animation completes */
        .glass-card {
          opacity: 1;
          transform: translateY(0) scale(1);
          position: relative;
          overflow: hidden;
        }
        
        /* Beautiful content emergence */
        .content-container {
          animation: content-emerge 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        
        @keyframes content-emerge {
          0% {
            opacity: 0;
            transform: translateY(30px);
            filter: blur(2px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0px);
          }
        }
        
        /* Sparkle animation */
        @keyframes sparkle {
          0% {
            opacity: 0;
            transform: scale(0) translateY(10px);
          }
          50% {
            opacity: 1;
            transform: scale(1) translateY(-5px);
          }
          100% {
            opacity: 0;
            transform: scale(0.5) translateY(-15px);
          }
        }
      `}</style>

      {/* Header */}
      <Header 
        currentUrl={currentUrl}
        onBack={handleBack}
        onStartOver={handleStartOver}
      />

      {/* Main Content - Full Viewport */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Compact Header */}
        <div className={`flex-shrink-0 px-3 lg:px-4 py-2 border-b border-white/10 bg-black/10 backdrop-blur-sm ${
          !hasAnimated ? 'content-container' : ''
        }`}>
          <div className="max-w-none">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
              {/* Title and URL */}
              <div className="flex-1 min-w-0">
                <h1 className="text-base lg:text-lg text-gradient font-bold truncate mb-1">
                  {scrapedData.title}
                </h1>
                {currentUrl && (
                  <div className="flex items-center gap-2 text-xs text-white/60 group hover:text-white/80 transition-colors">
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <a 
                      href={currentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-mono-enhanced hover:text-white neon-glow transition-all duration-300 truncate"
                    >
                      {currentUrl}
                    </a>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-2 text-xs text-white/70">
                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded">
                  <svg className="w-3 h-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>{scrapedData.text.split(' ').length.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded">
                  <svg className="w-3 h-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>~{Math.ceil(scrapedData.text.split(' ').length / 200)}m</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded">
                  <svg className="w-3 h-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  <span>~{Math.ceil(estimateTextDuration(scrapedData.text) / 60)}m</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard - Full Height 3-Column Layout */}
        <div className="flex-1 px-3 lg:px-4 py-3 min-h-0">
          <div className="h-full">
            <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
            
                           {/* Column 1: Content Cards */}
               <div className="h-full flex flex-col min-h-0">
                 <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl h-full flex flex-col min-h-0">
                   {/* Column Header */}
                   <div className="flex-shrink-0 px-3 py-2 border-b border-white/10">
                     <div className="flex items-center gap-2">
                       <div className="w-2 h-2 bg-white/70 rounded-full"></div>
                       <h2 className="text-xs font-semibold text-white">Content Cards</h2>
                       <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded-full ml-auto">
                         {getAvailableSections().length + (isSummaryAvailable() ? 1 : 0)}
                       </span>
                     </div>
                   </div>
                   
                   {/* Scrollable Content */}
                   <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                     {/* Check if all content is in queue */}
                     {getAvailableSections().length === 0 && !isSummaryAvailable() && scrapedData.sections.length <= 5 ? (
                       <div className="flex flex-col items-center justify-center h-full text-center p-4">
                         <div className="text-2xl mb-2 opacity-60">🎧</div>
                         <h3 className="text-xs font-semibold text-white mb-1">All Content Queued</h3>
                         <p className="text-xs text-white/60 max-w-32">
                           Remove items from the queue to see them here again.
                         </p>
                       </div>
                     ) : (
                       <div className="p-2 space-y-2 pb-4">
                         {/* Section Cards - Only show sections not in queue */}
                         {scrapedData.sections.slice(0, 5).map((section, index) => {
                           // Don't render if this section is in the queue
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
                               onClick={() => handleAddSectionToQueue(index)}
                             />
                           );
                         })}

                         {/* Additional Sections (if more than 5) */}
                         {scrapedData.sections.length > 5 && (
                           <ContentCard
                             key="more-sections"
                             id="more-sections"
                             title=""
                             content=""
                             type="more-sections"
                             index={5}
                             isAnimating={isAnimating}
                             hasAnimated={hasAnimated}
                             additionalSectionsCount={scrapedData.sections.length - 5}
                           />
                         )}

                         {/* Summary Card - Only show if not in queue */}
                         {scrapedData.text && isSummaryAvailable() && (
                           <ContentCard
                             key="summary"
                             id="summary"
                             title="Summary"
                             content={extractSummary(scrapedData.text, 200)}
                             type="summary"
                             index={scrapedData.sections.slice(0, 5).filter((_, i) => !isInQueue(`section-${i}`)).length}
                             isAnimating={isAnimating}
                             hasAnimated={hasAnimated}
                             onClick={handleAddSummaryToQueue}
                           />
                         )}
                       </div>
                     )}
                   </div>
                 </div>
               </div>

               {/* Column 2: Listening Queue */}
               <div className="h-full flex flex-col min-h-0">
                 <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl h-full flex flex-col min-h-0">
                   {/* Column Header */}
                   <div className="flex-shrink-0 px-3 py-2 border-b border-white/10">
                     <div className="flex items-center gap-2">
                       <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                       <h2 className="text-xs font-semibold text-white">Listening Queue</h2>
                     </div>
                   </div>
                   
                   {/* Queue Content - Full Height */}
                   <div className="flex-1 flex flex-col min-h-0 p-2">
                     <div className="flex-1 min-h-0">
                       <ListeningQueue />
                     </div>
                   </div>
                 </div>
               </div>

               {/* Column 3: Smart Chat */}
               <div className="h-full flex flex-col min-h-0">
                 <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl h-full flex flex-col min-h-0">
                   {/* Column Header */}
                   <div className="flex-shrink-0 px-3 py-2 border-b border-white/10">
                     <div className="flex items-center gap-2">
                       <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                       <h2 className="text-xs font-semibold text-white">Smart Assistant</h2>
                       <div className="ml-auto">
                         <div className="w-1.5 h-1.5 bg-white/80 rounded-full animate-pulse"></div>
                       </div>
                     </div>
                   </div>
                   
                   {/* Chat Content - Full Height */}
                   <div className="flex-1 flex flex-col min-h-0 p-2">
                     <div className="flex-1 min-h-0">
                       <SmartChatPanel
                         availableSections={getAvailableSectionsForChat()}
                         onAddToQueue={handleSmartAddToQueue}
                         onAddSummary={handleSmartAddSummary}
                         isProcessing={false}
                       />
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         </div>
       </main>

      {/* Audio Player (Bottom Controls) */}
      <AudioPlayer />

      {/* Maximized Player Overlay */}
      <MaximizedPlayer />
    </div>
  );
};

// Main ReadPage with Providers
export default function ReadPage() {
  return (
    <AudioProvider>
      <QueueProvider>
        <ReadPageContent />
      </QueueProvider>
    </AudioProvider>
  );
} 
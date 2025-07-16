"use client";

import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  type: 'user' | 'system';
  content: string;
  timestamp: Date;
  addedSections?: string[];
}

interface SmartChatProps {
  availableSections: Array<{
    title: string;
    content: string;
    index: number;
  }>;
  onAddToQueue: (sectionIndices: number[], explanation: string, autoMaximize?: boolean) => void;
  onAddSummary: () => void;
  isProcessing?: boolean;
}

// Local analysis function (replaces the deleted API)
function analyzeMessageLocally(userMessage: string, availableSections: Array<{title: string, content: string, index: number}>): {
  response: string;
  matchedSections: number[];
  addedSectionTitles: string[];
  includeSummary: boolean;
  explanation: string;
} {
  const message = userMessage.toLowerCase();
  const matchedSections: number[] = [];
  const addedSectionTitles: string[] = [];
  let includeSummary = false;

  // Enhanced keyword mappings with more specificity
  const keywordMappings = {
    // Trade and Economics - more specific terms
    trade: {
      primary: ['trade network', 'trading route', 'silk road', 'commercial network', 'trade route'],
      secondary: ['trade', 'trading', 'commerce', 'commercial', 'merchant', 'goods', 'exchange', 'market'],
      context: ['facilitated', 'enabled', 'spread', 'connected', 'linked']
    },
    
    // Technology and Innovation
    technology: {
      primary: ['technological innovation', 'technology transfer', 'technological advancement', 'innovation spread'],
      secondary: ['technology', 'innovation', 'invention', 'technical', 'advancement', 'development'],
      context: ['facilitated', 'enabled', 'spread', 'transferred', 'adopted', 'diffused']
    },
    
    // Mongol Empire
    mongol: {
      primary: ['mongol empire', 'pax mongolica', 'mongol expansion', 'genghis khan'],
      secondary: ['mongol', 'mongols', 'khan', 'yuan dynasty'],
      context: ['conquered', 'united', 'controlled', 'expanded']
    },
    
    // Islamic World
    islamic: {
      primary: ['islamic expansion', 'dar al-islam', 'islamic golden age', 'abbasid caliphate'],
      secondary: ['islam', 'islamic', 'muslim', 'caliphate', 'sultanate'],
      context: ['expansion', 'spread', 'influence', 'culture']
    },
    
    // Environment and Disease
    environment: {
      primary: ['black death', 'bubonic plague', 'demographic crisis', 'climate change'],
      secondary: ['plague', 'disease', 'epidemic', 'climate', 'environment', 'weather'],
      context: ['devastated', 'affected', 'spread', 'killed', 'changed']
    },
    
    // General learning requests
    everything: ['everything', 'all', 'complete', 'full', 'entire', 'whole'],
    summary: ['summary', 'overview', 'brief', 'summarize', 'main points', 'key points']
  };

  // Check for summary requests
  if (keywordMappings.summary.some(keyword => message.includes(keyword))) {
    includeSummary = true;
  }

  // Check for "everything" requests
  if (keywordMappings.everything.some(keyword => message.includes(keyword))) {
    // Add all available sections
    availableSections.forEach(section => {
      matchedSections.push(section.index);
      addedSectionTitles.push(section.title);
    });
    includeSummary = true;
    
    return {
      response: `Perfect! I've added all available content to your queue (${availableSections.length} sections + summary). You'll get the complete learning experience about this topic!`,
      matchedSections,
      addedSectionTitles,
      includeSummary,
      explanation: "User requested all available content"
    };
  }

  // Enhanced contextual analysis
  const getContextualRelevance = (userMessage: string, sectionText: string): number => {
    let relevanceScore = 0;
    const userWords = userMessage.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    const sectionWords = sectionText.toLowerCase().split(/\s+/);
    
    // Check for phrase-level matches (higher weight)
    const userPhrases = [];
    for (let i = 0; i < userWords.length - 1; i++) {
      userPhrases.push(`${userWords[i]} ${userWords[i + 1]}`);
    }
    
    userPhrases.forEach(phrase => {
      if (sectionText.toLowerCase().includes(phrase)) {
        relevanceScore += 15; // High score for phrase matches
      }
    });
    
    // Check for conceptual relationships
    const conceptMappings = {
      'trade networks': ['economic exchange', 'commercial routes', 'merchant activity', 'goods flow'],
      'technological innovation': ['new technology', 'inventions', 'technical advancement', 'knowledge transfer'],
      'facilitated': ['enabled', 'promoted', 'encouraged', 'supported', 'helped spread'],
      'during this period': ['at this time', 'in this era', 'throughout this period', 'during these years']
    };
    
    Object.entries(conceptMappings).forEach(([userConcept, relatedTerms]) => {
      if (userMessage.includes(userConcept)) {
        relatedTerms.forEach(term => {
          if (sectionText.toLowerCase().includes(term)) {
            relevanceScore += 10;
          }
        });
      }
    });
    
    return relevanceScore;
  };

  // Score each section with enhanced logic
  const sectionScores = availableSections.map(section => {
    let score = 0;
    const sectionText = `${section.title} ${section.content}`.toLowerCase();
    
    // Contextual relevance scoring
    score += getContextualRelevance(userMessage, sectionText);
    
    // Enhanced keyword category scoring
    Object.entries(keywordMappings).forEach(([category, keywords]) => {
      if (category === 'everything' || category === 'summary') return;
      
      const keywordData = keywords as any;
      if (typeof keywordData === 'object' && keywordData.primary) {
        // Check primary keywords (highest weight)
        const userHasPrimary = keywordData.primary.some((keyword: string) => message.includes(keyword));
        const sectionHasPrimary = keywordData.primary.some((keyword: string) => sectionText.includes(keyword));
        
        if (userHasPrimary && sectionHasPrimary) {
          score += 25; // Very high score for primary matches
        }
        
        // Check secondary keywords (medium weight)
        const userHasSecondary = keywordData.secondary.some((keyword: string) => message.includes(keyword));
        const sectionHasSecondary = keywordData.secondary.some((keyword: string) => sectionText.includes(keyword));
        
        if (userHasSecondary && sectionHasSecondary) {
          score += 15; // Medium score for secondary matches
        }
        
        // Check context keywords (bonus if both primary/secondary and context match)
        if ((userHasPrimary || userHasSecondary) && (sectionHasPrimary || sectionHasSecondary)) {
          const userHasContext = keywordData.context.some((keyword: string) => message.includes(keyword));
          const sectionHasContext = keywordData.context.some((keyword: string) => sectionText.includes(keyword));
          
          if (userHasContext && sectionHasContext) {
            score += 10; // Bonus for contextual relevance
          }
        }
      } else {
        // Handle simple keyword arrays (backward compatibility)
        const keywordArray = Array.isArray(keywordData) ? keywordData : [];
        const userHasKeyword = keywordArray.some((keyword: string) => message.includes(keyword));
        const sectionHasKeyword = keywordArray.some((keyword: string) => sectionText.includes(keyword));
        
        if (userHasKeyword && sectionHasKeyword) {
          score += 10;
        }
      }
    });

    // Title relevance bonus
    const titleWords = section.title.toLowerCase().split(/\s+/);
    const userWords = message.split(/\s+/).filter(word => word.length > 3);
    
    userWords.forEach(word => {
      if (titleWords.some(titleWord => titleWord.includes(word) || word.includes(titleWord))) {
        score += 8;
      }
    });

    // Penalize sections that seem irrelevant based on negative indicators
    const negativeIndicators = [
      { userHas: ['trade', 'network'], sectionHas: ['religion', 'spiritual', 'prayer'], penalty: -15 },
      { userHas: ['technology', 'innovation'], sectionHas: ['political', 'governance', 'administration'], penalty: -10 },
      { userHas: ['economic'], sectionHas: ['warfare', 'military', 'battle'], penalty: -8 }
    ];
    
    negativeIndicators.forEach(indicator => {
      const userHasTerms = indicator.userHas.some(term => message.includes(term));
      const sectionHasTerms = indicator.sectionHas.some(term => sectionText.includes(term));
      
      if (userHasTerms && sectionHasTerms) {
        score += indicator.penalty;
      }
    });

    return { section, score };
  });

  // Sort by score and apply more selective filtering
  const sortedSections = sectionScores
    .filter(item => item.score > 10) // Higher threshold for relevance
    .sort((a, b) => b.score - a.score);

  // More selective section addition
  const minScore = sortedSections.length > 0 ? Math.max(sortedSections[0].score * 0.6, 15) : 15;
  
  for (const item of sortedSections) {
    if (matchedSections.length < 3 && item.score >= minScore) { // Limit to max 3 sections
      matchedSections.push(item.section.index);
      addedSectionTitles.push(item.section.title);
    }
  }

  // If no high-quality matches, try to find at least one decent match
  if (matchedSections.length === 0 && sortedSections.length > 0) {
    const bestMatch = sortedSections[0];
    if (bestMatch.score > 5) {
      matchedSections.push(bestMatch.section.index);
      addedSectionTitles.push(bestMatch.section.title);
    }
  }

  // Generate more contextual responses
  let response = "";
  if (matchedSections.length === 0) {
    response = "I couldn't find content that closely matches your specific request. Try being more specific with key terms, or say 'everything' to explore all available content.";
  } else if (matchedSections.length === 1) {
    response = `Great! I found 1 highly relevant section: "${addedSectionTitles[0]}". This content directly relates to your question.`;
  } else {
    response = `Perfect! I found ${matchedSections.length} sections that are highly relevant to your request: ${addedSectionTitles.join(", ")}. These focus specifically on what you asked about.`;
  }

  if (includeSummary) {
    response += " I've also included the summary to give you a good overview.";
  }

  return {
    response,
    matchedSections,
    addedSectionTitles,
    includeSummary,
    explanation: `Enhanced contextual analysis with relevance scoring (${matchedSections.length} sections matched)`
  };
}

export default function SmartChat({ 
  availableSections, 
  onAddToQueue, 
  onAddSummary,
  isProcessing = false 
}: SmartChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'system',
      content: "Hi! I'm your Lexio AI learning assistant. Tell me what you'd like to learn about and I'll add the most relevant content to your queue. Try saying something like 'I want to learn about trade networks' or 'teach me about the Mongol Empire'.",
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addSystemMessage = (content: string, addedSections?: string[]) => {
    const message: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(),
      type: 'system',
      content,
      timestamp: new Date(),
      addedSections
    };
    setMessages(prev => [...prev, message]);
    return new Promise(resolve => setTimeout(resolve, 400)); // Shorter delay for faster interaction
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Single concise processing message
      await addSystemMessage("🔍 Analyzing request and searching content...");

      // Use local analysis instead of API call
      const analysis = analyzeMessageLocally(userMessage.content, availableSections);

      if (analysis.matchedSections.length > 0) {
        // Show simple result and add to queue
        if (analysis.addedSectionTitles && analysis.addedSectionTitles.length > 0) {
          await addSystemMessage(`✅ Added ${analysis.matchedSections.length} section${analysis.matchedSections.length > 1 ? 's' : ''} to your queue${analysis.includeSummary ? ' + summary' : ''}!`, analysis.addedSectionTitles);
        }
        
        // Add matched sections to queue
        onAddToQueue(analysis.matchedSections, analysis.explanation);
      } else {
        await addSystemMessage("🔍 No matching sections found for your request.");
      }
      
      // Add summary if requested
      if (analysis.includeSummary) {
        onAddSummary();
      }

      // Show only a concise final response (limit to 150 chars)
      const shortResponse = analysis.response.length > 150 
        ? analysis.response.substring(0, 150) + "..." 
        : analysis.response;
      await addSystemMessage(shortResponse);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: "❌ Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };



  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  const suggestions = [
    "Trade networks",
    "Mongol Empire", 
    "Islamic expansion",
    "Black Death",
    "Technology innovations",
    "Everything"
  ];

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <h3 className="text-lg font-semibold text-white">Smart Learning Assistant</h3>
        <p className="text-sm text-neutral-400">AI-powered content selection by Lexio</p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 border border-neutral-700 rounded-lg p-4 bg-neutral-800 min-h-0 mb-4 scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                message.type === 'user'
                  ? 'bg-white text-black'
                  : 'bg-neutral-700 border border-neutral-600 text-white'
              }`}
            >
              <p>{message.content}</p>
              {message.addedSections && message.addedSections.length > 0 && (
                <div className="mt-2 pt-2 border-t border-neutral-600">
                  <p className="text-xs text-neutral-300 font-medium">Added:</p>
                  <div className="text-xs text-neutral-300 mt-1">
                    {message.addedSections.map((section, index) => (
                      <div key={index} className="truncate">• {section}</div>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-xs opacity-60 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-sm text-white">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span>Lexio is analyzing your request...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Section */}
      <div className="flex-shrink-0 space-y-4">
        {/* Quick Suggestions */}
        <div className="space-y-2">
          <p className="text-xs text-neutral-400">Quick suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={isLoading}
                className="px-3 py-1 text-xs border border-neutral-600 rounded-full text-neutral-300 hover:text-white hover:border-neutral-500 hover:bg-neutral-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="e.g., 'I want to learn about trade networks'"
            disabled={isLoading || isProcessing}
            className="flex-1 px-4 py-2 border border-neutral-600 rounded-lg text-sm bg-neutral-800 text-white placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 transition-all duration-200 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || isProcessing || !inputValue.trim()}
            className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isLoading ? 'Analyzing...' : 'Send'}
          </button>
        </form>

        {(isLoading || isProcessing) && (
          <div className="text-xs text-neutral-400 text-center">
            Please wait while Lexio analyzes your request and finds the best content...
          </div>
        )}
      </div>
    </div>
  );
} 
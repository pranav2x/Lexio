"use client";

import React, { useState } from 'react';

interface AvailableSection {
  title: string;
  content: string;
  index: number;
}

interface SmartChatPanelProps {
  availableSections: Array<{ title: string; content: string; index: number }>;
  onAddToQueue: (sectionIndices: number[]) => void;
  onAddSummary: () => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: {
    type: 'add_sections' | 'add_summary';
    sectionIndices?: number[];
    explanation?: string;
  };
}

/**
 * Extract learning topics from user query
 */
function extractLearningTopics(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  
  // Remove common words and phrases
  const cleanQuery = lowerQuery
    .replace(/\b(i want to|want to|learn about|how|what|when|where|why|during|this|period|time|about|the|and|or|of|in|on|at|for|with|by|from|to|a|an|that|which|who|whom|whose)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Extract meaningful phrases and words
  const topics: string[] = [];
  
  // Look for multi-word topics first (2-3 words)
  const multiWordTopics = cleanQuery.match(/\b\w+\s+\w+(?:\s+\w+)?\b/g) || [];
  topics.push(...multiWordTopics);
  
  // Then individual meaningful words (filter out very short words)
  const singleWords = cleanQuery.split(/\s+/).filter(word => 
    word.length > 3 && 
    !['have', 'been', 'were', 'they', 'them', 'their', 'there', 'these', 'those', 'would', 'could', 'should'].includes(word)
  );
  topics.push(...singleWords);
  
  // Remove duplicates and return
  return [...new Set(topics)].filter(topic => topic.length > 0);
}

/**
 * Generate dynamic suggestions based on available content
 */
function generateContentBasedSuggestions(availableSections: AvailableSection[]): string[] {
  if (availableSections.length === 0) {
    return ['Recommend something', 'Show summary', 'Add everything'];
  }

  const suggestions = ['Recommend something', 'Show summary', 'Add everything'];
  
  // Extract key topics from section titles and content
  const allText = availableSections.map(section => 
    `${section.title} ${section.content}`
  ).join(' ').toLowerCase();
  
  // Common academic/learning topics to look for
  const topicPatterns = [
    { keywords: ['action', 'reasoning', 'model', 'ai', 'artificial intelligence'], suggestion: 'I want to learn about AI models' },
    { keywords: ['robot', 'robotics', 'embodiment', 'manipulation'], suggestion: 'I want to learn about robotics' },
    { keywords: ['vision', 'language', 'multimodal', 'perception'], suggestion: 'I want to learn about vision-language models' },
    { keywords: ['3d', 'space', 'spatial', 'geometry', 'depth'], suggestion: 'I want to learn about spatial reasoning' },
    { keywords: ['training', 'dataset', 'performance', 'evaluation'], suggestion: 'I want to learn about model training' },
    { keywords: ['open source', 'open model', 'research'], suggestion: 'I want to learn about open research' },
    { keywords: ['trade', 'network', 'trading', 'commerce', 'economic'], suggestion: 'I want to learn about trade networks' },
    { keywords: ['mongol', 'empire', 'expansion', 'conquest'], suggestion: 'I want to learn about Mongol Empire' },
    { keywords: ['islamic', 'islam', 'muslim', 'caliphate'], suggestion: 'I want to learn about Islamic expansion' },
    { keywords: ['technology', 'innovation', 'invention', 'technical'], suggestion: 'I want to learn about technology innovations' },
    { keywords: ['disease', 'plague', 'black death', 'pandemic'], suggestion: 'I want to learn about disease impact' },
    { keywords: ['climate', 'environment', 'environmental'], suggestion: 'I want to learn about environmental factors' },
    { keywords: ['culture', 'cultural', 'exchange', 'diffusion'], suggestion: 'I want to learn about cultural exchange' },
    { keywords: ['political', 'politics', 'government', 'power'], suggestion: 'I want to learn about political systems' },
    { keywords: ['social', 'society', 'class', 'hierarchy'], suggestion: 'I want to learn about social structures' },
    { keywords: ['military', 'warfare', 'conflict', 'battle'], suggestion: 'I want to learn about military history' }
  ];
  
  // Find matching topics based on keyword density
  const matchedTopics = topicPatterns
    .map(pattern => ({
      ...pattern,
      score: pattern.keywords.reduce((score, keyword) => {
        const matches = (allText.match(new RegExp(keyword, 'g')) || []).length;
        return score + matches;
      }, 0)
    }))
    .filter(topic => topic.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2); // Take top 2 matched topics
  
  // Add the matched suggestions to the beginning
  matchedTopics.forEach(topic => {
    suggestions.unshift(topic.suggestion);
  });
  
  // Keep only unique suggestions and limit to 4 total
  return [...new Set(suggestions)].slice(0, 4);
}

/**
 * Calculate relevance score for a section based on extracted topics
 * Now requires substantial content alignment, not just keyword mentions
 */
function calculateRelevanceScore(section: AvailableSection, topics: string[], originalQuery: string): number {
  let score = 0;
  const sectionTitle = section.title.toLowerCase();
  const sectionContent = section.content.toLowerCase();
  const queryLower = originalQuery.toLowerCase();
  
  // Calculate content length for proportion scoring
  const contentWordCount = sectionContent.split(/\s+/).length;
  const titleWordCount = sectionTitle.split(/\s+/).length;
  
  // Track how much content is related to the query topics
  let relatedContentWords = 0;
  let titleMatches = 0;
  
  for (const topic of topics) {
    const topicLower = topic.toLowerCase();
    const topicWords = topicLower.split(/\s+/);
    
    // Title analysis - requires exact or very close matches
    if (sectionTitle.includes(topicLower)) {
      titleMatches++;
      score += topicWords.length > 2 ? 25 : 15; // Multi-word topics get more weight
    }
    
    // Content analysis - look for multiple mentions and context
    const topicMentions = (sectionContent.match(new RegExp(topicLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    
    if (topicMentions > 0) {
      // Base score for mentions
      score += Math.min(topicMentions * 3, 12); // Cap at 12 points per topic
      
      // Estimate related content by counting words around mentions
      const contextWords = topicWords.length * topicMentions * 5; // Estimate 5 words context per mention
      relatedContentWords += contextWords;
    }
    
    // Bonus for exact phrase matches from original query
    const queryPhrases = queryLower.match(/\b\w+(?:\s+\w+){1,3}\b/g) || [];
    for (const phrase of queryPhrases) {
      if (phrase.length > 8 && (sectionTitle.includes(phrase) || sectionContent.includes(phrase))) {
        score += 20; // High bonus for exact phrase matches
        relatedContentWords += phrase.split(/\s+/).length * 3;
      }
    }
  }
  
  // Calculate content proportion score
  const contentProportion = Math.min(relatedContentWords / contentWordCount, 1);
  const titleProportion = titleMatches / Math.max(titleWordCount, 1);
  
  // Apply proportion bonuses - content must be substantially about the topic
  if (contentProportion > 0.4) { // At least 40% of content should be related
    score += 30;
  } else if (contentProportion > 0.25) { // At least 25% related
    score += 15;
  } else if (contentProportion > 0.15) { // At least 15% related
    score += 5;
  }
  
  // Title proportion bonus
  if (titleProportion > 0.5) { // More than half of title words match topics
    score += 20;
  }
  
  // Penalty for very brief mentions (content that's too short to be substantial)
  if (contentWordCount < 50 && score > 0) {
    score *= 0.5; // Reduce score for very short content
  }
  
  return Math.round(score);
}

/**
 * Find relevant sections based on user's learning request
 * Now much more selective - only returns sections primarily focused on the query
 */
function findRelevantSections(availableSections: AvailableSection[], query: string): { 
  sections: AvailableSection[], 
  topics: string[], 
  explanation: string 
} {
  const topics = extractLearningTopics(query);
  
  if (topics.length === 0) {
    return { sections: [], topics: [], explanation: 'No specific topics identified' };
  }
  
  // Calculate relevance scores for all sections
  const scoredSections = availableSections.map(section => ({
    section,
    score: calculateRelevanceScore(section, topics, query)
  }));
  
  // Much higher threshold - only sections that are substantially about the topic
  const relevantSections = scoredSections
    .filter(item => item.score >= 35) // Increased from 3 to 35 for much higher selectivity
    .sort((a, b) => b.score - a.score)
    .map(item => item.section);
  
  // Limit to top 3 most relevant sections to avoid overwhelming
  const finalSections = relevantSections.slice(0, 3);
  
  // Generate explanation
  const topTopics = topics.slice(0, 3);
  let explanation;
  
  if (finalSections.length === 0) {
    explanation = `No sections found that substantially focus on: ${topTopics.join(', ')}`;
  } else {
    explanation = `Found ${finalSections.length} section${finalSections.length !== 1 ? 's' : ''} that substantially focus on: ${topTopics.join(', ')}`;
  }
  
  return {
    sections: finalSections,
    topics: topTopics,
    explanation
  };
}

const SmartChatPanel: React.FC<SmartChatPanelProps> = ({
  availableSections,
  onAddToQueue,
  onAddSummary
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hi! I'm your smart assistant powered by ChatGPT. I can help you build your listening queue by intelligently analyzing your learning interests. Just tell me what you want to learn about, and I'll automatically find and add relevant sections to your queue!",
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (type: 'user' | 'assistant', content: string, actions?: ChatMessage['actions']) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      actions
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      // Call OpenAI API for intelligent response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          availableSections: availableSections.map(section => ({
            title: section.title,
            content: section.content.substring(0, 300),
            index: section.index
          })),
          context: 'User is browsing content and wants to build a listening queue'
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      let aiResponse = data.response;

      // Parse AI response to extract recommended sections
      const recommendedSections: number[] = [];
      const sectionPattern = /(?:section\s+)?(\d+)/gi;
      const matches = aiResponse.match(sectionPattern);
      
      if (matches) {
        for (const match of matches) {
          const sectionNum = parseInt(match.replace(/\D/g, ''));
          if (sectionNum > 0 && sectionNum <= availableSections.length) {
            const sectionIndex = availableSections[sectionNum - 1].index;
            if (!recommendedSections.includes(sectionIndex)) {
              recommendedSections.push(sectionIndex);
            }
          }
        }
      }

      // If AI recommended specific sections, auto-add them
      if (recommendedSections.length > 0) {
        onAddToQueue(recommendedSections);
        const sectionTitles = recommendedSections.map(idx => 
          availableSections.find(s => s.index === idx)?.title
        ).filter(Boolean);
        
        aiResponse += `\n\n✅ I've automatically added ${recommendedSections.length} section${recommendedSections.length > 1 ? 's' : ''} to your queue: ${sectionTitles.join(', ')}`;
      }

      // Check for summary request
      if (aiResponse.toLowerCase().includes('summary') || userMessage.toLowerCase().includes('summary')) {
        onAddSummary();
        aiResponse += '\n\n✅ Summary added to your queue!';
      }

      addMessage('assistant', aiResponse);

    } catch (error) {
      console.error('OpenAI API error, falling back to local analysis:', error);
      
      // Fallback to the original hardcoded logic
      const lowerInput = userMessage.toLowerCase();
      
      // Check if this is a learning request
      const isLearningRequest = 
        lowerInput.includes('learn about') || 
        lowerInput.includes('want to learn') ||
        lowerInput.includes('interested in') ||
        lowerInput.includes('study') ||
        lowerInput.includes('understand') ||
        lowerInput.includes('explore') ||
        lowerInput.includes('know about') ||
        lowerInput.includes('find out about');
      
      if (isLearningRequest) {
        // This is a learning request - automatically find and add relevant sections
        const { sections: relevantSections, topics } = findRelevantSections(availableSections, userMessage);
        
        if (relevantSections.length > 0) {
          const sectionIndices = relevantSections.map(s => s.index);
          
          // Automatically add sections to queue
          onAddToQueue(sectionIndices);
          
          // Send confirmation message
          const sectionTitles = relevantSections.map(s => `"${s.title}"`).join(', ');
          addMessage('assistant', 
            `Perfect! I found ${relevantSections.length} section${relevantSections.length !== 1 ? 's' : ''} that primarily focus on your learning goal and automatically added ${relevantSections.length === 1 ? 'it' : 'them'} to your queue:\n\n${sectionTitles}\n\n${relevantSections.length === 1 ? 'This section focuses' : 'These sections focus'} specifically on: ${topics.join(', ')}. You can now start listening to learn about ${topics.join(' and ')}!`
          );
        } else {
          addMessage('assistant', 
            `I understand you want to learn about "${topics.join(', ')}", but I couldn't find any sections where this is the primary focus. The available sections may only mention these topics briefly.\n\nYou can:\n• Try browsing sections manually to see what's available\n• Rephrase your request with different keywords\n• Ask for a "summary" to get an overview first\n• Use "recommend something" for general suggestions`
          );
        }
      } else if (lowerInput.includes('summary') || lowerInput.includes('overview') || lowerInput.includes('main points')) {
        addMessage('assistant', "I recommend starting with the summary to get an overview of the main points. This will give you a good foundation before diving into specific sections.", {
          type: 'add_summary'
        });
      } else if (lowerInput.includes('all') || lowerInput.includes('everything')) {
        const allIndices = availableSections.map(s => s.index);
        if (allIndices.length > 0) {
          addMessage('assistant', `I can add all ${availableSections.length} available sections to your queue. This will give you comprehensive coverage of the topic.`, {
            type: 'add_sections',
            sectionIndices: allIndices,
            explanation: 'Complete coverage of all sections'
          });
        } else {
          addMessage('assistant', "It looks like all sections might already be in your queue! Check the queue panel to see what's available.");
        }
      } else if (lowerInput.includes('recommend') || lowerInput.includes('suggest') || lowerInput.includes('what should')) {
        if (availableSections.length > 2) {
          const recommendedIndices = availableSections.slice(0, 2).map(s => s.index);
          
          // Automatically add sections to queue
          onAddToQueue(recommendedIndices);
          
          addMessage('assistant', `Perfect! I've automatically added these two key sections to your queue: "${availableSections[0].title}" and "${availableSections[1].title}". They provide good foundational knowledge and you can start listening right away!`);
        } else if (availableSections.length > 0) {
          // Automatically add the single section to queue
          onAddToQueue([availableSections[0].index]);
          
          addMessage('assistant', `Great! I've automatically added "${availableSections[0].title}" to your queue - it's one of the key sections available right now. You can start listening immediately!`);
        } else {
          addMessage('assistant', "It looks like most sections are already in your queue! Would you like me to suggest the summary?", {
            type: 'add_summary'
          });
        }
      } else {
        // Try to find relevant content anyway using topic extraction
        const { sections: relevantSections, topics } = findRelevantSections(availableSections, userMessage);
        
        if (relevantSections.length > 0 && topics.length > 0) {
          const sectionIndices = relevantSections.slice(0, 2).map(s => s.index); // Limit to top 2
          addMessage('assistant', 
            `I found ${relevantSections.length === 1 ? 'a section' : 'sections'} that focus on "${topics.join(', ')}": "${relevantSections[0].title}"${relevantSections.length > 1 ? ` and "${relevantSections[1].title}"` : ''}. Would you like me to add ${relevantSections.length === 1 ? 'it' : 'them'} to your queue?`, {
            type: 'add_sections',
            sectionIndices,
            explanation: `Focused on ${topics.join(', ')}`
          });
        } else {
          // Generic helpful response
          const responses = [
            "I can help you choose sections based on your interests. Try saying something like 'I want to learn about [topic]' or ask me to 'recommend something'.",
            "What topics interest you most? I can automatically find and add relevant sections to your queue.",
            "I'm here to help build your listening queue! You can ask me about specific themes, or say 'I want to learn about...' and I'll find matching content."
          ];
          addMessage('assistant', responses[Math.floor(Math.random() * responses.length)]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleActionClick = (message: ChatMessage) => {
    if (!message.actions) return;

    if (message.actions.type === 'add_sections' && message.actions.sectionIndices) {
      onAddToQueue(message.actions.sectionIndices);
    } else if (message.actions.type === 'add_summary') {
      onAddSummary();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Chat Messages - Scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 min-h-0 mb-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-white/20 text-white'
                  : 'bg-black/40 text-white border border-white/20'
              }`}
            >
              <div className="text-sm leading-relaxed mb-1 whitespace-pre-line">
                {message.content}
              </div>
              
              {/* Action Button */}
              {message.actions && (
                <div className="mt-2 pt-2 border-t border-white/20">
                  <button
                    onClick={() => handleActionClick(message)}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white transition-colors"
                  >
                    {message.actions.type === 'add_summary' ? 'Add Summary' : 
                     `Add ${message.actions.sectionIndices?.length === 1 ? 'Section' : 'Sections'}`}
                  </button>
                </div>
              )}
              
              <div className="text-xs text-white/50 mt-1">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-black/40 border border-white/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-white/70">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs">Analyzing...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="I want to learn about..."
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white text-sm placeholder-white/50 resize-none focus:outline-none focus:border-white/40 transition-colors"
              rows={2}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        
        {/* Quick suggestions */}
        <div className="mt-2 flex flex-wrap gap-2">
          {generateContentBasedSuggestions(availableSections).map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInputValue(suggestion)}
              className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white/70 text-xs rounded border border-white/10 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SmartChatPanel; 
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
  onAddToQueue: (sectionIndices: number[], explanation: string) => void;
  onAddSummary: () => void;
  isProcessing?: boolean;
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

      // Call our AI analysis API
      const response = await fetch('/api/analyze-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: userMessage.content,
          availableSections: availableSections.map(section => ({
            title: section.title,
            content: section.content.substring(0, 500), // Send first 500 chars for analysis
            index: section.index
          }))
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.matchedSections.length > 0) {
          // Show simple result and add to queue
          if (data.addedSectionTitles && data.addedSectionTitles.length > 0) {
            await addSystemMessage(`✅ Added ${data.matchedSections.length} section${data.matchedSections.length > 1 ? 's' : ''} to your queue${data.includeSummary ? ' + summary' : ''}!`, data.addedSectionTitles);
          }
          
          // Add matched sections to queue
          onAddToQueue(data.matchedSections, data.explanation);
        } else {
          await addSystemMessage("🔍 No matching sections found for your request.");
        }
        
        // Add summary if requested
        if (data.includeSummary) {
          onAddSummary();
        }

        // Show only a concise final response (limit to 150 chars)
        const shortResponse = data.response.length > 150 
          ? data.response.substring(0, 150) + "..." 
          : data.response;
        await addSystemMessage(shortResponse);
      } else {
        throw new Error(data.response || 'Failed to analyze message');
      }
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
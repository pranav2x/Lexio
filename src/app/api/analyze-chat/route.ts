import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface AnalyzeRequest {
  userMessage: string;
  availableSections: Array<{
    title: string;
    content: string;
    index: number;
  }>;
}

interface AnalyzeResponse {
  success: boolean;
  response: string;
  matchedSections: number[];
  addedSectionTitles: string[];
  includeSummary: boolean;
  explanation: string;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  try {
    const { userMessage, availableSections }: AnalyzeRequest = await request.json();

    if (!userMessage || !availableSections) {
      return NextResponse.json({
        success: false,
        response: "Invalid request",
        matchedSections: [],
        addedSectionTitles: [],
        includeSummary: false,
        explanation: ""
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured, falling back to local analysis');
      const analysis = analyzeMessageLocally(userMessage, availableSections);
      return NextResponse.json({
        success: true,
        response: analysis.response,
        matchedSections: analysis.matchedSections,
        addedSectionTitles: analysis.addedSectionTitles,
        includeSummary: analysis.includeSummary,
        explanation: analysis.explanation
      });
    }

    // Use OpenAI for intelligent analysis
    const analysis = await analyzeMessageWithAI(userMessage, availableSections);

    return NextResponse.json({
      success: true,
      response: analysis.response,
      matchedSections: analysis.matchedSections,
      addedSectionTitles: analysis.addedSectionTitles,
      includeSummary: analysis.includeSummary,
      explanation: analysis.explanation
    });

  } catch (error) {
    console.error('Chat analysis error:', error);
    
    // Fallback to local analysis if AI fails
    try {
      const { userMessage, availableSections }: AnalyzeRequest = await request.json();
      const analysis = analyzeMessageLocally(userMessage, availableSections);
      return NextResponse.json({
        success: true,
        response: analysis.response + " (Note: AI analysis temporarily unavailable)",
        matchedSections: analysis.matchedSections,
        addedSectionTitles: analysis.addedSectionTitles,
        includeSummary: analysis.includeSummary,
        explanation: analysis.explanation
      });
    } catch {
      return NextResponse.json({
        success: false,
        response: "Sorry, I couldn't process that request.",
        matchedSections: [],
        addedSectionTitles: [],
        includeSummary: false,
        explanation: ""
      });
    }
  }
}

async function analyzeMessageWithAI(userMessage: string, availableSections: Array<{title: string, content: string, index: number}>): Promise<{
  response: string;
  matchedSections: number[];
  addedSectionTitles: string[];
  includeSummary: boolean;
  explanation: string;
}> {
  // Prepare section summaries for AI analysis (truncate content for token efficiency)
  const sectionSummaries = availableSections.map((section) => ({
    index: section.index,
    title: section.title,
    summary: section.content.substring(0, 200) + (section.content.length > 200 ? '...' : ''),
    originalTitle: section.title
  }));

  const systemPrompt = `You are a smart learning assistant that helps students select the most relevant content based on their learning goals. 

You will receive:
1. A user's learning request/question
2. A list of available content sections with titles and summaries

Your task is to:
1. Analyze the user's intent and learning needs
2. Select the most relevant sections (1-4 sections max, unless they ask for everything)
3. Decide if a summary would be helpful
4. Provide a conversational response explaining what you've added

Return your response as a JSON object with this exact structure:
{
  "selectedSections": [array of section indices],
  "includeSummary": boolean,
  "response": "conversational explanation of what you added and why",
  "reasoning": "brief explanation of your selection logic"
}

Guidelines:
- Be selective - only add content that directly relates to their request
- If they ask for "everything" or "all content", add all sections
- If they want an overview or summary, include the summary
- If their request is vague, ask for clarification or suggest specific topics
- Be conversational and encouraging in your response
- Explain briefly why you selected specific content`;

  const userPrompt = `User's learning request: "${userMessage}"

Available content sections:
${sectionSummaries.map(s => `${s.index}. ${s.title}\n   Summary: ${s.summary}`).join('\n\n')}

Please analyze this request and select the most relevant content sections.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using the faster, cheaper model for this task
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    const parsed = JSON.parse(aiResponse);
    
    // Validate and extract the response
    const selectedSections = Array.isArray(parsed.selectedSections) ? parsed.selectedSections : [];
    const matchedSections = selectedSections.filter(index => 
      typeof index === 'number' && availableSections.some(s => s.index === index)
    );
    
    const addedSectionTitles = matchedSections.map(index => 
      availableSections.find(s => s.index === index)?.title || 'Unknown'
    );

    return {
      response: parsed.response || "I've added some relevant content to your learning queue.",
      matchedSections,
      addedSectionTitles,
      includeSummary: Boolean(parsed.includeSummary),
      explanation: parsed.reasoning || "AI-powered content selection"
    };

  } catch (error) {
    console.error('OpenAI API error:', error);
    // Fallback to local analysis
    return analyzeMessageLocally(userMessage, availableSections);
  }
}

// Keep the original local analysis as fallback
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

  // Define keyword mappings for better matching
  const keywordMappings = {
    // Trade and Economics
    trade: ['trade', 'trading', 'commerce', 'commercial', 'economic', 'economy', 'merchant', 'goods', 'exchange', 'market'],
    networks: ['network', 'networks', 'route', 'routes', 'connection', 'path', 'silk road'],
    
    // Mongol Empire
    mongol: ['mongol', 'mongols', 'genghis', 'khan', 'pax mongolica', 'yuan', 'empire'],
    
    // Islamic World
    islamic: ['islam', 'islamic', 'muslim', 'caliphate', 'dar al-islam', 'abbasid', 'ottoman', 'sultanate'],
    expansion: ['expansion', 'spread', 'growth', 'extend', 'influence'],
    
    // Technology and Innovation
    technology: ['technology', 'innovation', 'invention', 'technical', 'advancement', 'development'],
    gunpowder: ['gunpowder', 'compass', 'printing', 'paper', 'chinese invention'],
    
    // Environmental and Social
    environment: ['environment', 'climate', 'weather', 'black death', 'plague', 'disease', 'demographic'],
    social: ['social', 'society', 'culture', 'cultural', 'people', 'population'],
    
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

  // Score each section based on keyword matches
  const sectionScores = availableSections.map(section => {
    let score = 0;
    const sectionText = `${section.title} ${section.content}`.toLowerCase();
    
    // Check each keyword category
    Object.entries(keywordMappings).forEach(([category, keywords]) => {
      if (category === 'everything' || category === 'summary') return;
      
      const userHasKeyword = keywords.some(keyword => message.includes(keyword));
      const sectionHasKeyword = keywords.some(keyword => sectionText.includes(keyword));
      
      if (userHasKeyword && sectionHasKeyword) {
        score += 10; // High score for direct matches
      }
    });

    // Additional scoring for direct word matches
    const userWords = message.split(/\s+/).filter(word => word.length > 3);
    userWords.forEach(word => {
      if (sectionText.includes(word)) {
        score += 5;
      }
    });

    return { section, score };
  });

  // Sort by score and take top matches
  const sortedSections = sectionScores
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // Add top scoring sections (at least 1, max 4 unless score is very low)
  let addedCount = 0;
  for (const item of sortedSections) {
    if (addedCount < 4 && (item.score >= 5 || addedCount === 0)) {
      matchedSections.push(item.section.index);
      addedSectionTitles.push(item.section.title);
      addedCount++;
    }
  }

  // Generate response based on what was found
  let response = "";
  if (matchedSections.length === 0) {
    response = "I couldn't find any content that directly matches your request. Try being more specific or use keywords like 'trade', 'Mongol Empire', 'Islamic expansion', etc. You can also say 'everything' to add all content to your queue.";
  } else if (matchedSections.length === 1) {
    response = `Great! I found 1 section that matches your interest: "${addedSectionTitles[0]}". I've added it to your listening queue.`;
  } else {
    response = `Perfect! I found ${matchedSections.length} sections related to your request. I've added them to your listening queue so you can learn about: ${addedSectionTitles.join(", ")}.`;
  }

  if (includeSummary) {
    response += " I've also included the summary to give you a good overview.";
  }

  return {
    response,
    matchedSections,
    addedSectionTitles,
    includeSummary,
    explanation: `Matched based on keyword analysis and content relevance`
  };
} 
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface AvailableSection {
  title: string;
  content: string;
  index: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY environment variable is required' },
        { status: 500 }
      );
    }

    const { message, availableSections, context } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Build context for ChatGPT about available content
    const sectionsContext = availableSections && availableSections.length > 0 
      ? `\n\nAvailable content sections:\n${availableSections.map((section: AvailableSection, index: number) => 
          `${index + 1}. "${section.title}" - ${section.content.substring(0, 150)}...`
        ).join('\n')}`
      : '';

    const systemPrompt = `You are Lexio AI, a smart learning assistant that helps users discover and organize content for text-to-speech listening. Your role is to:

1. Analyze user requests to understand what they want to learn about
2. Recommend specific content sections that best match their interests
3. Provide helpful, encouraging responses that guide users toward relevant learning materials
4. Be concise but friendly - keep responses under 200 words

IMPORTANT: You should ANALYZE the available content sections and recommend the most relevant ones by their INDEX NUMBERS (1, 2, 3, etc.) based on the user's request.

When recommending content:
- Mention specific section titles that match the user's interests
- Explain briefly why those sections are relevant
- If asking about multiple topics, prioritize the most relevant sections
- If no sections match well, acknowledge this and suggest alternatives
- Use encouraging, educational language

Context about the user's current session: ${context || 'New conversation'}${sectionsContext}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using the more cost-effective model
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      return NextResponse.json(
        { error: 'No response generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      response: response.trim(),
      usage: completion.usage
    });

  } catch (error) {
    console.error('OpenAI Chat API error:', error);
    
    if (error instanceof Error) {
      // Handle specific OpenAI errors
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'OpenAI API key is invalid or missing' },
          { status: 401 }
        );
      }
      if (error.message.includes('quota') || error.message.includes('billing')) {
        return NextResponse.json(
          { error: 'OpenAI API quota exceeded or billing issue' },
          { status: 429 }
        );
      }
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'OpenAI API rate limit exceeded. Please try again in a moment.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate chat response' },
      { status: 500 }
    );
  }
}

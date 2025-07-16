import { NextRequest, NextResponse } from 'next/server';

interface TTSRequest {
  text: string;
  voice_id?: string;
}

interface LemonfoxResponse {
  audio_base64: string;
  word_timestamps: Array<{
    word: string;
    start_time: number;
    end_time: number;
  }>;
}

interface WordTiming {
  text: string; 
  start: number;
  end: number;
}

/**
 * POST endpoint for text-to-speech generation with real word timestamps from Lemonfox
 */
export async function POST(request: NextRequest) {
  try {
    // Validate API key on server-side
    const apiKey = process.env.LEMONFOX_API_KEY;
    if (!apiKey) {
      console.error('❌ LEMONFOX_API_KEY environment variable is missing');
      return NextResponse.json(
        { error: 'LEMONFOX_API_KEY environment variable is required. Please add your Lemonfox API key to .env.local' },
        { status: 500 }
      );
    }

    console.log('✅ Lemonfox API key found, calling Lemonfox API...');

    // Parse request body
    const body: TTSRequest = await request.json();
    const { 
      text, 
      voice_id = 'sarah' // Default to Sarah voice
    } = body;

    // Validate text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Valid text is required for speech generation' },
        { status: 400 }
      );
    }

    console.log('🎯 Generating TTS with word timestamps for text length:', text.length);

    // Call Lemonfox API
    const response = await fetch('https://api.lemonfox.ai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text.trim(),
        voice: voice_id,
        word_timestamps: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lemonfox API error:', errorText);
      return NextResponse.json(
        { error: `Lemonfox API error (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    // Parse the JSON response
    const data: LemonfoxResponse = await response.json();

    console.log('✅ Received Lemonfox response with word timestamps');
    console.log('🔍 Word timestamps details:', {
      wordCount: data.word_timestamps?.length || 0,
      hasAudio: !!data.audio_base64,
      firstWords: data.word_timestamps?.slice(0, 5)?.map(w => w.word) || []
    });

    // Transform Lemonfox word_timestamps into our expected wordTimings format
    const wordTimings: WordTiming[] = (data.word_timestamps || []).map(timestamp => ({
      text: timestamp.word,
      start: timestamp.start_time,
      end: timestamp.end_time
    }));

    console.log('✅ Transformed word timestamps:', {
      totalWords: wordTimings.length,
      firstWord: wordTimings[0],
      lastWord: wordTimings[wordTimings.length - 1],
      sampleWords: wordTimings.slice(0, 5).map(w => `"${w.text}" (${w.start.toFixed(2)}s-${w.end.toFixed(2)}s)`)
    });

    // Calculate audio duration from last word timing
    const duration = wordTimings.length > 0 
      ? Math.max(...wordTimings.map(w => w.end))
      : 0;

    // Return response with both audio and word timings
    const responseData = {
      audio: data.audio_base64,
      wordTimings: wordTimings,
      duration: duration
    };

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Error in Lemonfox TTS API route:', error);
    
    const errorMessage = error instanceof Error 
      ? `Failed to generate speech with timing: ${error.message}`
      : 'Failed to generate speech with timing: Unknown error occurred';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';

export interface TTSRequest {
  text: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

/**
 * Server-side API route for text-to-speech using ElevenLabs
 * Keeps API keys secure on the server
 */

/**
 * GET endpoint to fetch available voices
 */
export async function GET() {
  try {
    // Validate API key on server-side
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY environment variable is required' },
        { status: 500 }
      );
    }

    // Fetch voices from ElevenLabs
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `ElevenLabs API error (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching voices:', error);
    
    const errorMessage = error instanceof Error 
      ? `Failed to fetch voices: ${error.message}`
      : 'Failed to fetch voices: Unknown error occurred';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for text-to-speech generation
 */
export async function POST(request: NextRequest) {
  try {
    // Validate API key on server-side
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error('❌ ELEVENLABS_API_KEY environment variable is missing');
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY environment variable is required. Please add your ElevenLabs API key to .env.local' },
        { status: 500 }
      );
    }

    console.log('✅ ElevenLabs API key found, initializing client...');

    // Parse request body
    const body: TTSRequest = await request.json();
    const { 
      text, 
      voiceId = 'pNInz6obpgDQGcFmaJgB', // Adam voice - good for narration
      stability = 0.5,
      similarityBoost = 0.75,
      style = 0.0,
      useSpeakerBoost = true
    } = body;

    // Validate text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Valid text is required for speech generation' },
        { status: 400 }
      );
    }

    // Prepare request body for ElevenLabs
    const requestBody = {
      text: text.trim(),
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
        style,
        use_speaker_boost: useSpeakerBoost,
      },
      output_format: 'mp3_44100_128',
      apply_text_normalization: 'auto'
    };

    // Make API request to ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
      }
    );

    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `ElevenLabs API error (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    // Get audio data
    const audioBuffer = await response.arrayBuffer();

    // Return the audio data with appropriate headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('Error in TTS API route:', error);
    
    // Handle different types of errors
    const errorMessage = error instanceof Error 
      ? `Failed to generate speech: ${error.message}`
      : 'Failed to generate speech: Unknown error occurred';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 
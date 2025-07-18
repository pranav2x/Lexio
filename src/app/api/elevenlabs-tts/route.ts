import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID = '4tRn1lSkEn13EVTuqb0g'; // User specified voice ID
const FALLBACK_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'; // Known working voice ID (George)

export async function POST(request: NextRequest) {
  try {
    console.log('ElevenLabs TTS API called');
    
    if (!ELEVENLABS_API_KEY) {
      console.error('ElevenLabs API key not found in environment variables');
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    const { text, voiceId = DEFAULT_VOICE_ID } = await request.json();
    
    console.log('Request details:', {
      textLength: text?.length,
      voiceId,
      hasApiKey: !!ELEVENLABS_API_KEY
    });

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Call ElevenLabs API
    console.log('Making request to ElevenLabs API...');
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      }),
    });
    
    console.log('ElevenLabs API response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        voiceId,
        textLength: text.length
      });
      return NextResponse.json(
        { 
          error: `ElevenLabs API error: ${response.status} ${response.statusText}`,
          details: errorText
        },
        { status: response.status }
      );
    }

    // Get the audio data as array buffer
    const audioBuffer = await response.arrayBuffer();
    
    // Convert to base64 for JSON response
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    return NextResponse.json({
      audio: base64Audio,
      contentType: 'audio/mpeg'
    });

  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
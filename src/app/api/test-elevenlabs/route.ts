import { NextResponse } from 'next/server';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID = '4tRn1lSkEn13EVTuqb0g';
const FALLBACK_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'; // Known working voice ID

export async function GET() {
  try {
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json({
        status: 'error',
        message: 'ELEVENLABS_API_KEY environment variable is required',
        hasApiKey: false
      });
    }

    // Test with a very short text to minimize API usage
    const testText = 'Hello world';
    
    // Try user's voice ID first
    console.log('Testing ElevenLabs API with user voice ID:', DEFAULT_VOICE_ID);
    
    let response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: testText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8
        }
      }),
    });

    if (response.ok) {
      return NextResponse.json({
        status: 'success',
        message: 'ElevenLabs API is working correctly with your voice ID',
        hasApiKey: true,
        voiceId: DEFAULT_VOICE_ID,
        responseStatus: response.status
      });
    }

    // If user's voice ID failed, try fallback
    const userVoiceError = await response.text();
    console.log('User voice ID failed, trying fallback voice ID:', FALLBACK_VOICE_ID);
    
    response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${FALLBACK_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: testText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8
        }
      }),
    });

    if (response.ok) {
      return NextResponse.json({
        status: 'partial_success',
        message: 'ElevenLabs API works but your voice ID is invalid. Using fallback voice.',
        hasApiKey: true,
        userVoiceId: DEFAULT_VOICE_ID,
        workingVoiceId: FALLBACK_VOICE_ID,
        userVoiceError: userVoiceError,
        responseStatus: response.status
      });
    }

    // Both failed
    const fallbackError = await response.text();
    return NextResponse.json({
      status: 'error',
      message: 'ElevenLabs API failed with both voice IDs',
      hasApiKey: true,
      userVoiceId: DEFAULT_VOICE_ID,
      fallbackVoiceId: FALLBACK_VOICE_ID,
      userVoiceError: userVoiceError,
      fallbackVoiceError: fallbackError,
      responseStatus: response.status
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      hasApiKey: !!ELEVENLABS_API_KEY
    });
  }
} 
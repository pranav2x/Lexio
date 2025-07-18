import { NextResponse } from 'next/server';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export async function GET() {
  console.log('Testing ElevenLabs API configuration...');
  
  // Check API key
  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({
      success: false,
      error: 'ElevenLabs API key not found',
      details: 'Please add ELEVENLABS_API_KEY to your .env.local file',
      steps: [
        '1. Get your API key from https://elevenlabs.io/app/speech-synthesis/text-to-speech',
        '2. Create .env.local file in project root',
        '3. Add: ELEVENLABS_API_KEY=your_key_here',
        '4. Restart your dev server'
      ]
    });
  }

  if (ELEVENLABS_API_KEY.length < 10) {
    return NextResponse.json({
      success: false,
      error: 'API key appears invalid (too short)',
      keyLength: ELEVENLABS_API_KEY.length,
      details: 'ElevenLabs API keys are typically much longer'
    });
  }

  // Test API connection
  try {
    console.log('Testing API connection...');
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.text();
        errorMessage = errorData;
      } catch (e) {
        // Use default message
      }

      return NextResponse.json({
        success: false,
        error: 'API key test failed',
        status: response.status,
        details: errorMessage,
        apiKeyPreview: `${ELEVENLABS_API_KEY.substring(0, 8)}...`
      });
    }

    const data = await response.json();
    const voiceCount = data.voices?.length || 0;

    return NextResponse.json({
      success: true,
      message: 'ElevenLabs API is working correctly!',
      voiceCount,
      apiKeyPreview: `${ELEVENLABS_API_KEY.substring(0, 8)}...`,
      testVoiceId: '4tRn1lSkEn13EVTuqb0g'
    });

  } catch (error) {
    console.error('Network error testing API:', error);
    return NextResponse.json({
      success: false,
      error: 'Network error',
      details: 'Unable to connect to ElevenLabs API. Check your internet connection.',
      networkError: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
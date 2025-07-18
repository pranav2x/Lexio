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
        { 
          error: 'ElevenLabs API key not configured. Please add ELEVENLABS_API_KEY to your .env.local file.',
          details: 'Missing API key in server environment'
        },
        { status: 500 }
      );
    }

    if (ELEVENLABS_API_KEY.length < 10) {
      console.error('ElevenLabs API key appears to be invalid (too short)');
      return NextResponse.json(
        { 
          error: 'ElevenLabs API key appears to be invalid',
          details: 'API key is too short or malformed'
        },
        { status: 500 }
      );
    }

    const { text, voiceId = DEFAULT_VOICE_ID, stream = false, useChunking = false, speed = 1.0 } = await request.json();
    
    console.log('Request details:', {
      textLength: text?.length,
      voiceId,
      stream,
      useChunking,
      speed,
      hasApiKey: !!ELEVENLABS_API_KEY,
      apiKeyLength: ELEVENLABS_API_KEY?.length || 0
    });

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (text.length > 50000) {
      return NextResponse.json(
        { error: 'Text is too long (max 50,000 characters)' },
        { status: 400 }
      );
    }

    // Validate speed parameter
    if (speed < 0.25 || speed > 4.0) {
      return NextResponse.json(
        { 
          error: 'Invalid speed parameter',
          details: 'Speed must be between 0.25 and 4.0'
        },
        { status: 400 }
      );
    }

    // Validate voice ID format
    if (!voiceId || voiceId.length < 10) {
      return NextResponse.json(
        { 
          error: 'Invalid voice ID',
          details: 'Voice ID must be a valid ElevenLabs voice identifier'
        },
        { status: 400 }
      );
    }

    // If streaming is requested, use streaming endpoint
    if (stream) {
      return handleStreamingRequest(text, voiceId, speed);
    }

    // For very long texts, use chunking
    if (useChunking && text.length > 2000) {
      return handleChunkedRequest(text, voiceId, speed);
    }

    // Call ElevenLabs API
    console.log('Making request to ElevenLabs API...');
    let response;
    try {
      response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
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
            use_speaker_boost: true,
            speed: speed
          }
        })
      });
    } catch (fetchError) {
      console.error('Network error calling ElevenLabs API:', fetchError);
      return NextResponse.json(
        { 
          error: 'Network error: Unable to connect to ElevenLabs API',
          details: 'Please check your internet connection and try again'
        },
        { status: 503 }
      );
    }
    
    console.log('ElevenLabs API response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      let errorDetails = '';
      let errorMessage = `ElevenLabs API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorText = await response.text();
        errorDetails = errorText;
        
        // Try to parse as JSON for more detailed error info
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            errorMessage = errorJson.detail;
            errorDetails = JSON.stringify(errorJson);
          }
        } catch (parseError) {
          // If not JSON, use the raw text
          if (errorText) {
            errorMessage = errorText.length > 200 ? errorText.substring(0, 200) + '...' : errorText;
          }
        }
      } catch (readError) {
        console.error('Failed to read error response:', readError);
        errorDetails = 'Unable to read error response';
      }

      console.error('ElevenLabs API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorDetails,
        voiceId,
        speed,
        textLength: text.length,
        url: response.url
      });

      // Provide helpful error messages based on status code
      let helpfulMessage = errorMessage;
      if (response.status === 400) {
        helpfulMessage = 'Invalid request parameters. Please check your voice ID and speed settings.';
      } else if (response.status === 401) {
        helpfulMessage = 'Invalid API key. Please check your ElevenLabs API key in .env.local';
      } else if (response.status === 429) {
        helpfulMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (response.status === 500) {
        helpfulMessage = 'ElevenLabs server error. Please try again later.';
      }

      return NextResponse.json(
        { 
          error: helpfulMessage,
          details: errorDetails,
          status: response.status
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

async function handleStreamingRequest(text: string, voiceId: string, speed: number = 1.0) {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
          speed: speed
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs streaming API error:', errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Create a readable stream that forwards the ElevenLabs stream
    const stream = new ReadableStream({
      start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.error(new Error('No response body'));
          return;
        }

        function pump(): Promise<void> {
          return reader!.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }
            controller.enqueue(value);
            return pump();
          });
        }

        return pump();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('Streaming error:', error);
    return NextResponse.json(
      { error: 'Streaming failed' },
      { status: 500 }
    );
  }
}

function chunkText(text: string, maxChunkSize: number = 1500): string[] {
  const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    // If adding this sentence would exceed the limit, save current chunk and start new one
    if (currentChunk.length + trimmedSentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim() + '.');
      currentChunk = trimmedSentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    }
  }

  // Add the last chunk if it exists
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim() + '.');
  }

  return chunks;
}

async function handleChunkedRequest(text: string, voiceId: string, speed: number = 1.0) {
  try {
    const chunks = chunkText(text);
    console.log(`Processing ${chunks.length} chunks for text of length ${text.length}`);
    
    // Generate audio for all chunks in parallel
    const audioPromises = chunks.map(async (chunk, index) => {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify({
          text: chunk,
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
            speed: speed
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Chunk ${index} failed: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      return {
        index,
        audio: Buffer.from(audioBuffer).toString('base64'),
        text: chunk
      };
    });

    const audioChunks = await Promise.all(audioPromises);
    
    return NextResponse.json({
      chunks: audioChunks,
      contentType: 'audio/mpeg',
      totalChunks: chunks.length
    });

  } catch (error) {
    console.error('Chunking error:', error);
    return NextResponse.json(
      { error: 'Chunked processing failed' },
      { status: 500 }
    );
  }
} 
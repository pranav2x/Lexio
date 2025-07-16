import { NextRequest, NextResponse } from 'next/server';

interface TTSRequest {
  text: string;
  voice_id?: string;
}

interface CharacterAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

interface ElevenLabsTimestampResponse {
  audio_base64: string;
  alignment: CharacterAlignment;
}

interface WordTiming {
  text: string;
  start: number;
  end: number;
}

/**
 * POST endpoint for text-to-speech generation with real character-level timestamps from ElevenLabs
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

    console.log('✅ ElevenLabs API key found, calling /with-timestamps endpoint...');

    // Parse request body
    const body: TTSRequest = await request.json();
    const { 
      text, 
      voice_id = 'pNInz6obpgDQGcFmaJgB' // Adam voice - good for narration
    } = body;

    // Validate text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Valid text is required for speech generation' },
        { status: 400 }
      );
    }

    console.log('🎯 Generating TTS with character-level timestamps for text length:', text.length);

    // Call ElevenLabs /with-timestamps endpoint
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}/with-timestamps`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: 'eleven_multilingual_v2',
          output_format: 'mp3_44100_128'
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      return NextResponse.json(
        { error: `ElevenLabs API error (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    // Parse the JSON response
    const data: ElevenLabsTimestampResponse = await response.json();

    console.log('✅ Received ElevenLabs response with character alignment');
    console.log('🔍 Character alignment details:', {
      charactersCount: data.alignment?.characters?.length || 0,
      startTimesCount: data.alignment?.character_start_times_seconds?.length || 0,
      endTimesCount: data.alignment?.character_end_times_seconds?.length || 0,
      hasAlignment: !!data.alignment,
      firstChars: data.alignment?.characters?.slice(0, 10)?.join('') || 'none',
      firstStartTimes: data.alignment?.character_start_times_seconds?.slice(0, 5) || []
    });

    // Parse character-level alignment into word-level timings
    const wordTimings = parseCharacterAlignmentToWords(data.alignment);

    console.log('✅ Parsed character alignment into word timings:', wordTimings.length, 'words');
    console.log('🔍 Word timing details:', {
      totalWords: wordTimings.length,
      firstWord: wordTimings[0],
      lastWord: wordTimings[wordTimings.length - 1],
      sampleWords: wordTimings.slice(0, 5).map(w => `"${w.text}" (${w.start.toFixed(2)}s-${w.end.toFixed(2)}s)`)
    });

    // Calculate audio duration from last character timing
    const alignment = data.alignment;
    const duration = alignment.character_end_times_seconds.length > 0 
      ? Math.max(...alignment.character_end_times_seconds)
      : 0;

    // Return response with both audio and real word timings
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
    console.error('Error in TTS with timing API route:', error);
    
    const errorMessage = error instanceof Error 
      ? `Failed to generate speech with timing: ${error.message}`
      : 'Failed to generate speech with timing: Unknown error occurred';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Parse ElevenLabs character-level alignment into word-level timings
 */
function parseCharacterAlignmentToWords(alignment: CharacterAlignment): WordTiming[] {
  const { characters, character_start_times_seconds, character_end_times_seconds } = alignment;
  
  console.log('🔍 parseCharacterAlignmentToWords called with:', {
    charactersLength: characters?.length || 0,
    startTimesLength: character_start_times_seconds?.length || 0,
    endTimesLength: character_end_times_seconds?.length || 0
  });
  
  if (!characters || characters.length === 0) {
    console.warn('⚠️ No character alignment data received');
    return [];
  }

  if (!character_start_times_seconds || !character_end_times_seconds) {
    console.warn('⚠️ Missing timing arrays in character alignment');
    return [];
  }

  if (characters.length !== character_start_times_seconds.length || characters.length !== character_end_times_seconds.length) {
    console.warn('⚠️ Character and timing arrays have mismatched lengths:', {
      characters: characters.length,
      startTimes: character_start_times_seconds.length,
      endTimes: character_end_times_seconds.length
    });
  }

  const words: WordTiming[] = [];
  let currentWord = '';
  let wordStartTime: number | null = null;
  let wordEndTime: number | null = null;

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    const startTime = character_start_times_seconds[i];
    const endTime = character_end_times_seconds[i];

    // Skip if timing data is missing
    if (typeof startTime !== 'number' || typeof endTime !== 'number') {
      console.warn(`⚠️ Missing timing data at index ${i}:`, { char, startTime, endTime });
      continue;
    }

    // Check if this character is whitespace or punctuation that ends a word
    const isWordBreak = /\s/.test(char);
    const isPunctuation = /[.!?;:,]/.test(char);
    
    if (isWordBreak) {
      // End current word if we have one
      if (currentWord.trim().length > 0 && wordStartTime !== null && wordEndTime !== null) {
        const newWord = {
          text: currentWord.trim(),
          start: wordStartTime,
          end: wordEndTime
        };
        words.push(newWord);
        
        if (words.length <= 5) {
          console.log(`📝 Added word ${words.length}:`, newWord);
        }
      }
      
      // Reset for next word
      currentWord = '';
      wordStartTime = null;
      wordEndTime = null;
    } else {
      // Add character to current word
      currentWord += char;
      
      // Set word start time on first character
      if (wordStartTime === null) {
        wordStartTime = startTime;
      }
      
      // Always update word end time (including punctuation)
      wordEndTime = endTime;
      
      // If this is punctuation at the end of a word, close the word
      if (isPunctuation && currentWord.trim().length > 0) {
        const newWord = {
          text: currentWord.trim(),
          start: wordStartTime!,
          end: wordEndTime
        };
        words.push(newWord);
        
        if (words.length <= 5) {
          console.log(`📝 Added word ${words.length} (with punctuation):`, newWord);
        }
        
        // Reset for next word
        currentWord = '';
        wordStartTime = null;
        wordEndTime = null;
      }
    }
  }

  // Handle final word if text doesn't end with whitespace
  if (currentWord.trim().length > 0 && wordStartTime !== null && wordEndTime !== null) {
    const finalWord = {
      text: currentWord.trim(),
      start: wordStartTime,
      end: wordEndTime
    };
    words.push(finalWord);
    console.log(`📝 Added final word:`, finalWord);
  }

  console.log('📊 Character-to-word parsing stats:', {
    totalCharacters: characters.length,
    totalWords: words.length,
    firstWord: words[0]?.text,
    lastWord: words[words.length - 1]?.text
  });

  if (words.length === 0) {
    console.error('❌ No words were parsed from character alignment!');
  } else {
    console.log('✅ Successfully parsed words from character alignment');
  }

  return words;
} 
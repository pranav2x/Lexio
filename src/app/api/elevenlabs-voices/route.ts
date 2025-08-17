import { NextResponse } from 'next/server';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Add interface at the top after imports
interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  preview_url?: string;
}

// Popular default voices with their characteristics
const POPULAR_VOICES = [
  {
    voice_id: '4tRn1lSkEn13EVTuqb0g',
    name: 'Serafina (MOMMY!)',
    gender: 'female',
    accent: 'american',
    description: 'Absolute MOMMY!'
  },
  {
    voice_id: 'kdmDKE6EkgrWrrykO9Qt',
    name: 'Alexandra',
    gender: 'female',
    accent: 'american',
    description: 'Super realistic, young female voice that likes to chat'
  },
  {
    voice_id: 'L0Dsvb3SLTyegXwtm47J',
    name: 'Archer',
    gender: 'male',
    accent: 'british',
    description: 'Grounded and friendly young British male with charm'
  },
  {
    voice_id: 'g6xIsTj2HwM6VR4iXFCw',
    name: 'Jessica Anne Bogart',
    gender: 'female',
    accent: 'american',
    description: 'Empathetic and expressive, great for wellness coaches'
  },
  {
    voice_id: 'OYTbf65OHHFELVut7v2H',
    name: 'Hope',
    gender: 'female',
    accent: 'american',
    description: 'Bright and uplifting, perfect for positive interactions'
  },
  {
    voice_id: 'dj3G1R1ilKoFKhBnWOzG',
    name: 'Eryn',
    gender: 'female',
    accent: 'american',
    description: 'Friendly and relatable, ideal for casual interactions'
  },
  {
    voice_id: 'HDA9tsk27wYi3uq0fPcK',
    name: 'Stuart',
    gender: 'male',
    accent: 'australian',
    description: 'Professional & friendly Aussie, ideal for technical assistance'
  },
  {
    voice_id: '1SM7GgM6IMuvQlz2BwM3',
    name: 'Mark',
    gender: 'male',
    accent: 'american',
    description: 'Relaxed and laid back, suitable for nonchalant chats'
  },
  {
    voice_id: 'PT4nqlKZfc06VW1BuClj',
    name: 'Angela',
    gender: 'female',
    accent: 'american',
    description: 'Raw and relatable, great listener and down to earth'
  },
  {
    voice_id: 'vBKc2FfBKJfcZNyEt1n6',
    name: 'Finn',
    gender: 'male',
    accent: 'american',
    description: 'Tenor pitched, excellent for podcasts and light chats'
  },
  {
    voice_id: '56AoDkrOh6qfVPDXZ7Pt',
    name: 'Cassidy',
    gender: 'female',
    accent: 'american',
    description: 'Engaging and energetic, good for entertainment contexts'
  }
];

export async function GET() {
  try {
    if (!ELEVENLABS_API_KEY) {
      console.error('ElevenLabs API key not found');
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY environment variable is required' },
        { status: 500 }
      );
    }

    // Try to fetch voices from ElevenLabs API
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter for public/premade voices and add popular ones
        const publicVoices = data.voices?.filter((voice: ElevenLabsVoice) => 
          voice.category === 'premade' || POPULAR_VOICES.some(pv => pv.voice_id === voice.voice_id)
        ) || [];

        // Merge with our popular voices list, prioritizing API data
        const mergedVoices = POPULAR_VOICES.map(popularVoice => {
          const apiVoice = publicVoices.find((v: ElevenLabsVoice) => v.voice_id === popularVoice.voice_id);
          return apiVoice ? {
            voice_id: apiVoice.voice_id,
            name: apiVoice.name,
            gender: popularVoice.gender,
            accent: popularVoice.accent,
            description: popularVoice.description,
            preview_url: apiVoice.preview_url
          } : popularVoice;
        });

        return NextResponse.json({ voices: mergedVoices });
      }
    } catch (apiError) {
      console.warn('Failed to fetch from ElevenLabs API, using fallback:', apiError);
    }

    // Fallback to popular voices if API fails
    return NextResponse.json({ voices: POPULAR_VOICES });

  } catch (error) {
    console.error('Error fetching voices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voices' },
      { status: 500 }
    );
  }
} 
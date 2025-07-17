import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ScrapeResult } from './firecrawl';

interface LexioState {
  // Current scraped data
  scrapedData: ScrapeResult | null;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Current URL being processed
  currentUrl: string | null;
  
  // Voice selection
  selectedVoiceId: string;
  
  // Actions
  setScrapedData: (data: ScrapeResult | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentUrl: (url: string | null) => void;
  setSelectedVoiceId: (voiceId: string) => void;
  clearAll: () => void;
}

export const useLexioStore = create<LexioState>()(
  persist(
    (set) => ({
      // Initial state
      scrapedData: null,
      isLoading: false,
      error: null,
      currentUrl: null,
      selectedVoiceId: 'sarah', // Default to Nicole
      
      // Actions
      setScrapedData: (data) => set({ scrapedData: data }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setCurrentUrl: (url) => set({ currentUrl: url }),
      setSelectedVoiceId: (voiceId) => set({ selectedVoiceId: voiceId }),
      clearAll: () => set({ 
        scrapedData: null, 
        isLoading: false, 
        error: null, 
        currentUrl: null 
        // Keep selectedVoiceId when clearing other data
      }),
    }),
    {
      name: 'lexio-settings',
      // Only persist the voice selection, not temporary data
      partialize: (state) => ({ selectedVoiceId: state.selectedVoiceId }),
    }
  )
);

// Helper hook for easy access to store actions
export const useLexioActions = () => {
  const { setScrapedData, setLoading, setError, setCurrentUrl, setSelectedVoiceId, clearAll } = useLexioStore();
  return { setScrapedData, setLoading, setError, setCurrentUrl, setSelectedVoiceId, clearAll };
};

// Helper hook for easy access to store state
export const useLexioState = () => {
  const { scrapedData, isLoading, error, currentUrl, selectedVoiceId } = useLexioStore();
  return { scrapedData, isLoading, error, currentUrl, selectedVoiceId };
}; 
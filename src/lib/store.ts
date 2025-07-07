import { create } from 'zustand';
import { ScrapeResult } from './firecrawl';

interface NarrateState {
  // Current scraped data
  scrapedData: ScrapeResult | null;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Current URL being processed
  currentUrl: string | null;
  
  // Actions
  setScrapedData: (data: ScrapeResult | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentUrl: (url: string | null) => void;
  clearAll: () => void;
}

export const useNarrateStore = create<NarrateState>((set) => ({
  // Initial state
  scrapedData: null,
  isLoading: false,
  error: null,
  currentUrl: null,
  
  // Actions
  setScrapedData: (data) => set({ scrapedData: data }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setCurrentUrl: (url) => set({ currentUrl: url }),
  clearAll: () => set({ 
    scrapedData: null, 
    isLoading: false, 
    error: null, 
    currentUrl: null 
  }),
}));

// Helper hook for easy access to store actions
export const useNarrateActions = () => {
  const { setScrapedData, setLoading, setError, setCurrentUrl, clearAll } = useNarrateStore();
  return { setScrapedData, setLoading, setError, setCurrentUrl, clearAll };
};

// Helper hook for easy access to store state
export const useNarrateState = () => {
  const { scrapedData, isLoading, error, currentUrl } = useNarrateStore();
  return { scrapedData, isLoading, error, currentUrl };
}; 
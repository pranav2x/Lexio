import { create } from 'zustand';
import { ScrapeResult } from './firecrawl';

interface LexioState {
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

export const useLexioStore = create<LexioState>((set) => ({
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
export const useLexioActions = () => {
  const { setScrapedData, setLoading, setError, setCurrentUrl, clearAll } = useLexioStore();
  return { setScrapedData, setLoading, setError, setCurrentUrl, clearAll };
};

// Helper hook for easy access to store state
export const useLexioState = () => {
  const { scrapedData, isLoading, error, currentUrl } = useLexioStore();
  return { scrapedData, isLoading, error, currentUrl };
}; 
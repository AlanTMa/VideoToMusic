// hooks/useHistory.ts

import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { HistoryItem, UseHistoryResult } from '../types';

const HISTORY_STORAGE_KEY = 'musicpairer_history';
const MAX_HISTORY_ITEMS = 50; // Limit to prevent localStorage from getting too large

export const useHistory = (): UseHistoryResult => {
  const [historyItems, setHistoryItems] = useLocalStorage<HistoryItem[]>(HISTORY_STORAGE_KEY, []);

  const addToHistory = useCallback((item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: generateId(),
      timestamp: new Date(),
    };

    setHistoryItems(prev => {
      // Add to beginning of array (most recent first)
      const updated = [newItem, ...prev];

      // Limit to MAX_HISTORY_ITEMS
      return updated.slice(0, MAX_HISTORY_ITEMS);
    });
  }, [setHistoryItems]);

  const removeFromHistory = useCallback((id: string) => {
    setHistoryItems(prev => prev.filter(item => item.id !== id));
  }, [setHistoryItems]);

  const clearHistory = useCallback(() => {
    setHistoryItems([]);
  }, [setHistoryItems]);

  const getHistoryItem = useCallback((id: string): HistoryItem | undefined => {
    return historyItems.find(item => item.id === id);
  }, [historyItems]);

  return {
    historyItems,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getHistoryItem,
  };
};

// Helper function to generate unique IDs
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
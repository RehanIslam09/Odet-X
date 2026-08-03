import { useState, useEffect, useCallback } from "react";

export interface RecentlyViewedItem {
  id: string;
  title: string;
  type: "project" | "task" | "page";
  url: string;
  timestamp: number;
  iconKey?: string;
}

const STORAGE_KEY = "ai_pm_recently_viewed_v1";
const MAX_ITEMS = 20;

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage unavailable fallback
    }
  }, [items]);

  const addRecentlyViewed = useCallback((item: Omit<RecentlyViewedItem, "timestamp">) => {
    setItems((prev) => {
      const filtered = prev.filter((i) => i.id !== item.id && i.url !== item.url);
      const newItem: RecentlyViewedItem = {
        ...item,
        timestamp: Date.now(),
      };
      return [newItem, ...filtered].slice(0, MAX_ITEMS);
    });
  }, []);

  const removeRecentlyViewed = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    setItems([]);
  }, []);

  return {
    recentlyViewedList: items,
    addRecentlyViewed,
    removeRecentlyViewed,
    clearRecentlyViewed,
  };
}

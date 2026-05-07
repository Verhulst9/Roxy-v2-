/**
 * Sidebar Context
 * State management for galgame layout sidebars
 * Supports both open/close and collapsed/expanded states
 * Persists state to localStorage
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export type SidebarState = 'expanded' | 'collapsed';

// localStorage keys
const SIDEBAR_STATE_KEY = 'nakari_sidebar_state';

interface StoredSidebarState {
  leftOpen: boolean;
  leftCollapsed: boolean;
  rightOpen: boolean;
}

interface SidebarContextValue {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  leftSidebarCollapsed: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  toggleLeftSidebarCollapse: () => void;
  closeBothSidebars: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

interface SidebarProviderProps {
  children: ReactNode;
  defaultLeftOpen?: boolean;
  defaultRightOpen?: boolean;
  defaultLeftCollapsed?: boolean;
}

// Load state from localStorage
function loadStoredState(): StoredSidebarState | null {
  try {
    const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof parsed.leftOpen === 'boolean' &&
        typeof parsed.leftCollapsed === 'boolean' &&
        typeof parsed.rightOpen === 'boolean'
      ) {
        return parsed;
      }
      localStorage.removeItem(SIDEBAR_STATE_KEY);
    }
  } catch {
    localStorage.removeItem(SIDEBAR_STATE_KEY);
  }
  return null;
}

// Save state to localStorage
function saveStoredState(state: StoredSidebarState) {
  try {
    localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore errors
  }
}

export function SidebarProvider({
  children,
  defaultLeftOpen = false,
  defaultRightOpen = false,
  defaultLeftCollapsed = false,
}: SidebarProviderProps) {
  // Initialize from localStorage or use defaults
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(() => {
    const stored = loadStoredState();
    return stored?.leftOpen ?? defaultLeftOpen;
  });
  const [rightSidebarOpen, setRightSidebarOpen] = useState(() => {
    const stored = loadStoredState();
    return stored?.rightOpen ?? defaultRightOpen;
  });
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(() => {
    const stored = loadStoredState();
    return stored?.leftCollapsed ?? defaultLeftCollapsed;
  });

  // Save to localStorage when state changes
  useEffect(() => {
    const state: StoredSidebarState = {
      leftOpen: leftSidebarOpen,
      leftCollapsed: leftSidebarCollapsed,
      rightOpen: rightSidebarOpen,
    };
    saveStoredState(state);
  }, [leftSidebarOpen, leftSidebarCollapsed, rightSidebarOpen]);

  const toggleLeftSidebar = useCallback(() => {
    setLeftSidebarOpen(prev => !prev);
  }, []);

  const toggleRightSidebar = useCallback(() => {
    setRightSidebarOpen(prev => !prev);
  }, []);

  const toggleLeftSidebarCollapse = useCallback(() => {
    setLeftSidebarCollapsed(prev => !prev);
  }, []);

  const closeBothSidebars = useCallback(() => {
    setLeftSidebarOpen(false);
    setRightSidebarOpen(false);
  }, []);

  const value: SidebarContextValue = {
    leftSidebarOpen,
    rightSidebarOpen,
    leftSidebarCollapsed,
    toggleLeftSidebar,
    toggleRightSidebar,
    toggleLeftSidebarCollapse,
    closeBothSidebars,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebarContext(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarContext must be used within SidebarProvider');
  }
  return context;
}

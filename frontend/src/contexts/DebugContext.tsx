/**
 * DebugContext - Provides debug mode state to the entire app
 */

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { setDebugMode } from '../utils/debug';

interface DebugContextType {
  isDebugMode: boolean;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

interface DebugProviderProps {
  children: ReactNode;
  isDebugMode: boolean;
}

export function DebugProvider({ children, isDebugMode }: DebugProviderProps) {
  // Update global debug state when debug mode changes
  useEffect(() => {
    setDebugMode(isDebugMode);
  }, [isDebugMode]);

  const value: DebugContextType = {
    isDebugMode,
  };

  return <DebugContext.Provider value={value}>{children}</DebugContext.Provider>;
}

/**
 * Hook to access debug mode state
 */
export function useDebug() {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebug must be used within DebugProvider');
  }
  return context;
}

/**
 * P5RTransition - Main transition component that manages different transition effects
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TransitionType } from '../../utils/styles/theme';
import { SlashEffect } from './SlashEffect';

interface P5RTransitionProps {
  type: TransitionType | null;
  duration?: number;
  onComplete?: () => void;
  className?: string;
}

export function P5RTransition({
  type,
  duration = 300,
  onComplete,
  className = '',
}: P5RTransitionProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (type) {
      setActive(true);
      const timer = setTimeout(() => {
        setActive(false);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [type, duration, onComplete]);

  if (!type || !active) {
    return null;
  }

  const transitionClass = `p5r-transition-overlay ${className}`;

  // Render appropriate transition effect
  switch (type) {
    case 'slash_down':
    case 'slash_up':
      return (
        <div className={transitionClass}>
          <SlashEffect type={type} duration={duration} />
        </div>
      );

    case 'fade':
      return (
        <div className={`${transitionClass} p5r-fade-overlay p5r-fade-out`} />
      );

    case 'glitch':
      return (
        <div className={transitionClass}>
          <div className="p5r-glitch-overlay p5r-glitch-active" />
        </div>
      );

    default:
      return null;
  }
}

/**
 * Hook to trigger transitions
 */
export function useTransition() {
  const [transition, setTransition] = useState<TransitionType | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const trigger = useCallback((type: TransitionType, duration = 300) => {
    setTransition(type);
    timeoutRef.current = setTimeout(() => {
      setTransition(null);
      timeoutRef.current = null;
    }, duration);
  }, []);

  return { transition, trigger };
}

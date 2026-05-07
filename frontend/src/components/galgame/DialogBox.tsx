/**
 * DialogBox - Visual novel style dialogue display
 */

import { useEffect, useRef } from 'react';

interface DialogBoxProps {
  text: string;
  className?: string;
  speed?: number;
  onComplete?: () => void;
}

export function DialogBox({
  text,
  className = '',
  onComplete,
}: DialogBoxProps) {
  const prevTextRef = useRef<string>('');

  // Clean and validate text - handle all undefined/null cases
  let cleanText = '';
  if (text === undefined || text === null) {
    cleanText = '';
  } else if (typeof text !== 'string') {
    cleanText = String(text);
  } else if (text === 'undefined' || text === 'null' || text.trim() === 'undefined' || text.trim() === 'null') {
    cleanText = '';
  } else {
    cleanText = text;
  }

  // Notify when clean text changes
  useEffect(() => {
    if (cleanText !== prevTextRef.current) {
      prevTextRef.current = cleanText;
      onComplete?.();
    }
  }, [cleanText, onComplete]);

  return (
    <div className={`galgame-dialog-box ${className}`}>
      <span className="galgame-dialog-text" style={{ display: 'block' }}>
        {cleanText}
      </span>
    </div>
  );
}

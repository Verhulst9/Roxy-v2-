/**
 * TextInput - P5R styled input area for user messages
 * With integrated voice input support
 */

import { useState, useRef } from 'react';
import { VoiceInputButton } from '../voice/VoiceInputButton';
import { useLanguage } from '../../contexts/LanguageContext';
import type { WSMessage, WSMessageType } from '../../types';

interface TextInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  wsSend?: (type: WSMessageType, data: unknown) => void;
  micSensitivity?: number; // Microphone sensitivity (0.5 - 2.0)
}

export function TextInput({
  onSend,
  disabled = false,
  placeholder,
  className = '',
  wsSend,
  micSensitivity = 1.0,
}: TextInputProps) {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Use translated placeholder as default
  const inputPlaceholder = placeholder ?? t.typeMessage;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && text.trim()) {
      handleSend();
    }
  };

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }
  };

  // 处理录音完成
  const handleRecordingComplete = async (blob: Blob, base64Audio: string) => {
    if (!wsSend) {
      const errorMsg = 'WebSocket not connected. Voice input requires a connection.';
      console.warn('[TextInput] ' + errorMsg);
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(null), 3000);
      setIsRecording(false);
      return;
    }

    // 获取 MIME 类型
    const mimeType = blob.type || 'audio/webm';

    // 发送 audio_blob 消息到后端
    const message: WSMessage = {
      type: 'audio_blob',
      payload: {
        audio_uri: `data:${mimeType};base64,${base64Audio}`,
        mime_type: mimeType,
        metadata: {
          size: blob.size,
          type: mimeType,
        },
      },
      timestamp: Date.now(),
    };

    // 发送到后端
    try {
      wsSend('audio_blob', message.payload);
    } catch (error) {
      console.error('Failed to send audio:', error);
      setErrorMessage('Failed to send audio. Please try again.');
      setTimeout(() => setErrorMessage(null), 3000);
    }

    setIsRecording(false);
  };

  return (
    <div className={`galgame-input-container ${className} ${isRecording ? 'recording' : ''}`}>
      {/* 语音输入按钮 */}
      <VoiceInputButton
        onRecordingComplete={handleRecordingComplete}
        disabled={disabled || isRecording || !wsSend}
        className="voice-input-wrapper"
        micSensitivity={micSensitivity}
      />

      {/* Error message toast */}
      {errorMessage && (
        <div className="galgame-input-error">
          {errorMessage}
        </div>
      )}

      <input
        ref={inputRef}
        type="text"
        className="galgame-input"
        placeholder={isRecording ? t.recording : inputPlaceholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isRecording}
      />

      <button
        className="galgame-send-button"
        onClick={handleSend}
        disabled={disabled || !text.trim() || isRecording}
      >
        {t.send}
      </button>
    </div>
  );
}

/**
 * VoiceInputButton - 语音输入按钮组件
 * 带有录音状态指示、音量可视化和计时器
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioRecorder } from '../../utils/AudioRecorder';

interface VoiceInputButtonProps {
  onRecordingComplete: (audioBlob: Blob, base64Audio: string) => void;
  disabled?: boolean;
  className?: string;
  micSensitivity?: number; // Microphone sensitivity (0.5 - 2.0)
}

interface RecordingState {
  isRecording: boolean;
  duration: number;
}

export function VoiceInputButton({
  onRecordingComplete,
  disabled = false,
  className = '',
  micSensitivity = 1.0,
}: VoiceInputButtonProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    duration: 0,
  });

  // @ts-ignore - audioLevel reserved for future UI visualization
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 清理资源
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recorderRef.current) {
        recorderRef.current.dispose();
      }
    };
  }, []);

  // 更新计时器
  useEffect(() => {
    // Clear any existing timer first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recordingState.isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 0.1,
        }));
      }, 100);
    }

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [recordingState.isRecording]);

  // 开始录音
  const handleStartRecording = useCallback(async () => {
    if (isTransitioning) return;

    setIsTransitioning(true);

    const recorder = new AudioRecorder({
      onStateChange: (state) => {
        setRecordingState(state);
      },
      onAudioLevel: (level) => {
        setAudioLevel(level);
      },
    });

    recorderRef.current = recorder;

    // Set microphone sensitivity
    recorder.setSensitivity(micSensitivity);

    try {
      await recorder.startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      setRecordingState({
        isRecording: false,
        duration: 0,
      });
    } finally {
      setIsTransitioning(false);
    }
  }, [isTransitioning, micSensitivity]);

  // 停止录音
  const handleStopRecording = useCallback(async () => {
    if (isTransitioning || !recorderRef.current) {
      return;
    }

    setIsTransitioning(true);

    try {
      const blob = await recorderRef.current.stopRecording();

      if (blob) {
        const base64 = await AudioRecorder.blobToBase64(blob);
        onRecordingComplete(blob, base64);
      }

      // 重置状态
      setRecordingState({
        isRecording: false,
        duration: 0,
      });
      setAudioLevel(0);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    } finally {
      setIsTransitioning(false);
    }
  }, [isTransitioning, onRecordingComplete]);

  // 点击处理
  const handleClick = useCallback(() => {
    if (disabled || isTransitioning) return;

    if (recordingState.isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  }, [disabled, isTransitioning, recordingState.isRecording, handleStartRecording, handleStopRecording]);

  return (
    <div className={`voice-input-container ${className}`}>
      <button
        className={`voice-input-button ${recordingState.isRecording ? 'recording' : ''}`}
        onClick={handleClick}
        disabled={disabled || isTransitioning}
        title={isTransitioning ? '处理中...' : recordingState.isRecording ? '点击停止录音' : '点击开始录音'}
        aria-label={isTransitioning ? '处理中' : recordingState.isRecording ? '停止录音' : '开始录音'}
      >
        {/* 极简麦克风图标 */}
        <svg
          className="voice-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2C10.3431 2 9 3.34315 9 5V11C9 12.6569 10.3431 14 12 14C13.6569 14 15 12.6569 15 11V5C15 3.34315 13.6569 2 12 2Z"
            fill={recordingState.isRecording ? '#ef4444' : 'currentColor'}
          />
          <path
            d="M19 10V11C19 14.866 15.866 18 12 18C8.13401 18 5 14.866 5 11V10"
            stroke={recordingState.isRecording ? '#ef4444' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="12"
            y1="18"
            x2="12"
            y2="22"
            stroke={recordingState.isRecording ? '#ef4444' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        {/* 录音时的脉冲动画 */}
        {recordingState.isRecording && (
          <span className="voice-input-pulse" />
        )}
      </button>

    </div>
  );
}

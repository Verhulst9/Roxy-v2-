/**
 * AudioRecorder - 音频录制工具类
 * 使用 MediaRecorder API 录制音频并导出为 WebM/WAV 格式
 */

import { createScopedLogger } from './debug';

const debug = createScopedLogger('AudioRecorder');

export interface RecordingState {
  isRecording: boolean;
  duration: number; // 录制时长（秒）
}

export interface AudioRecorderOptions {
  onStateChange?: (state: RecordingState) => void;
  onAudioLevel?: (level: number) => void;
  mimeType?: string;
  sampleRate?: number;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startTime: number = 0;
  private animationFrameId: number | null = null;

  private options: AudioRecorderOptions;
  private isRecording: boolean = false;
  private sensitivity: number = 1.0; // Microphone sensitivity (0.5 - 2.0)

  // 默认支持的 MIME 类型
  private static readonly MIME_TYPES = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
    'audio/mpeg',
  ];

  constructor(options: AudioRecorderOptions = {}) {
    this.options = {
      mimeType: options.mimeType,
      sampleRate: options.sampleRate || 44100,
      onStateChange: options.onStateChange,
      onAudioLevel: options.onAudioLevel,
    };
  }

  /**
   * 获取支持的 MIME 类型
   */
  private getSupportedMimeType(): string {
    if (this.options.mimeType && MediaRecorder.isTypeSupported(this.options.mimeType)) {
      return this.options.mimeType;
    }

    for (const mimeType of AudioRecorder.MIME_TYPES) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    // 默认返回 webm
    return 'audio/webm';
  }

  /**
   * 开始录音
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      debug.warn('Already recording');
      return;
    }

    try {
      // 获取麦克风权限
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.options.sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 创建 AudioContext 用于音量检测
      this.audioContext = new AudioContext({ sampleRate: this.options.sampleRate });
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      // 创建增益节点用于灵敏度控制
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.sensitivity;

      // 连接麦克风 -> 增益节点 -> 分析器
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.gainNode);
      this.gainNode.connect(this.analyser);

      // 创建 MediaRecorder
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

      this.chunks = [];
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        // 录音停止时的处理在 stopRecording 方法中
      };

      // 开始录音
      this.mediaRecorder.start(100); // 每 100ms 触发一次 ondataavailable
      this.startTime = Date.now();
      this.isRecording = true;

      // 开始监测音量
      this.startAudioLevelMonitoring();

      // 通知状态变化
      this.notifyStateChange();

    } catch (error) {
      debug.error('Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * 停止录音并返回音频 Blob
   */
  async stopRecording(): Promise<Blob | null> {
    if (!this.isRecording || !this.mediaRecorder) {
      debug.warn('Not recording');
      return null;
    }

    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const mimeType = this.getSupportedMimeType();
        const blob = new Blob(this.chunks, { type: mimeType });

        // 清理资源
        this.cleanup();

        resolve(blob);
      };

      this.mediaRecorder!.stop();
      this.isRecording = false;
      this.notifyStateChange();
    });
  }

  /**
   * 取消录音
   */
  cancelRecording(): void {
    if (!this.isRecording) {
      return;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.onstop = () => {};
      this.mediaRecorder.stop();
    }

    this.chunks = [];
    this.isRecording = false;
    this.cleanup();
    this.notifyStateChange();
  }

  /**
   * 获取当前录音时长（秒）
   */
  getDuration(): number {
    if (!this.isRecording) {
      return 0;
    }
    return (Date.now() - this.startTime) / 1000;
  }

  /**
   * 设置麦克风灵敏度 (0.5 - 2.0)
   * 1.0 = 正常, < 1.0 = 降低, > 1.0 = 提高
   */
  setSensitivity(sensitivity: number): void {
    // Clamp between 0.5 and 2.0
    this.sensitivity = Math.max(0.5, Math.min(2.0, sensitivity));
    if (this.gainNode) {
      this.gainNode.gain.value = this.sensitivity;
    }
  }

  /**
   * 获取当前麦克风灵敏度
   */
  getSensitivity(): number {
    return this.sensitivity;
  }

  /**
   * 开始监测音量级别
   */
  private startAudioLevelMonitoring(): void {
    if (!this.analyser) {
      return;
    }

    // Cancel any existing animation frame before starting new one
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const updateLevel = () => {
      // Check if still recording and analyser exists
      if (!this.isRecording || !this.analyser) {
        // Clear the animation frame ID if we're stopping
        this.animationFrameId = null;
        return;
      }

      this.analyser.getByteFrequencyData(dataArray);

      // 计算平均音量
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const level = Math.min(average / 128, 1); // 归一化到 0-1

      this.options.onAudioLevel?.(level);

      // 更新状态
      this.notifyStateChange();

      // Only request next frame if still recording
      if (this.isRecording) {
        this.animationFrameId = requestAnimationFrame(updateLevel);
      }
    };

    updateLevel();
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    // 停止动画
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // 停止麦克风流
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    // 断开增益节点
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    // 关闭 AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;

    // 停止媒体流 - 安全停止每个 track
    if (this.stream) {
      const tracks = this.stream.getTracks();
      for (const track of tracks) {
        try {
          track.stop();
        } catch (e) {
          debug.warn('[AudioRecorder] Failed to stop track:', e);
        }
      }
      this.stream = null;
    }

    this.mediaRecorder = null;
  }

  /**
   * 通知状态变化
   */
  private notifyStateChange(): void {
    this.options.onStateChange?.({
      isRecording: this.isRecording,
      duration: this.getDuration(),
    });
  }

  /**
   * 将 Blob 转换为 base64 字符串
   */
  static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 获取录音文件的扩展名
   */
  static getExtension(mimeType: string): string {
    if (mimeType.includes('webm')) return '.webm';
    if (mimeType.includes('ogg')) return '.ogg';
    if (mimeType.includes('mp4') || mimeType.includes('mpeg')) return '.mp3';
    return '.webm'; // 默认
  }

  /**
   * 释放所有资源
   */
  dispose(): void {
    this.cancelRecording();
    this.chunks = [];
  }
}

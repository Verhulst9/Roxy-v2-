/**
 * Audio Processor - Handles audio playback and lip-sync
 */

import { createScopedLogger } from './debug';

const debug = createScopedLogger('AudioProcessor');

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isPlaying = false;
  private animationFrameId: number | null = null;
  private stopPending = false; // Track if stop is pending to prevent double-stop

  // Lip-sync parameters
  private mouthParam = 0; // 0.0 - 1.0
  private onMouthParamChange?: (value: number) => void;

  // Volume control
  private volume = 0.8; // Default volume 0.0 - 1.0

  constructor(onMouthParamChange?: (value: number) => void) {
    this.onMouthParamChange = onMouthParamChange;
  }

  /**
   * Initialize AudioContext (must be called after user interaction)
   */
  async init(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({
        sampleRate: 24000, // Match TTS sample rate
      });
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.1;

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Decode base64 audio data
   */
  private async decodeAudio(base64Audio: string): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    // Remove data URL prefix if present
    const base64Data = base64Audio.includes(',')
      ? base64Audio.split(',')[1]
      : base64Audio;

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return await this.audioContext.decodeAudioData(bytes.buffer);
  }

  /**
   * Play audio with lip-sync
   */
  async play(base64Audio: string): Promise<void> {
    await this.init();

    // Stop current audio if playing (wait for stop to complete)
    this.stop();

    // Reset stop pending flag for new playback
    this.stopPending = false;

    try {
      const audioBuffer = await this.decodeAudio(base64Audio);

      // Don't play if stop was called while decoding
      if (this.stopPending) {
        return;
      }

      // Create source and connect to analyser
      const source = this.audioContext!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.analyser!);
      this.analyser!.connect(this.gainNode!);
      this.gainNode!.connect(this.audioContext!.destination);

      this.currentSource = source;
      this.isPlaying = true;

      // Start playback
      source.start(0);

      // Start lip-sync animation
      this.updateLipSync();

      // Cleanup when playback ends naturally (not via stop())
      source.onended = () => {
        if (this.isPlaying) {
          // Only call stop if we're still marked as playing
          // (otherwise stop() was already called externally)
          this.cleanupAfterPlayback();
        }
      };
    } catch (error) {
      debug.error('Error playing audio:', error);
      this.cleanupAfterPlayback();
    }
  }

  /**
   * Update lip-sync parameters based on audio analysis
   */
  private updateLipSync(): void {
    if (!this.isPlaying || !this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate average volume in frequency range relevant to speech
    let sum = 0;
    const speechRange = dataArray.slice(0, 30); // Lower frequencies for speech
    for (const value of speechRange) {
      sum += value;
    }
    const average = sum / speechRange.length;

    // Map to mouth parameter (0.0 - 1.0)
    const targetMouthParam = Math.min(average / 100, 1);

    // Smooth transition
    this.mouthParam += (targetMouthParam - this.mouthParam) * 0.3;

    // Clamp value
    this.mouthParam = Math.max(0, Math.min(1, this.mouthParam));

    // Notify callback
    this.onMouthParamChange?.(this.mouthParam);

    // Continue animation - store the frame ID for cancellation
    if (this.isPlaying) {
      this.animationFrameId = requestAnimationFrame(() => this.updateLipSync());
    }
  }

  /**
   * Stop current audio playback
   */
  stop(): void {
    this.stopPending = true;
    this.isPlaying = false;

    // Cancel any pending animation frame first
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Stop and cleanup audio source
    if (this.currentSource) {
      try {
        // Remove onended listener to prevent double cleanup
        this.currentSource.onended = null;
        // Stop the source
        this.currentSource.stop(0);
        // Disconnect to prevent memory leaks
        this.currentSource.disconnect();
      } catch {
        // Source already stopped or not yet started
      }
      this.currentSource = null;
    }

    // Reset mouth parameter
    this.mouthParam = 0;
    this.onMouthParamChange?.(0);
  }

  /**
   * Cleanup after natural playback end (not manual stop)
   */
  private cleanupAfterPlayback(): void {
    this.isPlaying = false;

    // Cancel animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Clear source reference (but don't stop/disconnect as it's already done)
    this.currentSource = null;

    // Reset mouth parameter
    this.mouthParam = 0;
    this.onMouthParamChange?.(0);
  }

  /**
   * Get current mouth parameter value
   */
  getMouthParam(): number {
    return this.mouthParam;
  }

  /**
   * Check if audio is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Set volume for audio playback (0.0 - 1.0)
   */
  setVolume(volume: number): void {
    // Clamp volume between 0 and 1
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Stop any playing audio
    this.stop();

    // Disconnect gain node from destination before cleanup
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {
        // Already disconnected
      }
      this.gainNode = null;
    }

    // Disconnect analyser from destination before cleanup
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {
        // Already disconnected
      }
      this.analyser = null;
    }

    // Close AudioContext
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // Already closed
      }
      this.audioContext = null;
    }
  }
}

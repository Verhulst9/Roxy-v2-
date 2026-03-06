/**
 * Main App component - nakari Live2D frontend with Galgame/P5R styling
 * Integrates WebSocket communication with Live2D rendering in visual novel style
 */

import { useState, useEffect, useRef, useCallback, Component, type ReactNode } from 'react';
import { config } from './config';
import { Live2DRenderer } from './live2d/Live2DRenderer';
import { AudioProcessor } from './utils/AudioProcessor';
import { useWebSocket } from './hooks/useWebSocket';
import { debug } from './utils/debug';
import type { Live2DState, WSMessage, DialogState } from './types';
import { useTransition } from './components/transitions';
import { P5RTheme, TRANSITION_TYPES } from './utils/styles/theme';

// Galgame components
import {
  GalgameLayout,
  BackgroundLayer,
  DialogBox,
  CharacterName,
  TextInput,
  LeftSidebar,
  MainViewContainer,
  ChatHistory,
} from './components/galgame';

// UI components
import { StatusIndicator } from './components/ui';

// Settings
import { SettingsPanel } from './components/settings';

// Context providers
import { SidebarProvider, useSidebarContext } from './contexts/SidebarContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ChatHistoryProvider, useChatHistory } from './contexts/ChatHistoryContext';
import { DebugProvider } from './contexts/DebugContext';

// Error Boundary
class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          color: P5RTheme.colors.primary.red,
          fontFamily: 'monospace',
          background: P5RTheme.colors.primary.black,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <h2 style={{color: P5RTheme.colors.primary.red}}>Application Error</h2>
          <pre style={{color: P5RTheme.colors.primary.white}}>{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  // Core state
  const [currentState, setCurrentState] = useState<Live2DState>('idle');
  const [currentDialog, setCurrentDialog] = useState<DialogState | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<string>('neutral');
  const [live2dReady, setLive2dReady] = useState(false);
  const [messageHistory, setMessageHistory] = useState<DialogState[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioContextReady, setAudioContextReady] = useState(false);

  // Sidebar state
  const { leftSidebarOpen, leftSidebarCollapsed } = useSidebarContext();

  // Chat history
  const { state: chatState, loadSession, loadSessions } = useChatHistory();

  // Settings
  const { settings } = useSettings();

  // Refs
  const modelRef = useRef<any>(null);
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  // Use refs to track latest state values (avoid closure issues in callbacks)
  const currentStateRef = useRef<Live2DState>(currentState);
  const currentEmotionRef = useRef<string>(currentEmotion);
  const triggerRef = useRef<any>(null);
  const audioContextReadyRef = useRef<boolean>(false);
  const enableAudioRef = useRef<boolean>(config.enableAudio);

  // Update refs when state changes
  useEffect(() => {
    currentStateRef.current = currentState;
  }, [currentState]);

  useEffect(() => {
    currentEmotionRef.current = currentEmotion;
  }, [currentEmotion]);

  // Update enableAudio ref when config changes
  useEffect(() => {
    enableAudioRef.current = config.enableAudio;
  }, [config.enableAudio]);

  // Initialize AudioContext on first user interaction (autoplay policy)
  useEffect(() => {
    if (audioContextReady) return; // Already initialized

    const handleUserInteraction = async () => {
      if (!audioContextReady && audioProcessorRef.current) {
        try {
          await audioProcessorRef.current.init();
          setAudioContextReady(true);
          audioContextReadyRef.current = true;
        } catch (e) {
          debug.warn('[App] Failed to initialize AudioContext:', e);
        }
      }
    };

    // Listen for user interaction events
    const events = ['click', 'keydown', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, handleUserInteraction, { once: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserInteraction);
      });
    };
  }, [audioContextReady]);

  // Transition hook
  const { transition, trigger } = useTransition();

  // Store trigger in ref
  useEffect(() => {
    triggerRef.current = trigger;
  }, [trigger]);

  // Stable message handler - uses refs to avoid closure issues
  const handleMessage = useCallback((message: WSMessage) => {
    // Use payload for all message types (backend sends payload, not data)
    const payload = (message as any).payload || message.data;
    switch (message.type) {
      case 'connected': {
        // 'connected' is not in WSMessageType but is sent by backend
        break;
      }
      case 'state': {
        const newState = (payload as { state: Live2DState }).state;
        // Trigger transition on state change (using ref to get latest state)
        const prevState = currentStateRef.current;
        if (newState !== prevState && newState === 'speaking' && triggerRef.current) {
          triggerRef.current(TRANSITION_TYPES.SLASH_DOWN, 300);
        }
        setCurrentState(newState);
        break;
      }

      case 'text': {
        const textData = payload as { text: string; isUser: boolean };
        // Only update if text is valid (non-empty after trim, not literal 'undefined'/'null')
        const text = textData.text?.trim();
        if (text && text !== 'undefined' && text !== 'null' && text.length > 0) {
          const newDialog: DialogState = {
            text: text,
            speaker: textData.isUser ? 'You' : 'Roxy',
            isUser: textData.isUser,
            timestamp: Date.now(),
          };
          // Add to history
          setMessageHistory(prev => [...prev, newDialog]);
          // Update current dialog
          setCurrentDialog(newDialog);
        }
        break;
      }

      case 'user_text':
        break;

      case 'audio':
        // Play audio if enabled and AudioContext is ready
        if (enableAudioRef.current && audioProcessorRef.current && audioContextReadyRef.current) {
          const audioData = payload as { audio: string; format: string; sampleRate: number };
          audioProcessorRef.current.play(audioData.audio)
            .catch(e => debug.error('[App] Audio playback failed:', e));
        }
        break;

      case 'emotion': {
        const newEmotion = (payload as { emotion: string }).emotion;
        debug.log('[App] Emotion received:', newEmotion);
        // Trigger transition on emotion change (using ref to get latest emotion)
        const prevEmotion = currentEmotionRef.current;
        if (newEmotion !== prevEmotion && newEmotion !== 'neutral' && triggerRef.current) {
          triggerRef.current(TRANSITION_TYPES.SLASH_DOWN, 300);
        }
        setCurrentEmotion(newEmotion);
        // Apply emotion to Live2D model if available
        if (modelRef.current) {
          debug.log('[App] Applying emotion to model:', newEmotion);
          import('./live2d/Live2DRenderer').then(({ setModelEmotion }) => {
            setModelEmotion(modelRef.current, newEmotion as any);
          });
        }
        break;
      }

      case 'motion':
        // Trigger motion on Live2D model if available
        if (modelRef.current) {
          import('./live2d/Live2DRenderer').then(({ triggerMotion }) => {
            const motionData = payload as { group: string; index: number };
            triggerMotion(modelRef.current, motionData.group, motionData.index);
          });
        }
        break;

      case 'param':
        // Direct parameter setting
        if (modelRef.current) {
          import('./live2d/Live2DRenderer').then(({ setModelParams }) => {
            const paramData = payload as { params: Array<{ name: string; value: number }> };
            setModelParams(modelRef.current, paramData.params);
          });
        }
        break;
    }
  }, []); // No dependencies - uses refs for all dynamic values

  // Stable state change handler
  const handleStateChange = useCallback((_state: string) => {
    // State change handling
  }, []);

  // Use WebSocket hook with stable callbacks
  const { connectionState, sendText, sendMessage, connect } = useWebSocket(config.wsUrl, {
    autoReconnect: true,
    reconnectInterval: 3000,
    onMessage: handleMessage,
    onStateChange: handleStateChange,
  });

  // Log configuration on mount and connect
  useEffect(() => {
    // Auto-connect on mount (only once)
    connect();
  }, [connect]); // Added connect dependency

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Restore current session messages on mount and when session changes
  useEffect(() => {
    if (chatState.currentSessionId) {
      loadSession(chatState.currentSessionId).then(messages => {
        setMessageHistory(messages);
        // Set current dialog to last message if available, otherwise clear it
        if (messages.length > 0) {
          setCurrentDialog(messages[messages.length - 1]);
        } else {
          // Clear current dialog for new/empty sessions
          setCurrentDialog(null);
        }
      });
    }
  }, [chatState.currentSessionId, loadSession]);

  // Apply TTS volume setting to AudioProcessor
  useEffect(() => {
    if (audioProcessorRef.current) {
      audioProcessorRef.current.setVolume(settings.audio.ttsVolume);
    }
  }, [settings.audio.ttsVolume]);

  // Handle user input
  const handleSendMessage = useCallback((text: string) => {
    if (text.trim()) {
      sendText(text, true);
      const newUserDialog: DialogState = {
        text,
        speaker: 'You',
        isUser: true,
        timestamp: Date.now(),
      };
      // Add to history
      setMessageHistory(prev => [...prev, newUserDialog]);
      // Update current dialog
      setCurrentDialog(newUserDialog);
    }
  }, [sendText]);

  // Handle Live2D model loaded
  const handleModelLoaded = useCallback((model?: any) => {
    if (model) {
      modelRef.current = model;
    }
    setLive2dReady(true);

    // Initialize AudioProcessor with lip-sync callback
    if (!audioProcessorRef.current && config.enableLipSync) {
      audioProcessorRef.current = new AudioProcessor((mouthParam) => {
        // Apply mouth parameter to Live2D model for lip-sync
        if (modelRef.current) {
          try {
            // Use the same parameter setting logic
            import('./live2d/Live2DRenderer').then(({ setModelParams }) => {
              setModelParams(modelRef.current, [{ name: 'ParamMouthOpenY', value: mouthParam }]);
            });
          } catch (e) {
            debug.warn('[App] Failed to update lip-sync:', e);
          }
        }
      });
      // Set initial volume from settings
      audioProcessorRef.current.setVolume(settings.audio.ttsVolume);
    }
  }, [config.enableLipSync, settings.audio.ttsVolume]);

  // Handle Live2D error
  const handleLive2DError = useCallback((error: Error) => {
    debug.error('Live2D error:', error);
  }, []);

  return (
    <GalgameLayout>
      {/* Background Layer */}
      <BackgroundLayer />

      {/* Left Sidebar - Navigation */}
      <LeftSidebar onSettingsClick={() => setSettingsOpen(true)} />

      {/* Main View Container - shifts as a unit when sidebar opens */}
      <MainViewContainer
        sidebarOpen={leftSidebarOpen}
        sidebarCollapsed={leftSidebarCollapsed}
      >
        {/* Live2D Character Layer */}
        <Live2DRenderer
          className="galgame-character-layer"
          config={config.modelConfig}
          onModelLoaded={handleModelLoaded}
          onError={handleLive2DError}
          live2dSettings={settings.live2d}
        />

        {/* Dialog Section */}
        {live2dReady && (
          <>
            {/* Chat History - shown when autoScrollChat is enabled */}
            {settings.general.autoScrollChat && (
              <ChatHistory
                messages={messageHistory}
                containerRef={chatHistoryRef}
              />
            )}

            {/* Current Dialog */}
            <div className="galgame-dialog-container">
              <CharacterName name={currentDialog?.speaker} />
              <DialogBox
                text={currentDialog?.text ?? 'Hello! I am Roxy. How can I help you today?'}
              />
            </div>
          </>
        )}

        {/* Input Area */}
        <TextInput
          onSend={handleSendMessage}
          wsSend={sendMessage}
          disabled={connectionState !== 'connected'}
          micSensitivity={settings.audio.micSensitivity}
        />
      </MainViewContainer>

      {/* P5R Transition Overlay */}
      {transition && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 200, pointerEvents: 'none' }}>
          {transition}
        </div>
      )}

      {/* Settings Panel */}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

      {/* Header with Status */}
      <header className="galgame-header">
        <StatusIndicator connectionState={connectionState} live2dReady={live2dReady} />
      </header>
    </GalgameLayout>
  );
}

function AppWithProviders() {
  return (
    <SettingsProvider>
      <ThemeAwareApp />
    </SettingsProvider>
  );
}

function ThemeAwareApp() {
  const { settings } = useSettings();

  return (
    <div data-theme={settings.general.theme}>
      <DebugProvider isDebugMode={settings.advanced.debugMode}>
        <ChatHistoryProvider>
          <LanguageProvider>
            <SidebarProvider defaultLeftOpen={true} defaultRightOpen={false} defaultLeftCollapsed={true}>
              <App />
            </SidebarProvider>
          </LanguageProvider>
        </ChatHistoryProvider>
      </DebugProvider>
    </div>
  );
}

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <AppWithProviders />
    </ErrorBoundary>
  );
}

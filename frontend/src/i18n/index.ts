/**
 * Internationalization (i18n) translations
 */

export type Language = 'en' | 'zh' | 'ja';

export interface Translations {
  // Settings Panel
  settings: string;
  general: string;
  live2d: string;
  audio: string;
  advanced: string;

  // General Settings
  theme: string;
  language: string;
  autoScrollChat: string;

  // Theme Options
  light: string;
  dark: string;

  // Live2D Settings
  model: string;
  modelScale: string;
  positionX: string;
  positionY: string;
  idleMotion: string;
  breathingAnimation: string;

  // Model names
  model_xiaomai: string;
  model_miku: string;
  model_22_high: string;
  model_33_high: string;

  // Audio Settings
  ttsVolume: string;
  micSensitivity: string;
  lipSync: string;
  enableAudio: string;

  // Advanced Settings
  debugMode: string;
  showAIThoughts: string;

  // Data Management
  dataManagement: string;
  exportSettings: string;
  importSettings: string;
  resetToDefaults: string;
  copyToClipboard: string;

  // Labels with values
  modelScaleValue: (value: string) => string;
  positionValue: (value: number) => string;
  volumeValue: (value: number) => string;

  // Sidebar
  newChat: string;
  recentHistory: string;

  // Chat History
  renameChat: string;
  deleteChat: string;
  deleteConfirm: string;
  deleteConfirmMessage: string;
  batchDeleteConfirm: (count: number) => string;
  untitledChat: string;
  today: string;
  yesterday: string;

  // Batch mode
  selected: string;
  cancel: string;
  clickToSelect: string;

  // Sidebar toggle
  expand: string;
  collapse: string;

  // Input
  typeMessage: string;
  recording: string;
  send: string;
}

const translations: Record<Language, Translations> = {
  en: {
    settings: 'Settings',
    general: 'General',
    live2d: 'Live2D',
    audio: 'Audio',
    advanced: 'Advanced',
    theme: 'Theme',
    language: 'Language',
    autoScrollChat: 'Show Chat History',
    light: 'Light',
    dark: 'Dark',
    model: 'Model',
    modelScale: 'Model Scale',
    positionX: 'Position X',
    positionY: 'Position Y',
    idleMotion: 'Idle Motion',
    breathingAnimation: 'Breathing Animation',
    model_xiaomai: 'Xiaomai (Umaru)',
    model_miku: 'Miku',
    model_22_high: 'Hiyori (22)',
    model_33_high: 'Haru (33)',
    ttsVolume: 'TTS Volume',
    micSensitivity: 'Mic Sensitivity',
    lipSync: 'Lip Sync',
    enableAudio: 'Enable Audio',
    debugMode: 'Debug Mode',
    showAIThoughts: 'Show AI Thoughts',
    dataManagement: 'Data Management',
    exportSettings: 'Export Settings',
    importSettings: 'Import Settings',
    resetToDefaults: 'Reset to Defaults',
    copyToClipboard: 'Copy to Clipboard',
    modelScaleValue: (value: string) => `${value}x`,
    positionValue: (value: number) => `${value}px`,
    volumeValue: (value: number) => `${value}%`,
    newChat: 'New Chat',
    recentHistory: 'Recent History',
    renameChat: 'Rename',
    deleteChat: 'Delete',
    deleteConfirm: 'Confirm Delete',
    deleteConfirmMessage: 'Are you sure you want to delete this conversation?',
    batchDeleteConfirm: (count: number) => `Are you sure you want to delete ${count} selected conversation${count > 1 ? 's' : ''}?`,
    untitledChat: 'Untitled Chat',
    today: 'Today',
    yesterday: 'Yesterday',
    selected: 'selected',
    cancel: 'Cancel',
    clickToSelect: 'Click to select/deselect',
    expand: 'Expand',
    collapse: 'Collapse',
    typeMessage: 'Type a message...',
    recording: 'Recording...',
    send: 'Send',
  },
  zh: {
    settings: '设置',
    general: '通用',
    live2d: 'Live2D',
    audio: '音频',
    advanced: '高级',
    theme: '主题',
    language: '语言',
    autoScrollChat: '显示对话记录',
    light: '浅色',
    dark: '深色',
    model: '模型',
    modelScale: '模型缩放',
    positionX: '位置 X',
    positionY: '位置 Y',
    idleMotion: '空闲动作',
    breathingAnimation: '呼吸动画',
    model_xiaomai: '小麦 (Umaru)',
    model_miku: '初音',
    model_22_high: '日葵 (22)',
    model_33_high: '春 (33)',
    ttsVolume: '语音音量',
    micSensitivity: '麦克风灵敏度',
    lipSync: '口型同步',
    enableAudio: '启用音频',
    debugMode: '调试模式',
    showAIThoughts: '显示 AI 思考',
    dataManagement: '数据管理',
    exportSettings: '导出设置',
    importSettings: '导入设置',
    resetToDefaults: '重置为默认值',
    copyToClipboard: '复制到剪贴板',
    modelScaleValue: (value: string) => `${value}倍`,
    positionValue: (value: number) => `${value}px`,
    volumeValue: (value: number) => `${value}%`,
    newChat: '新对话',
    recentHistory: '近期记录',
    renameChat: '重命名',
    deleteChat: '删除',
    deleteConfirm: '确认删除',
    deleteConfirmMessage: '确定要删除这个对话吗？',
    batchDeleteConfirm: (count: number) => `确定要删除选中的 ${count} 个对话吗？`,
    untitledChat: '未命名对话',
    today: '今天',
    yesterday: '昨天',
    selected: '已选择',
    cancel: '取消',
    clickToSelect: '点击选择/取消',
    expand: '展开',
    collapse: '折叠',
    typeMessage: '输入消息...',
    recording: '录音中...',
    send: '发送',
  },
  ja: {
    settings: '設定',
    general: '一般',
    live2d: 'Live2D',
    audio: 'オーディオ',
    advanced: '詳細',
    theme: 'テーマ',
    language: '言語',
    autoScrollChat: '会話履歴を表示',
    light: 'ライト',
    dark: 'ダーク',
    model: 'モデル',
    modelScale: 'モデルスケール',
    positionX: '位置 X',
    positionY: '位置 Y',
    idleMotion: 'アイドルモーション',
    breathingAnimation: '呼吸アニメーション',
    model_xiaomai: '小麦 (ウマル)',
    model_miku: 'ミク',
    model_22_high: 'ヒヨリ (22)',
    model_33_high: 'ハル (33)',
    ttsVolume: 'TTS音量',
    micSensitivity: 'マイク感度',
    lipSync: 'リップシンク',
    enableAudio: 'オーディオ有効',
    debugMode: 'デバッグモード',
    showAIThoughts: 'AI思考を表示',
    dataManagement: 'データ管理',
    exportSettings: '設定をエクスポート',
    importSettings: '設定をインポート',
    resetToDefaults: 'デフォルトにリセット',
    copyToClipboard: 'クリップボードにコピー',
    modelScaleValue: (value: string) => `${value}倍`,
    positionValue: (value: number) => `${value}px`,
    volumeValue: (value: number) => `${value}%`,
    newChat: '新しいチャット',
    recentHistory: '最近の履歴',
    renameChat: '名前を変更',
    deleteChat: '削除',
    deleteConfirm: '削除の確認',
    deleteConfirmMessage: 'この会話を削除してもよろしいですか？',
    batchDeleteConfirm: (count: number) => `選択した ${count} 件の会話を削除してもよろしいですか？`,
    untitledChat: '無題のチャット',
    today: '今日',
    yesterday: '昨日',
    selected: '件を選択',
    cancel: 'キャンセル',
    clickToSelect: 'クリックして選択/解除',
    expand: '展開',
    collapse: '折りたたみ',
    typeMessage: 'メッセージを入力...',
    recording: '録音中...',
    send: '送信',
  },
};

export function getTranslations(lang: Language): Translations {
  return translations[lang];
}

export const defaultLanguage: Language = 'en';

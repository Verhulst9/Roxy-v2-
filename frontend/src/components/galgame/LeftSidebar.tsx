/**
 * LeftSidebar - Gemini-style collapsible navigation sidebar
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSidebarContext } from '../../contexts/SidebarContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useChatHistory } from '../../contexts/ChatHistoryContext';
import type { ChatSession } from '../../types';

interface LeftSidebarProps {
  onSettingsClick?: () => void;
}

const LONG_PRESS_DURATION = 800; // 800ms for long press

export function LeftSidebar({
  onSettingsClick,
}: LeftSidebarProps) {
  const { leftSidebarOpen, leftSidebarCollapsed, toggleLeftSidebarCollapse } = useSidebarContext();
  const { t } = useLanguage();
  const { state, loadSessions, switchSession, deleteSession, renameSession, newConversation } = useChatHistory();

  // Delay text display until after sidebar expansion animation completes (90ms)
  const [showText, setShowText] = useState(leftSidebarCollapsed === false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Batch deletion mode
  const [batchMode, setBatchMode] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggeredRef = useRef(false);

  useEffect(() => {
    if (!leftSidebarCollapsed) {
      const timer = setTimeout(() => {
        setShowText(true);
      }, 90);
      return () => clearTimeout(timer);
    } else {
      setShowText(false);
    }
  }, [leftSidebarCollapsed]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Handle new chat button click
  const handleNewChat = useCallback(() => {
    newConversation();
  }, [newConversation]);

  // Handle history item click
  const handleHistoryItemClick = useCallback((sessionId: string) => {
    if (batchMode) {
      // Toggle selection in batch mode
      setSelectedSessions(prev => {
        const newSet = new Set(prev);
        if (newSet.has(sessionId)) {
          newSet.delete(sessionId);
        } else {
          newSet.add(sessionId);
        }
        return newSet;
      });
    } else {
      switchSession(sessionId);
    }
  }, [batchMode, switchSession]);

  // Handle mouse down for long press
  const handleMouseDown = useCallback((session: ChatSession) => {
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setBatchMode(true);
      setSelectedSessions(new Set([session.id]));
    }, LONG_PRESS_DURATION);
  }, []);

  // Handle mouse up / leave
  const handleMouseUpOrLeave = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Exit batch mode
  const exitBatchMode = useCallback(() => {
    setBatchMode(false);
    setSelectedSessions(new Set());
  }, []);

  // Handle batch delete
  const handleBatchDelete = useCallback(() => {
    if (selectedSessions.size === 0) return;
    const count = selectedSessions.size;
    if (confirm(t.batchDeleteConfirm(count))) {
      selectedSessions.forEach(sessionId => {
        deleteSession(sessionId);
      });
      exitBatchMode();
    }
  }, [selectedSessions, deleteSession, exitBatchMode, t.batchDeleteConfirm]);

  // Handle delete button click
  const handleDeleteClick = useCallback((e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (batchMode) {
      // Toggle selection
      setSelectedSessions(prev => {
        const newSet = new Set(prev);
        if (newSet.has(sessionId)) {
          newSet.delete(sessionId);
        } else {
          newSet.add(sessionId);
        }
        return newSet;
      });
    } else {
      if (confirm(t.deleteConfirmMessage || 'Are you sure you want to delete this conversation?')) {
        deleteSession(sessionId);
      }
    }
  }, [batchMode, deleteSession, t.deleteConfirmMessage]);

  // Handle double-click to rename (disabled in batch mode)
  const handleDoubleClick = useCallback((session: ChatSession) => {
    if (batchMode) return;
    setEditingId(session.id);
    setEditingTitle(session.title);
  }, [batchMode]);

  // Handle rename submit
  const handleRenameSubmit = useCallback((e: React.KeyboardEvent, sessionId: string) => {
    if (e.key === 'Enter' && editingTitle.trim()) {
      renameSession(sessionId, editingTitle.trim());
      setEditingId(null);
      setEditingTitle('');
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditingTitle('');
    }
  }, [editingTitle, renameSession]);

  // Handle rename blur
  const handleRenameBlur = useCallback((sessionId: string) => {
    if (editingTitle.trim()) {
      renameSession(sessionId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle('');
  }, [editingTitle, renameSession]);

  // Format timestamp for display
  const formatTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return t.today || 'Today';
    if (days === 1) return t.yesterday || 'Yesterday';
    return date.toLocaleDateString();
  }, [t.today, t.yesterday]);

  // Check if session is selected
  const isSelected = useCallback((sessionId: string) => {
    return selectedSessions.has(sessionId);
  }, [selectedSessions]);

  return (
    <aside
      className={`galgame-sidebar galgame-sidebar--left ${
        leftSidebarOpen ? 'galgame-sidebar--open' : ''
      } ${leftSidebarCollapsed ? 'galgame-sidebar--collapsed' : ''}`}
    >
      {/* Top: Collapse/Expand button */}
      <div className="galgame-sidebar__top">
        <button
          className="galgame-sidebar__toggle-btn"
          onClick={toggleLeftSidebarCollapse}
          aria-label={leftSidebarCollapsed ? t.expand : t.collapse}
          title={leftSidebarCollapsed ? t.expand : t.collapse}
        >
          {leftSidebarCollapsed ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          )}
        </button>
      </div>

      {/* Middle: New chat button */}
      <div className="galgame-sidebar__middle">
        <button className="galgame-sidebar__new-chat" onClick={handleNewChat}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="galgame-sidebar__icon-plus">
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
          </svg>
          <span className="galgame-sidebar__text">{t.newChat}</span>
        </button>
      </div>

      {/* Chat history list */}
      {!leftSidebarCollapsed && (
        <div className="galgame-sidebar__history">
          <div className="galgame-sidebar__history-title">
            {t.recentHistory}
            {batchMode && (
              <span className="galgame-sidebar__batch-actions">
                <span className="galgame-sidebar__batch-count">{selectedSessions.size} {t.selected}</span>
                <button
                  className="galgame-sidebar__batch-cancel"
                  onClick={exitBatchMode}
                >
                  {t.cancel}
                </button>
                <button
                  className="galgame-sidebar__batch-delete"
                  onClick={handleBatchDelete}
                  disabled={selectedSessions.size === 0}
                >
                  {t.deleteChat}
                </button>
              </span>
            )}
          </div>
          {state.sessions.map((session) => (
            <div
              key={session.id}
              className={`galgame-sidebar__history-item${
                state.currentSessionId === session.id ? ' galgame-sidebar__history-item--active' : ''
              }${
                batchMode ? ' galgame-sidebar__history-item--batch-mode' : ''
              }${
                isSelected(session.id) ? ' galgame-sidebar__history-item--selected' : ''
              }`}
              onClick={() => handleHistoryItemClick(session.id)}
              onDoubleClick={() => handleDoubleClick(session)}
              onMouseDown={() => handleMouseDown(session)}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              title={batchMode ? t.clickToSelect : session.title}
            >
              {batchMode && (
                <span className="galgame-sidebar__checkbox">
                  {isSelected(session.id) && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
              )}
              {editingId === session.id ? (
                <input
                  type="text"
                  className="galgame-sidebar__edit-input"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => handleRenameSubmit(e, session.id)}
                  onBlur={() => handleRenameBlur(session.id)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="galgame-sidebar__text">{session.title}</span>
              )}
              <span className="galgame-sidebar__history-time">
                {formatTime(session.started_at)}
              </span>
              {!batchMode && (
                <button
                  className="galgame-sidebar__history-delete"
                  onClick={(e) => handleDeleteClick(e, session.id)}
                  title={t.deleteChat || 'Delete'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bottom: Settings */}
      <div className="galgame-sidebar__bottom">
        <button className="galgame-sidebar__bottom-item" onClick={onSettingsClick}>
          <span className="galgame-sidebar__bottom-icon">⚙</span>
          <span className="galgame-sidebar__text">{t.settings}</span>
        </button>
      </div>
    </aside>
  );
}

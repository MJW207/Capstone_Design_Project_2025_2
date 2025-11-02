import { useState, useEffect } from 'react';
import { Star, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { bookmarkManager, type PanelBookmark } from '../../lib/bookmarkManager';

interface PIBookmarkPanelProps {
  onNavigate: (panelId: string) => void;
  isOpen?: boolean; // 외부에서 제어
}

export function PIBookmarkPanel({ onNavigate, isOpen: externalIsOpen }: PIBookmarkPanelProps) {
  const [isOpen, setIsOpen] = useState(externalIsOpen ?? false);
  const [bookmarks, setBookmarks] = useState<PanelBookmark[]>([]);

  useEffect(() => {
    if (externalIsOpen !== undefined) {
      setIsOpen(externalIsOpen);
    }
  }, [externalIsOpen]);

  useEffect(() => {
    if (isOpen) {
      setBookmarks(bookmarkManager.loadBookmarks());
    }
  }, [isOpen]);

  const handleClearAll = () => {
    if (confirm('모든 북마크를 삭제하시겠습니까?')) {
      bookmarkManager.clearAll();
      setBookmarks([]);
      toast.success('모든 북마크가 삭제되었습니다');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Slide Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsOpen(false);
                // 외부 제어가 없을 때만 내부 상태 업데이트
                if (externalIsOpen === undefined) {
                  // 외부 제어가 없으면 내부 상태로 관리
                }
              }}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(4px)',
                zIndex: 1001,
              }}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: '400px',
                height: '100vh',
                background: 'var(--surface-1)',
                boxShadow: 'var(--shadow-3)',
                zIndex: 1002,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '24px',
                  borderBottom: '1px solid var(--border-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Star size={20} fill="white" stroke="white" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      북마크
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>
                      {bookmarks.length}개 저장됨
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <X size={20} style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {bookmarks.length === 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      gap: '12px',
                    }}
                  >
                    <Star size={48} style={{ color: 'var(--text-tertiary)' }} />
                    <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                      북마크한 패널이 없습니다
                      <br />
                      별 아이콘을 클릭하여 저장하세요
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {bookmarks.map((bookmark) => (
                      <motion.div
                        key={bookmark.panelId}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => {
                          onNavigate(bookmark.panelId);
                          setIsOpen(false);
                        }}
                        style={{
                          padding: '16px',
                          borderRadius: '12px',
                          border: '1px solid var(--border-primary)',
                          cursor: 'pointer',
                          background: 'var(--surface-1)',
                          transition: 'all 120ms',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--surface-2)';
                          e.currentTarget.style.borderColor = '#F59E0B';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--surface-1)';
                          e.currentTarget.style.borderColor = 'var(--border-primary)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Star size={16} fill="#F59E0B" stroke="#F59E0B" />
                          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {bookmark.panelId}
                          </span>
                        </div>
                        {bookmark.metadata && (
                          <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {bookmark.metadata.gender && (
                              <span
                                style={{
                                  fontSize: '12px',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  background: 'var(--surface-2)',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                {bookmark.metadata.gender}
                              </span>
                            )}
                            {bookmark.metadata.age && (
                              <span
                                style={{
                                  fontSize: '12px',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  background: 'var(--surface-2)',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                {bookmark.metadata.age}세
                              </span>
                            )}
                            {bookmark.metadata.region && (
                              <span
                                style={{
                                  fontSize: '12px',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  background: 'var(--surface-2)',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                {bookmark.metadata.region}
                              </span>
                            )}
                          </div>
                        )}
                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '8px 0 0 0' }}>
                          {new Date(bookmark.timestamp).toLocaleString('ko-KR')}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {bookmarks.length > 0 && (
                <div
                  style={{
                    padding: '16px 24px',
                    borderTop: '1px solid var(--border-primary)',
                  }}
                >
                  <button
                    onClick={handleClearAll}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid var(--error-300)',
                      background: 'var(--surface-2)',
                      color: 'var(--error-500)',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--surface-3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--surface-2)';
                    }}
                  >
                    <Trash2 size={16} />
                    모두 삭제
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}


import React, { useState, useEffect } from 'react';
import { FolderOpen, Trash2, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { presetManager, type FilterPreset } from '../../lib/presetManager';

interface PIPresetLoadButtonProps {
  onLoad: (preset: FilterPreset) => void;
  onEdit?: (preset: FilterPreset) => void; // 프리셋 수정 요청 콜백
}

export function PIPresetLoadButton({ onLoad, onEdit }: PIPresetLoadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [presets, setPresets] = useState<FilterPreset[]>([]);

  useEffect(() => {
    if (isOpen) {
      const loadedPresets = presetManager.loadPresets();
      setPresets(loadedPresets);
    }
  }, [isOpen]);

  const handleLoad = (preset: FilterPreset) => {
    // 프리셋 필터 값을 적용하고 검색 실행
    setIsOpen(false);
    onLoad(preset);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`프리셋 "${name}"을 삭제하시겠습니까?`)) {
      presetManager.removePreset(id);
      const loadedPresets = presetManager.loadPresets();
      setPresets(loadedPresets);
      toast.success('프리셋이 삭제되었습니다');
    }
  };

  return (
    <>
      <div style={{ position: 'relative' }}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsOpen(!isOpen)}
          className="h-full"
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 150ms ease',
            height: '100%',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <FolderOpen size={14} style={{ color: 'var(--text-secondary)' }} />
          프리셋
          {presets.length > 0 && (
            <span
              style={{
                padding: '2px 5px',
                borderRadius: '999px',
                background: 'var(--brand-blue-500)',
                color: 'white',
                fontSize: '10px',
                fontWeight: 700,
              }}
            >
              {presets.length}
            </span>
          )}
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 9998,
                  background: 'rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(6px)',
                }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  left: '40%',
                  top: '40%',
                  transform: 'translate(-50%, -50%)',
                  width: '420px',
                  maxWidth: 'calc(100vw - 32px)',
                  maxHeight: '560px',
                  borderRadius: '16px',
                  background: 'var(--surface-1)',
                  color: 'var(--text-primary)',
                  boxShadow: 'var(--shadow-2)',
                  border: '1px solid var(--border-primary)',
                  zIndex: 9999,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <h4 style={{ 
                    fontSize: '14px', 
                    fontWeight: 700, 
                    color: 'var(--foreground)', 
                    margin: 0 
                  }}>
                    저장된 프리셋
                  </h4>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                  {presets.length === 0 ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '32px 16px',
                        gap: '12px',
                      }}
                    >
                      <FolderOpen size={40} style={{ color: 'var(--muted-foreground)' }} />
                      <p style={{ 
                        fontSize: '13px', 
                        color: 'var(--muted-foreground)', 
                        textAlign: 'center' 
                      }}>
                        저장된 프리셋이 없습니다
                      </p>
                      <p style={{ 
                        fontSize: '12px', 
                        color: 'var(--text-tertiary)', 
                        textAlign: 'center',
                        marginTop: '4px',
                      }}>
                        필터를 설정한 후 저장하여 프리셋을 만들 수 있습니다
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {presets.map((preset) => (
                        <motion.div
                          key={preset.id}
                          whileHover={{ scale: 1.01 }}
                          style={{
                            padding: '12px',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            background: 'var(--card)',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--surface-3)';
                            e.currentTarget.style.borderColor = 'var(--primary-500)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--card)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h5 style={{ 
                                fontSize: '13px', 
                                fontWeight: 600, 
                                color: 'var(--foreground)', 
                                margin: 0, 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap' 
                              }}>
                                {preset.name}
                              </h5>
                              <p style={{ 
                                fontSize: '11px', 
                                color: 'var(--muted-foreground)', 
                                margin: '4px 0 0 0' 
                              }}>
                                {new Date(preset.timestamp).toLocaleDateString('ko-KR')}
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLoad(preset);
                                }}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: 'var(--primary-500)',
                                  color: 'white',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'background 120ms',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'var(--primary-600)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'var(--primary-500)';
                                }}
                              >
                                검색
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onEdit) {
                                    setIsOpen(false);
                                    onEdit(preset);
                                  }
                                }}
                                style={{
                                  padding: '6px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border)',
                                  background: 'var(--card)',
                                  color: 'var(--muted-foreground)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 120ms',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'var(--surface-3)';
                                  e.currentTarget.style.borderColor = 'var(--primary-500)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'var(--card)';
                                  e.currentTarget.style.borderColor = 'var(--border)';
                                }}
                                title="수정"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(preset.id, preset.name);
                                }}
                                style={{
                                  padding: '6px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--error-500)',
                                  background: 'var(--card)',
                                  color: 'var(--error-500)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 120ms',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'var(--card)';
                                }}
                                title="삭제"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

    </>
  );
}

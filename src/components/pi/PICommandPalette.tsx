import { useState, useEffect } from 'react';
import { Search, Filter, FileDown, BarChart3, Grid, Table, Settings, Keyboard } from 'lucide-react';

interface Command {
  id: string;
  name: string;
  description: string;
  icon: any;
  group: string;
  shortcut?: string;
  action: () => void;
}

interface PICommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onFilterOpen?: () => void;
  onExportOpen?: () => void;
  onClusterLabOpen?: () => void;
}

export function PICommandPalette({ 
  isOpen, 
  onClose,
  onFilterOpen,
  onExportOpen,
  onClusterLabOpen,
}: PICommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: Command[] = [
    {
      id: 'filter',
      name: '필터 열기',
      description: '검색 조건 설정',
      icon: Filter,
      group: '빠른 명령',
      shortcut: 'F',
      action: () => {
        onFilterOpen?.();
        onClose();
      },
    },
    {
      id: 'export',
      name: '내보내기',
      description: '결과를 다양한 형식으로 내보내기',
      icon: FileDown,
      group: '빠른 명령',
      shortcut: 'E',
      action: () => {
        onExportOpen?.();
        onClose();
      },
    },
    {
      id: 'cluster-lab',
      name: 'Cluster Lab 열기',
      description: '군집 분석 실행',
      icon: BarChart3,
      group: '분석',
      shortcut: 'C',
      action: () => {
        onClusterLabOpen?.();
        onClose();
      },
    },
    {
      id: 'view-grid',
      name: '카드 보기',
      description: '결과를 카드로 보기',
      icon: Grid,
      group: '보기 전환',
      action: () => {
        console.log('Switch to grid view');
        onClose();
      },
    },
    {
      id: 'view-table',
      name: '테이블 보기',
      description: '결과를 테이블로 보기',
      icon: Table,
      group: '보기 전환',
      action: () => {
        console.log('Switch to table view');
        onClose();
      },
    },
    {
      id: 'shortcuts',
      name: '단축키 보기',
      description: '모든 단축키 확인',
      icon: Keyboard,
      group: '설정',
      shortcut: '?',
      action: () => {
        console.log('Show shortcuts');
        onClose();
      },
    },
    {
      id: 'settings',
      name: '설정',
      description: '앱 설정 열기',
      icon: Settings,
      group: '설정',
      action: () => {
        console.log('Open settings');
        onClose();
      },
    },
  ];

  const filteredCommands = searchQuery
    ? commands.filter(cmd =>
        cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : commands;

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        filteredCommands[selectedIndex]?.action();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(6px)',
        }}
        onClick={onClose}
      />

      {/* Command Palette */}
      <div
        className="fixed z-50 flex flex-col animate-in fade-in slide-in-from-top-4"
        style={{
          left: '50%',
          top: '20%',
          transform: 'translateX(-50%)',
          width: '720px',
          maxWidth: 'calc(100vw - 32px)',
          minWidth: '560px',
          maxHeight: '560px',
          background: 'var(--surface-1)',
          border: '1px solid var(--border-primary)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-2)',
          color: 'var(--text-primary)',
          animationDuration: '180ms',
          animationTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
        }}
      >
        {/* Search Input */}
        <div 
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{
            borderColor: 'var(--border-primary)',
            background: 'var(--surface-1)',
          }}
        >
          <Search className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
          <input
            type="text"
            placeholder="명령 검색 (예: 필터 열기, 내보내기, Cluster Lab...)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent outline-none"
            style={{
              fontSize: '14px',
              fontWeight: 400,
              color: 'var(--text-primary)',
            }}
            autoFocus
          />
          <kbd 
            className="px-2 py-1 rounded text-xs"
            style={{
              background: 'var(--surface-2)',
              color: 'var(--text-secondary)',
              fontFamily: 'monospace',
              border: '1px solid var(--border-primary)',
            }}
          >
            Cmd+K
          </kbd>
        </div>

        {/* Command List */}
        <div 
          className="flex-1 overflow-y-auto p-2"
          style={{
            maxHeight: '460px',
            background: 'var(--surface-1)',
          }}
        >
          {Object.keys(groupedCommands).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div style={{ 
                fontSize: '14px', 
                fontWeight: 500, 
                color: 'var(--text-primary)',
              }}>
                일치하는 명령이 없습니다.
              </div>
              <div className="flex flex-col gap-2">
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: 500, 
                  color: 'var(--text-secondary)', 
                  textAlign: 'center' 
                }}>
                  추천 명령:
                </div>
                <div className="flex gap-2">
                  {commands.slice(0, 3).map(cmd => (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      className="px-3 py-1.5 rounded-lg transition-colors"
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border-primary)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--surface-3)';
                        e.currentTarget.style.borderColor = 'var(--primary-500)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--surface-2)';
                        e.currentTarget.style.borderColor = 'var(--border-primary)';
                      }}
                    >
                      {cmd.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {Object.entries(groupedCommands).map(([group, cmds]) => (
                <div key={group}>
                  <div 
                    className="px-2 py-1 uppercase tracking-wide"
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-tertiary)',
                      letterSpacing: '0.05em',
                      marginBottom: '4px',
                    }}
                  >
                    {group}
                  </div>
                  <div className="flex flex-col gap-1 mt-1">
                    {cmds.map((cmd) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      const isSelected = globalIndex === selectedIndex;
                      
                      return (
                        <button
                          key={cmd.id}
                          onClick={cmd.action}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left"
                          style={{
                            background: isSelected ? 'var(--surface-3)' : 'transparent',
                            border: isSelected ? '1px solid var(--primary-500)' : '1px solid transparent',
                            boxShadow: isSelected ? '0 0 0 2px rgba(37, 99, 235, 0.1)' : 'none',
                          }}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          onMouseLeave={() => {
                            // 선택 상태 유지 (키보드 네비게이션을 위해)
                          }}
                        >
                          <div 
                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{
                              background: isSelected 
                                ? 'linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)'
                                : 'var(--surface-2)',
                            }}
                          >
                            <cmd.icon 
                              className="w-4 h-4" 
                              style={{ 
                                color: isSelected ? '#FFFFFF' : 'var(--muted-foreground)',
                                strokeWidth: 2,
                              }} 
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div style={{ 
                              fontSize: '14px', 
                              fontWeight: 600, 
                              color: isSelected ? 'var(--text-primary)' : 'var(--text-primary)'
                            }}>
                              {cmd.name}
                            </div>
                            <div 
                              className="truncate"
                              style={{ 
                                fontSize: '12px', 
                                fontWeight: 400, 
                                color: 'var(--muted-foreground)',
                                marginTop: '2px',
                              }}
                            >
                              {cmd.description}
                            </div>
                          </div>
                          {cmd.shortcut && (
                            <kbd 
                              className="px-2 py-1 rounded text-xs flex-shrink-0"
                              style={{
                                background: 'var(--surface-2)',
                                color: 'var(--text-secondary)',
                                fontFamily: 'monospace',
                                border: '1px solid var(--border-primary)',
                                fontSize: '11px',
                                fontWeight: 500,
                              }}
                            >
                              {cmd.shortcut}
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

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
          background: 'rgba(0, 0, 0, 0.32)',
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
          background: 'rgba(255, 255, 255, 0.70)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
          animationDuration: '180ms',
          animationTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
        }}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b"
          style={{
            borderColor: 'rgba(17, 24, 39, 0.08)',
          }}
        >
          <Search className="w-5 h-5" style={{ color: '#64748B' }} />
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
              color: '#0F172A',
            }}
            autoFocus
          />
          <kbd 
            className="px-2 py-1 rounded text-xs"
            style={{
              background: 'rgba(17, 24, 39, 0.06)',
              color: '#64748B',
              fontFamily: 'monospace',
              border: '1px solid rgba(17, 24, 39, 0.08)',
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
          }}
        >
          {Object.keys(groupedCommands).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div style={{ fontSize: '14px', fontWeight: 400, color: '#64748B' }}>
                일치하는 명령이 없습니다.
              </div>
              <div className="flex flex-col gap-2">
                <div style={{ fontSize: '12px', fontWeight: 400, color: '#64748B', textAlign: 'center' }}>
                  추천 명령:
                </div>
                <div className="flex gap-2">
                  {commands.slice(0, 3).map(cmd => (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      className="px-3 py-1.5 rounded-lg hover:bg-white/80 transition-colors"
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#64748B',
                        border: '1px solid rgba(17, 24, 39, 0.08)',
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
                      color: '#64748B',
                      letterSpacing: '0.05em',
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
                            background: isSelected ? 'rgba(255, 255, 255, 0.8)' : 'transparent',
                            border: isSelected ? '1px solid rgba(29, 78, 216, 0.2)' : '1px solid transparent',
                            boxShadow: isSelected ? '0 0 0 2px rgba(29, 78, 216, 0.1)' : 'none',
                          }}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                          <div 
                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{
                              background: isSelected 
                                ? 'linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)'
                                : 'rgba(17, 24, 39, 0.06)',
                            }}
                          >
                            <cmd.icon 
                              className="w-4 h-4" 
                              style={{ 
                                color: isSelected ? '#FFFFFF' : '#64748B',
                                strokeWidth: 2,
                              }} 
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                              {cmd.name}
                            </div>
                            <div 
                              className="truncate"
                              style={{ fontSize: '12px', fontWeight: 400, color: '#64748B' }}
                            >
                              {cmd.description}
                            </div>
                          </div>
                          {cmd.shortcut && (
                            <kbd 
                              className="px-2 py-1 rounded text-xs flex-shrink-0"
                              style={{
                                background: 'rgba(17, 24, 39, 0.06)',
                                color: '#64748B',
                                fontFamily: 'monospace',
                                border: '1px solid rgba(17, 24, 39, 0.08)',
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

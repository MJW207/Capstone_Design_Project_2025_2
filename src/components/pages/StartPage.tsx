import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Info } from 'lucide-react';
import { PIQuickActionChip } from '../../ui/pi/PIQuickActionChip';
import { PIPresetMenu } from '../../ui/pi/PIPresetMenu';
import { PIBookmarkMenu } from '../../ui/pi/PIBookmarkMenu';
import { PICommandPalette } from '../../ui/pi/PICommandPalette';
import { PIBookmarkPanel } from '../../ui/pi/PIBookmarkPanel';
import { PIBookmarkButton } from '../../ui/pi/PIBookmarkButton';
import { PIPresetButton } from '../../ui/pi/PIPresetButton';
import { bookmarkManager } from '../../lib/bookmarkManager';
import { presetManager } from '../../lib/presetManager';
import { DarkModeToggle } from '../../lib/DarkModeSystem';

interface StartPageProps {
  onSearch: (query: string) => void;
  onFilterOpen: () => void;
  onPresetApply?: (preset: any) => void;
  currentFilters?: any;
  onPanelDetailOpen?: (panelId: string) => void;
}

export function StartPage({ onSearch, onFilterOpen, onPresetApply, currentFilters = {}, onPanelDetailOpen }: StartPageProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const [isBookmarkOpen, setIsBookmarkOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isBookmarkPanelOpen, setIsBookmarkPanelOpen] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [presetCount, setPresetCount] = useState(0);

  // 북마크 개수 로드
  useEffect(() => {
    const updateBookmarkCount = () => {
      const bookmarks = bookmarkManager.loadBookmarks();
      setBookmarkCount(bookmarks.length);
    };
    updateBookmarkCount();
    // 북마크가 변경될 때마다 개수 업데이트 (간단한 polling 방식)
    const interval = setInterval(updateBookmarkCount, 1000);
    return () => clearInterval(interval);
  }, []);

  // 프리셋 개수 로드
  useEffect(() => {
    const updatePresetCount = () => {
      const presets = presetManager.loadPresets();
      setPresetCount(presets.length);
    };
    updatePresetCount();
    // 프리셋이 변경될 때마다 개수 업데이트 (간단한 polling 방식)
    const interval = setInterval(updatePresetCount, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = () => {
    // 검색어가 없어도 검색 화면으로 전환
    onSearch(query.trim());
  };

  const handleNavigateToBookmark = (panelId: string) => {
    setIsBookmarkPanelOpen(false);
    if (onPanelDetailOpen) {
      onPanelDetailOpen(panelId);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      // / for search focus
      if (e.key === '/' && !isFocused) {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        searchInput?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocused]);

  // 별 생성 - useMemo로 한 번만 생성하여 위치 고정
  const stars = useMemo(() => {
    const starElements = [];
    const starCount = 20; // 별 개수 (과하지 않게)
    
    for (let i = 0; i < starCount; i++) {
      const size = Math.random() < 0.6 ? 'small' : Math.random() < 0.8 ? 'medium' : 'large';
      const left = Math.random() * 100;
      const top = Math.random() * 80; // 상단 80% 영역에만 배치
      const delay = Math.random() * 2;
      
      starElements.push(
        <div
          key={i}
          className={`star star-${size}`}
          style={{
            left: `${left}%`,
            top: `${top}%`,
            animationDelay: `${delay}s`,
          }}
        />
      );
    }
    
    return starElements;
  }, []); // 빈 의존성 배열로 마운트 시 한 번만 생성

  return (
    <div 
      className="flex flex-col relative min-h-screen"
      style={{
        background: 'var(--background)',
      }}
    >
      {/* 별 반짝임 효과 */}
      <div className="stars-container">
        {stars}
      </div>

      {/* Top 20% subtle radial gradient overlay */}
      <div 
        className="absolute inset-x-0 top-0 h-[20%] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(96, 165, 250, 0.08) 0%, transparent 70%)',
        }}
      />

      {/* Minimal Transparent Nav */}
      <nav className="relative z-20 px-20 py-6 flex items-center justify-between">
        <div className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
          Panel Insight
        </div>
        <DarkModeToggle variant="icon" size="sm" position="relative" />
      </nav>

      {/* Hero Section with Background */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Background Group - Extended for seamless appearance */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            top: '-20vh',
            bottom: '-20vh',
            left: 0,
            right: 0,
          }}
        >
          {/* Left Orb - Blue Gradient */}
          <div 
            className="absolute animate-float-slow"
            style={{
              left: '40%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="rounded-full"
              style={{
                width: '620px',
                height: '620px',
                background: 'radial-gradient(circle, #60A5FA 0%, #1D4ED8 100%)',
                filter: 'blur(120px)',
                opacity: 0.28,
              }}
            />
          </div>

          {/* Right Orb - Purple Gradient */}
          <div 
            className="absolute animate-float-slow-delayed"
            style={{
              left: '66%',
              top: '56%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="rounded-full"
              style={{
                width: '580px',
                height: '580px',
                background: 'radial-gradient(circle, #C084FC 0%, #7C3AED 100%)',
                filter: 'blur(120px)',
                opacity: 0.24,
              }}
            />
          </div>

          {/* Subtle Grid Overlay */}
          <div 
            className="absolute"
            style={{
              top: '20vh',
              left: 0,
              right: 0,
              bottom: '20vh',
              backgroundImage: `
                linear-gradient(#0B1220 1px, transparent 1px),
                linear-gradient(90deg, #0B1220 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
              opacity: 0.04,
              mixBlendMode: 'overlay',
            }}
          />
        </div>

        {/* Center Stack - Auto Layout */}
        <div className="relative z-10 flex flex-col items-center gap-3" style={{ width: '720px' }}>
          {/* Title with Gradient */}
          <div className="flex flex-col items-center gap-2">
            <h1
              style={{
                fontSize: '56px',
                fontWeight: 700,
                letterSpacing: '-0.3%',
                lineHeight: '1.2',
                background: 'linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: 'none',
              }}
            >
              Panel Insight
            </h1>
            
            {/* Gradient Underline */}
            <div
              className="rounded-full"
              style={{
                width: '56px',
                height: '1px',
                background: 'linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)',
                opacity: 0.4,
              }}
            />
          </div>

          {/* Subtitle */}
          <p
            className="text-center text-tertiary"
            style={{
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: '140%',
              marginTop: '8px',
            }}
          >
            자연어로 원하는 패널을 찾고, 집단을 이해하세요.
          </p>

          {/* Glass Search Bar */}
          <div className="w-full" style={{ marginTop: '32px' }}>
            <div
              className={`relative w-full transition-all duration-[120ms] ease-[cubic-bezier(0.33,1,0.68,1)] glass ${isFocused ? 'pi-focus-ring-gradient' : ''}`}
              style={{
                height: '56px',
                borderRadius: '16px',
                border: isFocused 
                  ? '1px solid var(--border-accent)' 
                  : '1px solid var(--border)',
                boxShadow: isFocused
                  ? 'var(--shadow-2), 0 0 0 1px var(--glass-border-strong), 0 0 24px rgba(37, 99, 235, 0.15)'
                  : 'var(--shadow-1)',
                transform: isFocused ? 'translateY(-2px)' : 'translateY(0)',
              }}
              onMouseEnter={(e) => {
                if (!isFocused) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(17, 24, 39, 0.12)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isFocused) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(17, 24, 39, 0.08)';
                }
              }}
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="예) 서울 20대 여성, OTT 이용·스킨케어 관심 200명"
                className="w-full h-full px-5 bg-transparent border-none outline-none input"
                style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  background: 'transparent',
                  border: 'none',
                }}
              />

              {/* Trailing Icons */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  type="button"
                  className="p-2 rounded-lg btn--ghost transition-fast group"
                  title="도움말"
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                  }}
                >
                  <Info className="w-[18px] h-[18px] transition-colors" style={{ color: 'var(--muted-foreground)' }} />
                </button>
                
                <button
                  type="button"
                  onClick={onFilterOpen}
                  className="p-2 rounded-lg btn--ghost transition-fast group"
                  title="필터"
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                  }}
                >
                  <Filter className="w-[18px] h-[18px] transition-colors" style={{ color: 'var(--muted-foreground)' }} />
                </button>
                
                <button
                  type="button"
                  onClick={handleSearch}
                  className="p-2 rounded-lg btn--ghost transition-fast group"
                  title="검색"
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                  }}
                >
                  <Search className="w-[18px] h-[18px] transition-colors" style={{ color: 'var(--muted-foreground)' }} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2" style={{ marginTop: '16px' }}>
            <PIPresetButton
              onClick={() => {
                setIsPresetOpen(true);
              }}
              presetCount={presetCount}
              variant="chip"
            />
            <PIBookmarkButton
              onClick={() => setIsBookmarkPanelOpen(!isBookmarkPanelOpen)}
              bookmarkCount={bookmarkCount}
              variant="chip"
            />
            <PIQuickActionChip 
              type="command" 
              onClick={() => setIsCommandPaletteOpen(true)}
            />
          </div>

          {/* Keyboard Shortcuts Hint */}
          <p className="text-center text-disabled" style={{ fontSize: '12px', marginTop: '8px' }}>
            <kbd className="px-2 py-0.5 rounded border text-xs" style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)'
            }}>/</kbd>
            {' '}포커스
          </p>
        </div>
      </div>

      {/* Quick Action Menus */}
      <PIPresetMenu
        isOpen={isPresetOpen}
        onClose={() => setIsPresetOpen(false)}
        onApply={onPresetApply}
        currentFilters={currentFilters}
        anchorPosition="center"
      />

      <PIBookmarkMenu
        isOpen={isBookmarkOpen}
        onClose={() => setIsBookmarkOpen(false)}
        currentQuery={query}
        currentFilters={currentFilters}
        onOpen={(bookmark) => {
          if (bookmark.query) {
            setQuery(bookmark.query);
          }
          // 북마크에 필터가 저장되어 있으면 적용
          if (bookmark.filters && Object.keys(bookmark.filters).length > 0 && onPresetApply) {
            onPresetApply({ filters: bookmark.filters, name: bookmark.title || bookmark.query });
          } else if (bookmark.query) {
            onSearch(bookmark.query);
          }
        }}
      />

      <PICommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onFilterOpen={onFilterOpen}
        onExportOpen={() => {}}
        onClusterLabOpen={() => {}}
      />

      {/* 북마크 패널 */}
      <PIBookmarkPanel
        isOpen={isBookmarkPanelOpen}
        onNavigate={handleNavigateToBookmark}
      />
    </div>
  );
}

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Filter } from 'lucide-react';
import { PIQuickActionChip } from '../../ui/pi/PIQuickActionChip';
import { PIPresetMenu } from '../../ui/pi/PIPresetMenu';
import { PIBookmarkMenu } from '../../ui/pi/PIBookmarkMenu';
import { PICommandPalette } from '../../ui/pi/PICommandPalette';
import { PIBookmarkPanel } from '../../ui/pi/PIBookmarkPanel';
import { PIBookmarkButton } from '../../ui/pi/PIBookmarkButton';
import { PIPresetButton } from '../../ui/pi/PIPresetButton';
import { bookmarkManager } from '../../lib/bookmarkManager';
import { presetManager } from '../../lib/presetManager';
import { DarkModeToggle, useDarkMode } from '../../lib/DarkModeSystem';

interface StartPageProps {
  onSearch: (query: string) => void;
  onFilterOpen: () => void;
  onPresetApply?: (preset: any) => void;
  currentFilters?: any;
  onPanelDetailOpen?: (panelId: string) => void;
}

export function StartPage({ onSearch, onFilterOpen, onPresetApply, currentFilters = {}, onPanelDetailOpen }: StartPageProps) {
  const { isDark } = useDarkMode();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const [isBookmarkOpen, setIsBookmarkOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isBookmarkPanelOpen, setIsBookmarkPanelOpen] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [showFloatAnimation, setShowFloatAnimation] = useState(false);
  const [presetCount, setPresetCount] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [mouseVelocity, setMouseVelocity] = useState({ vx: 0, vy: 0 });
  const heroSectionRef = useRef<HTMLDivElement>(null);
  const lastMousePositionRef = useRef({ x: 0, y: 0 });

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

  // Hero title animation: after initial float-up, start continuous floating
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFloatAnimation(true);
    }, 1200); // 1.2초 후 floating 시작
    return () => clearTimeout(timer);
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

  // 마우스 움직임 추적 - 속도 계산 포함
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroSectionRef.current) {
        const rect = heroSectionRef.current.getBoundingClientRect();
        const newX = e.clientX - rect.left;
        const newY = e.clientY - rect.top;
        
        // 속도 계산 (이전 위치와의 차이)
        const vx = newX - lastMousePositionRef.current.x;
        const vy = newY - lastMousePositionRef.current.y;
        
        setMousePosition({ x: newX, y: newY });
        setMouseVelocity({ vx, vy });
        
        lastMousePositionRef.current = { x: newX, y: newY };
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);


  // 물결 효과 계산 - 마우스가 오브 위를 지나갈 때 물결 생성
  const calculateWaveEffect = (orbCenterX: number, orbCenterY: number) => {
    if (!heroSectionRef.current) {
      return { waveX: 0, waveY: 0, scale: 1, waveIntensity: 0 };
    }

    const rect = heroSectionRef.current.getBoundingClientRect();
    const orbScreenX = rect.left + (rect.width * orbCenterX / 100);
    const orbScreenY = rect.top + (rect.height * orbCenterY / 100);
    
    // 마우스와 오브 중심 간 거리
    const dx = mousePosition.x - (rect.width * orbCenterX / 100);
    const dy = mousePosition.y - (rect.height * orbCenterY / 100);
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 오브 반경 (대략)
    const orbRadius = 310; // 620px / 2
    
    // 마우스가 오브 범위 내에 있는지 확인
    const isInsideOrb = distance < orbRadius * 1.5; // 약간 여유있게
    
    if (!isInsideOrb) {
      return { waveX: 0, waveY: 0, scale: 1, waveIntensity: 0 };
    }
    
    // 거리에 따른 영향력 (가까울수록 강함)
    const influence = Math.max(0, 1 - distance / (orbRadius * 1.5));
    
    // 마우스 속도에 따른 물결 강도
    const speed = Math.sqrt(mouseVelocity.vx * mouseVelocity.vx + mouseVelocity.vy * mouseVelocity.vy);
    const waveIntensity = influence * Math.min(speed / 3, 1);
    
    // 물결 방향 (마우스 움직임 방향)
    const angle = Math.atan2(mouseVelocity.vy, mouseVelocity.vx);
    
    // 원형 파문 효과 (마우스 위치에서 퍼지는 물결)
    const time = Date.now() * 0.002;
    const waveRadius = distance * 0.1; // 거리에 비례한 파문 크기
    const waveAngle = Math.atan2(dy, dx);
    
    // 물결 파형 (여러 레이어로 자연스러운 물결)
    const wave1 = Math.sin(time * 3 - waveRadius * 0.05) * waveIntensity * 20;
    const wave2 = Math.cos(time * 2.5 - waveRadius * 0.08) * waveIntensity * 15;
    
    // 원형으로 퍼지는 물결
    const waveX = Math.cos(waveAngle) * (wave1 + wave2);
    const waveY = Math.sin(waveAngle) * (wave1 + wave2);
    
    // 거리에 따른 스케일 (마우스가 가까울수록 약간 확대)
    const scale = 1 + influence * 0.1;
    
    return {
      waveX,
      waveY,
      scale,
      waveIntensity: waveIntensity,
    };
  };

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
      <div className="stars-container" style={{ zIndex: 0 }}>
        {stars}
      </div>

      {/* Top 20% subtle radial gradient overlay */}
      <div 
        className="absolute inset-x-0 top-0 h-[20%] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(96, 165, 250, 0.08) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />

      {/* Minimal Transparent Nav */}
      <nav className="relative z-20 px-20 py-6 flex items-center justify-between">
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
          }}
        >
          <img 
            src="/panel-insight-icon.svg" 
            alt="Panel Insight"
            style={{
              width: '32px',
              height: '32px',
            }}
          />
          <div className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
            Panel Insight
          </div>
        </button>
        <DarkModeToggle variant="icon" size="sm" position="relative" />
      </nav>

      {/* Hero Section with Background */}
      <div 
        ref={heroSectionRef}
        className="flex-1 flex items-center justify-center relative overflow-hidden"
      >
        {/* Background Group - Extended for seamless appearance */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            top: '-20vh',
            bottom: '-20vh',
            left: 0,
            right: 0,
            zIndex: 0,
          }}
        >
          {/* Left Orb - Blue Gradient (고정 위치, 마우스가 지나갈 때 물결) */}
          {(() => {
            const wave = calculateWaveEffect(40, 50);
            
            return (
              <div 
                className="absolute orb-interactive animate-float-slow"
                style={{
                  left: '40%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${wave.waveX}px), calc(-50% + ${wave.waveY}px)) scale(${wave.scale})`,
                  filter: `blur(${120 - wave.waveIntensity * 20}px)`,
                  willChange: 'transform, filter',
                  transition: 'transform 0.1s ease-out, filter 0.1s ease-out',
                }}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: '620px',
                    height: '620px',
                    background: 'radial-gradient(circle, #60A5FA 0%, #1D4ED8 100%)',
                    opacity: 0.28,
                  }}
                />
              </div>
            );
          })()}

          {/* Right Orb - Purple Gradient (고정 위치, 마우스가 지나갈 때 물결) */}
          {(() => {
            const wave = calculateWaveEffect(66, 56);
            
            return (
              <div 
                className="absolute orb-interactive animate-float-slow-delayed"
                style={{
                  left: '66%',
                  top: '56%',
                  transform: `translate(calc(-50% + ${wave.waveX * 0.8}px), calc(-50% + ${wave.waveY * 0.8}px)) scale(${wave.scale * 0.95})`,
                  filter: `blur(${120 - wave.waveIntensity * 15}px)`,
                  willChange: 'transform, filter',
                  transition: 'transform 0.1s ease-out, filter 0.1s ease-out',
                }}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: '580px',
                    height: '580px',
                    background: 'radial-gradient(circle, #C084FC 0%, #7C3AED 100%)',
                    opacity: 0.24,
                  }}
                />
              </div>
            );
          })()}

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
              opacity: 0.01,
              mixBlendMode: 'overlay',
            }}
          />
        </div>

        {/* Center Stack - Auto Layout */}
        <div className="relative z-20 flex flex-col items-center gap-3" style={{ width: '720px' }}>
          {/* PANEL INSIGHT Typo */}
          <div className="flex flex-col items-center gap-2">
            <h1
              className={`inline-block uppercase font-extrabold ${showFloatAnimation ? 'hero-title-float' : 'hero-title-enter'}`}
              style={{
                fontSize: 'clamp(32px, 5vw, 64px)',
                letterSpacing: '0.18em',
                lineHeight: '1.2',
                background: 'linear-gradient(to right, #4b74ff 0%, #8055ff 50%, #c35bff 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 8px 24px rgba(88, 104, 255, 0.35)',
                filter: 'drop-shadow(0 8px 24px rgba(88, 104, 255, 0.35))',
              }}
            >
              PANEL&nbsp;INSIGHT
            </h1>
            
            {/* Gradient Underline */}
            <div
              className="rounded-full"
              style={{
                width: '56px',
                height: '1px',
                background: 'linear-gradient(135deg, #4b74ff 0%, #8055ff 50%, #c35bff 100%)',
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
              className="relative w-full transition-all duration-[120ms] ease-[cubic-bezier(0.33,1,0.68,1)] glass-search-bar"
              style={{
                height: '56px',
                borderRadius: '20px',
                background: isDark
                  ? isFocused
                    ? 'rgba(0, 0, 0, 0.25)'
                    : 'rgba(0, 0, 0, 0.15)'
                  : isFocused
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                border: isDark
                  ? isFocused
                    ? '1px solid rgba(255, 255, 255, 0.25)'
                    : '1px solid rgba(255, 255, 255, 0.15)'
                  : isFocused
                    ? '1px solid rgba(255, 255, 255, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: isDark
                  ? isFocused
                    ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(255, 255, 255, 0.05), inset 0 0 16px 8px rgba(255, 255, 255, 0.1), 0 0 24px rgba(96, 165, 250, 0.2)'
                    : '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(255, 255, 255, 0.03), inset 0 0 16px 8px rgba(255, 255, 255, 0.05)'
                  : isFocused
                    ? '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(255, 255, 255, 0.1), inset 0 0 16px 8px rgba(255, 255, 255, 0.8), 0 0 24px rgba(37, 99, 235, 0.15)'
                    : '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(255, 255, 255, 0.08), inset 0 0 16px 8px rgba(255, 255, 255, 0.6)',
                transform: isFocused ? 'translateY(-2px)' : 'translateY(0)',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                if (!isFocused) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.background = isDark
                    ? 'rgba(0, 0, 0, 0.2)'
                    : 'rgba(255, 255, 255, 0.13)';
                  e.currentTarget.style.borderColor = isDark
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'rgba(255, 255, 255, 0.28)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isFocused) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = isDark
                    ? 'rgba(0, 0, 0, 0.15)'
                    : 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.borderColor = isDark
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(255, 255, 255, 0.25)';
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

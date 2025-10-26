import React, { useState, useEffect } from 'react';
import { Search, Filter, Info } from 'lucide-react';
import { PIQuickActionChip } from '../pi/PIQuickActionChip';
import { PIPresetMenu } from '../pi/PIPresetMenu';
import { PIBookmarkMenu } from '../pi/PIBookmarkMenu';
import { PICommandPalette } from '../pi/PICommandPalette';

interface StartPageProps {
  onSearch: (query: string) => void;
  onFilterOpen: () => void;
  onPresetApply?: (preset: any) => void;
  currentFilters?: any;
}

export function StartPage({ onSearch, onFilterOpen, onPresetApply, currentFilters = {} }: StartPageProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const [isBookmarkOpen, setIsBookmarkOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query);
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

  return (
    <div 
      className="flex flex-col relative min-h-screen"
      style={{
        background: '#F8FAFC',
      }}
    >
      {/* Top 20% subtle radial gradient overlay */}
      <div 
        className="absolute inset-x-0 top-0 h-[20%] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(96, 165, 250, 0.08) 0%, transparent 70%)',
        }}
      />

      {/* Minimal Transparent Nav */}
      <nav className="relative z-20 px-20 py-6">
        <div className="text-base font-bold text-[#111827]">
          Panel Insight
        </div>
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
            className="text-center"
            style={{
              fontSize: '16px',
              fontWeight: 500,
              color: '#64748B',
              lineHeight: '140%',
              marginTop: '8px',
            }}
          >
            자연어로 원하는 패널을 찾고, 집단을 이해하세요.
          </p>

          {/* Glass Search Bar */}
          <div className="w-full" style={{ marginTop: '32px' }}>
            <div
              className={`
                relative w-full transition-all duration-[120ms] ease-[cubic-bezier(0.33,1,0.68,1)]
                ${isFocused ? 'pi-focus-ring-gradient' : ''}
              `}
              style={{
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.65)',
                backdropFilter: 'blur(16px)',
                border: isFocused 
                  ? '1px solid rgba(29, 78, 216, 0.3)' 
                  : '1px solid rgba(17, 24, 39, 0.08)',
                boxShadow: isFocused
                  ? '0 6px 16px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.25), 0 0 24px rgba(29, 78, 216, 0.15)'
                  : '0 6px 16px rgba(0, 0, 0, 0.06)',
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
                className="w-full h-full px-5 bg-transparent border-none outline-none"
                style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#111827',
                }}
              />

              {/* Trailing Icons */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-black/5 transition-all duration-[120ms] group"
                  title="도움말"
                >
                  <Info className="w-[18px] h-[18px] text-[#475569] group-hover:text-[#111827] transition-colors" />
                </button>
                
                <button
                  type="button"
                  onClick={onFilterOpen}
                  className="p-2 rounded-lg hover:bg-black/5 transition-all duration-[120ms] group"
                  title="필터"
                >
                  <Filter className="w-[18px] h-[18px] text-[#475569] group-hover:text-[#111827] transition-colors" />
                </button>
                
                <button
                  type="button"
                  onClick={handleSearch}
                  className="p-2 rounded-lg hover:bg-black/5 transition-all duration-[120ms] group"
                  title="검색"
                >
                  <Search className="w-[18px] h-[18px] text-[#475569] group-hover:text-[#111827] transition-colors" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2" style={{ marginTop: '16px' }}>
            <PIQuickActionChip 
              type="preset" 
              onClick={() => setIsPresetOpen(true)}
            />
            <PIQuickActionChip 
              type="bookmark" 
              onClick={() => setIsBookmarkOpen(true)}
            />
            <PIQuickActionChip 
              type="command" 
              onClick={() => setIsCommandPaletteOpen(true)}
            />
          </div>

          {/* Keyboard Shortcuts Hint */}
          <p className="text-center" style={{ fontSize: '12px', color: '#94A3B8', marginTop: '8px' }}>
            <kbd className="px-2 py-0.5 bg-white/60 rounded border border-black/10 text-xs">/</kbd>
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
      />

      <PIBookmarkMenu
        isOpen={isBookmarkOpen}
        onClose={() => setIsBookmarkOpen(false)}
        currentQuery={query}
        onOpen={(bookmark) => {
          setQuery(bookmark.query);
          onSearch(bookmark.query);
        }}
      />

      <PICommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onFilterOpen={onFilterOpen}
        onExportOpen={() => console.log('Export')}
        onClusterLabOpen={() => console.log('Cluster Lab')}
      />
    </div>
  );
}

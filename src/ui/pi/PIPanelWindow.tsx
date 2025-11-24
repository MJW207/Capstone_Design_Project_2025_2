import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Pin, Copy, GripVertical } from 'lucide-react';
import { PIBadge } from './PIBadge';
import { PIButton } from './PIButton';
import { PIHashtag, getHashtagColor } from './PIHashtag';
import { PISegmentedControl } from './PISegmentedControl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../base/tabs';

export type WindowSize = 'M' | 'L' | 'XL';

interface PanelData {
  id: string;
  coverage: 'Q+W' | 'W only';
  cluster?: string;
  gender: string;
  age: number;
  region: string;
  income: string;
  tags: string[];
  isPinned?: boolean;
  responses?: Array<{
    title: string;
    answer: string;
    date: string;
  }>;
  evidence?: Array<{
    text: string;
    similarity: number;
  }>;
}

interface PIPanelWindowProps {
  panelData: PanelData;
  size?: WindowSize;
  onClose: () => void;
  onDuplicate?: () => void;
  isFocused?: boolean;
  onFocus?: () => void;
  initialPosition?: { x: number; y: number };
}

export function PIPanelWindow({
  panelData,
  size = 'M',
  onClose,
  onDuplicate,
  isFocused = true,
  onFocus,
  initialPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 },
}: PIPanelWindowProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isPinned, setIsPinned] = useState(panelData.isPinned || false);
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [responseSortOrder, setResponseSortOrder] = useState<'desc' | 'asc'>('desc'); // desc = 최신순
  const windowRef = useRef<HTMLDivElement>(null);

  const sizeMap = {
    M: { width: 720, height: 640 },
    L: { width: 960, height: 720 },
    XL: { width: 1200, height: 820 },
  };

  const dimensions = sizeMap[size];

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    
    onFocus?.();
    setIsDragging(true);
    
    const rect = windowRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Constrain to viewport
      const maxX = window.innerWidth - dimensions.width;
      const maxY = window.innerHeight - dimensions.height;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, dimensions]);

  const handlePin = () => {
    setIsPinned(!isPinned);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(panelData.id);
  };

  // Mock data
  const responses = panelData.responses || [
    { title: '선호하는 OTT 서비스는?', answer: '넷플릭스, 디즈니플러스', date: '2025.10.05' },
    { title: '주말 여가 활동', answer: '카페 방문, 운동', date: '2025.09.28' },
    { title: '스킨케어 관심도', answer: '매우 높음 (5/5)', date: '2025.09.15' },
  ];

  // Sort responses by index (date가 없으므로 인덱스 순서로 정렬)
  const sortedResponses = useMemo(() => {
    const sorted = [...responses];
    // date가 있으면 date로 정렬, 없으면 인덱스 순서 유지
    return sorted.sort((a, b) => {
      if (a.date && b.date) {
        const dateA = new Date(a.date.replace(/\./g, '-')).getTime();
        const dateB = new Date(b.date.replace(/\./g, '-')).getTime();
        return responseSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      }
      // date가 없으면 원래 순서 유지
      return 0;
    });
  }, [responses, responseSortOrder]);

  const evidence = panelData.evidence || [
    { text: '넷플릭스를 주 3회 이상 시청하며, 피부 관리에 관심이 많음', similarity: 0.92 },
    { text: '최근 스킨케어 제품 구매 빈도 증가', similarity: 0.88 },
    { text: 'OTT 구독 서비스에 월 2만원 이상 지출', similarity: 0.85 },
  ];

  return (
    <div
      ref={windowRef}
      className={`fixed flex flex-col bg-white select-none ${isDragging ? 'cursor-grabbing' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(16px)',
        border: isFocused 
          ? '2px solid rgba(29, 78, 216, 0.3)' 
          : '1px solid rgba(17, 24, 39, 0.10)',
        borderRadius: '16px',
        boxShadow: isFocused
          ? '0 12px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.25)'
          : '0 6px 16px rgba(0, 0, 0, 0.08)',
        zIndex: isFocused ? 100 : 90,
        transition: isDragging ? 'none' : 'border 120ms, box-shadow 120ms',
      }}
      onClick={onFocus}
    >
      {/* Draggable Header */}
      <div 
        className={`flex items-center justify-between px-6 py-4 border-b ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          borderColor: 'rgba(17, 24, 39, 0.08)',
          background: isFocused ? 'rgba(37, 99, 235, 0.02)' : 'transparent',
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Gradient Hairline */}
        <div 
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{
            background: 'linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)',
            opacity: isFocused ? 0.6 : 0.4,
          }}
        />

        {/* Left: Panel Info */}
        <div className="flex items-center gap-3">
          <GripVertical className="w-4 h-4" style={{ color: '#94A3B8' }} />
          <div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                {panelData.id}
              </span>
              {isPinned && (
                <Pin className="w-3 h-3" style={{ color: '#2563EB', fill: '#2563EB' }} />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <PIBadge variant={panelData.coverage === 'Q+W' ? 'success' : 'default'} size="sm">
                {panelData.coverage}
              </PIBadge>
              {panelData.cluster && (
                <PIBadge variant="accent" size="sm">
                  {panelData.cluster}
                </PIBadge>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePin();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
            style={{ color: isPinned ? '#2563EB' : '#64748B' }}
            title="핀 고정"
          >
            <Pin className="w-4 h-4" style={{ fill: isPinned ? '#2563EB' : 'none' }} />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate?.();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
            style={{ color: '#64748B' }}
            title="새 창으로"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
            style={{ color: '#64748B' }}
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-6 border-b" style={{ borderColor: 'rgba(17, 24, 39, 0.08)' }}>
          <TabsList className="bg-transparent border-0 h-12">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="history">응답 이력</TabsTrigger>
            <TabsTrigger value="tags">태그·근거</TabsTrigger>
          </TabsList>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <TabsContent value="overview" className="p-6 space-y-6 m-0">
            {/* Basic Info */}
            <div className="space-y-3">
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                기본 정보
              </h3>
              <div className="flex flex-wrap gap-2">
                <PIBadge variant="outline">{panelData.gender}</PIBadge>
                <PIBadge variant="outline">{panelData.age}세</PIBadge>
                <PIBadge variant="outline">{panelData.region}</PIBadge>
                <PIBadge variant="outline">{panelData.income}</PIBadge>
              </div>
            </div>

            {/* Warning for Welcome only */}
            {panelData.coverage === 'W only' && (
              <div 
                className="p-4 rounded-xl"
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                }}
              >
                <p style={{ fontSize: '12px', fontWeight: 500, color: '#D97706' }}>
                  ⚠️ Welcome Survey만 보유한 패널입니다
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                빠른 액션
              </h3>
              <div className="flex flex-col gap-2">
                <PIButton variant="ghost" size="sm" onClick={handleCopyId} className="justify-start">
                  ID 복사
                </PIButton>
                <PIButton variant="ghost" size="sm" className="justify-start">
                  같은 군집 보기
                </PIButton>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="p-6 space-y-4 m-0">
            {/* Sort Control */}
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                응답 이력
              </h3>
              <PISegmentedControl
                options={[
                  { value: 'desc', label: '최신순' },
                  { value: 'asc', label: '오래된순' },
                ]}
                value={responseSortOrder}
                onChange={(v) => setResponseSortOrder(v as 'desc' | 'asc')}
              />
            </div>

            {/* Timeline */}
            <div className="space-y-3">
              {sortedResponses.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl hover:bg-white/80 transition-colors"
                  style={{
                    border: '1px solid rgba(17, 24, 39, 0.06)',
                  }}
                >
                  <div className="mb-2">
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                      {item.title}
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', fontWeight: 400, color: '#64748B' }}>
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tags" className="p-6 space-y-6 m-0">
            {/* Hashtags (수동 태그만) */}
            <div className="space-y-3">
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                태그
              </h3>
              <div className="flex flex-wrap gap-2">
                {panelData.tags.map((tag, idx) => (
                  <PIHashtag key={idx} color={getHashtagColor(tag)}>
                    {tag}
                  </PIHashtag>
                ))}
              </div>
            </div>

            {/* Evidence */}
            <div className="space-y-3">
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                근거 문장 Top 3
              </h3>
              <div className="space-y-2">
                {evidence.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg"
                    style={{
                      background: 'rgba(37, 99, 235, 0.05)',
                      border: '1px solid rgba(37, 99, 235, 0.1)',
                    }}
                  >
                    <p style={{ fontSize: '12px', fontWeight: 400, color: '#0F172A', marginBottom: '8px' }}>
                      "{item.text}"
                    </p>
                    <span 
                      className="inline-flex items-center px-2 py-0.5 rounded-full"
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        background: 'rgba(37, 99, 235, 0.1)',
                        color: '#2563EB',
                      }}
                    >
                      유사도 {(item.similarity * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
              <button 
                className="text-sm underline hover:no-underline transition-all" 
                style={{ color: '#2563EB', fontWeight: 500 }}
              >
                원문 보기
              </button>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

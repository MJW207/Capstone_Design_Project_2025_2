import { useState, useEffect } from 'react';
import { X, Pin, ExternalLink, ArrowLeft, ArrowRight, Download, ChevronRight } from 'lucide-react';
import { PIBadge } from './PIBadge';
import { PIButton } from './PIButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { historyManager } from '../../lib/history';

export type PanelSheetMode = 'single' | 'compareTile';
export type PanelSheetSize = 'M' | 'L' | 'Full';

interface PanelData {
  id: string;
  coverage: 'Q+W' | 'W only';
  cluster?: string;
  gender: string;
  age: number;
  region: string;
  income: string;
  interests: string[];
  isPinned?: boolean;
}

interface PIPanelSheetProps {
  mode?: PanelSheetMode;
  size?: PanelSheetSize;
  panelData: PanelData;
  onClose: () => void;
  onPin?: () => void;
  onNewSheet?: () => void;
  showNavigation?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
}

export function PIPanelSheet({
  mode = 'single',
  size = 'M',
  panelData,
  onClose,
  onPin,
  onNewSheet,
  showNavigation = true,
  onPrevious,
  onNext,
}: PIPanelSheetProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isPinned, setIsPinned] = useState(panelData.isPinned || false);

  // 패널 히스토리 저장
  useEffect(() => {
    const historyItem = historyManager.createPanelHistory(
      panelData.id,
      `패널 ${panelData.id}`,
      panelData
    );
    historyManager.save(historyItem);
  }, [panelData]);

  const widthMap = {
    M: '720px',
    L: '960px',
    Full: '1200px',
  };

  const handlePin = () => {
    setIsPinned(!isPinned);
    onPin?.();
  };

  return (
    <div
      className="flex flex-col bg-white animate-in fade-in zoom-in-95"
      style={{
        width: mode === 'compareTile' ? '100%' : widthMap[size],
        maxHeight: mode === 'compareTile' ? '100%' : '820px',
        height: mode === 'compareTile' ? '100%' : '640px',
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(16px)',
        border: mode === 'compareTile' 
          ? '2px solid rgba(29, 78, 216, 0.2)' 
          : '1px solid rgba(17, 24, 39, 0.10)',
        borderRadius: '16px',
        boxShadow: mode === 'compareTile'
          ? '0 2px 8px rgba(0, 0, 0, 0.04)'
          : '0 6px 16px rgba(0, 0, 0, 0.08)',
        animationDuration: '180ms',
        animationTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b relative"
        style={{
          borderColor: 'rgba(17, 24, 39, 0.08)',
        }}
      >
        {/* Gradient Hairline */}
        <div 
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{
            background: 'linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)',
            opacity: 0.5,
          }}
        />

        {/* Left: Panel Info */}
        <div className="flex items-center gap-3">
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
            onClick={handlePin}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
            style={{ color: isPinned ? '#2563EB' : '#64748B' }}
            title="핀 고정"
          >
            <Pin className="w-4 h-4" style={{ fill: isPinned ? '#2563EB' : 'none' }} />
          </button>
          
          {mode === 'single' && onNewSheet && (
            <button
              onClick={onNewSheet}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
              style={{ color: '#64748B' }}
              title="새 시트로"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
            style={{ color: '#64748B' }}
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-6 border-b" style={{ borderColor: 'rgba(17, 24, 39, 0.08)' }}>
          <TabsList className="bg-transparent border-0 h-12">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="history">응답 이력</TabsTrigger>
            <TabsTrigger value="tags">태그·근거</TabsTrigger>
            <TabsTrigger value="radar">레이더</TabsTrigger>
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

            {/* Interests */}
            <div className="space-y-3">
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                관심사
              </h3>
              <div className="flex flex-wrap gap-2">
                {panelData.interests.map((interest, idx) => (
                  <PIBadge key={idx} variant="secondary">
                    {interest}
                  </PIBadge>
                ))}
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
                  ⚠ Welcome Survey만 보유한 패널입니다
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                빠른 액션
              </h3>
              <div className="flex flex-col gap-2">
                <button className="flex items-center justify-between p-3 rounded-lg hover:bg-black/5 transition-colors text-left"
                  style={{ border: '1px solid rgba(17, 24, 39, 0.08)' }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>
                    딥링크 복사
                  </span>
                  <ChevronRight className="w-4 h-4" style={{ color: '#64748B' }} />
                </button>
                <button className="flex items-center justify-between p-3 rounded-lg hover:bg-black/5 transition-colors text-left"
                  style={{ border: '1px solid rgba(17, 24, 39, 0.08)' }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>
                    ID 복사
                  </span>
                  <ChevronRight className="w-4 h-4" style={{ color: '#64748B' }} />
                </button>
                <button className="flex items-center justify-between p-3 rounded-lg hover:bg-black/5 transition-colors text-left"
                  style={{ border: '1px solid rgba(17, 24, 39, 0.08)' }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>
                    같은 군집 보기
                  </span>
                  <ChevronRight className="w-4 h-4" style={{ color: '#64748B' }} />
                </button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="p-6 space-y-4 m-0">
            {/* Filter bar */}
            <div className="flex items-center gap-2 p-3 rounded-lg"
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                border: '1px solid rgba(17, 24, 39, 0.08)',
              }}
            >
              <input
                type="text"
                placeholder="검색..."
                className="flex-1 bg-transparent border-0 outline-none text-sm"
              />
            </div>

            {/* Timeline */}
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="p-4 rounded-xl hover:bg-white/80 transition-colors"
                  style={{
                    border: '1px solid rgba(17, 24, 39, 0.06)',
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                      설문 제목 {item}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 400, color: '#64748B' }}>
                      2025.10.{10 + item}
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', fontWeight: 400, color: '#64748B' }}>
                    응답 내용이 여기에 표시됩니다...
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tags" className="p-6 space-y-6 m-0">
            {/* Auto Tags */}
            <div className="space-y-3">
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                자동 태그
              </h3>
              <div className="flex flex-wrap gap-2">
                {['활동적', '기술친화적', '소셜'].map((tag, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{
                      background: 'rgba(37, 99, 235, 0.08)',
                      border: '1px solid rgba(37, 99, 235, 0.2)',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#2563EB' }}>
                      {tag}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748B' }}>
                      {90 - idx * 5}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence */}
            <div className="space-y-3">
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                근거 문장 Top 3
              </h3>
              <div className="space-y-2">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="p-3 rounded-lg"
                    style={{
                      background: 'rgba(255, 255, 255, 0.5)',
                      border: '1px solid rgba(17, 24, 39, 0.06)',
                    }}
                  >
                    <p style={{ fontSize: '12px', fontWeight: 400, color: '#0F172A' }}>
                      "{item}번째 근거 문장이 여기에 표시됩니다..."
                    </p>
                  </div>
                ))}
              </div>
              <button className="text-sm underline" style={{ color: '#2563EB' }}>
                원문 보기
              </button>
            </div>
          </TabsContent>

          <TabsContent value="radar" className="p-6 m-0">
            <div className="flex items-center justify-center h-64"
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                border: '1px solid rgba(17, 24, 39, 0.08)',
                borderRadius: '12px',
              }}
            >
              <p style={{ fontSize: '14px', fontWeight: 400, color: '#64748B' }}>
                레이더 차트 (개인 vs 집단)
              </p>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer */}
      {showNavigation && (
        <div className="flex items-center justify-between px-6 py-4 border-t"
          style={{
            borderColor: 'rgba(17, 24, 39, 0.08)',
          }}
        >
          <div className="flex items-center gap-2">
            <PIButton variant="ghost" size="small" onClick={onPrevious}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              이전
            </PIButton>
            <PIButton variant="ghost" size="small" onClick={onNext}>
              다음
              <ArrowRight className="w-4 h-4 ml-1" />
            </PIButton>
          </div>

          <div className="flex items-center gap-2">
            <PIButton variant="ghost" size="small">
              선택목록 추가
            </PIButton>
            <PIButton variant="ghost" size="small">
              <Download className="w-4 h-4 mr-1" />
              CSV
            </PIButton>
          </div>
        </div>
      )}
    </div>
  );
}

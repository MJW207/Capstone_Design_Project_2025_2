import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import { PIBadge } from '../pi/PIBadge';
import { PIChip } from '../pi/PIChip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { searchApi } from '../../lib/utils';

interface PanelDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  panelId: string;
}

interface PanelResponse {
  key: string;
  title: string;
  answer: string;
  date: string;
}

interface PanelEvidence {
  text: string;
  source: string;
  similarity?: number | null;
}

interface Panel {
  id: string;
  name: string;
  age: number;
  gender: string;
  region: string;
  income?: string;
  responses: PanelResponse[] | any;  // 백엔드 응답 구조에 맞춰 배열 또는 객체
  tags?: string[];
  evidence?: PanelEvidence[];
  aiSummary?: string;
  created_at: string;
  coverage?: 'qw' | 'w' | string;
  embedding?: number[];
}

export function PanelDetailDrawer({ isOpen, onClose, panelId }: PanelDetailDrawerProps) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 패널 데이터 로드
  useEffect(() => {
    if (isOpen && panelId) {
      loadPanel();
    }
  }, [isOpen, panelId]);

  const loadPanel = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const panelData = await searchApi.getPanel(panelId);
      setPanel(panelData);
    } catch (err) {
      setError('패널 정보를 불러오는데 실패했습니다.');
      console.error('Panel load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-40" style={{ backdropFilter: 'blur(8px)' }} />
        <div className="fixed right-0 top-0 h-full w-[520px] bg-white shadow-2xl z-50 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>패널 정보 로딩 중...</span>
          </div>
        </div>
      </>
    );
  }

  if (error || !panel) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-40" style={{ backdropFilter: 'blur(8px)' }} />
        <div className="fixed right-0 top-0 h-full w-[520px] bg-white shadow-2xl z-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || '패널을 찾을 수 없습니다.'}</p>
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              닫기
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Overlay with Enhanced Blur */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        style={{ backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[520px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-[var(--duration-base)]">
        {/* Header with Gradient Border */}
        <div className="relative px-6 py-5 border-b border-[var(--neutral-200)]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--accent-blue)] to-transparent opacity-50" />
          
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">{panel.name}</h2>
                <PIBadge kind={panel.coverage === 'qw' ? 'coverage-qw' : 'coverage-w'}>
                  {panel.coverage === 'qw' ? 'Q+W' : 'W'}
                </PIBadge>
              </div>
              <p className="text-sm text-gray-600 mt-1">ID: {panel.id}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--neutral-100)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start px-6 border-b border-[var(--neutral-200)]">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="responses">응답이력</TabsTrigger>
            <TabsTrigger value="tags">태그/근거</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* AI Summary */}
            {panel.aiSummary && (
              <div className="p-4 bg-[rgba(37,99,235,0.06)] rounded-xl border border-[rgba(37,99,235,0.18)]">
                <h3 className="text-sm font-semibold text-[#2563EB] mb-2">AI 요약</h3>
                <p className="text-sm text-[var(--neutral-700)] leading-relaxed">{panel.aiSummary}</p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold">기본 정보</h3>
              <div className="flex flex-wrap gap-2">
                {panel.gender && <PIChip type="tag">{panel.gender}</PIChip>}
                {panel.age > 0 && <PIChip type="tag">{panel.age}세</PIChip>}
                {panel.region && <PIChip type="tag">{panel.region}</PIChip>}
                {panel.income && <PIChip type="tag">소득: {panel.income}</PIChip>}
                <PIChip type="tag">생성일: {new Date(panel.created_at).toLocaleDateString()}</PIChip>
              </div>
            </div>

            {/* 응답 내용 요약 */}
            {panel.responses && Array.isArray(panel.responses) && panel.responses.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">응답 내용 요약</h3>
                <div className="space-y-3">
                  {panel.responses.slice(0, 3).map((response, i) => (
                    <div key={i} className="p-3 bg-[var(--neutral-50)] rounded-lg">
                      <h4 className="text-sm font-medium text-[var(--neutral-700)] mb-1">{response.title || response.key}</h4>
                      <p className="text-sm text-[var(--neutral-600)] line-clamp-2">{response.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Responses Tab */}
          <TabsContent value="responses" className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            <h3 className="font-semibold">응답 이력</h3>
            
            {panel.responses && Array.isArray(panel.responses) && panel.responses.length > 0 ? (
              <div className="space-y-3">
                {panel.responses.map((response, i) => (
                  <div key={i} className="p-4 bg-white border border-[var(--neutral-200)] rounded-xl space-y-2 hover:border-[var(--accent-blue)] transition-colors">
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-medium">{response.title || response.key}</h4>
                      <span className="text-xs text-[var(--neutral-600)]">{response.date || new Date(panel.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-[var(--neutral-600)] whitespace-pre-wrap">{response.answer}</p>
                  </div>
                ))}
              </div>
            ) : panel.responses && !Array.isArray(panel.responses) && Object.keys(panel.responses).length > 0 ? (
              // 기존 객체 형태 응답 (하위 호환성)
              Object.entries(panel.responses).map(([key, value], i) => (
                <div key={i} className="p-4 bg-white border border-[var(--neutral-200)] rounded-xl space-y-2 hover:border-[var(--accent-blue)] transition-colors">
                  <div className="flex items-start justify-between">
                    <h4 className="text-sm font-medium">{key}</h4>
                    <span className="text-xs text-[var(--neutral-600)]">{new Date(panel.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-[var(--neutral-600)]">{String(value)}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-[var(--neutral-500)]">
                <p>응답 이력이 없습니다.</p>
              </div>
            )}
          </TabsContent>

          {/* Tags/Evidence Tab */}
          <TabsContent value="tags" className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <div className="space-y-6">
              {/* 태그 섹션 */}
              <div className="space-y-4">
                <h3 className="font-semibold">태그</h3>
                {panel.tags && panel.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {panel.tags.map((tag, i) => (
                      <PIChip key={i} type="tag" selected>
                        {tag}
                      </PIChip>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--neutral-500)]">태그가 없습니다.</p>
                )}
              </div>

              {/* 근거 섹션 */}
              <div className="space-y-4">
                <h3 className="font-semibold">근거 문장 {panel.evidence && panel.evidence.length > 0 ? `TOP ${Math.min(panel.evidence.length, 10)}` : ''}</h3>
                {panel.evidence && panel.evidence.length > 0 ? (
                  <div className="space-y-3">
                    {panel.evidence.slice(0, 10).map((evidence, i) => (
                      <div key={i} className="p-4 bg-[var(--neutral-50)] rounded-xl border border-[var(--neutral-200)] hover:border-[var(--accent-blue)] transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-medium text-[var(--accent-blue)]">{evidence.source}</span>
                          {evidence.similarity !== null && evidence.similarity !== undefined && (
                            <span className="text-xs font-semibold text-[var(--accent-blue)]">
                              유사도 {Math.round(evidence.similarity * 100)}%
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[var(--neutral-700)] whitespace-pre-wrap leading-relaxed">{evidence.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--neutral-500)]">근거 데이터가 없습니다.</p>
                )}
              </div>

              {/* 기본 특성 섹션 */}
              <div className="space-y-4">
                <h3 className="font-semibold">기본 특성</h3>
                <div className="p-4 bg-gradient-to-br from-[var(--accent-blue)]/5 to-transparent rounded-xl border border-[var(--accent-blue)]/20">
                  <div className="flex flex-wrap gap-2">
                    {panel.gender && <PIChip type="tag">{panel.gender}</PIChip>}
                    {panel.age > 0 && <PIChip type="tag">{panel.age}세</PIChip>}
                    {panel.region && <PIChip type="tag">{panel.region}</PIChip>}
                    {panel.income && <PIChip type="tag">소득: {panel.income}</PIChip>}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

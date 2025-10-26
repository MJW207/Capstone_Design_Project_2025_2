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

interface Panel {
  id: string;
  name: string;
  age: number;
  gender: string;
  region: string;
  responses: any;
  created_at: string;
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
                <PIBadge kind="coverage-qw">
                  Q+W
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
            <div className="space-y-4">
              <h3 className="font-semibold">기본 정보</h3>
              <div className="flex flex-wrap gap-2">
                <PIChip type="tag">{panel.gender}</PIChip>
                <PIChip type="tag">{panel.age}세</PIChip>
                <PIChip type="tag">{panel.region}</PIChip>
                <PIChip type="tag">생성일: {new Date(panel.created_at).toLocaleDateString()}</PIChip>
              </div>
            </div>

            {panel.responses && Object.keys(panel.responses).length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">응답 내용</h3>
                <div className="space-y-3">
                  {Object.entries(panel.responses).map(([key, value], i) => (
                    <div key={i} className="p-3 bg-[var(--neutral-50)] rounded-lg">
                      <h4 className="text-sm font-medium text-[var(--neutral-700)] mb-1">{key}</h4>
                      <p className="text-sm text-[var(--neutral-600)]">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 bg-[var(--neutral-50)] rounded-xl">
              <p className="text-sm text-[var(--neutral-600)]">
                이 패널의 상세 정보와 응답 내용을 확인할 수 있습니다. 
                패널의 특성과 관심사를 파악하여 더 나은 분석을 제공합니다.
              </p>
            </div>
          </TabsContent>

          {/* Responses Tab */}
          <TabsContent value="responses" className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            <h3 className="font-semibold">응답 이력</h3>
            
            {panel.responses && Object.keys(panel.responses).length > 0 ? (
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
            <div className="space-y-4">
              <h3 className="font-semibold">패널 특성</h3>
              <p className="text-sm text-[var(--neutral-600)]">
                이 패널의 주요 특성과 응답 패턴입니다.
              </p>

              <div className="space-y-3">
                <div className="p-4 bg-gradient-to-br from-[var(--accent-blue)]/5 to-transparent rounded-xl border border-[var(--accent-blue)]/20">
                  <h4 className="text-sm font-medium mb-2">기본 특성</h4>
                  <div className="flex flex-wrap gap-2">
                    <PIChip type="tag">{panel.gender}</PIChip>
                    <PIChip type="tag">{panel.age}세</PIChip>
                    <PIChip type="tag">{panel.region}</PIChip>
                  </div>
                </div>

                {panel.responses && Object.keys(panel.responses).length > 0 && (
                  <div className="p-4 bg-gradient-to-br from-[var(--accent-blue)]/5 to-transparent rounded-xl border border-[var(--accent-blue)]/20">
                    <h4 className="text-sm font-medium mb-2">응답 키워드</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(panel.responses).map((key, i) => (
                        <PIChip key={i} type="tag" selected>
                          {key}
                        </PIChip>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Loader2, User, MapPin, Calendar, DollarSign, Briefcase, 
  GraduationCap, Home, Car, Smartphone, Heart, Users, 
  MessageSquare, Tag, Sparkles, FileText, CheckCircle2, BarChart3
} from 'lucide-react';
import { PIBadge } from '../../ui/pi/PIBadge';
import { PIChip } from '../../ui/pi/PIChip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/base/tabs';
import { searchApi } from '../../lib/utils';
import { historyManager } from '../../lib/history';

interface PanelDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  panelId: string;
  searchResults?: any[];
  query?: string;
}

interface PanelResponse {
  key: string;
  category?: string;
  title: string;
  answer: string;
  date: string;
}

interface PanelEvidence {
  text: string;
  source: string;
  similarity?: number | null;
}

interface PanelData {
  id: string;
  name: string;
  gender: string;
  age: number;
  region: string;
  income: string;
  coverage?: 'qw' | 'w';
  tags: string[];
  responses: PanelResponse[];
  evidence: PanelEvidence[];
  aiSummary: string;
  created_at: string;
  metadata?: {
    결혼여부?: string;
    자녀수?: number;
    가족수?: string;
    최종학력?: string;
    직업?: string;
    직무?: string;
    "월평균 개인소득"?: string;
    "월평균 가구소득"?: string;
    보유전제품?: string[];
    "보유 휴대폰 단말기 브랜드"?: string;
    "보유 휴대폰 모델명"?: string;
    보유차량여부?: string;
    "자동차 제조사"?: string;
    "자동차 모델"?: string;
    자동차제조사?: string;
    자동차모델?: string;
    흡연경험?: string[];
    "흡연경험 담배브랜드"?: string[] | string;
    "궐련형 전자담배/가열식 전자담배 이용경험"?: string[] | string;
    "음용경험 술"?: string[];
    [key: string]: any;
  };
}

export function PanelDetailDrawer({ isOpen, onClose, panelId, searchResults = [], query = '' }: PanelDetailDrawerProps) {
  const [panel, setPanel] = useState<PanelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clusterInfo, setClusterInfo] = useState<{ clusterId: number; clusterData: any } | null>(null);
  
  // 리사이즈 및 드래그 상태
  const [size, setSize] = useState({ width: 520, height: window.innerHeight });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string>('');
  const drawerRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  // 초기 크기 및 위치를 중앙 모달로 설정 (4:3 비율)
  useEffect(() => {
    if (isOpen) {
      // 4:3 비율로 계산 (더 큰 기본 사이즈)
      const baseWidth = Math.min(1200, Math.floor(window.innerWidth * 0.85));
      const baseHeight = Math.floor(baseWidth * 0.75); // 4:3 비율
      const maxHeight = Math.floor(window.innerHeight * 0.9);
      
      setSize({
        width: baseWidth,
        height: Math.min(baseHeight, maxHeight),
      });
      setPosition({ x: 0, y: 0 }); // 중앙 정렬이므로 x, y는 0
    }
  }, [isOpen]);

  // 리사이즈 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    if (drawerRef.current) {
      const rect = drawerRef.current.getBoundingClientRect();
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
      };
    }
  }, []);

  // 드래그 핸들러
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // 리사이즈 핸들 클릭 시 드래그 방지
    if ((e.target as HTMLElement).closest('[class*="resize"]') || 
        (e.target as HTMLElement).closest('[data-resize-handle]')) {
      return;
    }
    
    // 헤더 영역에서만 드래그 가능
    if (!(e.target as HTMLElement).closest('.panel-detail-header')) {
      return;
    }
    
    e.preventDefault();
    setIsDragging(true);
    if (drawerRef.current) {
      const rect = drawerRef.current.getBoundingClientRect();
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      };
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 리사이즈 처리
      if (isResizing && resizeStartRef.current) {
        const deltaX = e.clientX - resizeStartRef.current.x;
        const deltaY = e.clientY - resizeStartRef.current.y;
        
        let newWidth = resizeStartRef.current.width;
        let newHeight = resizeStartRef.current.height;
        
        const maxWidth = window.innerWidth * 0.95;
        const minWidth = 400;
        const maxHeight = window.innerHeight * 0.95;
        const minHeight = 500;
        
        if (resizeDirection.includes('right')) {
          newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartRef.current.width + deltaX));
        }
        if (resizeDirection.includes('left')) {
          newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartRef.current.width - deltaX));
        }
        if (resizeDirection.includes('bottom')) {
          newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStartRef.current.height + deltaY));
        }
        if (resizeDirection.includes('top')) {
          newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStartRef.current.height - deltaY));
        }
        
        if (resizeDirection.includes('right-bottom')) {
          newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartRef.current.width + deltaX));
          newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStartRef.current.height + deltaY));
        }
        
        setSize({ width: newWidth, height: newHeight });
      }
      
      // 드래그 처리
      if (isDragging && dragStartRef.current && drawerRef.current) {
        const rect = drawerRef.current.getBoundingClientRect();
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // 중앙 기준으로 위치 계산
        const newX = e.clientX - centerX - (dragStartRef.current.offsetX - rect.width / 2);
        const newY = e.clientY - centerY - (dragStartRef.current.offsetY - rect.height / 2);
        
        // 화면 밖으로 나가지 않도록 제한
        const maxX = (window.innerWidth - rect.width) / 2;
        const maxY = (window.innerHeight - rect.height) / 2;
        
        setPosition({
          x: Math.max(-maxX, Math.min(maxX, newX)),
          y: Math.max(-maxY, Math.min(maxY, newY)),
        });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setIsDragging(false);
      setResizeDirection('');
      resizeStartRef.current = null;
      dragStartRef.current = null;
    };

    if (isResizing || isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, isDragging, resizeDirection]);

  // 패널 데이터 로드
  useEffect(() => {
    if (isOpen && panelId) {
      loadPanel();
    }
  }, [isOpen, panelId]);

  // 군집 정보 로드 (API에서 가져오기)
  useEffect(() => {
    if (!isOpen || !panelId) {
      setClusterInfo(null);
      return;
    }

    let isMounted = true;

    const loadClusterInfo = async () => {
      try {
        console.log('[군집 정보] ========== 로드 시작 ==========');
        console.log('[군집 정보] panelId:', panelId, 'isOpen:', isOpen);
        
        // 1. 패널의 군집 ID 가져오기
        console.log('[군집 정보] [1단계] getPanelClusterMapping 호출 시작');
        const mappingResponse = await searchApi.getPanelClusterMapping([panelId], 'hdbscan_default');
        console.log('[군집 정보] [1단계] 매핑 응답:', mappingResponse);
        
        if (!isMounted) {
          console.warn('[군집 정보] 컴포넌트가 언마운트됨 (1단계)');
          return;
        }
        
        if (!mappingResponse) {
          console.warn('[군집 정보] [1단계 실패] mappingResponse가 null/undefined');
          setClusterInfo(null);
          return;
        }
        
        if (!mappingResponse.mappings) {
          console.warn('[군집 정보] [1단계 실패] mappings 필드가 없음:', Object.keys(mappingResponse));
          setClusterInfo(null);
          return;
        }
        
        const mappings = mappingResponse.mappings;
        console.log('[군집 정보] [1단계] mappings 배열:', mappings.length, '개');
        
        if (!Array.isArray(mappings) || mappings.length === 0) {
          console.warn('[군집 정보] [1단계 실패] mappings가 배열이 아니거나 비어있음');
          setClusterInfo(null);
          return;
        }
        
        // panel_id 매칭 (정규화하여 비교)
        const normalizedPanelId = String(panelId).trim().toLowerCase();
        console.log('[군집 정보] [1단계] 정규화된 panelId:', normalizedPanelId);
        console.log('[군집 정보] [1단계] 매핑 항목 샘플:', mappings.slice(0, 3).map((m: any) => ({
          panel_id: m.panel_id,
          found: m.found,
          cluster_id: m.cluster_id
        })));
        
        // panel_id 매칭 (정규화하여 비교, found 체크는 나중에)
        const panelMapping = mappings.find((m: any) => {
          if (!m) return false;
          const normalizedMappingId = String(m.panel_id || '').trim().toLowerCase();
          const match = normalizedMappingId === normalizedPanelId;
          if (match) {
            console.log('[군집 정보] [1단계] 매칭 발견:', {
              panel_id: m.panel_id,
              cluster_id: m.cluster_id,
              found: m.found,
              normalizedMappingId,
              normalizedPanelId
            });
          }
          return match;
        });
        
        if (!panelMapping) {
          console.warn('[군집 정보] [1단계 실패] panelMapping을 찾을 수 없음');
          console.warn('[군집 정보] [1단계] 요청한 panelId:', panelId);
          console.warn('[군집 정보] [1단계] 정규화된 panelId:', normalizedPanelId);
          console.warn('[군집 정보] [1단계] 사용 가능한 panel_id 목록:', mappings.map((m: any) => ({
            panel_id: m.panel_id,
            normalized: String(m.panel_id || '').trim().toLowerCase(),
            found: m.found
          })));
          setClusterInfo(null);
          return;
        }
        
        if (!panelMapping.found) {
          console.warn('[군집 정보] [1단계 실패] panelMapping.found가 false - 패널이 Precomputed 데이터에 없음');
          console.warn('[군집 정보] [1단계] panel_id:', panelMapping.panel_id);
          setClusterInfo(null);
          return;
        }
        
        // 군집 0 (노이즈) 또는 -1 제외
        const clusterId = panelMapping.cluster_id;
        console.log('[군집 정보] [1단계] 찾은 clusterId:', clusterId, '타입:', typeof clusterId);
        
        if (clusterId === null || clusterId === undefined || clusterId === -1 || clusterId === 0) {
          console.warn('[군집 정보] [1단계 실패] 유효하지 않은 clusterId:', clusterId);
          setClusterInfo(null);
          return;
        }
        
        console.log('[군집 정보] [1단계] ✅ 성공 - clusterId:', clusterId);

        // 2. 군집 프로필 정보 가져오기
        console.log('[군집 정보] [2단계] getClusterProfiles 호출 시작');
        const profilesResponse = await searchApi.getClusterProfiles();
        console.log('[군집 정보] [2단계] 프로필 응답 원본:', profilesResponse);
        console.log('[군집 정보] [2단계] 응답 타입:', typeof profilesResponse, 'isArray:', Array.isArray(profilesResponse));
        
        if (!isMounted) {
          console.warn('[군집 정보] 컴포넌트가 언마운트됨 (2단계)');
          return;
        }
        
        if (!profilesResponse) {
          console.warn('[군집 정보] [2단계 실패] 프로필 응답이 없음');
          setClusterInfo(null);
          return;
        }
        
        // 응답 형식 확인: { success: true, data: [...] } 또는 직접 배열
        let profiles: any[] = [];
        if (Array.isArray(profilesResponse)) {
          console.log('[군집 정보] [2단계] 응답이 직접 배열');
          profiles = profilesResponse;
        } else if (profilesResponse && typeof profilesResponse === 'object') {
          console.log('[군집 정보] [2단계] 응답이 객체, keys:', Object.keys(profilesResponse));
          // data 필드가 있으면 사용
          if ('data' in profilesResponse && Array.isArray(profilesResponse.data)) {
            console.log('[군집 정보] [2단계] data 필드에서 배열 추출');
            profiles = profilesResponse.data;
          } else {
            console.warn('[군집 정보] [2단계] data 필드가 없거나 배열이 아님');
          }
        }
        
        console.log('[군집 정보] [2단계] 파싱된 프로필 목록:', profiles.length, '개');
        if (profiles.length > 0) {
          console.log('[군집 정보] [2단계] 프로필 cluster 값들 (처음 5개):', profiles.slice(0, 5).map((p: any) => ({
            cluster: p.cluster,
            cluster_id: p.cluster_id,
            name: p.name
          })));
        }
        
        if (!Array.isArray(profiles) || profiles.length === 0) {
          console.warn('[군집 정보] [2단계 실패] 프로필 목록이 비어있음');
          setClusterInfo(null);
          return;
        }
        
        // cluster 필드로 매칭 (숫자 비교, 타입 안전)
        const targetClusterId = Number(clusterId);
        console.log('[군집 정보] [2단계] 찾을 clusterId:', targetClusterId, '타입:', typeof targetClusterId);
        
        const clusterProfile = profiles.find((p: any) => {
          if (!p || typeof p !== 'object') return false;
          
          // cluster 필드 찾기
          let pCluster: number | null = null;
          if (p.cluster !== undefined && p.cluster !== null) {
            pCluster = Number(p.cluster);
          } else if (p.cluster_id !== undefined && p.cluster_id !== null) {
            pCluster = Number(p.cluster_id);
          }
          
          if (pCluster === null || isNaN(pCluster)) return false;
          
          const match = pCluster === targetClusterId;
          if (match) {
            console.log('[군집 정보] [2단계] 매칭 성공:', {
              profile_cluster: pCluster,
              target_cluster: targetClusterId,
              name: p.name
            });
          }
          return match;
        });

        if (!clusterProfile) {
          console.warn('[군집 정보] [2단계 실패] 프로필을 찾을 수 없음. clusterId:', targetClusterId);
          console.warn('[군집 정보] [2단계] 사용 가능한 cluster 값들:', profiles.map((p: any) => p.cluster || p.cluster_id));
          setClusterInfo(null);
          return;
        }
        
        console.log('[군집 정보] [2단계] ✅ 성공 - 찾은 프로필:', {
          cluster: clusterProfile.cluster,
          name: clusterProfile.name,
          size: clusterProfile.size,
          has_insights_storytelling: !!clusterProfile.insights_storytelling,
          has_tags: !!clusterProfile.tags,
          has_tags_hierarchical: !!clusterProfile.tags_hierarchical
        });

        // 군집 색상 계산
        const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#14B8A6'];
        const colorIndex = Number(clusterId) % colors.length;
        
        // tags 추출
        let tags: string[] = [];
        if (clusterProfile.tags && Array.isArray(clusterProfile.tags) && clusterProfile.tags.length > 0) {
          tags = clusterProfile.tags.filter((t: any) => t && typeof t === 'string');
        } else if (clusterProfile.tags_hierarchical) {
          const primaryTags = clusterProfile.tags_hierarchical.primary || [];
          const secondaryTags = clusterProfile.tags_hierarchical.secondary || [];
          const lifestyleTags = clusterProfile.tags_hierarchical.lifestyle || [];
          tags = [
            ...primaryTags.map((t: any) => {
              if (typeof t === 'string') return t;
              return t?.label || t?.name || String(t);
            }),
            ...secondaryTags.map((t: any) => {
              if (typeof t === 'string') return t;
              return t?.label || t?.name || String(t);
            }),
            ...lifestyleTags.map((t: any) => {
              if (typeof t === 'string') return t;
              return t?.label || t?.name || String(t);
            })
          ].filter((t: string) => t && t.trim().length > 0);
        }
        
        // description 추출 (insights_storytelling 우선)
        let description = '';
        if (clusterProfile.insights_storytelling) {
          if (clusterProfile.insights_storytelling.who?.[0]?.message) {
            description = clusterProfile.insights_storytelling.who[0].message;
          } else if (clusterProfile.insights_storytelling.why?.[0]?.message) {
            description = clusterProfile.insights_storytelling.why[0].message;
          } else if (clusterProfile.insights_storytelling.what?.[0]?.message) {
            description = clusterProfile.insights_storytelling.what[0].message;
          }
        }
        
        if (!description && clusterProfile.insights && Array.isArray(clusterProfile.insights) && clusterProfile.insights.length > 0) {
          description = clusterProfile.insights[0];
        }
        
        if (!description && clusterProfile.description) {
          description = clusterProfile.description;
        }
        
        // name 추출
        const name = clusterProfile.name || 
                    clusterProfile.name_main || 
                    clusterProfile.segments?.name_main ||
                    clusterProfile.segments?.name ||
                    `클러스터 ${clusterId}`;
        
        if (!isMounted) return;
        
        const finalClusterInfo = {
          clusterId: Number(clusterId),
          clusterData: {
            size: Number(clusterProfile.size || 0),
            color: colors[colorIndex],
            name: String(name || `클러스터 ${clusterId}`),
            tags: Array.isArray(tags) ? tags : [],
            description: String(description || ''),
          }
        };
        
        console.log('[군집 정보] [3단계] 최종 설정할 데이터:', finalClusterInfo);
        console.log('[군집 정보] [3단계] setClusterInfo 호출 전');
        setClusterInfo(finalClusterInfo);
        console.log('[군집 정보] [3단계] setClusterInfo 호출 후');
        console.log('[군집 정보] ========== 로드 완료 ==========');
      } catch (err) {
        console.error('[군집 정보 로드] ========== 에러 발생 ==========');
        console.error('[군집 정보 로드] 에러 상세:', err);
        console.error('[군집 정보 로드] 에러 스택:', (err as Error)?.stack);
        if (isMounted) {
          setClusterInfo(null);
        }
      }
    };

    loadClusterInfo();
    
    return () => {
      isMounted = false;
    };
  }, [isOpen, panelId]);

  // clusterInfo 상태 변경 감지 (디버깅용)
  useEffect(() => {
    console.log('[군집 정보] clusterInfo 상태 변경:', clusterInfo);
    if (clusterInfo) {
      console.log('[군집 정보] clusterInfo 상세:', {
        clusterId: clusterInfo.clusterId,
        hasClusterData: !!clusterInfo.clusterData,
        name: clusterInfo.clusterData?.name,
        description: clusterInfo.clusterData?.description,
        tagsCount: clusterInfo.clusterData?.tags?.length || 0,
        size: clusterInfo.clusterData?.size
      });
    }
  }, [clusterInfo]);

  const loadPanel = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 일반 패널은 API에서 로드
      const panelData = await searchApi.getPanel(panelId);
      
      // AI 인사이트 로드 (비동기로 별도 로드)
      try {
        const aiSummaryData = await searchApi.getPanelAiSummary(panelId);
        if (aiSummaryData && aiSummaryData.aiSummary) {
          panelData.aiSummary = aiSummaryData.aiSummary;
        }
      } catch (aiErr) {
        console.warn('AI 인사이트 로드 실패:', aiErr);
        // AI 인사이트 로드 실패해도 계속 진행
      }
      
      setPanel(panelData);
      
      // 패널 상세정보 히스토리 저장
      const panelName = panelData.name || panelData.id || panelId;
      const historyItem = historyManager.createPanelHistory(panelId, panelName, panelData);
      historyManager.save(historyItem);
    } catch (err: any) {
      setError(err.message || '패널 정보를 불러오는데 실패했습니다.');
      console.error('Panel load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Loading State
  if (loading) {
    return (
      <>
        <div 
          className="fixed inset-0 z-40 modal-backdrop"
          onClick={onClose}
        />
        <div 
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 drawer-content z-50 flex items-center justify-center rounded-2xl"
          style={{
            width: `${size.width}px`,
            height: `${size.height}px`,
            background: 'var(--surface-1)',
            color: 'var(--text-secondary)',
            boxShadow: 'var(--shadow-3)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3" style={{ color: 'var(--text-secondary)' }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand-blue-300)' }} />
            <span>패널 정보 로딩 중...</span>
          </div>
        </div>
      </>
    );
  }

  // Error State
  if (error || !panel) {
    return (
      <>
        <div 
          className="fixed inset-0 z-40 modal-backdrop"
          onClick={onClose}
        />
        <div 
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 drawer-content z-50 flex items-center justify-center rounded-2xl"
          style={{
            width: `${size.width}px`,
            height: `${size.height}px`,
            background: 'var(--surface-1)',
            color: 'var(--text-secondary)',
            boxShadow: 'var(--shadow-3)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center" style={{ color: 'var(--text-secondary)' }}>
            <p style={{ color: 'var(--error-500)', marginBottom: '16px' }}>
              {error || '패널을 찾을 수 없습니다.'}
            </p>
            <button 
              onClick={onClose}
              className="btn"
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
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 modal-backdrop"
        onClick={onClose}
      />

      {/* Modal - 중앙에 위치, 드래그 가능 */}
      <div 
        ref={drawerRef}
        className="fixed drawer-content z-50 flex flex-col rounded-2xl overflow-hidden"
        style={{
          left: `calc(50% + ${position.x}px)`,
          top: `calc(50% + ${position.y}px)`,
          transform: 'translate(-50%, -50%)',
          width: `${size.width}px`,
          height: `${size.height}px`,
          minWidth: '600px',
          minHeight: '500px',
          maxWidth: '95vw',
          maxHeight: '95vh',
          background: 'var(--surface-1)',
          color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow-3)',
          border: '1px solid var(--border-primary)',
          cursor: isResizing ? (resizeDirection.includes('right') ? 'ew-resize' : resizeDirection.includes('left') ? 'ew-resize' : resizeDirection.includes('bottom') ? 'ns-resize' : resizeDirection.includes('top') ? 'ns-resize' : 'nwse-resize') : isDragging ? 'move' : 'default',
          transition: isResizing || isDragging ? 'none' : 'all 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 리사이즈 핸들들 - 모서리 및 가장자리 */}
        {/* 오른쪽 */}
        <div
          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-20 transition-colors group"
          data-resize-handle="true"
          onMouseDown={(e) => handleMouseDown(e, 'right')}
          style={{
            backgroundColor: isResizing && resizeDirection.includes('right') ? 'rgba(37, 99, 235, 0.4)' : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        />
        {/* 하단 */}
        <div
          className="absolute left-0 right-0 bottom-0 h-3 cursor-ns-resize z-20 transition-colors group"
          data-resize-handle="true"
          onMouseDown={(e) => handleMouseDown(e, 'bottom')}
          style={{
            backgroundColor: isResizing && resizeDirection.includes('bottom') ? 'rgba(37, 99, 235, 0.4)' : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        />
        {/* 오른쪽 하단 모서리 */}
        <div
          className="absolute right-0 bottom-0 w-8 h-8 cursor-nwse-resize z-30 transition-colors rounded-tl-lg"
          data-resize-handle="true"
          onMouseDown={(e) => handleMouseDown(e, 'right-bottom')}
          style={{
            backgroundColor: isResizing && resizeDirection.includes('right-bottom') ? 'rgba(37, 99, 235, 0.5)' : 'transparent',
            backgroundImage: !isResizing ? 'linear-gradient(135deg, transparent 0%, transparent 40%, rgba(37, 99, 235, 0.3) 50%, transparent 60%, transparent 100%)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {/* 모서리 리사이즈 인디케이터 */}
          {!isResizing && (
            <div className="absolute right-1 bottom-1 w-0 h-0 border-l-[6px] border-l-transparent border-b-[6px] border-b-blue-500 opacity-50" />
          )}
        </div>
        {/* 시각적 리사이즈 인디케이터 */}
        {isResizing && (
          <div className="absolute right-2 bottom-2 z-40 px-2 py-1 rounded text-xs font-mono" style={{
            background: 'rgba(0, 0, 0, 0.7)',
            color: '#fff',
            pointerEvents: 'none'
          }}>
            {size.width} × {size.height}
          </div>
        )}
        {/* Header - 드래그 가능 */}
        <div 
          className="drawer-header panel-detail-header relative px-6 py-5 border-b"
          style={{
            borderColor: 'var(--border-primary)',
            cursor: isDragging ? 'move' : 'default',
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
          }}
          onMouseDown={handleDragStart}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="p-2 rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                    color: 'white',
                  }}
                >
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h2 
                    className="text-lg font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {panel.name || panel.id}
                  </h2>
                  <p 
                    className="text-[10px] mt-0.5"
                    style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}
                  >
                    ID: {panel.id}
                  </p>
                </div>
                {panel.coverage && (
                  <PIBadge kind={`coverage-${panel.coverage}`}>
                    {panel.coverage.toUpperCase()}
                  </PIBadge>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn--ghost p-2 rounded-lg transition-fast hover:bg-red-50 dark:hover:bg-red-900/20"
              style={{
                color: 'var(--muted-foreground)',
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <TabsList 
            className="w-full justify-start px-6 border-b"
            style={{
              borderColor: 'var(--border-primary)',
              background: 'transparent',
            }}
          >
            <TabsTrigger 
              value="overview"
              className="flex items-center gap-2"
              style={{
                color: 'var(--text-tertiary)',
              }}
            >
              <FileText className="w-4 h-4" />
              개요
            </TabsTrigger>
            <TabsTrigger 
              value="responses"
              className="flex items-center gap-2"
              style={{
                color: 'var(--text-tertiary)',
              }}
            >
              <MessageSquare className="w-4 h-4" />
              응답이력
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent 
            value="overview" 
            className="flex-1 overflow-y-auto px-8 py-6 space-y-8"
            style={{ height: 'calc(100% - 120px)', overflowY: 'auto' }}
          >
            {/* AI 인사이트 - 최상단 */}
            <div 
              className="p-6 rounded-xl relative overflow-hidden"
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border-primary)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="p-2 rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                    color: 'white',
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h3 
                    className="font-semibold text-base"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    AI 인사이트
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    패널 특성 분석
                  </p>
                </div>
              </div>
              {panel.aiSummary ? (
                <div 
                  className="p-4 rounded-lg"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  <p 
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {panel.aiSummary}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    AI 인사이트 생성 중...
                  </p>
                </div>
              )}
            </div>


            {/* Basic Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="p-1.5 rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
                    color: '#3B82F6',
                  }}
                >
                  <User className="w-4 h-4" />
                </div>
                <h3 
                  className="font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  기본 정보
                </h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {panel.gender && (
                  <PIChip type="tag" className="flex items-center gap-2">
                    <User className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{panel.gender}</span>
                  </PIChip>
                )}
                {panel.age > 0 && (
                  <PIChip type="tag" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{panel.age}세</span>
                  </PIChip>
                )}
                {panel.region && (
                  <PIChip type="tag" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{panel.region}</span>
                  </PIChip>
                )}
                {(panel.income || panel.metadata?.["월평균 개인소득"] || panel.metadata?.["월평균 가구소득"]) && (
                  <PIChip type="tag" className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {panel.metadata?.["월평균 개인소득"] || panel.metadata?.["월평균 가구소득"] || panel.income}
                    </span>
                  </PIChip>
                )}
                <PIChip type="tag" className="flex items-center gap-2">
                  <Calendar className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {new Date(panel.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </PIChip>
              </div>
            </div>

            {/* Quick Stats */}
            <div 
              className="p-5 rounded-xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.06), rgba(37, 99, 235, 0.1))',
                border: '1px solid rgba(59, 130, 246, 0.15)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-lg flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                      color: 'white',
                    }}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div 
                      className="text-xs mb-0.5 font-medium"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      응답 수
                    </div>
                    <div 
                      className="text-xl font-bold"
                      style={{ color: '#3B82F6' }}
                    >
                      {panel.responses?.length || 0}
                      <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-tertiary)' }}>개</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 상세 메타데이터 - 표시 가능한 데이터가 있을 때만 표시 */}
            {(() => {
              // 표시 가능한 데이터가 있는지 확인
              const hasDisplayableData = 
                panel.metadata && (
                  // 인구통계
                  panel.metadata.결혼여부 || 
                  panel.metadata.자녀수 !== undefined || 
                  panel.metadata.가족수 || 
                  panel.metadata.최종학력 || 
                  panel.metadata.직업 || 
                  panel.metadata.직무 ||
                  // 보유 제품
                  (panel.metadata.보유전제품 && panel.metadata.보유전제품.length > 0) ||
                  // 휴대폰 정보
                  panel.metadata["보유 휴대폰 단말기 브랜드"] ||
                  panel.metadata["보유 휴대폰 모델명"] ||
                  // 차량 정보
                  panel.metadata.보유차량여부 ||
                  // 흡연 경험
                  (panel.metadata.흡연경험 && (
                    (Array.isArray(panel.metadata.흡연경험) && panel.metadata.흡연경험.length > 0) ||
                    (!Array.isArray(panel.metadata.흡연경험) && panel.metadata.흡연경험)
                  )) ||
                  // 음용 경험
                  (panel.metadata.음용경험 && (
                    (Array.isArray(panel.metadata.음용경험) && panel.metadata.음용경험.length > 0) ||
                    (!Array.isArray(panel.metadata.음용경험) && panel.metadata.음용경험)
                  )) ||
                  (panel.metadata["음용경험 술"] && panel.metadata["음용경험 술"].length > 0)
                );
              
              if (!hasDisplayableData) return null;
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="p-1.5 rounded-lg"
                      style={{
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.1))',
                        color: '#8B5CF6',
                      }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 
                      className="font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      상세 정보
                    </h3>
                  </div>
                
                {/* 인구통계 정보 - 데이터가 있을 때만 표시 */}
                {(() => {
                  const hasDemographics = 
                    panel.metadata?.결혼여부 || 
                    panel.metadata?.자녀수 !== undefined || 
                    panel.metadata?.가족수 || 
                    panel.metadata?.최종학력 || 
                    panel.metadata?.직업 || 
                    panel.metadata?.직무;
                  
                  if (!hasDemographics) return null;
                  
                  return (
                    <div 
                      className="p-6 rounded-xl space-y-3"
                      style={{
                        background: 'var(--surface-1)',
                        border: '1px solid var(--border-primary)',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div 
                          className="p-2 rounded-lg"
                          style={{
                            background: 'linear-gradient(135deg, #10B981, #059669)',
                            color: 'white',
                          }}
                        >
                          <Users className="w-4 h-4" />
                        </div>
                        <h4 
                          className="text-sm font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          인구통계
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {panel.metadata.결혼여부 && (
                          <div className="flex items-center gap-3">
                            <Heart className="w-4 h-4 flex-shrink-0" style={{ color: '#EC4899' }} />
                            <span style={{ color: 'var(--text-tertiary)' }}>결혼여부: </span>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{panel.metadata.결혼여부}</span>
                          </div>
                        )}
                        {panel.metadata.자녀수 !== undefined && (
                          <div className="flex items-center gap-3">
                            <Users className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
                            <span style={{ color: 'var(--text-tertiary)' }}>자녀수: </span>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{panel.metadata.자녀수}명</span>
                          </div>
                        )}
                        {panel.metadata.가족수 && (
                          <div className="flex items-center gap-3">
                            <Home className="w-4 h-4 flex-shrink-0" style={{ color: '#10B981' }} />
                            <span style={{ color: 'var(--text-tertiary)' }}>가족수: </span>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{panel.metadata.가족수}</span>
                          </div>
                        )}
                        {panel.metadata.최종학력 && (
                          <div className="flex items-center gap-3">
                            <GraduationCap className="w-4 h-4 flex-shrink-0" style={{ color: '#6366F1' }} />
                            <span style={{ color: 'var(--text-tertiary)' }}>최종학력: </span>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{panel.metadata.최종학력}</span>
                          </div>
                        )}
                        {panel.metadata.직업 && (() => {
                          // 괄호와 그 안의 내용 제거
                          const jobWithoutParentheses = panel.metadata.직업.replace(/\s*\([^)]*\)/g, '').trim();
                          return (
                            <div className="col-span-2 flex items-center gap-3">
                              <Briefcase className="w-4 h-4 flex-shrink-0" style={{ color: '#3B82F6' }} />
                              <span style={{ color: 'var(--text-tertiary)' }}>직업: </span>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{jobWithoutParentheses}</span>
                            </div>
                          );
                        })()}
                        {panel.metadata.직무 && (() => {
                          // 괄호와 그 안의 내용 제거
                          const jobRoleWithoutParentheses = panel.metadata.직무.replace(/\s*\([^)]*\)/g, '').trim();
                          return (
                            <div className="col-span-2 flex items-center gap-3">
                              <Briefcase className="w-4 h-4 flex-shrink-0" style={{ color: '#8B5CF6' }} />
                              <span style={{ color: 'var(--text-tertiary)' }}>직무: </span>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{jobRoleWithoutParentheses}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()}

                {/* 보유 제품 정보 */}
                {panel.metadata.보유전제품 && panel.metadata.보유전제품.length > 0 && (
                  <div 
                    className="p-6 rounded-xl space-y-3"
                    style={{
                      background: 'var(--surface-1)',
                      border: '1px solid var(--border-primary)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{
                          background: 'linear-gradient(135deg, #10B981, #059669)',
                          color: 'white',
                        }}
                      >
                        <FileText className="w-4 h-4" />
                      </div>
                      <h4 
                        className="text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        보유 전자제품 ({panel.metadata.보유전제품.length}개)
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {panel.metadata.보유전제품.map((item, idx) => (
                        <PIChip key={idx} type="tag">{item}</PIChip>
                      ))}
                    </div>
                  </div>
                )}

                {/* 휴대폰 정보 */}
                {(panel.metadata["보유 휴대폰 단말기 브랜드"] || panel.metadata["보유 휴대폰 모델명"]) && (
                  <div 
                    className="p-6 rounded-xl space-y-2"
                    style={{
                      background: 'var(--surface-1)',
                      border: '1px solid var(--border-primary)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{
                          background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                          color: 'white',
                        }}
                      >
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <h4 
                        className="text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        휴대폰
                      </h4>
                    </div>
                    <div className="text-sm space-y-3">
                      {panel.metadata["보유 휴대폰 단말기 브랜드"] && (
                        <div className="flex items-center gap-3">
                          <span style={{ color: 'var(--text-tertiary)' }}>브랜드:</span>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{panel.metadata["보유 휴대폰 단말기 브랜드"]}</span>
                        </div>
                      )}
                      {panel.metadata["보유 휴대폰 모델명"] && (
                        <div className="flex items-center gap-3">
                          <span style={{ color: 'var(--text-tertiary)' }}>모델:</span>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{panel.metadata["보유 휴대폰 모델명"]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 차량 정보 */}
                {panel.metadata.보유차량여부 && (
                  <div 
                    className="p-6 rounded-xl space-y-2"
                    style={{
                      background: 'var(--surface-1)',
                      border: '1px solid var(--border-primary)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{
                          background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                          color: 'white',
                        }}
                      >
                        <Car className="w-4 h-4" />
                      </div>
                      <h4 
                        className="text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        차량
                      </h4>
                    </div>
                    <div className="text-sm space-y-3">
                      <div className="flex items-center gap-3">
                        <span style={{ color: 'var(--text-tertiary)' }}>보유여부:</span>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{panel.metadata.보유차량여부}</span>
                      </div>
                      {panel.metadata.보유차량여부 === "있다" && (
                        <>
                          {(panel.metadata["자동차 제조사"] || panel.metadata.자동차제조사) && 
                           (panel.metadata["자동차 제조사"] || panel.metadata.자동차제조사) !== "무응답" && (
                            <div className="flex items-center gap-3">
                              <span style={{ color: 'var(--text-tertiary)' }}>제조사:</span>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                                {panel.metadata["자동차 제조사"] || panel.metadata.자동차제조사}
                              </span>
                            </div>
                          )}
                          {(panel.metadata["자동차 모델"] || panel.metadata.자동차모델) && 
                           (panel.metadata["자동차 모델"] || panel.metadata.자동차모델) !== "무응답" && (
                            <div className="flex items-center gap-3">
                              <span style={{ color: 'var(--text-tertiary)' }}>모델:</span>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                                {panel.metadata["자동차 모델"] || panel.metadata.자동차모델}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* 흡연 경험 */}
                {panel.metadata.흡연경험 && panel.metadata.흡연경험.length > 0 && (
                  <div 
                    className="p-6 rounded-xl space-y-3"
                    style={{
                      background: 'var(--surface-1)',
                      border: '1px solid var(--border-primary)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{
                          background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                          color: 'white',
                        }}
                      >
                        <X className="w-4 h-4 rotate-45" />
                      </div>
                      <h4 
                        className="text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        흡연 경험
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(panel.metadata.흡연경험) ? (
                        panel.metadata.흡연경험.map((item, idx) => (
                          <PIChip key={idx} type="tag">{item}</PIChip>
                        ))
                      ) : (
                        <PIChip type="tag">{panel.metadata.흡연경험}</PIChip>
                      )}
                    </div>
                    {panel.metadata["흡연경험 담배브랜드"] && 
                     panel.metadata["흡연경험 담배브랜드"] !== "무응답" && (
                      <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-primary)' }}>
                        <div className="text-xs mb-2 font-medium" style={{ color: 'var(--text-tertiary)' }}>담배 브랜드</div>
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(panel.metadata["흡연경험 담배브랜드"]) ? (
                            panel.metadata["흡연경험 담배브랜드"].map((brand, idx) => (
                              <PIChip key={idx} type="tag" variant="secondary">{brand}</PIChip>
                            ))
                          ) : (
                            <PIChip type="tag" variant="secondary">{panel.metadata["흡연경험 담배브랜드"]}</PIChip>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 음용 경험 */}
                {panel.metadata["음용경험 술"] && panel.metadata["음용경험 술"].length > 0 && (
                  <div 
                    className="p-6 rounded-xl space-y-3"
                    style={{
                      background: 'var(--surface-1)',
                      border: '1px solid var(--border-primary)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{
                          background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                          color: 'white',
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <h4 
                        className="text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        음용 경험 (술)
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {panel.metadata["음용경험 술"].map((item, idx) => (
                        <PIChip key={idx} type="tag">{item}</PIChip>
                      ))}
                    </div>
                  </div>
                )}
                </div>
              );
            })()}
          </TabsContent>

          {/* Responses Tab */}
          <TabsContent 
            value="responses" 
            className="flex-1 overflow-y-auto px-8 py-6 space-y-5"
            style={{ height: 'calc(100% - 120px)', overflowY: 'auto' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div 
                  className="p-1.5 rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
                    color: '#3B82F6',
                  }}
                >
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 
                  className="font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  응답 이력
                </h3>
                {panel.responses && panel.responses.length > 0 && (
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#3B82F6',
                    }}
                  >
                    {panel.responses.length}개
                  </span>
                )}
              </div>
              {panel.coverage && (
                <div 
                  className="px-3 py-1.5 rounded-lg font-semibold text-sm"
                  style={{
                    background: (panel.coverage === 'qw' || panel.coverage === 'qw1' || panel.coverage === 'qw2' || panel.coverage === 'q')
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.15))'
                      : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.15))',
                    color: (panel.coverage === 'qw' || panel.coverage === 'qw1' || panel.coverage === 'qw2' || panel.coverage === 'q') ? '#10B981' : '#3B82F6',
                    border: (panel.coverage === 'qw' || panel.coverage === 'qw1' || panel.coverage === 'qw2' || panel.coverage === 'q')
                      ? '1px solid rgba(16, 185, 129, 0.2)'
                      : '1px solid rgba(59, 130, 246, 0.2)',
                  }}
                >
                  {(panel.coverage === 'qw' || panel.coverage === 'qw1' || panel.coverage === 'qw2' || panel.coverage === 'q') ? 'Q+W' : 'W'}
                </div>
              )}
            </div>
            
            {panel.responses && panel.responses.length > 0 ? (
              <div className="space-y-5">
                {panel.responses.map((response, index) => (
                  <div 
                    key={`response-${index}`}
                    className="p-6 rounded-xl border transition-all hover:shadow-lg"
                    style={{
                      background: 'var(--surface-1)',
                      borderColor: 'var(--border-primary)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <div className="flex items-start gap-4 mb-3">
                      <div 
                        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-semibold"
                        style={{
                          background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                          color: 'white',
                        }}
                      >
                        Q{index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 
                          className="text-sm font-semibold mb-3"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {response.title}
                        </h5>
                        <div 
                          className="p-5 rounded-lg"
                          style={{
                            background: 'var(--surface-2)',
                            border: '1px solid var(--border-primary)',
                          }}
                        >
                          <p 
                            className="text-sm leading-relaxed whitespace-pre-wrap"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {response.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div 
                className="text-center py-12"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <div 
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{
                    background: 'rgba(156, 163, 175, 0.1)',
                    color: '#9CA3AF',
                  }}
                >
                  <MessageSquare className="w-8 h-8" />
                </div>
                <p>응답 이력이 없습니다.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

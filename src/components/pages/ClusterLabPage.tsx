import { useState, useEffect } from 'react';
import { PIButton } from '../pi/PIButton';
import { PIModelStatusCard } from '../pi/PIModelStatusCard';
import { PIQualityLegend } from '../pi/PIQualityLegend';
import { PIViewControls } from '../pi/PIViewControls';
import { PIClusterFilter } from '../pi/PIClusterFilter';
import { PIOutdatedBanner } from '../pi/PIOutdatedBanner';
import { PIClusteringExplainer } from '../pi/PIClusteringExplainer';
import { PIClusterProfileCard } from '../pi/PIClusterProfileCard';
import { PISectionHeader } from '../pi/PISectionHeader';
import { PIActionBar } from '../pi/PIActionBar';
import { PILocatorOverlay } from '../pi/PILocatorOverlay';
import { PILocatorStrip } from '../pi/PILocatorStrip';
import { PIModelBadge, ModelStatus } from '../pi/PIModelBadge';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';
import { historyManager } from '../../lib/history';
import { Loader2 } from 'lucide-react';

// Mock UMAP data with panel attributes
const mockUmapData = [
  // Cluster 0 (건강관리형) - 우상단 영역
  { x: 2.0, y: 1.5, cluster: 0, panelId: 'P001', gender: 'female', region: 'seoul', income: 'high', age: 30 },
  { x: 2.2, y: 1.8, cluster: 0, panelId: 'P002', gender: 'female', region: 'seoul', income: 'high', age: 28 },
  { x: 1.8, y: 1.2, cluster: 0, panelId: 'P003', gender: 'male', region: 'busan', income: 'high', age: 35 },
  
  // Cluster 1 (트렌디소비형) - 좌상단 영역
  { x: -1.5, y: 1.0, cluster: 1, panelId: 'P004', gender: 'female', region: 'seoul', income: 'medium', age: 25 },
  { x: -1.2, y: 0.8, cluster: 1, panelId: 'P005', gender: 'female', region: 'incheon', income: 'medium', age: 22 },
  { x: -1.8, y: 1.2, cluster: 1, panelId: 'P006', gender: 'male', region: 'seoul', income: 'medium', age: 27 },
  
  // Cluster 2 (가성비추구형) - 좌하단 영역
  { x: -1.0, y: -1.5, cluster: 2, panelId: 'P007', gender: 'male', region: 'daegu', income: 'low', age: 45 },
  { x: -0.8, y: -1.8, cluster: 2, panelId: 'P008', gender: 'female', region: 'gwangju', income: 'low', age: 50 },
  { x: -1.2, y: -1.2, cluster: 2, panelId: 'P009', gender: 'male', region: 'daejeon', income: 'low', age: 42 },
  
  // Cluster 3 (가족중심형) - 우하단 영역
  { x: 1.5, y: -1.0, cluster: 3, panelId: 'P010', gender: 'female', region: 'seoul', income: 'high', age: 38 },
  { x: 1.8, y: -1.3, cluster: 3, panelId: 'P011', gender: 'male', region: 'busan', income: 'high', age: 40 },
  { x: 1.2, y: -0.8, cluster: 3, panelId: 'P012', gender: 'female', region: 'incheon', income: 'medium', age: 35 },
  
  // Cluster 4 (문화향유형) - 중앙 영역
  { x: 0.0, y: 0.5, cluster: 4, panelId: 'P013', gender: 'male', region: 'seoul', income: 'medium', age: 32 },
  { x: -0.3, y: 0.8, cluster: 4, panelId: 'P014', gender: 'female', region: 'busan', income: 'high', age: 29 },
  { x: 0.3, y: 0.2, cluster: 4, panelId: 'P015', gender: 'male', region: 'daegu', income: 'medium', age: 33 },
  
  // Noise points (분산된 위치)
  { x: 2.5, y: -0.5, cluster: -1, panelId: 'P016', gender: 'female', region: 'seoul', income: 'high', age: 24 },
  { x: -2.0, y: -2.0, cluster: -1, panelId: 'P017', gender: 'male', region: 'gwangju', income: 'low', age: 55 },
  { x: 0.5, y: 2.0, cluster: -1, panelId: 'P018', gender: 'female', region: 'incheon', income: 'medium', age: 26 },
];


const clusterColors = ['#2563EB', '#16A34A', '#F59E0B', '#EF4444', '#8B5CF6'];

// 색상 기준에 따른 색상 매핑
const getColorByAttribute = (point: any, colorBy: string) => {
  switch (colorBy) {
    case 'gender':
      return point.gender === 'female' ? '#EC4899' : '#3B82F6';
    case 'region':
      const regionColors: { [key: string]: string } = {
        'seoul': '#2563EB',
        'busan': '#16A34A', 
        'incheon': '#F59E0B',
        'daegu': '#EF4444',
        'gwangju': '#8B5CF6',
        'daejeon': '#06B6D4'
      };
      return regionColors[point.region] || '#94A3B8';
    case 'income':
      const incomeColors: { [key: string]: string } = {
        'high': '#16A34A',
        'medium': '#F59E0B',
        'low': '#EF4444'
      };
      return incomeColors[point.income] || '#94A3B8';
    case 'cluster':
    default:
      return point.cluster === -1 ? '#94A3B8' : clusterColors[point.cluster % clusterColors.length];
  }
};

// 필터링된 UMAP 데이터 가져오기
const getFilteredUmapData = (data: UMAPPoint[], selectedClusters: string[], showNoise: boolean) => {
  if (selectedClusters.length === 0) {
    // 선택된 군집이 없으면 모든 데이터 표시 (노이즈 제외 옵션 적용)
    return showNoise ? data : data.filter(d => d.cluster !== -1);
  }
  
  const clusterNumbers = selectedClusters.map(c => parseInt(c.replace('C', '')) - 1);
  let filtered = data.filter(d => clusterNumbers.includes(d.cluster));
  
  if (showNoise) {
    filtered = [...filtered, ...data.filter(d => d.cluster === -1)];
  }
  
  return filtered;
};


interface ClusterLabPageProps {
  locatedPanelId?: string | null;
  searchResults?: any[]; // 검색 결과 데이터
  query?: string; // 검색 쿼리
}

interface ClusterData {
  id: number;
  size: number;
  indices: number[];
  centroid: number[];
  query_similarity: number;
  representative_items: number[];
}

interface UMAPPoint {
  x: number;
  y: number;
  cluster: number;
  panelId?: string;
}

export function ClusterLabPage({ locatedPanelId }: ClusterLabPageProps) {
  const [modelStatus, setModelStatus] = useState<ModelStatus>('synced');
  const [userRole] = useState<'viewer' | 'admin'>('viewer');
  const [showOutdatedBanner, setShowOutdatedBanner] = useState(false);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  
  // View controls state
  const [showNoise, setShowNoise] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [densityCorrection, setDensityCorrection] = useState(false);
  const [opacity, setOpacity] = useState(0.8);
  const [colorBy, setColorBy] = useState('cluster');
  
  // Located panels for overlay
  const [locatedPanels, setLocatedPanels] = useState<Array<{ id: string; color: string }>>([]);
  
  // Clustering state
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [umapData, setUmapData] = useState<UMAPPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 품질 지표는 현재 사용하지 않음
  // const [qualityMetrics] = useState<any>({
  //   silhouette_score: 0.65,
  //   calinski_harabasz: 142.3,
  //   davies_bouldin: 0.89,
  //   noise_ratio: 12.5,
  //   cluster_count: 5,
  //   avg_cluster_size: 3.6
  // });
  
  // 클러스터링 실행 (더미 데이터 사용)
  const runClustering = async () => {
    setLoading(true);
    setError(null);

    try {
      // 더미 클러스터 데이터 생성
      const dummyClusters: ClusterData[] = [
        {
          id: 0,
          size: 3,
          indices: [0, 1, 2],
          centroid: [2.0, 1.5],
          query_similarity: 0.85,
          representative_items: [0, 1, 2]
        },
        {
          id: 1,
          size: 3,
          indices: [3, 4, 5],
          centroid: [-1.5, 1.0],
          query_similarity: 0.78,
          representative_items: [3, 4, 5]
        },
        {
          id: 2,
          size: 3,
          indices: [6, 7, 8],
          centroid: [-1.0, -1.5],
          query_similarity: 0.72,
          representative_items: [6, 7, 8]
        }
      ];
      setClusters(dummyClusters);

      // UMAP 데이터 설정 (이미 정의된 더미 데이터 사용)
      setUmapData(mockUmapData);

      // 품질 지표는 이미 초기값으로 설정됨

      // 군집 히스토리 저장
      const clusterData = {
        count: mockUmapData.length,
        percentage: 100,
        clusters: dummyClusters
      };
      const historyItem = historyManager.createClusterHistory(
        'clustering_result',
        '군집 분석 결과',
        clusterData,
        mockUmapData
      );
      historyManager.save(historyItem);

      toast.success('클러스터링이 완료되었습니다');
    } catch (err) {
      console.error('Clustering error:', err);
      setError('클러스터링 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 클러스터링 실행
  useEffect(() => {
    runClustering();
  }, []);

  useEffect(() => {
    if (locatedPanelId) {
      // Mock: assign random cluster color
      const colors = ['#2563EB', '#16A34A', '#F59E0B', '#EF4444', '#8B5CF6'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      setLocatedPanels(prev => {
        const filtered = prev.filter(p => p.id !== locatedPanelId);
        return [{ id: locatedPanelId, color }, ...filtered].slice(0, 3);
      });
    }
  }, [locatedPanelId]);

  return (
    <div className="min-h-screen bg-[var(--neutral-50)] pb-20">
      {/* Page Header */}
      <div className="bg-white border-b border-[var(--neutral-200)] px-20 py-6">
        <div className="flex items-start justify-between">
          <div>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: 600, 
              color: '#64748B', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '8px'
            }}>
              CLUSTER LAB
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
              군집 분석
            </h1>
            <p style={{ fontSize: '14px', fontWeight: 400, color: '#64748B', lineHeight: '1.5' }}>
              검색한 패널의 군집 위치와 각 집단 특성을 비교·분석합니다.
            </p>
          </div>
          
          <PIModelBadge status={modelStatus} version="v2025-10-13 14:30" />
        </div>
      </div>

      {/* Locator Strip (Sticky) */}
      <PILocatorStrip
        locatedPanels={locatedPanels}
        onClear={(panelId) => {
          setLocatedPanels(prev => prev.filter(p => p.id !== panelId));
        }}
        onHighlightAll={() => toast.success('선택한 패널을 강조합니다')}
        onSendToCompare={() => toast.success('비교 보드로 이동합니다')}
      />

      {/* Outdated Banner */}
      {showOutdatedBanner && (
        <div className="px-20 pt-8">
          <PIOutdatedBanner
            userRole={userRole}
            onRefresh={() => {
              setModelStatus('synced');
              setShowOutdatedBanner(false);
              toast.success('모델이 새로고침되었습니다');
            }}
            onRequestRetrain={() => {
              toast.success('재학습 요청이 전송되었습니다');
              setShowOutdatedBanner(false);
            }}
            onDismiss={() => setShowOutdatedBanner(false)}
          />
        </div>
      )}

      <div className="px-20 py-8 space-y-8">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-lg">클러스터링 중...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <PIButton onClick={runClustering}>다시 시도</PIButton>
            </div>
          </div>
        )}

        {/* Row 1: UMAP Map + Inspector Stack */}
        {!loading && !error && (
          <div className="grid grid-cols-12 gap-6">
            {/* Left: UMAP Scatter (Col 1-8) */}
            <div className="col-span-8">
              <div
                className="relative rounded-2xl p-4 flex flex-col"
                style={{
                  height: '560px',
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(17, 24, 39, 0.10)',
                  boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
                }}
                data-umap-chart
              >
                <div 
                  className="absolute top-0 left-0 right-0 h-[1px]"
                  style={{
                    background: 'linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)',
                    opacity: 0.5,
                  }}
                />
                
                {/* Locator Overlay */}
                {locatedPanels.length > 0 && (
                  <PILocatorOverlay
                    locatedPanels={locatedPanels}
                    onClear={(panelId) => {
                      setLocatedPanels(prev => prev.filter(p => p.id !== panelId));
                    }}
                  />
                )}
                
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '12px' }}>
                  UMAP 산점도
                </h3>
                <div className="flex-1" style={{ minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }} data={getFilteredUmapData(umapData, selectedClusters, showNoise)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(17, 24, 39, 0.1)" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name="UMAP 1"
                        stroke="#64748B"
                        tick={{ fontSize: 11 }}
                        strokeWidth={0.5}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name="UMAP 2"
                        stroke="#64748B"
                        tick={{ fontSize: 11 }}
                        strokeWidth={0.5}
                      />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length > 0) {
                            const data = payload[0].payload;
                            const clusterName = data.cluster === -1 ? '노이즈' : `C${data.cluster + 1}`;
                            const clusterColor = data.cluster === -1 ? '#94A3B8' : clusterColors[data.cluster % clusterColors.length];
                            
                            return (
                              <div className="bg-white p-3 rounded-lg shadow-lg border border-[var(--neutral-200)]">
                                <div className="flex items-center gap-2 mb-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: clusterColor }}
                                  />
                                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--neutral-800)' }}>
                                    {clusterName}
                                  </p>
                                </div>
                                <p style={{ fontSize: '11px', color: 'var(--neutral-600)' }}>
                                  패널 ID: {data.panelId}
                                </p>
                                <p style={{ fontSize: '11px', color: 'var(--neutral-600)' }}>
                                  UMAP: ({data.x.toFixed(2)}, {data.y.toFixed(2)})
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {/* 색상 기준이 클러스터인 경우 기존 방식 사용 */}
                      {colorBy === 'cluster' && clusters.map((_, clusterId) => (
                        <Scatter
                          key={clusterId}
                          name={`C${clusterId + 1}`}
                          data={getFilteredUmapData(umapData, selectedClusters, showNoise).filter((d) => d.cluster === clusterId)}
                          fill={clusterColors[clusterId % clusterColors.length]}
                          fillOpacity={opacity}
                          r={4}
                        />
                      ))}
                      
                      {/* 색상 기준이 클러스터가 아닌 경우 모든 점을 하나의 Scatter로 처리 */}
                      {colorBy !== 'cluster' && (
                        <Scatter
                          name="패널"
                          data={getFilteredUmapData(umapData, selectedClusters, showNoise)}
                          fillOpacity={opacity}
                          r={4}
                        >
                          {getFilteredUmapData(umapData, selectedClusters, showNoise).map((point, index) => (
                            <Cell key={`cell-${index}`} fill={getColorByAttribute(point, colorBy)} />
                          ))}
                        </Scatter>
                      )}
                      
                      {/* Noise points (클러스터 기준일 때만) */}
                      {colorBy === 'cluster' && showNoise && (
                        <Scatter
                          name="노이즈"
                          data={getFilteredUmapData(umapData, selectedClusters, showNoise).filter((d) => d.cluster === -1)}
                          fill="#94A3B8"
                          fillOpacity={opacity * 0.6}
                          r={3}
                        />
                      )}
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legend inside card */}
                <div className="flex items-center gap-4 mt-2 pt-2 border-t flex-shrink-0" style={{ borderColor: 'rgba(17, 24, 39, 0.08)' }}>
                  {colorBy === 'cluster' ? (
                    <>
                      {clusters.map((_, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: clusterColors[idx % clusterColors.length] }} />
                          <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>C{idx + 1}</span>
                        </div>
                      ))}
                      {showNoise && (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: '#94A3B8' }} />
                          <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>노이즈</span>
                        </div>
                      )}
                    </>
                  ) : colorBy === 'gender' ? (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: '#EC4899' }} />
                        <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>여성</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: '#3B82F6' }} />
                        <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>남성</span>
                      </div>
                    </>
                  ) : colorBy === 'region' ? (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: '#2563EB' }} />
                        <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>서울</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: '#16A34A' }} />
                        <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>부산</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: '#F59E0B' }} />
                        <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>인천</span>
                      </div>
                    </>
                  ) : colorBy === 'income' ? (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: '#16A34A' }} />
                        <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>고소득</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: '#F59E0B' }} />
                        <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>중소득</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: '#EF4444' }} />
                        <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>저소득</span>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Right: Inspector Stack (Col 9-12, Sticky) */}
            <div className="col-span-4">
              <div className="sticky top-[88px] flex flex-col gap-4" style={{ height: '560px' }}>
                <PIViewControls
                  showNoise={showNoise}
                  onShowNoiseChange={setShowNoise}
                  showLabels={showLabels}
                  onShowLabelsChange={setShowLabels}
                  densityCorrection={densityCorrection}
                  onDensityCorrectionChange={setDensityCorrection}
                  opacity={opacity}
                  onOpacityChange={setOpacity}
                  colorBy={colorBy}
                  onColorByChange={setColorBy}
                  onHighlightSimilar={() => toast.info('비슷한 패널 하이라이트 기능 개발 중')}
                  onExportSnapshot={() => toast.success('스냅샷을 다운로드했습니다')}
                />
                
                <PIClusterFilter
                  clusters={clusters.map((_, idx) => ({
                    id: `C${idx + 1}`,
                    label: `C${idx + 1}`,
                    count: clusters[idx]?.size || 0,
                    color: clusterColors[idx % clusterColors.length]
                  }))}
                  selectedClusters={selectedClusters}
                  onSelectionChange={setSelectedClusters}
                  onViewSelected={() => {
                    if (selectedClusters.length === 0) {
                      toast.info('선택된 군집이 없습니다');
                    } else {
                      toast.success(`${selectedClusters.length}개 군집만 표시합니다`);
                    }
                  }}
                  onSendToCompare={() => {
                    if (selectedClusters.length === 0) {
                      toast.info('선택된 군집이 없습니다');
                    } else {
                      toast.success('비교 보드로 이동합니다');
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Row 2: Cluster Profile Cards (3 columns) */}
        {!loading && !error && (
          <div>
            <PISectionHeader
              title="군집 프로필"
              description="각 군집의 특성과 대표 인사이트를 확인하고 라벨을 관리합니다."
            />
            
            <div className="grid grid-cols-3 gap-6">
              {clusters.map((cluster, index) => (
                <PIClusterProfileCard
                  key={cluster.id}
                  id={`C${index + 1}`}
                  color={clusterColors[index % clusterColors.length]}
                  name={`군집 ${index + 1}`}
                  description={`${cluster.size}명의 패널이 포함된 군집`}
                  tags={['특성 분석 중...']}
                  size={cluster.size}
                  silhouette={cluster.query_similarity}
                  snippets={[
                    `쿼리 유사도: ${(cluster.query_similarity * 100).toFixed(1)}%`,
                    `대표 패널: ${cluster.representative_items.length}개`,
                    '상세 분석 진행 중...'
                  ]}
                  onSave={() => toast.success(`군집 ${index + 1} 라벨이 저장되었습니다`)}
                />
              ))}
            </div>
          </div>
        )}


        {/* Row 4: Model Status and Quality Metrics */}
        <div className="grid grid-cols-2 gap-6">
          {/* Model Status */}
          <div className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(17, 24, 39, 0.10)',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
            }}
          >
            <div className="px-5 py-4 border-b border-[var(--neutral-200)]">
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                모델 상태
              </h3>
            </div>
            <div className="p-5">
              <PIModelStatusCard
                status={modelStatus}
                userRole={userRole}
                modelVersion="v2025-10-13 14:30"
                quickpollCount={8863}
                panelCount={2140}
                clusterCount={5}
                noiseRatio={8.5}
                silhouette={0.62}
                lastUpdated="2시간 전"
                onRefresh={() => toast.success('모델을 새로고침했습니다')}
                onRequestRetrain={() => toast.success('재학습 요청이 전송되었습니다')}
                onViewHistory={() => toast.info('이전 버전 기능 개발 중')}
              />
            </div>
          </div>

          {/* Quality Metrics */}
          <div className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(17, 24, 39, 0.10)',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
            }}
          >
            <div className="px-5 py-4 border-b border-[var(--neutral-200)]">
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                품질 지표
              </h3>
            </div>
            <div className="p-5">
              <PIQualityLegend
                silhouette={0.62}
                noiseRatio={8.5}
                balanceScore={0.78}
              />
            </div>
          </div>
        </div>

        {/* Row 5: Clustering Explainer */}
        <PIClusteringExplainer
          silhouette={0.62}
          noiseRatio={8.5}
          clusterCount={5}
        />
      </div>

      {/* Sticky Action Bar */}
      <PIActionBar
        filterSummary="전체 결과"
        selectedCount={5}
        onExport={() => toast.success('PNG 내보내기 시작')}
      />
    </div>
  );
}

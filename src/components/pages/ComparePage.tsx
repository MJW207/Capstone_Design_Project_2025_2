import { useState, useMemo } from 'react';
import { Download, Save, ArrowRight, TrendingUp, FileText, Image, X } from 'lucide-react';
import { PICard } from '../pi/PICard';
import { PIButton } from '../pi/PIButton';
import { PIBadge } from '../pi/PIBadge';
import { PISegmentedControl } from '../pi/PISegmentedControl';
import { PIHashtag, getHashtagColor } from '../pi/PIHashtag';
import { PIGroupSelectionModal } from '../pi/PIGroupSelectionModal';
import { toast } from 'sonner';
import { historyManager } from '../../lib/history';

type GroupType = 'cluster' | 'segment';
type GroupSource = 'all' | 'search';

interface CompareGroup {
  id: string;
  type: GroupType;
  label: string;
  count: number;
  percentage: number;
  color: string;
  description: string;
  tags: string[];
  evidence?: string[];
  qualityWarnings?: Array<'low-sample' | 'low-coverage' | 'high-noise'>;
}

interface DifferenceData {
  category: string;
  groupA: number;
  groupB: number;
  delta: number;
}

interface LiftData {
  feature: string;
  liftA: number;
  liftB: number;
}

interface SMDData {
  metric: string;
  groupA: number;
  groupB: number;
  smd: number;
  ci: [number, number];
}

interface OpportunityData {
  title: string;
  delta: number;
  direction: 'positive' | 'negative';
}


export function ComparePage() {
  const [groupType, setGroupType] = useState<GroupType>('cluster');
  const [selectedGroupA, setSelectedGroupA] = useState<CompareGroup | null>(null);
  const [selectedGroupB, setSelectedGroupB] = useState<CompareGroup | null>(null);
  const [groupBSource, setGroupBSource] = useState<GroupSource>('all');
  const [diffSortBy, setDiffSortBy] = useState<'delta' | 'lift' | 'smd'>('delta');
  
  // Modal states
  const [isGroupAModalOpen, setIsGroupAModalOpen] = useState(false);
  const [isGroupBModalOpen, setIsGroupBModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // Mock data - Cluster groups
  const clusterGroups: CompareGroup[] = [
    {
      id: 'C1',
      type: 'cluster',
      label: 'C1 - 건강관리형',
      count: 520,
      percentage: 24.3,
      color: '#2563EB',
      description: '건강, 웰빙, 운동에 관심이 많고 자기계발에 적극적인 그룹. 프리미엄 건강식품과 피트니스 서비스에 높은 구매의향.',
      tags: ['건강', '운동', '프리미엄', '자기계발', '웰빙', '영양제'],
      evidence: ['주 3회 이상 운동하며 건강식품 정기구독', '피트니스 앱 사용 및 건강관리 적극적'],
      qualityWarnings: [],
    },
    {
      id: 'C2',
      type: 'cluster',
      label: 'C2 - 트렌디소비형',
      count: 430,
      percentage: 20.1,
      color: '#7C3AED',
      description: '최신 트렌드에 민감하며 패션, 뷰티에 관심 많음. SNS 활동 활발하고 브랜드 이미지 중시.',
      tags: ['패션', '뷰티', 'SNS', '트렌드', '브랜드', '스타일'],
      qualityWarnings: [],
    },
    {
      id: 'C3',
      type: 'cluster',
      label: 'C3 - 가성비추구형',
      count: 380,
      percentage: 17.8,
      color: '#16A34A',
      description: '합리적 소비를 추구하며 가격 대비 성능을 중시. 쿠폰과 할인 정보에 적극적.',
      tags: ['가성비', '합리적', '할인', '쿠폰', '비교', '리뷰'],
      qualityWarnings: ['low-coverage'],
    },
    {
      id: 'C4',
      type: 'cluster',
      label: 'C4 - 가족중심형',
      count: 410,
      percentage: 19.2,
      color: '#F59E0B',
      description: '가족과 자녀를 위한 소비에 집중. 교육, 육아 관련 제품과 서비스에 관심.',
      tags: ['가족', '육아', '교육', '자녀', '안전', '품질'],
      qualityWarnings: [],
    },
    {
      id: 'C5',
      type: 'cluster',
      label: 'C5 - 문화향유형',
      count: 400,
      percentage: 18.7,
      color: '#EC4899',
      description: 'OTT, 음악, 전시회 등 문화 콘텐츠 소비가 많음. 취미생활에 시간과 비용 투자.',
      tags: ['OTT', '문화', '취미', '여행', '공연', '전시'],
      qualityWarnings: ['low-sample'],
    },
  ];

  // Mock difference data - 건강관리형 vs 트렌디소비형
  const differenceData: DifferenceData[] = [
    { category: '여성', groupA: 68, groupB: 72, delta: -4 },
    { category: '남성', groupA: 32, groupB: 28, delta: 4 },
    { category: '20대', groupA: 15, groupB: 45, delta: -30 },
    { category: '30대', groupA: 45, groupB: 35, delta: 10 },
    { category: '40대', groupA: 28, groupB: 15, delta: 13 },
    { category: '50대+', groupA: 12, groupB: 5, delta: 7 },
    { category: '서울', groupA: 35, groupB: 45, delta: -10 },
    { category: '경기', groupA: 25, groupB: 30, delta: -5 },
    { category: '부산', groupA: 15, groupB: 10, delta: 5 },
    { category: '대구', groupA: 10, groupB: 8, delta: 2 },
    { category: '기타', groupA: 15, groupB: 7, delta: 8 },
  ];

  // Mock lift data - 건강관리형 vs 트렌디소비형
  const liftData: LiftData[] = [
    { feature: '건강식품 구매', liftA: 2.4, liftB: 0.8 },
    { feature: '피트니스 이용', liftA: 3.1, liftB: 1.2 },
    { feature: '프리미엄 브랜드', liftA: 1.8, liftB: 0.6 },
    { feature: 'SNS 활동', liftA: 1.2, liftB: 2.8 },
    { feature: '패션/뷰티', liftA: 0.7, liftB: 2.9 },
    { feature: 'OTT 구독', liftA: 1.1, liftB: 2.5 },
    { feature: '온라인 쇼핑', liftA: 1.4, liftB: 1.6 },
    { feature: '배송 서비스', liftA: 1.3, liftB: 1.5 },
    { feature: '브랜드 충성도', liftA: 1.9, liftB: 1.1 },
    { feature: '트렌드 추종', liftA: 0.8, liftB: 2.7 },
  ];

  // Mock SMD data - 건강관리형 vs 트렌디소비형
  const smdData: SMDData[] = [
    { metric: '월 평균 소비액', groupA: 420000, groupB: 280000, smd: 0.82, ci: [0.65, 0.99] },
    { metric: '건강관심도 (1-5)', groupA: 4.2, groupB: 3.1, smd: 0.71, ci: [0.58, 0.84] },
    { metric: '운동 횟수/주', groupA: 3.8, groupB: 1.9, smd: 0.65, ci: [0.52, 0.78] },
    { metric: 'SNS 사용시간/일', groupA: 1.2, groupB: 2.8, smd: -0.58, ci: [-0.71, -0.45] },
    { metric: '브랜드 충성도', groupA: 3.9, groupB: 3.2, smd: 0.42, ci: [0.29, 0.55] },
    { metric: '패션 관심도 (1-5)', groupA: 2.8, groupB: 4.1, smd: -0.73, ci: [-0.86, -0.60] },
    { metric: '트렌드 민감도 (1-5)', groupA: 2.5, groupB: 4.3, smd: -0.89, ci: [-1.02, -0.76] },
    { metric: '가격 민감도 (1-5)', groupA: 3.2, groupB: 2.1, smd: 0.68, ci: [0.55, 0.81] },
  ];

  // Mock opportunity data
  const opportunityData: OpportunityData[] = [
    { title: '프리미엄 건강식품 구매의향 - 실제 구매', delta: 34, direction: 'positive' },
    { title: '피트니스 앱 관심 - 유료 구독 전환', delta: 28, direction: 'positive' },
    { title: '온라인 PT 서비스 인지 - 이용의향', delta: 22, direction: 'positive' },
  ];



  // Set default selections
  useMemo(() => {
    if (!selectedGroupA && clusterGroups.length > 0) {
      setSelectedGroupA(clusterGroups[0]);
    }
    if (!selectedGroupB && clusterGroups.length > 1) {
      setSelectedGroupB(clusterGroups[1]);
    }
  }, [clusterGroups]);

  // 비교 히스토리 저장 (UI 틀만 - 실제 저장 로직 제거)
  // useMemo(() => {
  //   if (selectedGroupA && selectedGroupB) {
  //     const historyItem = historyManager.createComparisonHistory(
  //       {
  //         id: selectedGroupA.id,
  //         name: selectedGroupA.label,
  //         color: selectedGroupA.color
  //       },
  //       {
  //         id: selectedGroupB.id,
  //         name: selectedGroupB.label,
  //         color: selectedGroupB.color
  //       },
  //       diffSortBy as 'difference' | 'lift' | 'smd',
  //       {
  //         differenceData,
  //         liftData,
  //         smdData
  //       }
  //     );
  //     historyManager.save(historyItem);
  //   }
  // }, [selectedGroupA, selectedGroupB, diffSortBy]);

  const getQualityBadge = (warning: string) => {
    switch (warning) {
      case 'low-sample':
        return { label: '표본<50', variant: 'warning' as const };
      case 'low-coverage':
        return { label: 'Coverage<30%', variant: 'warning' as const };
      case 'high-noise':
        return { label: 'Noise↑', variant: 'error' as const };
      default:
        return null;
    }
  };

  const sortedDifferenceData = useMemo(() => {
    return [...differenceData].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [differenceData, diffSortBy]);

  // 내보내기 함수들
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPNG = async () => {
    try {
      // 그룹이 선택되지 않은 경우 체크
      if (!selectedGroupA || !selectedGroupB) {
        toast.error('비교할 그룹을 먼저 선택해주세요');
        return;
      }

      // 차트 컨테이너 찾기
      const element = document.querySelector('.comparison-chart-container');
      
      if (!element) {
        toast.error('내보낼 차트를 찾을 수 없습니다. 페이지를 새로고침 후 다시 시도해주세요.');
        return;
      }

      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 2, // 고해상도
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight
      });

      const link = document.createElement('a');
      link.download = `compare_analysis_${selectedGroupA?.id || 'A'}_vs_${selectedGroupB?.id || 'B'}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('PNG 파일이 다운로드되었습니다');
    } catch (error) {
      console.error('PNG export error:', error);
      toast.error('PNG 내보내기 중 오류가 발생했습니다');
    }
  };

  const exportToCSV = () => {
    const csvData = [
      ['구분', '항목', '그룹A (%)', '그룹B (%)', '차이 (Delta%p)'],
      ...differenceData.map(item => [
        '분포차이',
        item.category,
        item.groupA.toString(),
        item.groupB.toString(),
        item.delta.toString()
      ]),
      ['', '', '', '', ''],
      ['구분', '특성', '그룹A Lift', '그룹B Lift'],
      ...liftData.map(item => [
        'Lift분석',
        item.feature,
        item.liftA.toString(),
        item.liftB.toString()
      ]),
      ['', '', '', ''],
      ['구분', '지표', '그룹A 값', '그룹B 값', 'SMD', 'CI 하한', 'CI 상한'],
      ...smdData.map(item => [
        'SMD분석',
        item.metric,
        item.groupA.toString(),
        item.groupB.toString(),
        item.smd.toString(),
        item.ci[0].toString(),
        item.ci[1].toString()
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    downloadCSV(csvContent, `compare_analysis_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('CSV 파일이 다운로드되었습니다');
  };

  return (
    <div className="min-h-screen bg-[var(--neutral-50)]">
      {/* SECTION-0: Compare Bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-[var(--neutral-200)]" style={{ height: '72px' }}>
        <div className="mx-auto px-20 h-full flex items-center justify-between">
          {/* Left: Controls */}
          <div className="flex items-center gap-4">
            <PISegmentedControl
              value={groupType}
              onChange={(v) => setGroupType(v as GroupType)}
              options={[
                { value: 'cluster', label: 'Quickpoll 군집' },
                { value: 'segment', label: 'Welcome 세그먼트' },
              ]}
            />

            <div className="flex items-center gap-2">
              {/* Group A Selection */}
              <button
                className="px-3 py-1.5 rounded-full flex items-center gap-2 hover:bg-[var(--neutral-100)] transition-colors"
                style={{
                  background: selectedGroupA?.color ? `${selectedGroupA.color}15` : 'transparent',
                  border: `1.5px solid ${selectedGroupA?.color || 'var(--neutral-300)'}`,
                }}
                onClick={() => setIsGroupAModalOpen(true)}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: selectedGroupA?.color || '#94A3B8' }}
                />
                <span className="text-sm font-semibold" style={{ color: selectedGroupA?.color }}>
                  {selectedGroupA?.id || 'A 선택'}
                </span>
              </button>

              <span className="text-[var(--neutral-400)]">vs</span>

              {/* Group B Selection */}
              <button
                className="px-3 py-1.5 rounded-full flex items-center gap-2 hover:bg-[var(--neutral-100)] transition-colors"
                style={{
                  background: selectedGroupB?.color ? `${selectedGroupB.color}15` : 'transparent',
                  border: `1.5px solid ${selectedGroupB?.color || 'var(--neutral-300)'}`,
                }}
                onClick={() => setIsGroupBModalOpen(true)}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: selectedGroupB?.color || '#94A3B8' }}
                />
                <span className="text-sm font-semibold" style={{ color: selectedGroupB?.color }}>
                  {selectedGroupB?.id || 'B 선택'}
                </span>
              </button>

              {/* Source toggle for B */}
              <div className="ml-2">
                <PISegmentedControl
                  value={groupBSource}
                  onChange={(v) => setGroupBSource(v as GroupSource)}
                  options={[
                    { value: 'all', label: '전체' },
                    { value: 'search', label: '검색결과' },
                  ]}
                />
              </div>

              {/* Quality warnings */}
              {selectedGroupA?.qualityWarnings?.map((warning, idx) => {
                const badge = getQualityBadge(warning);
                return badge ? (
                  <PIBadge key={`a-${idx}`} variant={badge.variant} size="sm">
                    {badge.label}
                  </PIBadge>
                ) : null;
              })}
              {selectedGroupB?.qualityWarnings?.map((warning, idx) => {
                const badge = getQualityBadge(warning);
                return badge ? (
                  <PIBadge key={`b-${idx}`} variant={badge.variant} size="sm">
                    {badge.label}
                  </PIBadge>
                ) : null;
              })}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <PIButton 
              variant="ghost" 
              size="small"
              onClick={() => setIsSaveModalOpen(true)}
            >
              <Save className="w-4 h-4 mr-1" />
              이 비교 저장
            </PIButton>
            <PIButton 
              variant="ghost" 
              size="small"
              onClick={exportToCSV}
            >
              <FileText className="w-4 h-4 mr-1" />
              CSV
            </PIButton>
            <PIButton 
              variant="ghost" 
              size="small"
              onClick={downloadPNG}
            >
              <Image className="w-4 h-4 mr-1" />
              PNG
            </PIButton>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto px-20 py-6 space-y-6 comparison-chart-container">
        {/* SECTION-1: Profile Cards */}
        <div className="grid grid-cols-12 gap-6" style={{ minHeight: '220px', height: '240px' }}>
          {/* Group A Card */}
          <div className="col-span-6">
            <PICard className="h-full flex flex-col relative overflow-hidden p-5">
              {/* Top gradient hairline */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                  background: 'linear-gradient(90deg, #C7B6FF 0%, #A5C8FF 100%)',
                }}
              />

              {/* Header - Title Row */}
              <div className="flex items-center gap-2" style={{ marginBottom: '12px' }}>
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: selectedGroupA?.color }}
                />
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary-500)' }}>
                  {selectedGroupA?.label}
                </h3>
                <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--neutral-600)' }}>
                  {selectedGroupA?.count.toLocaleString()}명
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: selectedGroupA?.color }}>
                  {selectedGroupA?.percentage}%
                </span>
                {selectedGroupA?.qualityWarnings && selectedGroupA.qualityWarnings.length > 0 && (
                  <PIBadge variant="warning" size="sm" className="ml-auto">
                    품질주의
                  </PIBadge>
                )}
              </div>

              {/* Description - 2 line clamp */}
              <p 
                className="line-clamp-2"
                style={{ 
                  fontSize: '13px', 
                  fontWeight: 400, 
                  lineHeight: '1.5', 
                  color: 'var(--primary-500)',
                  marginBottom: '12px',
                  height: 'calc(13px * 1.5 * 2)', // Fixed height for 2 lines
                }}
              >
                {selectedGroupA?.description}
              </p>

              {/* Tags - Single line with overflow counter */}
              <div className="flex items-center gap-2 overflow-hidden" style={{ marginBottom: '12px', height: '24px' }}>
                {selectedGroupA?.tags.slice(0, 5).map((tag, idx) => (
                  <PIHashtag key={idx} color={getHashtagColor(tag)}>
                    {tag}
                  </PIHashtag>
                ))}
                {selectedGroupA && selectedGroupA.tags.length > 5 && (
                  <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--neutral-600)', flexShrink: 0 }}>
                    … +{selectedGroupA.tags.length - 5}
                  </span>
                )}
              </div>

              {/* Evidence - Max 1, 2 line clamp */}
              {selectedGroupA?.evidence && selectedGroupA.evidence.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div
                    className="line-clamp-2 px-3 py-2 rounded-lg italic"
                    style={{
                      background: 'rgba(37, 99, 235, 0.05)',
                      border: '1px solid rgba(37, 99, 235, 0.1)',
                      fontSize: '11px',
                      fontWeight: 400,
                      lineHeight: '1.4',
                      color: 'var(--neutral-600)',
                    }}
                  >
                    "{selectedGroupA.evidence[0]}"
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-auto pt-3 border-t border-[var(--neutral-200)]" style={{ marginTop: '16px' }}>
                <PIButton variant="ghost" size="small" className="w-full justify-center">
                  {selectedGroupA?.id} 만 보기
                </PIButton>
              </div>
            </PICard>
          </div>

          {/* Group B Card */}
          <div className="col-span-6">
            <PICard className="h-full flex flex-col relative overflow-hidden p-5">
              {/* Top gradient hairline */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                  background: 'linear-gradient(90deg, #C7B6FF 0%, #A5C8FF 100%)',
                }}
              />

              {/* Header - Title Row */}
              <div className="flex items-center gap-2" style={{ marginBottom: '12px' }}>
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: selectedGroupB?.color }}
                />
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary-500)' }}>
                  {selectedGroupB?.label}
                </h3>
                <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--neutral-600)' }}>
                  {selectedGroupB?.count.toLocaleString()}명
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: selectedGroupB?.color }}>
                  {selectedGroupB?.percentage}%
                </span>
                {selectedGroupB?.qualityWarnings && selectedGroupB.qualityWarnings.length > 0 && (
                  <PIBadge variant="warning" size="sm" className="ml-auto">
                    품질주의
                  </PIBadge>
                )}
              </div>

              {/* Description - 2 line clamp */}
              <p 
                className="line-clamp-2"
                style={{ 
                  fontSize: '13px', 
                  fontWeight: 400, 
                  lineHeight: '1.5', 
                  color: 'var(--primary-500)',
                  marginBottom: '12px',
                  height: 'calc(13px * 1.5 * 2)', // Fixed height for 2 lines
                }}
              >
                {selectedGroupB?.description}
              </p>

              {/* Tags - Single line with overflow counter */}
              <div className="flex items-center gap-2 overflow-hidden" style={{ marginBottom: '12px', height: '24px' }}>
                {selectedGroupB?.tags.slice(0, 5).map((tag, idx) => (
                  <PIHashtag key={idx} color={getHashtagColor(tag)}>
                    {tag}
                  </PIHashtag>
                ))}
                {selectedGroupB && selectedGroupB.tags.length > 5 && (
                  <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--neutral-600)', flexShrink: 0 }}>
                    … +{selectedGroupB.tags.length - 5}
                  </span>
                )}
              </div>

              {/* Evidence - Max 1, 2 line clamp */}
              {selectedGroupB?.evidence && selectedGroupB.evidence.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div
                    className="line-clamp-2 px-3 py-2 rounded-lg italic"
                    style={{
                      background: 'rgba(124, 58, 237, 0.05)',
                      border: '1px solid rgba(124, 58, 237, 0.1)',
                      fontSize: '11px',
                      fontWeight: 400,
                      lineHeight: '1.4',
                      color: 'var(--neutral-600)',
                    }}
                  >
                    "{selectedGroupB.evidence[0]}"
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-auto pt-3 border-t border-[var(--neutral-200)]" style={{ marginTop: '16px' }}>
                <PIButton variant="ghost" size="small" className="w-full justify-center">
                  {selectedGroupB?.id} 만 보기
                </PIButton>
              </div>
            </PICard>
          </div>
        </div>

        {/* SECTION-2: Difference Panel */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12">
            <PICard className="relative overflow-visible h-[540px] p-5" data-export-chart>
              {/* Top gradient hairline */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                  background: 'linear-gradient(90deg, #C7B6FF 0%, #A5C8FF 100%)',
                }}
              />

              {/* Header - Sticky */}
              <div className="flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10" style={{ padding: '12px 0', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary-500)' }}>차이 분석</h3>
                <PISegmentedControl
                  value={diffSortBy}
                  onChange={(v) => setDiffSortBy(v as 'delta' | 'lift' | 'smd')}
                    options={[
                      { value: 'delta', label: 'Delta%p' },
                      { value: 'lift', label: 'Lift' },
                    { value: 'smd', label: 'SMD' },
                  ]}
                />
              </div>

              <div className="space-y-4" style={{ gap: '16px' }}>
                {/* BLOCK-1: Δ%p (h=220) */}
                <div style={{ height: '220px' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--neutral-600)' }}>분포 차이 (Delta%p)</h4>
                    <select 
                      className="text-xs px-2 py-1 rounded border border-[var(--neutral-200)] bg-white text-[var(--neutral-600)]"
                      defaultValue="delta"
                    >
                      <option value="delta">Delta%p ↓</option>
                      <option value="groupA">A% ↓</option>
                      <option value="groupB">B% ↓</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {sortedDifferenceData.slice(0, 6).map((item, idx) => {
                      const maxPercent = Math.max(item.groupA, item.groupB);
                      const scaleA = (item.groupA / maxPercent) * 100;
                      const scaleB = (item.groupB / maxPercent) * 100;

                      return (
                        <div key={idx} className="flex items-center" style={{ gap: '12px' }}>
                          {/* Col-L: Label (120px) */}
                          <div style={{ width: '120px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: 'var(--primary-500)' }}>
                            {item.category}
                          </div>

                          {/* Col-M: Diverging Bar (flex-1) */}
                          <div className="flex-1 relative" style={{ height: '14px' }}>
                            {/* Rail */}
                            <div className="absolute inset-0 rounded-full" style={{ background: '#EEF2F8' }} />
                            
                            {/* Center guide */}
                            <div className="absolute top-0 bottom-0 left-1/2 w-px" style={{ background: '#E5E7EB', transform: 'translateX(-50%)' }} />
                            
                            {/* Left fill (A) - align right */}
                            <div 
                              className="absolute top-0 bottom-0 right-1/2 rounded-l-full"
                              style={{ 
                                width: `${scaleA / 2}%`,
                                background: '#3B82F6',
                              }}
                            />
                            
                            {/* Right fill (B) - align left */}
                            <div 
                              className="absolute top-0 bottom-0 left-1/2 rounded-r-full"
                              style={{ 
                                width: `${scaleB / 2}%`,
                                background: '#8B5CF6',
                              }}
                            />
                            
                            {/* Center Δ chip - Enhanced visibility */}
                            <div 
                              className="absolute top-1/2 left-1/2 flex items-center gap-0.5 px-2 py-1 rounded-full shadow-sm"
                              style={{ 
                                transform: 'translate(-50%, -50%)',
                                background: item.delta > 0 ? '#DCFCE7' : '#FEE2E2',
                                border: `1.5px solid ${item.delta > 0 ? '#16A34A' : '#DC2626'}`,
                                color: item.delta > 0 ? '#15803D' : '#B91C1C',
                                fontWeight: 700,
                                fontSize: '11px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span style={{ fontSize: '10px' }}>{item.delta > 0 ? '+' : '-'}</span>
                              <span>{Math.abs(item.delta)}%p</span>
                            </div>
                          </div>

                          {/* Col-R: Values (96px) */}
                          <div style={{ width: '96px', fontSize: '12px', fontWeight: 600, color: 'var(--primary-500)' }}>
                            <span style={{ color: '#3B82F6' }}>{item.groupA}%</span>
                            <span style={{ color: 'var(--neutral-400)', fontWeight: 400, margin: '0 4px' }}>/</span>
                            <span style={{ color: '#8B5CF6' }}>{item.groupB}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* BLOCK-2: Lift (h=160) */}
                <div className="pt-4 border-t border-[var(--neutral-200)]" style={{ height: '160px' }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--neutral-600)' }}>특징 히트맵 (Lift)</h4>
                    <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--neutral-500)' }}>1.0 기준</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {liftData.slice(0, 4).map((item, idx) => {
                      // Diverging bar around 1.0 with MAX width limit to prevent overflow
                      const baselinePosition = 50; // 1.0 at center
                      const maxLift = 3.0;
                      const MAX_BAR_WIDTH = 45; // Maximum 45% to prevent overflow into text
                      
                      // Calculate positions relative to baseline and clamp to max
                      let widthA = Math.min(((item.liftA - 1) / (maxLift - 1)) * baselinePosition, MAX_BAR_WIDTH);
                      let widthB = Math.min(((item.liftB - 1) / (maxLift - 1)) * baselinePosition, MAX_BAR_WIDTH);
                      
                      // For values < 1.0, calculate from left
                      let leftPosA = item.liftA < 1 ? Math.max(baselinePosition - Math.min(((1 - item.liftA) / (maxLift - 1)) * baselinePosition, MAX_BAR_WIDTH), 5) : baselinePosition;
                      let leftPosB = item.liftB < 1 ? Math.max(baselinePosition - Math.min(((1 - item.liftB) / (maxLift - 1)) * baselinePosition, MAX_BAR_WIDTH), 5) : baselinePosition;

                      return (
                        <div key={idx} className="flex items-center" style={{ gap: '12px' }}>
                          {/* Col-L: Label */}
                          <div style={{ width: '120px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: 'var(--primary-500)' }}>
                            {item.feature}
                          </div>

                          {/* Col-M: Diverging bar around 1.0 - SAFE ZONE */}
                          <div className="flex-1 relative overflow-hidden" style={{ height: '14px' }}>
                            {/* Rail - z-index 0 */}
                            <div className="absolute inset-0 rounded-full" style={{ background: '#EEF2F8', zIndex: 0 }} />
                            
                            {/* Center line at 1.0 - z-index 2 */}
                            <div className="absolute top-0 bottom-0 left-1/2 w-px" style={{ background: '#D1D5DB', transform: 'translateX(-50%)', zIndex: 2 }} />
                            <div 
                              className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full" 
                              style={{ background: '#9CA3AF', transform: 'translate(-50%, -50%)', zIndex: 2 }}
                            />
                            
                            {/* Group A bar - z-index 1 */}
                            {item.liftA < 1 ? (
                              <div 
                                className="absolute top-0 bottom-0 rounded-full"
                                style={{ 
                                  left: `${leftPosA}%`,
                                  right: '50%',
                                  background: '#60A5FA',
                                  opacity: 0.4,
                                  zIndex: 1,
                                }}
                              />
                            ) : (
                              <div 
                                className="absolute top-0 bottom-0 rounded-r-full"
                                style={{ 
                                  left: '50%',
                                  width: `${widthA}%`,
                                  background: '#F59E0B',
                                  opacity: 0.8,
                                  zIndex: 1,
                                }}
                              />
                            )}
                            
                            {/* Group B bar - z-index 1 */}
                            {item.liftB < 1 ? (
                              <div 
                                className="absolute top-0 bottom-0 rounded-full"
                                style={{ 
                                  left: `${leftPosB}%`,
                                  right: '50%',
                                  background: '#60A5FA',
                                  opacity: 0.25,
                                  zIndex: 1,
                                }}
                              />
                            ) : (
                              <div 
                                className="absolute top-0 bottom-0 rounded-r-full"
                                style={{ 
                                  left: '50%',
                                  width: `${widthB}%`,
                                  background: '#F59E0B',
                                  opacity: 0.5,
                                  zIndex: 1,
                                }}
                              />
                            )}
                          </div>

                          {/* Col-R: Values - PROTECTED with explicit z-index */}
                          <div style={{ width: '96px', display: 'flex', flexDirection: 'column', gap: '0', position: 'relative', zIndex: 10 }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-500)', lineHeight: '1.3' }}>
                              <span style={{ color: '#3B82F6' }}>{item.liftA.toFixed(1)}×</span>
                              <span style={{ margin: '0 2px', color: 'var(--neutral-400)', fontWeight: 400 }}>/</span>
                              <span style={{ color: '#8B5CF6' }}>{item.liftB.toFixed(1)}×</span>
                            </div>
                            <div style={{ fontSize: '9px', fontWeight: 400, color: 'var(--neutral-500)', lineHeight: '1.2' }}>
                              base 18%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* BLOCK-3: SMD (h=160) */}
                <div className="pt-4 border-t border-[var(--neutral-200)]" style={{ height: '160px' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                    <div className="flex items-center gap-2">
                      <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--neutral-600)' }}>연속형 차이 (SMD)</h4>
                      <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--neutral-500)' }}>표준화 평균 차이</span>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-[var(--neutral-600)] cursor-pointer">
                      <input type="checkbox" className="w-3 h-3 rounded" />
                      <span style={{ fontSize: '10px' }}>절대값 정렬</span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {smdData.slice(0, 4).map((item, idx) => {
                      // Zero baseline at center
                      const maxSMD = 2.0;
                      const smdPosition = ((item.smd / maxSMD) * 50) + 50; // Map -2~2 to 0~100%
                      const ciLeft = ((item.ci[0] / maxSMD) * 50) + 50;
                      const ciRight = ((item.ci[1] / maxSMD) * 50) + 50;

                      return (
                        <div key={idx} className="flex items-center" style={{ gap: '12px' }}>
                          {/* Col-L: Label */}
                          <div style={{ width: '120px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: 'var(--primary-500)' }}>
                            {item.metric}
                          </div>

                          {/* Col-M: Diverging bar with dot and CI whisker */}
                          <div className="flex-1 relative" style={{ height: '14px' }}>
                            {/* Rail */}
                            <div className="absolute inset-0 rounded-full" style={{ background: '#EEF2F8' }} />
                            
                            {/* Zero baseline */}
                            <div className="absolute top-0 bottom-0 left-1/2 w-px" style={{ background: '#D1D5DB', transform: 'translateX(-50%)' }} />
                            
                            {/* CI range (whisker) */}
                            <div
                              className="absolute top-1/2 h-0.5"
                              style={{
                                left: `${Math.min(ciLeft, ciRight)}%`,
                                width: `${Math.abs(ciRight - ciLeft)}%`,
                                background: item.smd > 0 ? '#3B82F6' : '#8B5CF6',
                                opacity: 0.3,
                                transform: 'translateY(-50%)',
                              }}
                            />
                            
                            {/* Point estimate (dot) */}
                            <div
                              className="absolute top-1/2 w-2 h-2 rounded-full shadow-sm"
                              style={{
                                left: `${smdPosition}%`,
                                transform: 'translate(-50%, -50%)',
                                background: item.smd > 0 ? '#3B82F6' : '#8B5CF6',
                                border: '1.5px solid white',
                              }}
                            />
                          </div>

                          {/* Col-R: Values */}
                          <div style={{ width: '96px' }}>
                            <span
                              className="inline-block px-2 py-0.5 rounded"
                              style={{
                                background: item.smd > 0 ? 'rgba(59, 130, 246, 0.12)' : 'rgba(139, 92, 246, 0.12)',
                                color: item.smd > 0 ? '#3B82F6' : '#8B5CF6',
                                fontSize: '11px',
                                fontWeight: 700,
                              }}
                            >
                              {item.smd > 0 ? '+' : ''}{item.smd.toFixed(2)} σ
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </PICard>
          </div>
        </div>

        {/* SECTION-3: Opportunity */}
        <div className="grid grid-cols-12 gap-6" style={{ minHeight: '160px' }}>
          <div className="col-span-12">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-semibold">기회 영역</h3>
              <PIBadge variant="accent" size="sm">
                의향 - 사용 갭 분석
              </PIBadge>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {opportunityData.map((opp, idx) => (
                <PICard key={idx} className="relative overflow-hidden">
                  {/* Top gradient hairline */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{
                      background: 'linear-gradient(90deg, #C7B6FF 0%, #A5C8FF 100%)',
                    }}
                  />

                  {/* Rank badge */}
                  <div className="absolute top-4 right-4">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
                      style={{
                        background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                        color: 'white',
                        fontSize: '14px',
                      }}
                    >
                      {idx + 1}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium leading-relaxed pr-10">
                      {opp.title}
                    </p>

                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-[var(--neutral-400)]" />
                      <div
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full"
                        style={{
                          background: 'rgba(37, 99, 235, 0.1)',
                        }}
                      >
                        <TrendingUp className="w-4 h-4 text-[var(--accent-blue)]" />
                        <span className="font-bold text-[var(--accent-blue)]">
                          +{opp.delta}%p
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[var(--neutral-600)]">
                      {selectedGroupA?.id}이(가) {selectedGroupB?.id}보다 {opp.delta}%p 높은 전환율
                    </p>
                  </div>
                </PICard>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER: Sticky Action Bar */}
      <div
        className="sticky bottom-0 z-30 bg-white border-t border-[var(--neutral-200)] shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
        style={{ height: '56px' }}
      >
        <div className="mx-auto px-20 h-full flex items-center justify-between">
          <div className="text-sm text-[var(--neutral-600)]">
            선택:{' '}
            <span className="font-semibold" style={{ color: selectedGroupA?.color }}>
              {selectedGroupA?.id}
            </span>
            {' vs '}
            <span className="font-semibold" style={{ color: selectedGroupB?.color }}>
              {selectedGroupB?.id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <PIButton variant="ghost" size="small">
              <Download className="w-4 h-4 mr-1" />
              CSV
            </PIButton>
            <PIButton 
              variant="primary" 
              size="small"
              onClick={downloadPNG}
            >
              <Download className="w-4 h-4 mr-1" />
              PNG
            </PIButton>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PIGroupSelectionModal
        isOpen={isGroupAModalOpen}
        onClose={() => setIsGroupAModalOpen(false)}
        onSelect={(group) => {
          setSelectedGroupA(group);
          setIsGroupAModalOpen(false);
        }}
        groups={clusterGroups}
        title="그룹 A 선택"
        selectedGroup={selectedGroupA}
      />

      <PIGroupSelectionModal
        isOpen={isGroupBModalOpen}
        onClose={() => setIsGroupBModalOpen(false)}
        onSelect={(group) => {
          setSelectedGroupB(group);
          setIsGroupBModalOpen(false);
        }}
        groups={clusterGroups}
        title="그룹 B 선택"
        selectedGroup={selectedGroupB}
      />

      {/* Save Comparison Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSaveModalOpen(false)} />
          <div className="relative w-[80vw] max-w-[800px] h-[60vw] max-h-[600px] bg-white rounded-xl shadow-2xl p-6 flex flex-col">
            {/* Header with close button */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="text-lg font-semibold text-[var(--primary-500)]">
                비교 저장
              </h3>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="p-2 hover:bg-[var(--neutral-100)] rounded-lg transition-colors"
                title="닫기"
              >
                <X className="w-5 h-5 text-[var(--neutral-600)]" />
              </button>
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-[var(--neutral-600)] mb-2">
                  저장 이름
                </label>
                <input
                  type="text"
                  placeholder="예: 건강관리형 vs 트렌디소비형"
                  className="w-full px-3 py-2 border border-[var(--neutral-200)] rounded-lg focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--neutral-600)] mb-2">
                  설명 (선택사항)
                </label>
                <textarea
                  placeholder="이 비교에 대한 설명을 입력하세요"
                  className="w-full px-3 py-2 border border-[var(--neutral-200)] rounded-lg focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent h-24 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--neutral-600)] mb-2">
                  태그 (선택사항)
                </label>
                <input
                  type="text"
                  placeholder="예: 건강, 트렌드, 소비패턴"
                  className="w-full px-3 py-2 border border-[var(--neutral-200)] rounded-lg focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--neutral-600)] mb-2">
                  분석 유형
                </label>
                <div className="flex gap-2">
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    <span className="text-sm">차이 분석 (Delta%p)</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">리프트 분석</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">SMD 분석</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[var(--neutral-200)] flex-shrink-0">
              <PIButton variant="ghost" onClick={() => setIsSaveModalOpen(false)}>
                취소
              </PIButton>
              <PIButton 
                variant="primary" 
                onClick={() => {
                  toast.success('비교가 저장되었습니다');
                  setIsSaveModalOpen(false);
                }}
              >
                저장
              </PIButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

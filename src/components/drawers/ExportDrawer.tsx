import { useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { PIButton } from '../../ui/pi/PIButton';
import { PISegmentedControl } from '../../ui/pi/PISegmentedControl';
import { Checkbox } from '../../ui/base/checkbox';
import { Label } from '../../ui/base/label';
import { toast } from 'sonner';

interface ExportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data?: any[]; // 내보낼 데이터
  query?: string; // 검색 쿼리
  filters?: any; // 적용된 필터
}

export function ExportDrawer({ isOpen, onClose, data = [], query = '', filters = {} }: ExportDrawerProps) {
  const [format, setFormat] = useState<string>('csv');
  const [samplingMethod, setSamplingMethod] = useState<string>('random');
  const [sampleSize, setSampleSize] = useState<string>('100');
  const [includeQuery, setIncludeQuery] = useState(true);
  const [includeTable, setIncludeTable] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (data.length === 0) {
      toast.error('내보낼 데이터가 없습니다');
      return;
    }

    setLoading(true);
    try {
      // 샘플링 적용
      let finalData = [...data];
      const targetSize = parseInt(sampleSize) || data.length;
      
      if (data.length > targetSize) {
        if (samplingMethod === 'random') {
          // 무작위 샘플링
          finalData = data.sort(() => 0.5 - Math.random()).slice(0, targetSize);
        } else {
          // 층화 샘플링 (성별, 연령대, 지역 기준)
          const groups: Record<string, any[]> = {};
          data.forEach(panel => {
            const gender = panel.gender || '기타';
            const ageGroup = panel.age ? Math.floor(panel.age / 10) * 10 : '기타';
            const region = panel.region || '기타';
            const key = `${gender}_${ageGroup}_${region}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(panel);
          });
          
          const samplesPerGroup = Math.floor(targetSize / Object.keys(groups).length);
          finalData = Object.values(groups)
            .flatMap(group => group.slice(0, samplesPerGroup))
            .slice(0, targetSize);
        }
      }

      // 파일 다운로드
      if (format === 'csv') {
        const csvContent = convertToCSV(finalData);
        downloadCSV(csvContent, `panel_export_${new Date().toISOString().split('T')[0]}.csv`);
      } else if (format === 'json') {
        downloadJSON(finalData, `panel_export_${new Date().toISOString().split('T')[0]}.json`);
      } else if (format === 'pdf') {
        downloadTXT(finalData, query, filters);
      }

      toast.success(`${format.toUpperCase()} 파일이 다운로드되었습니다`);
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast.error('내보내기 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (csvData: string, filename: string) => {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  // JSON 변환 함수 - 패널 기본정보 + Qpoll 질문-답 포함
  const downloadJSON = (jsonData: any[], filename: string) => {
    // 데이터 구조화: 기본정보 + 메타데이터 + Qpoll 응답
    const structuredData = jsonData.map(panel => {
      const exportPanel: any = {
        id: panel.id || '',
        name: panel.name || panel.id || '',
        basicInfo: {
          age: panel.age || null,
          gender: panel.gender || '',
          region: panel.region || panel.metadata?.location || '',
          district: panel.metadata?.detail_location || '',
          occupation: panel.metadata?.직업 || '',
          income: {
            personal: panel.metadata?.["월평균 개인소득"] || panel.income || '',
            household: panel.metadata?.["월평균 가구소득"] || ''
          },
          family: {
            married: panel.metadata?.결혼여부 || '',
            children: panel.metadata?.자녀수 || null,
            householdSize: panel.metadata?.가족수 || ''
          },
          education: panel.metadata?.최종학력 || ''
        },
        qpollResponses: {}
      };
      
      // Qpoll 응답 처리
      if (panel.responses) {
        if (Array.isArray(panel.responses)) {
          panel.responses.forEach((resp: any) => {
            if (resp.key && resp.key !== 'no_qpoll') {
              exportPanel.qpollResponses[resp.key] = {
                question: resp.title || resp.key,
                answer: resp.answer || '',
                date: resp.date || ''
              };
            }
          });
        } else if (typeof panel.responses === 'object') {
          Object.entries(panel.responses).forEach(([key, value]) => {
            exportPanel.qpollResponses[key] = {
              question: key,
              answer: typeof value === 'string' ? value : JSON.stringify(value),
              date: ''
            };
          });
        }
      }
      
      // 추가 메타데이터 (있는 경우)
      if (panel.metadata) {
        exportPanel.additionalMetadata = { ...panel.metadata };
        // 이미 basicInfo에 포함된 필드는 제거
        delete exportPanel.additionalMetadata.직업;
        delete exportPanel.additionalMetadata["월평균 개인소득"];
        delete exportPanel.additionalMetadata["월평균 가구소득"];
        delete exportPanel.additionalMetadata.결혼여부;
        delete exportPanel.additionalMetadata.자녀수;
        delete exportPanel.additionalMetadata.가족수;
        delete exportPanel.additionalMetadata.최종학력;
        delete exportPanel.additionalMetadata.detail_location;
        delete exportPanel.additionalMetadata.location;
      }
      
      return exportPanel;
    });
    
    const exportObject = {
      exportDate: new Date().toISOString(),
      query: query || '',
      filters: filters || {},
      totalPanels: structuredData.length,
      panels: structuredData
    };
    
    const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  // TXT 다운로드 함수 - 한글 인코딩 문제 없이 텍스트 파일로 내보내기
  const downloadTXT = (data: any[], query?: string, filters?: any) => {
    const lines: string[] = [];
    
    // 헤더
    lines.push('='.repeat(80));
    lines.push('패널 검색 결과 내보내기');
    lines.push('='.repeat(80));
    lines.push('');
    
    // 메타 정보
    if (query) {
      lines.push(`검색 쿼리: ${query}`);
    }
    lines.push(`내보낸 날짜: ${new Date().toLocaleString('ko-KR')}`);
    lines.push(`총 패널 수: ${data.length}개`);
    lines.push('');
    lines.push('='.repeat(80));
    lines.push('');
    
    // 각 패널 정보
    data.forEach((panel, index) => {
      lines.push(`[패널 ${index + 1}]`);
      lines.push('-'.repeat(80));
      lines.push(`ID: ${panel.id || ''}`);
      lines.push(`이름: ${panel.name || panel.id || ''}`);
      lines.push(`나이: ${panel.age || ''}`);
      lines.push(`성별: ${panel.gender || ''}`);
      lines.push(`지역: ${panel.region || panel.metadata?.location || ''}`);
      if (panel.metadata?.detail_location) {
        lines.push(`구: ${panel.metadata.detail_location}`);
      }
      lines.push(`직업: ${panel.metadata?.직업 || ''}`);
      lines.push(`소득(개인): ${panel.metadata?.["월평균 개인소득"] || panel.income || ''}`);
      lines.push(`소득(가구): ${panel.metadata?.["월평균 가구소득"] || ''}`);
      lines.push(`결혼여부: ${panel.metadata?.결혼여부 || ''}`);
      lines.push(`자녀수: ${panel.metadata?.자녀수 || ''}`);
      lines.push(`가족수: ${panel.metadata?.가족수 || ''}`);
      lines.push(`최종학력: ${panel.metadata?.최종학력 || ''}`);
      lines.push('');
      
      // Qpoll 응답
      if (panel.responses) {
        lines.push('Qpoll 응답:');
        if (Array.isArray(panel.responses)) {
          panel.responses.forEach((resp: any) => {
            if (resp.key && resp.key !== 'no_qpoll') {
              lines.push(`  Q [${resp.key}]: ${resp.title || resp.key}`);
              lines.push(`  A: ${resp.answer || ''}`);
              if (resp.date) {
                lines.push(`  날짜: ${resp.date}`);
              }
              lines.push('');
            }
          });
        } else if (typeof panel.responses === 'object') {
          Object.entries(panel.responses).forEach(([key, value]) => {
            lines.push(`  Q [${key}]: ${key}`);
            lines.push(`  A: ${String(value)}`);
            lines.push('');
          });
        }
      } else {
        lines.push('Qpoll 응답: 없음');
        lines.push('');
      }
      
      lines.push('='.repeat(80));
      lines.push('');
    });
    
    const textContent = lines.join('\n');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `panel_export_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  // CSV 변환 함수 - 패널 기본정보 + Qpoll 질문-답 포함
  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    // 모든 패널의 Qpoll 질문 키 수집
    const allQuestionKeys = new Set<string>();
    data.forEach(panel => {
      if (panel.responses) {
        if (Array.isArray(panel.responses)) {
          panel.responses.forEach((resp: any) => {
            if (resp.key && resp.key !== 'no_qpoll') {
              allQuestionKeys.add(resp.key);
            }
          });
        } else if (typeof panel.responses === 'object') {
          Object.keys(panel.responses).forEach(key => {
            allQuestionKeys.add(key);
          });
        }
      }
    });
    
    const questionKeys = Array.from(allQuestionKeys).sort();
    
    // 기본 헤더 + 메타데이터 헤더 + Qpoll 질문 헤더
    const baseHeaders = [
      'ID', '이름', '나이', '성별', '지역', '구', '직업', 
      '소득(개인)', '소득(가구)', '결혼여부', '자녀수', '가족수', '최종학력'
    ];
    const qpollHeaders = questionKeys.map(key => `Qpoll_${key}`);
    const headers = [...baseHeaders, ...qpollHeaders];
    
    const csvRows: string[] = [];
    
    // BOM 추가 (Excel에서 한글 깨짐 방지)
    csvRows.push('\uFEFF' + headers.map(h => `"${h}"`).join(','));
    
    data.forEach(panel => {
      // 기본 정보
      const baseRow = [
        panel.id || '',
        panel.name || panel.id || '',
        panel.age || '',
        panel.gender || '',
        panel.region || panel.metadata?.location || '',
        panel.metadata?.detail_location || '',
        panel.metadata?.직업 || '',
        panel.metadata?.["월평균 개인소득"] || panel.income || '',
        panel.metadata?.["월평균 가구소득"] || '',
        panel.metadata?.결혼여부 || '',
        panel.metadata?.자녀수 || '',
        panel.metadata?.가족수 || '',
        panel.metadata?.최종학력 || ''
      ];
      
      // Qpoll 응답
      const qpollRow = questionKeys.map(key => {
        if (Array.isArray(panel.responses)) {
          const resp = panel.responses.find((r: any) => r.key === key);
          return resp ? resp.answer : '';
        } else if (panel.responses && typeof panel.responses === 'object') {
          return panel.responses[key] || '';
        }
        return '';
      });
      
      const row = [...baseRow, ...qpollRow];
      // CSV 이스케이프: 따옴표를 두 개로, 줄바꿈 처리
      csvRows.push(row.map(field => {
        const str = String(field || '').replace(/"/g, '""');
        return `"${str}"`;
      }).join(','));
    });
    
    return csvRows.join('\n');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay with Enhanced Blur */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        style={{ backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className="fixed right-0 top-0 h-full w-[480px] drawer-content z-50 flex flex-col animate-in slide-in-from-right duration-[var(--duration-base)]"
        style={{
          background: 'var(--surface-1)',
          color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow-3)',
        }}
      >
        {/* Header */}
        <div 
          className="relative px-6 py-5 border-b drawer-header"
          style={{
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--brand-blue-500)] to-transparent opacity-50" />
          
          <div className="flex items-center justify-between">
            <h2 
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              내보내기
            </h2>
            <button
              onClick={onClose}
              className="btn--ghost p-2 rounded-lg transition-fast"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>파일 형식</Label>
            <PISegmentedControl
              options={[
                { value: 'csv', label: 'CSV' },
                { value: 'json', label: 'JSON' },
                { value: 'pdf', label: 'TXT' },
              ]}
              value={format}
              onChange={setFormat}
            />
          </div>

          {/* Include Options */}
          <div className="space-y-4">
            <Label>포함 범위</Label>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={includeQuery}
                  onCheckedChange={(checked: boolean) => setIncludeQuery(checked)}
                />
                <div className="flex-1">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>쿼리/필터 정의</span>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    검색 쿼리와 적용된 필터 조건 정보
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={includeTable}
                  onCheckedChange={(checked: boolean) => setIncludeTable(checked)}
                />
                <div className="flex-1">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>결과 테이블</span>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    패널 기본정보 및 Qpoll 질문-답변
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Sampling */}
          <div className="space-y-4">
            <Label>샘플링</Label>
            
            <PISegmentedControl
              options={[
                { value: 'random', label: '무작위' },
                { value: 'stratified', label: '층화' },
              ]}
              value={samplingMethod}
              onChange={setSamplingMethod}
            />

            {samplingMethod === 'stratified' && (
              <div 
                className="text-xs p-3 rounded-lg space-y-1"
                style={{
                  color: 'var(--text-secondary)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  층화 샘플링이란?
                </p>
                <p style={{ color: 'var(--text-tertiary)' }}>
                  전체 데이터를 <strong>성별, 연령대, 지역</strong>으로 그룹을 나눈 후, 각 그룹에서 균등하게 샘플을 추출합니다.
                </p>
                <p style={{ color: 'var(--text-tertiary)' }}>
                  예: 남성 20대 서울, 여성 30대 부산 등 각 그룹에서 비슷한 수만큼 선택하여 <strong>대표성을 높입니다</strong>.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>목표 샘플 수</Label>
              <input
                type="number"
                value={sampleSize}
                onChange={(e) => setSampleSize(e.target.value)}
                className="input w-full"
                style={{
                  background: 'var(--surface-2)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-primary)',
                }}
                placeholder="100"
              />
            </div>
          </div>

          {/* Preview Info */}
          <div 
            className="p-4 rounded-xl border"
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <h4 
              className="text-sm font-semibold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              미리보기
            </h4>
            <div 
              className="space-y-1 text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              <p>- 형식: {format.toUpperCase()}</p>
              <p>- 전체 데이터: {data.length}명</p>
              <p>- 샘플: {Math.min(parseInt(sampleSize), data.length)}명 ({samplingMethod === 'random' ? '무작위' : '층화'})</p>
              <p>- 예상 크기: ~{(Math.min(parseInt(sampleSize), data.length) * 2.5).toFixed(1)} KB</p>
              {query && <p>- 쿼리: "{query}"</p>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div 
          className="px-6 py-4 border-t flex items-center gap-3"
          style={{
            borderColor: 'var(--border-primary)',
            background: 'var(--bg-0)',
          }}
        >
          <PIButton 
            variant="ghost" 
            onClick={onClose} 
            className="flex-1"
            disabled={loading}
          >
            취소
          </PIButton>
          <PIButton
            variant="primary-gradient"
            icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            onClick={handleExport}
            disabled={loading || data.length === 0}
            className="flex-1"
          >
            {loading ? '생성 중...' : '내보내기 생성'}
          </PIButton>
        </div>
      </div>
    </>
  );
}

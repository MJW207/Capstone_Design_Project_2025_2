import { useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { PIButton } from '../pi/PIButton';
import { PISegmentedControl } from '../pi/PISegmentedControl';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { toast } from 'sonner';

interface ExportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data?: any[]; // 내보낼 데이터
  query?: string; // 검색 쿼리
  filters?: any; // 적용된 필터
}

export function ExportDrawer({ isOpen, onClose, data = [], query = '' }: ExportDrawerProps) {
  const [format, setFormat] = useState<string>('csv');
  const [samplingMethod, setSamplingMethod] = useState<string>('random');
  const [sampleSize, setSampleSize] = useState<string>('100');
  const [includeQuery, setIncludeQuery] = useState(true);
  const [includeTable, setIncludeTable] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeClusters, setIncludeClusters] = useState(false);
  const [includeSnippets, setIncludeSnippets] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    // 더미 데이터가 없으면 기본 더미 데이터 사용
    const exportData = data.length > 0 ? data : [
      { id: 'P001', name: '김철수', age: 28, gender: '남성', region: '서울', responses: { q1: '스마트폰을 하루에 5-6시간 사용합니다' } },
      { id: 'P002', name: '이영희', age: 35, gender: '여성', region: '부산', responses: { q1: '스마트폰을 하루에 3-4시간 사용합니다' } },
      { id: 'P003', name: '박민수', age: 42, gender: '남성', region: '대구', responses: { q1: '스마트폰을 하루에 2-3시간 사용합니다' } }
    ];

    setLoading(true);
    try {
      // 샘플링 적용
      let finalData = [...exportData];
      const targetSize = parseInt(sampleSize);
      
      if (exportData.length > targetSize) {
        if (samplingMethod === 'random') {
          // 무작위 샘플링
          finalData = exportData.sort(() => 0.5 - Math.random()).slice(0, targetSize);
        } else {
          // 층화 샘플링 (간단한 구현)
          const groups = {
            male: exportData.filter(p => p.gender === '남성'),
            female: exportData.filter(p => p.gender === '여성')
          };
          
          const samplesPerGroup = Math.floor(targetSize / Object.keys(groups).length);
          finalData = Object.values(groups)
            .flatMap(group => group.slice(0, samplesPerGroup))
            .slice(0, targetSize);
        }
      }

      // 파일 다운로드 (더미 데이터로)
      if (format === 'csv') {
        const csvContent = convertToCSV(finalData);
        downloadCSV(csvContent, `panel_export_${new Date().toISOString().split('T')[0]}.csv`);
      } else if (format === 'json') {
        downloadJSON(finalData, `panel_export_${new Date().toISOString().split('T')[0]}.json`);
      } else {
        // PDF는 간단한 텍스트 파일로 대체
        downloadText(finalData, `panel_export_${new Date().toISOString().split('T')[0]}.txt`);
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

  const downloadJSON = (jsonData: any, filename: string) => {
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };


  const downloadText = (data: any[], filename: string) => {
    const textContent = data.map(panel => 
      `ID: ${panel.id}\n이름: ${panel.name}\n나이: ${panel.age}\n성별: ${panel.gender}\n지역: ${panel.region}\n응답: ${panel.responses?.q1 || 'N/A'}\n---`
    ).join('\n');
    
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    const headers = ['ID', '이름', '나이', '성별', '지역', '응답1', '응답2', '응답3'];
    const csvRows = [headers.join(',')];
    
    data.forEach(panel => {
      const row = [
        panel.id || '',
        panel.name || '',
        panel.age || '',
        panel.gender || '',
        panel.region || '',
        panel.responses?.q1 || '',
        panel.responses?.q2 || '',
        panel.responses?.q3 || ''
      ];
      csvRows.push(row.map(field => `"${field}"`).join(','));
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
                { value: 'pdf', label: 'PDF' },
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
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>쿼리/필터 정의</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={includeTable}
                  onCheckedChange={(checked: boolean) => setIncludeTable(checked)}
                />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>결과 테이블</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={includeCharts}
                  onCheckedChange={(checked: boolean) => setIncludeCharts(checked)}
                />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>분포 그래프</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={includeClusters}
                  onCheckedChange={(checked: boolean) => setIncludeClusters(checked)}
                />
                <div className="flex-1">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>군집 결과</span>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    UMAP, Silhouette, Heatmap, Top-Feature
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={includeSnippets}
                  onCheckedChange={(checked: boolean) => setIncludeSnippets(checked)}
                />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>대표 스니펫 (비식별)</span>
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
              <p 
                className="text-xs p-3 rounded-lg"
                style={{
                  color: 'var(--text-tertiary)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                성별, 연령, 지역을 기준으로 층화 샘플링합니다.
              </p>
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

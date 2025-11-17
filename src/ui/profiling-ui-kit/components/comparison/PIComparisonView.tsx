import { useState, useMemo } from 'react';
import { ClusterComparisonData, ChartType, BinaryComparison, ContinuousComparison, CategoricalComparison } from './types';
import { PIComparisonTabs } from './PIComparisonTabs';
import { PIRadarChart } from './PIRadarChart';
import { PIComparisonHighlights } from './PIComparisonHighlights';
import { PIBinaryHeatmap } from './PIBinaryHeatmap';
import { PIStackedBarChart } from './PIStackedBarChart';
import { PIIndexDotPlot } from './PIIndexDotPlot';
import { PIFeatureSelector } from './PIFeatureSelector';
import { PIVariableDescription } from './PIVariableDescription';
import { prepareRadarData, prepareBinaryHeatmapData, prepareStackedBarData, prepareIndexDotData } from './dataPrep';
import { useDarkMode } from '../../../../lib/DarkModeSystem';

interface PIComparisonViewProps {
  data: ClusterComparisonData;
}

export function PIComparisonView({ data }: PIComparisonViewProps) {
  const { isDark } = useDarkMode();
  const [activeChart, setActiveChart] = useState<ChartType>('radar');
  const [showOnlyMeaningful, setShowOnlyMeaningful] = useState(true);
  
  // 차트별 선택된 변수 상태
  const [selectedRadarFeatures, setSelectedRadarFeatures] = useState<string[]>([]);
  const [selectedHeatmapFeatures, setSelectedHeatmapFeatures] = useState<string[]>([]);
  const [selectedStackedFeatures, setSelectedStackedFeatures] = useState<string[]>([]);
  const [selectedIndexFeatures, setSelectedIndexFeatures] = useState<string[]>([]);

  // 동적 클러스터 이름 사용 (label이 있으면 사용, 없으면 기본값)
  const clusterLabels = [
    data.group_a.label || `Cluster ${data.group_a.id}`, 
    data.group_b.label || `Cluster ${data.group_b.id}`
  ];

  // 전체 comparison 데이터를 각 차트에 전달 (차트 컴포넌트에서 필요한 필터링 수행)
  const allComparisonData = data.comparison || [];
  
  // 선택된 변수에 따라 필터링된 데이터
  const filteredRadarData = useMemo(() => {
    if (selectedRadarFeatures.length === 0) {
      return prepareRadarData(allComparisonData, 8, showOnlyMeaningful);
    }
    return allComparisonData.filter(d => 
      selectedRadarFeatures.includes(d.feature) &&
      (d.type === 'continuous' || d.type === 'binary')
    ).sort((a, b) => {
      const aIndex = selectedRadarFeatures.indexOf(a.feature);
      const bIndex = selectedRadarFeatures.indexOf(b.feature);
      return aIndex - bIndex;
    }) as any;
  }, [allComparisonData, selectedRadarFeatures, showOnlyMeaningful]);
  
  const filteredHeatmapData = useMemo(() => {
    if (selectedHeatmapFeatures.length === 0) {
      return prepareBinaryHeatmapData(allComparisonData);
    }
    return allComparisonData.filter(d => 
      selectedHeatmapFeatures.includes(d.feature) && d.type === 'binary'
    ).sort((a, b) => {
      const aIndex = selectedHeatmapFeatures.indexOf(a.feature);
      const bIndex = selectedHeatmapFeatures.indexOf(b.feature);
      return aIndex - bIndex;
    }) as any;
  }, [allComparisonData, selectedHeatmapFeatures]);
  
  const filteredStackedData = useMemo(() => {
    // 선택된 변수가 있으면 선택된 변수만 사용
    if (selectedStackedFeatures.length > 0) {
      return allComparisonData.filter(d => 
        selectedStackedFeatures.includes(d.feature) && d.type === 'categorical'
      ).sort((a, b) => {
        const aIndex = selectedStackedFeatures.indexOf(a.feature);
        const bIndex = selectedStackedFeatures.indexOf(b.feature);
        return aIndex - bIndex;
      }) as CategoricalComparison[];
    }
    // 선택된 변수가 없으면 기본 데이터 준비 함수 사용
    return prepareStackedBarData(allComparisonData);
  }, [allComparisonData, selectedStackedFeatures]);
  
  const filteredIndexData = useMemo(() => {
    let filtered: (BinaryComparison | ContinuousComparison)[];
    
    // 선택된 변수가 있으면 선택된 변수만 사용
    if (selectedIndexFeatures.length > 0) {
      filtered = allComparisonData.filter(d => 
        selectedIndexFeatures.includes(d.feature) &&
        (d.type === 'binary' || d.type === 'continuous')
      ).sort((a, b) => {
        const aIndex = selectedIndexFeatures.indexOf(a.feature);
        const bIndex = selectedIndexFeatures.indexOf(b.feature);
        return aIndex - bIndex;
      }) as (BinaryComparison | ContinuousComparison)[];
      
      // 선택된 변수가 있으면 그대로 반환 (prepareIndexDotData는 INDEX_DOT_ALL_FEATURES만 필터링하므로 사용하지 않음)
      return filtered;
    }
    
    // 선택된 변수가 없으면 기본 데이터 준비 함수 사용
    return prepareIndexDotData(allComparisonData);
  }, [allComparisonData, selectedIndexFeatures]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Chart Tabs + Filter Toggle */}
      <div 
        className="animate-in slide-in-from-bottom duration-500 space-y-4"
        style={{ animationDelay: '100ms' }}
      >
        <PIComparisonTabs 
          activeTab={activeChart} 
          onTabChange={setActiveChart} 
        />
        
        {/* 컨트롤 버튼들 */}
        <div className="flex items-center justify-end gap-3">
          <PIFeatureSelector
            allData={allComparisonData}
            selectedFeatures={
              activeChart === 'radar' ? selectedRadarFeatures :
              activeChart === 'heatmap' ? selectedHeatmapFeatures :
              activeChart === 'stacked' ? selectedStackedFeatures :
              selectedIndexFeatures
            }
            onFeaturesChange={
              activeChart === 'radar' ? setSelectedRadarFeatures :
              activeChart === 'heatmap' ? setSelectedHeatmapFeatures :
              activeChart === 'stacked' ? setSelectedStackedFeatures :
              setSelectedIndexFeatures
            }
            chartType={activeChart as 'radar' | 'heatmap' | 'stacked' | 'index'}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyMeaningful}
              onChange={(e) => setShowOnlyMeaningful(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span style={{ 
              fontSize: '13px', 
              fontWeight: 500, 
              color: isDark ? '#D1D5DB' : '#64748B',
            }}>
              의미 있는 차이만 보기
            </span>
          </label>
        </div>
      </div>

      {/* Chart Display */}
      <div 
        className="animate-in slide-in-from-bottom duration-500"
        style={{ animationDelay: '200ms' }}
      >
        {activeChart === 'radar' && (
          <PIRadarChart
            data={filteredRadarData}
            groupALabel={clusterLabels[0]}
            groupBLabel={clusterLabels[1]}
            maxFeatures={selectedRadarFeatures.length || 8}
            showOnlyMeaningful={showOnlyMeaningful}
            clusterAId={data.group_a.id}
            clusterBId={data.group_b.id}
          />
        )}

        {activeChart === 'heatmap' && (
          <PIBinaryHeatmap
            data={filteredHeatmapData}
            clusterLabels={clusterLabels}
            maxFeatures={selectedHeatmapFeatures.length || 12}
            showOnlyMeaningful={showOnlyMeaningful}
          />
        )}

        {activeChart === 'stacked' && (
          <PIStackedBarChart
            data={filteredStackedData}
            clusterLabels={clusterLabels}
          />
        )}

        {activeChart === 'index' && (
          <PIIndexDotPlot
            data={filteredIndexData}
            clusterLabels={clusterLabels}
            baselineValue={0.5}
            maxFeatures={selectedIndexFeatures.length || 10}
            showOnlyMeaningful={showOnlyMeaningful}
            hasSelectedFeatures={selectedIndexFeatures.length > 0}
          />
        )}
      </div>

      {/* Variable Description */}
      <div 
        className="animate-in slide-in-from-bottom duration-500"
        style={{ animationDelay: '300ms' }}
      >
        <PIVariableDescription />
      </div>

      {/* Highlights */}
      <div 
        className="animate-in slide-in-from-bottom duration-500"
        style={{ animationDelay: '400ms' }}
      >
        <PIComparisonHighlights
          continuousTop={data.highlights.num_top}
          binaryTop={data.highlights.bin_cat_top.filter(
            item => item.type === 'binary'
          ) as any}
          maxItems={5}
        />
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes slideInFromTop {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes slideInFromBottom {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}
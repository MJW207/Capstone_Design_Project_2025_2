import { HistoryItem, HistoryType } from '../types/history';

const HISTORY_KEY = 'panel_insight_history';
const MAX_HISTORY_ITEMS = 50;

export const historyManager = {
  // 히스토리 저장
  save: (item: HistoryItem) => {
    try {
      const history = historyManager.getAll();
      
      // 중복 제거 (같은 ID가 있으면 제거)
      const filteredHistory = history.filter(h => h.id !== item.id);
      
      // 새 아이템을 맨 앞에 추가
      const newHistory = [item, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
      
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      return true;
    } catch (error) {
      console.error('Failed to save history:', error);
      return false;
    }
  },

  // 히스토리 조회
  getAll: (): HistoryItem[] => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load history:', error);
      return [];
    }
  },

  // 타입별 히스토리 조회
  getByType: (type: HistoryType): HistoryItem[] => {
    return historyManager.getAll().filter(item => item.type === type);
  },

  // 특정 아이템 조회
  getById: (id: string): HistoryItem | null => {
    const history = historyManager.getAll();
    return history.find(item => item.id === id) || null;
  },

  // 히스토리 삭제
  remove: (id: string) => {
    try {
      const history = historyManager.getAll();
      const newHistory = history.filter(item => item.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      return true;
    } catch (error) {
      console.error('Failed to remove history:', error);
      return false;
    }
  },

  // 히스토리 전체 삭제
  clear: () => {
    try {
      localStorage.removeItem(HISTORY_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear history:', error);
      return false;
    }
  },

  // 히스토리 아이템 생성 헬퍼
  createQueryHistory: (query: string, filters: any, resultCount: number): HistoryItem => ({
    id: `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'query',
    title: `검색: "${query}"`,
    description: `${resultCount.toLocaleString()}개 결과`,
    timestamp: Date.now(),
    query,
    filters,
    resultCount
  }),

  createPanelHistory: (panelId: string, panelName: string, panelData: any): HistoryItem => ({
    id: `panel_${panelId}_${Date.now()}`,
    type: 'panel',
    title: `패널: ${panelName}`,
    description: `${panelData.gender} ${panelData.age}세 ${panelData.region}`,
    timestamp: Date.now(),
    panelId,
    panelName,
    panelData
  }),

  createClusterHistory: (clusterId: string, clusterName: string, clusterData: any, umapData?: any): HistoryItem => ({
    id: `cluster_${clusterId}_${Date.now()}`,
    type: 'cluster',
    title: `군집: ${clusterName}`,
    description: `${clusterData.count.toLocaleString()}명 (${clusterData.percentage}%)`,
    timestamp: Date.now(),
    clusterId,
    clusterName,
    clusterData,
    umapData
  }),

  createComparisonHistory: (
    groupA: { id: string; name: string; color: string },
    groupB: { id: string; name: string; color: string },
    analysisType: 'difference' | 'lift' | 'smd',
    comparisonData: any
  ): HistoryItem => ({
    id: `comparison_${groupA.id}_vs_${groupB.id}_${Date.now()}`,
    type: 'comparison',
    title: `비교: ${groupA.name} vs ${groupB.name}`,
    description: `${analysisType} 분석`,
    timestamp: Date.now(),
    groupA,
    groupB,
    analysisType,
    comparisonData
  })
};


export type HistoryType = 'query' | 'panel' | 'cluster' | 'comparison';

export interface BaseHistoryItem {
  id: string;
  type: HistoryType;
  title: string;
  timestamp: number;
  description?: string;
}

export interface QueryHistoryItem extends BaseHistoryItem {
  type: 'query';
  query: string;
  filters?: any;
  resultCount: number;
}

export interface PanelHistoryItem extends BaseHistoryItem {
  type: 'panel';
  panelId: string;
  panelName: string;
  panelData: any;
}

export interface ClusterHistoryItem extends BaseHistoryItem {
  type: 'cluster';
  clusterId: string;
  clusterName: string;
  clusterData: any;
  umapData?: any;
}

export interface ComparisonHistoryItem extends BaseHistoryItem {
  type: 'comparison';
  groupA: {
    id: string;
    name: string;
    color: string;
  };
  groupB: {
    id: string;
    name: string;
    color: string;
  };
  analysisType: 'difference' | 'lift' | 'smd';
  comparisonData: any;
}

export type HistoryItem = QueryHistoryItem | PanelHistoryItem | ClusterHistoryItem | ComparisonHistoryItem;


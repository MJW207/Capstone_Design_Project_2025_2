/**
 * 필터 프리셋 관리 유틸리티
 * LocalStorage 기반 프리셋 저장/로드
 */

export interface FilterPreset {
  id: string;
  name: string;
  filters: {
    gender?: string[];
    ageRange?: [number, number];
    regions?: string[];
    income?: string[];
    interests?: string;
    quickpollOnly?: boolean;
    [key: string]: any;
  };
  timestamp: number;
  scope: '개인' | '팀';
}

const PRESETS_STORAGE_KEY = 'filter_presets';

export const presetManager = {
  /**
   * localStorage에서 프리셋 로드
   */
  loadPresets(): FilterPreset[] {
    try {
      const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load presets:', error);
      return [];
    }
  },

  /**
   * localStorage에 프리셋 저장
   */
  savePresets(presets: FilterPreset[]): void {
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
      console.error('Failed to save presets:', error);
    }
  },

  /**
   * 프리셋 추가
   */
  addPreset(name: string, filters: FilterPreset['filters'], scope: '개인' | '팀' = '개인'): FilterPreset {
    const presets = this.loadPresets();
    const newPreset: FilterPreset = {
      id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      filters,
      timestamp: Date.now(),
      scope,
    };
    
    presets.unshift(newPreset); // 최신순으로 앞에 추가
    this.savePresets(presets);
    
    return newPreset;
  },

  /**
   * 프리셋 수정
   */
  updatePreset(id: string, updates: Partial<Pick<FilterPreset, 'name' | 'filters' | 'scope'>>): FilterPreset | null {
    const presets = this.loadPresets();
    const presetIndex = presets.findIndex(p => p.id === id);
    
    if (presetIndex === -1) {
      return null;
    }

    presets[presetIndex] = {
      ...presets[presetIndex],
      ...updates,
      timestamp: Date.now(), // 수정 시간 업데이트
    };
    
    this.savePresets(presets);
    return presets[presetIndex];
  },

  /**
   * 프리셋 제거
   */
  removePreset(id: string): FilterPreset[] {
    const presets = this.loadPresets();
    const filtered = presets.filter(p => p.id !== id);
    this.savePresets(filtered);
    return filtered;
  },

  /**
   * 특정 스코프의 프리셋 조회
   */
  getPresetsByScope(scope: '개인' | '팀'): FilterPreset[] {
    const presets = this.loadPresets();
    return presets
      .filter(p => p.scope === scope)
      .sort((a, b) => b.timestamp - a.timestamp);
  },

  /**
   * 특정 프리셋 조회
   */
  getPreset(id: string): FilterPreset | undefined {
    const presets = this.loadPresets();
    return presets.find(p => p.id === id);
  },
};

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// API 유틸리티 함수들
export const api = {
  // 기본 API 호출 함수
  get: async (url: string) => {
    const response = await fetch(`http://localhost:8000${url}`)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  },
  
  post: async (url: string, data: any) => {
    const response = await fetch(`http://localhost:8000${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  },
  
  put: async (url: string, data: any) => {
    const response = await fetch(`http://localhost:8000${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  },
  
  delete: async (url: string) => {
    const response = await fetch(`http://localhost:8000${url}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  }
}

// 검색 관련 API
export const searchApi = {
  // 패널 검색
  searchPanels: (query: string, filters?: any, page: number = 1, limit: number = 20) => 
    api.post('/api/search', { query, filters, page, limit }),
  
  // 패널 목록 조회
  getPanels: (page = 1, limit = 20) => 
    api.get(`/api/panels?page=${page}&limit=${limit}`),
  
  // 패널 상세 조회
  getPanel: (id: string) => 
    api.get(`/api/panels/${id}`),
  
  // 패널 비교
  comparePanels: (ids: string[]) => 
    api.post('/api/panels/compare', { ids }),
  
  // AI 인사이트 생성
  generateInsight: (query: string, context: any) => 
    api.post('/api/ai-insight', { query, context }),
  
  // 클러스터링
  clusterPanels: (data: any) => 
    api.post('/api/clustering/cluster', data),
  
  // 내보내기
  exportData: (format: string, data: any) => 
    api.post('/api/export', { format, data }),
  
  // 퀵 인사이트 생성
  generateQuickInsight: (query: string, panels: any[], filters?: any) => 
    api.post('/api/quick-insight', { query, panels, filters }),
  
  // 그룹 목록 조회
  getGroups: (groupType: string = 'cluster') => 
    api.get(`/api/groups?group_type=${groupType}`),
  
  // 그룹 비교 분석
  compareGroups: (groupAId: string, groupBId: string, groupType: string = 'cluster', analysisType: string = 'difference') => 
    api.post('/api/compare', {
      group_a_id: groupAId,
      group_b_id: groupBId,
      group_type: groupType,
      analysis_type: analysisType
    })
}

// 로컬 스토리지 유틸리티
export const storage = {
  get: (key: string) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  },
  
  set: (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Storage error:', error)
    }
  },
  
  remove: (key: string) => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Storage error:', error)
    }
  }
}

// 히스토리 관리
export const history = {
  add: (item: any) => {
    const history = storage.get('panel_history') || []
    const newHistory = [item, ...history.filter((h: any) => h.id !== item.id)].slice(0, 50)
    storage.set('panel_history', newHistory)
  },
  
  get: () => storage.get('panel_history') || [],
  
  clear: () => storage.remove('panel_history')
}
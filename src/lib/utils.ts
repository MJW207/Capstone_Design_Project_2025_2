import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { API_URL } from "./config"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// API 유틸리티 함수들
export const api = {
  // 기본 API 호출 함수
  get: async (url: string) => {
    try {
      const response = await fetch(`${API_URL}${url}`)
      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }
      return response.json()
    } catch (err: any) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        throw new Error(`백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요. (${API_URL})`)
      }
      throw err
    }
  },
  
  post: async (url: string, data: any) => {
    const fullUrl = `${API_URL}${url}`;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // AbortController로 타임아웃 설정
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;
    
    timeoutId = setTimeout(() => {
      console.error(`[DEBUG] ⏱️ 요청 타임아웃 (120초) [${requestId}]`);
      controller.abort();
    }, 120000); // 120초 타임아웃 (ChromaDB 검색이 오래 걸릴 수 있음)
    
    try {
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
        credentials: 'omit' as RequestCredentials,
        cache: 'no-cache' as RequestCache,
        mode: 'cors' as RequestMode
      };
      
      const fetchStartTime = Date.now();
      
      let response: Response;
      try {
        response = await fetch(fullUrl, requestOptions);
      } catch (fetchError: any) {
        if (timeoutId) clearTimeout(timeoutId);
        console.error(`[DEBUG] ❌ Fetch 실행 자체가 실패 [${requestId}]:`, {
          name: fetchError?.name,
          message: fetchError?.message,
          cause: fetchError?.cause,
          stack: fetchError?.stack
        });
        
        // AbortError 체크
        if (fetchError?.name === 'AbortError') {
          console.error('[DEBUG] 🛑 요청이 중단되었습니다 (타임아웃 또는 Abort)');
          throw new Error('요청이 타임아웃되었거나 중단되었습니다. 서버가 응답하는 데 너무 오래 걸립니다.');
        }
        throw fetchError;
      }
      
      if (timeoutId) clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`[DEBUG] ❌ HTTP 오류 응답 [${requestId}]:`, {
          status: response.status,
          statusText: response.statusText
        });
        
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('[DEBUG] Error response body:', errorText.substring(0, 500));
        } catch (textError) {
          console.error('[DEBUG] Error response body 읽기 실패:', textError);
        }
        
        try {
          const errorJson = JSON.parse(errorText);
          console.error('[DEBUG] Error JSON:', errorJson);
          throw new Error(errorJson.detail || `HTTP error! status: ${response.status}`)
        } catch (parseError) {
          throw new Error(`HTTP error! status: ${response.status} - ${errorText.substring(0, 200)}`)
        }
      }
      
      // Response body 읽기
      let jsonData: any;
      try {
        const textData = await response.text();
        
        if (!textData || textData.trim() === '') {
          console.error(`[DEBUG] ❌ 빈 응답 본문 [${requestId}]`);
          throw new Error('서버에서 빈 응답을 받았습니다.');
        }
        
        jsonData = JSON.parse(textData);
      } catch (parseError: any) {
        console.error(`[DEBUG] ❌ JSON 파싱 실패 [${requestId}]:`, {
          error: parseError?.message,
          stack: parseError?.stack
        });
        throw new Error(`응답 파싱 실패: ${parseError?.message || '알 수 없는 오류'}`);
      }
      
      return jsonData;
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);
      
      console.error(`[DEBUG] ========== Fetch 에러 발생 [${requestId}] ==========`);
      console.error('[DEBUG] 에러 상세 정보:', {
        requestId,
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        type: typeof err,
        constructor: err?.constructor?.name,
        cause: err?.cause,
        code: err?.code,
        errno: err?.errno,
        syscall: err?.syscall
      });
      
      // 브라우저 확장 프로그램 간섭 체크
      if (err?.message?.includes('message port closed') || err?.message?.includes('runtime.lastError')) {
        console.error('[DEBUG] 🔴 브라우저 확장 프로그램 간섭 가능성:', {
          error: 'Chrome 확장 프로그램이 요청을 차단했을 수 있습니다.',
          solution: '확장 프로그램을 비활성화하고 다시 시도해보세요.'
        });
      }
      
      // 네트워크 에러 분석
      if (err.message === 'Failed to fetch' || err.name === 'TypeError' || err.message?.includes('fetch')) {
        const detailedError = {
          error: '백엔드 서버에 연결할 수 없습니다',
          requestId,
          apiUrl: API_URL,
          fullUrl: fullUrl,
          errorName: err?.name,
          errorMessage: err?.message,
          possibleCauses: [
            '백엔드 서버가 실행되지 않음 (포트 8004)',
            'CORS 설정 문제',
            '네트워크 연결 문제',
            'URL이 잘못됨',
            '브라우저 확장 프로그램 간섭',
            '방화벽 또는 보안 소프트웨어 차단'
          ]
        };
        console.error('[DEBUG] 연결 실패 상세:', detailedError);
        
        // 더 구체적인 에러 메시지
        let errorMessage = `백엔드 서버에 연결할 수 없습니다.\n\n`;
        errorMessage += `요청 ID: ${requestId}\n`;
        errorMessage += `URL: ${API_URL}\n`;
        errorMessage += `전체 URL: ${fullUrl}\n\n`;
        errorMessage += `가능한 원인:\n${detailedError.possibleCauses.map(c => `- ${c}`).join('\n')}\n\n`;
        errorMessage += `에러: ${err?.name} - ${err?.message}`;
        
        throw new Error(errorMessage);
      }
      
      console.error(`[DEBUG] ========== Fetch 에러 처리 완료 [${requestId}] ==========`);
      throw err
    }
  },
  
  put: async (url: string, data: any) => {
    const response = await fetch(`${API_URL}${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  },
  
  delete: async (url: string) => {
    const response = await fetch(`${API_URL}${url}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  }
}

// 검색 관련 API
export const searchApi = {
  // 패널 검색 (텍스트 검색 포함)
  searchPanels: async (query: string, filters?: any, page: number = 1, limit: number = 20) => {
    const response = await api.post('/api/search', { query: query || '', filters: filters || {}, page, limit });
    return response;
  },
  
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
  
  // 클러스터링 (UI 틀만 - 실제 API 호출 제거)
  clusterPanels: async (data: any) => {
    // UI 틀만 남기고 실제 구현 제거
    throw new Error('클러스터링 기능이 비활성화되었습니다.');
  },
  
  // 내보내기
  exportData: (format: string, data: any) => 
    api.post('/api/export', { format, data }),
  
  // 퀵 인사이트 생성
  generateQuickInsight: (query: string, panels: any[], filters?: any) => 
    api.post('/api/quick-insight', { query, panels, filters }),
  
  // 그룹 목록 조회
  getGroups: (groupType: string = 'cluster') => 
    api.get(`/api/groups?group_type=${groupType}`),
  
  // 그룹 비교 분석 (UI 틀만 - 실제 API 호출 제거)
  compareGroups: async (groupAId: string, groupBId: string, groupType: string = 'cluster', analysisType: string = 'difference') => {
    // UI 틀만 남기고 실제 구현 제거
    throw new Error('군집 비교 기능이 비활성화되었습니다.');
  }
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
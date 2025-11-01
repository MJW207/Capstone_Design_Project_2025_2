/**
 * 애플리케이션 설정
 * - API URL 및 환경 변수 관리
 */

// API 기본 URL (환경 변수에서 읽거나 기본값 사용)
// Vite는 localhost:5173에서 실행되므로 백엔드 포트 8004로 연결
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8004';

// API 버전
export const API_VERSION = 'v1';

// API 전체 URL
export const API_URL = `${API_BASE_URL}`;

// 디버깅: API URL 확인
if (typeof window !== 'undefined') {
  console.log('[Config] API URL:', API_URL);
}


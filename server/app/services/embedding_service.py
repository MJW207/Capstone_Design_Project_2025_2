"""임베딩 생성 서비스 (LLM API 호출)"""
from typing import List, Optional
import os
import json
import httpx
from dotenv import load_dotenv

# 환경변수 로드 (서비스 모듈에서도 명시적으로 로드)
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
load_dotenv(env_path, override=False)  # override=False: 이미 설정된 환경변수는 유지


class EmbeddingService:
    """임베딩 생성 서비스"""
    
    def __init__(self):
        # 환경변수에서 API 키 및 설정 로드
        self.api_key = os.getenv("OPENAI_API_KEY") or os.getenv("EMBEDDING_API_KEY")
        self.api_base = os.getenv("EMBEDDING_API_BASE", "https://api.openai.com/v1")
        self.model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")  # 기본값: OpenAI
        self.dimension = int(os.getenv("EMBEDDING_DIMENSION", "768"))
        
        print(f"[DEBUG Embedding] 임베딩 서비스 초기화:")
        print(f"[DEBUG Embedding]   모델: {self.model}")
        print(f"[DEBUG Embedding]   차원: {self.dimension}")
        print(f"[DEBUG Embedding]   API Base: {self.api_base}")
        print(f"[DEBUG Embedding]   API Key: {'설정됨' if self.api_key else '없음'}")
    
    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """
        단일 텍스트의 임베딩 생성
        
        Args:
            text: 임베딩을 생성할 텍스트
            
        Returns:
            임베딩 벡터 리스트 또는 None
        """
        if not text or not text.strip():
            print(f"[DEBUG Embedding] 빈 텍스트, 임베딩 생성 스킵")
            return None
        
        print(f"[DEBUG Embedding] ========== 임베딩 생성 시작 ==========")
        print(f"[DEBUG Embedding] 텍스트 (처음 100자): {text[:100]}...")
        
        try:
            # OpenAI API 호출
            if self.api_key:
                embedding = await self._call_openai_api(text)
            else:
                # API 키가 없으면 에러
                print(f"[DEBUG Embedding] ❌ API 키가 설정되지 않았습니다")
                return None
            
            if embedding:
                print(f"[DEBUG Embedding] 임베딩 생성 성공, 차원: {len(embedding)}")
            else:
                print(f"[DEBUG Embedding] ❌ 임베딩 생성 실패")
            
            print(f"[DEBUG Embedding] ========== 임베딩 생성 완료 ==========")
            
            return embedding
            
        except Exception as e:
            import traceback
            print(f"[DEBUG Embedding] ❌ 임베딩 생성 실패:")
            print(f"[DEBUG Embedding] 에러 타입: {type(e).__name__}")
            print(f"[DEBUG Embedding] 에러 메시지: {str(e)}")
            print(f"[DEBUG Embedding] 스택 트레이스:")
            traceback.print_exc()
            return None
    
    async def _call_openai_api(self, text: str) -> Optional[List[float]]:
        """
        OpenAI Embedding API 호출
        
        Args:
            text: 임베딩을 생성할 텍스트
            
        Returns:
            임베딩 벡터 리스트 또는 None
        """
        url = f"{self.api_base}/embeddings"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "input": text,
            "dimensions": self.dimension  # 차원 지정 (가능한 경우)
        }
        
        print(f"[DEBUG Embedding] API 호출:")
        print(f"[DEBUG Embedding]   URL: {url}")
        print(f"[DEBUG Embedding]   모델: {self.model}")
        print(f"[DEBUG Embedding]   차원: {self.dimension}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                
                data = response.json()
                embedding = data.get("data", [{}])[0].get("embedding")
                
                if embedding:
                    print(f"[DEBUG Embedding] ✅ API 호출 성공, 차원: {len(embedding)}")
                    return embedding
                else:
                    print(f"[DEBUG Embedding] ❌ 응답에 embedding이 없습니다")
                    print(f"[DEBUG Embedding] 응답: {json.dumps(data, indent=2)[:500]}")
                    return None
                    
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            error_text = e.response.text[:1000]  # 에러 메시지 더 자세히
            
            print(f"[DEBUG Embedding] ❌ HTTP 오류 발생:")
            print(f"[DEBUG Embedding]   상태 코드: {status_code}")
            print(f"[DEBUG Embedding]   응답 헤더: {dict(e.response.headers)}")
            print(f"[DEBUG Embedding]   응답 본문: {error_text}")
            
            # OpenAI API 에러 코드별 상세 메시지
            try:
                error_json = e.response.json()
                error_message = error_json.get("error", {})
                error_type = error_message.get("type", "unknown")
                error_message_text = error_message.get("message", "알 수 없는 오류")
                print(f"[DEBUG Embedding]   에러 타입: {error_type}")
                print(f"[DEBUG Embedding]   에러 메시지: {error_message_text}")
                
                # 401 에러인 경우 API 키 문제
                if status_code == 401:
                    if "Invalid Authentication" in error_message_text or "Incorrect API key" in error_message_text:
                        print(f"[DEBUG Embedding] ⚠️ API 키가 잘못되었거나 유효하지 않습니다!")
                        print(f"[DEBUG Embedding]   사용된 API 키 (처음 10자): {self.api_key[:10]}..." if self.api_key else "   API 키: None")
                        print(f"[DEBUG Embedding]   해결 방법:")
                        print(f"[DEBUG Embedding]     1. OpenAI 대시보드에서 API 키 확인")
                        print(f"[DEBUG Embedding]     2. .env 파일의 OPENAI_API_KEY 값 확인")
                        print(f"[DEBUG Embedding]     3. 서버 재시작 확인")
                
                # 429 에러인 경우
                elif status_code == 429:
                    print(f"[DEBUG Embedding] ⚠️ Rate limit 또는 Quota 초과!")
                    
                # 500/503 에러인 경우
                elif status_code in [500, 503]:
                    print(f"[DEBUG Embedding] ⚠️ OpenAI 서버 문제입니다. 잠시 후 재시도하세요.")
                    
            except:
                print(f"[DEBUG Embedding]   응답을 JSON으로 파싱할 수 없습니다.")
            
            return None
        except httpx.RequestError as e:
            print(f"[DEBUG Embedding] ❌ 네트워크 요청 오류: {type(e).__name__}")
            print(f"[DEBUG Embedding]   에러 메시지: {str(e)}")
            print(f"[DEBUG Embedding]   원인: 네트워크 연결 문제, 프록시 설정, 방화벽, 또는 OpenAI 서버 접근 불가")
            return None
        except Exception as e:
            print(f"[DEBUG Embedding] ❌ API 호출 실패 (예상치 못한 오류):")
            print(f"[DEBUG Embedding]   에러 타입: {type(e).__name__}")
            print(f"[DEBUG Embedding]   에러 메시지: {str(e)}")
            import traceback
            traceback.print_exc()
            return None


# 전역 인스턴스
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    """임베딩 서비스 싱글톤 인스턴스 반환"""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service


"""
임베딩 생성 서비스
패널 특성을 임베딩 벡터로 변환
"""

import os
from typing import List, Optional
import openai
from anthropic import Anthropic


class EmbeddingService:
    """임베딩 생성 서비스"""
    
    def __init__(self, model: str = "text-embedding-3-small"):
        """
        Args:
            model: 사용할 임베딩 모델
                - OpenAI: "text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"
        """
        self.model = model
        self.dimension = self._get_dimension(model)
        
        # OpenAI API 설정
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY 환경 변수를 설정해주세요.")
        openai.api_key = api_key
    
    def _get_dimension(self, model: str) -> int:
        """모델별 차원 수 반환"""
        dimension_map = {
            "text-embedding-3-small": 1536,
            "text-embedding-3-large": 3072,
            "text-embedding-ada-002": 1536,
        }
        return dimension_map.get(model, 1536)
    
    def generate_embedding(self, text: str) -> List[float]:
        """
        단일 텍스트의 임베딩 생성
        
        Args:
            text: 임베딩을 생성할 텍스트
        
        Returns:
            임베딩 벡터 (List[float])
        """
        try:
            response = openai.embeddings.create(
                model=self.model,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"임베딩 생성 실패: {e}")
            raise
    
    def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        여러 텍스트의 임베딩을 배치로 생성
        
        Args:
            texts: 임베딩을 생성할 텍스트 리스트
        
        Returns:
            임베딩 벡터 리스트
        """
        try:
            # OpenAI는 최대 2048개까지 배치 처리 가능
            max_batch_size = 2048
            all_embeddings = []
            
            for i in range(0, len(texts), max_batch_size):
                batch = texts[i:i+max_batch_size]
                response = openai.embeddings.create(
                    model=self.model,
                    input=batch
                )
                batch_embeddings = [item.embedding for item in response.data]
                all_embeddings.extend(batch_embeddings)
            
            return all_embeddings
        except Exception as e:
            print(f"배치 임베딩 생성 실패: {e}")
            raise
    
    @property
    def embedding_dimension(self) -> int:
        """임베딩 차원 반환"""
        return self.dimension


# 전역 인스턴스
embedding_service = EmbeddingService()



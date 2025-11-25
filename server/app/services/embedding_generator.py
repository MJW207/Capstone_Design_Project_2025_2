"""임베딩 생성기"""
from typing import Dict, List
from openai import OpenAI
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging

logger = logging.getLogger(__name__)


class EmbeddingGenerator:
    """OpenAI text-embedding-3-small로 임베딩 생성 (병렬 처리)"""

    def __init__(self, api_key: str):
        """
        Args:
            api_key: OpenAI API 키
        """
        self.client = OpenAI(api_key=api_key)
        self.model = "text-embedding-3-small"

    def _generate_single(self, category: str, text: str) -> tuple[str, List[float]]:
        """단일 임베딩 생성 (병렬 처리용)"""
        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=text
            )
            embedding = response.data[0].embedding
            return (category, embedding)
        except Exception as e:
            logger.error(f"❌ [{category}] 임베딩 생성 실패: {e}")
            return (category, None)

    def generate(self, texts: Dict[str, str]) -> Dict[str, List[float]]:
        """
        카테고리별 임베딩 생성 (병렬 처리)
        
        Args:
            texts: 카테고리별 텍스트 딕셔너리
            
        Returns:
            카테고리별 임베딩 딕셔너리
        """
        result = {}
        
        # 병렬 처리로 임베딩 생성
        with ThreadPoolExecutor(max_workers=min(len(texts), 5)) as executor:
            futures = {
                executor.submit(self._generate_single, category, text): category
                for category, text in texts.items()
                if text
            }
            
            for future in as_completed(futures):
                category, embedding = future.result()
                if embedding:
                    result[category] = embedding

        return result


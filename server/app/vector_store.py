"""
벡터 DB 관리 모듈
단일 ChromaDB를 사용하여 Welcome 전용과 qpoll 포함자를 함께 저장하고,
메타데이터로 검색 범위를 동적으로 제어
"""

import chromadb
from chromadb.config import Settings
from typing import List, Dict, Optional, Any
import numpy as np
from datetime import datetime


class PanelVectorStore:
    """패널 임베딩을 관리하는 벡터 스토어"""
    
    def __init__(self, persist_directory: str = "./chroma_db"):
        """
        Args:
            persist_directory: ChromaDB 데이터 저장 경로
        """
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Collection 생성 (이미 있으면 기존 것 사용)
        try:
            self.collection = self.client.get_collection(name="panel_embeddings")
        except:
            self.collection = self.client.create_collection(
                name="panel_embeddings",
                metadata={"hnsw:space": "cosine"}  # 코사인 유사도 사용
            )
    
    def add_panel(self, 
                  panel_id: str,
                  embedding: List[float],
                  metadata: Dict[str, Any]):
        """단일 패널 추가"""
        self.collection.add(
            ids=[panel_id],
            embeddings=[embedding],
            metadatas=[metadata],
            documents=None  # 필요시 추가
        )
    
    def add_panels_batch(self, panels: List[Dict[str, Any]]):
        """여러 패널을 배치로 추가"""
        ids = [p["panel_id"] for p in panels]
        embeddings = [p["embedding"] for p in panels]
        metadatas = [p["metadata"] for p in panels]
        
        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas
        )
    
    def search_similar(self,
                      query_embedding: List[float],
                      n_results: int = 100,
                      where: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        유사도 검색
        
        Args:
            query_embedding: 쿼리 임베딩 벡터
            n_results: 반환할 결과 수
            where: 메타데이터 필터 (예: {"has_qpoll": True})
        
        Returns:
            검색 결과 리스트
        """
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where
        )
        
        # 결과 포맷팅
        formatted_results = []
        if results['ids']:
            for i in range(len(results['ids'][0])):
                result = {
                    "panel_id": results['ids'][0][i],
                    "score": 1 - results['distances'][0][i],  # 거리를 유사도로 변환
                    "metadata": results['metadatas'][0][i]
                }
                formatted_results.append(result)
        
        return formatted_results
    
    def search_by_scope(self,
                       query_embedding: List[float],
                       scope: str = "all",
                       n_results: int = 100) -> List[Dict[str, Any]]:
        """
        검색 범위를 지정한 유사도 검색
        
        Args:
            query_embedding: 쿼리 임베딩
            scope: 검색 범위
                - "all": 전체 30,000명
                - "qpoll_only": qpoll 응답자 8,000명
                - "welcome_only": Welcome만 22,000명
                - "qpoll_complete": qpoll 전부 응답 (35개)
                - "qpoll_partial": qpoll 부분 응답 (< 35개)
            n_results: 반환 결과 수
        
        Returns:
            검색 결과 리스트
        """
        scope_filters = {
            "all": None,
            "qpoll_only": {"has_qpoll": True},
            "welcome_only": {"has_qpoll": False},
            "qpoll_complete": {"qpoll_responses_count": 35},
            "qpoll_partial": {
                "has_qpoll": True,
                "qpoll_responses_count": {"$lt": 35}
            }
        }
        
        where_filter = scope_filters.get(scope)
        return self.search_similar(query_embedding, n_results, where_filter)
    
    def get_panel(self, panel_id: str) -> Optional[Dict[str, Any]]:
        """특정 패널 조회"""
        results = self.collection.get(ids=[panel_id])
        if results['ids']:
            return {
                "panel_id": results['ids'][0],
                "metadata": results['metadatas'][0],
                "embedding": results['embeddings'][0] if results['embeddings'] else None
            }
        return None
    
    def update_panel(self, panel_id: str, metadata: Dict[str, Any]):
        """패널 메타데이터 업데이트"""
        # ChromaDB는 직접 업데이트가 안되므로 삭제 후 재추가
        self.collection.delete(ids=[panel_id])
        # 재추가는 외부에서 처리
    
    def get_stats(self) -> Dict[str, Any]:
        """벡터 DB 통계"""
        count_result = self.collection.count()
        
        # 메타데이터별 통계
        # Note: ChromaDB는 전체 데이터를 스캔해야 하므로, 별도 카운터를 유지하는 것이 좋음
        
        return {
            "total_panels": count_result,
            "collection_name": "panel_embeddings"
        }
    
    def delete_panel(self, panel_id: str):
        """패널 삭제"""
        self.collection.delete(ids=[panel_id])
    
    def delete_all(self):
        """모든 데이터 삭제"""
        self.collection.delete(ids=[])
        self.collection = self.client.create_collection(
            name="panel_embeddings",
            metadata={"hnsw:space": "cosine"}
        )


# 전역 인스턴스
vector_store = PanelVectorStore()



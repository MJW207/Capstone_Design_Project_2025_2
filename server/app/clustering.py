import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from sklearn.decomposition import PCA
from sklearn.neighbors import NearestNeighbors
from sklearn.metrics.pairwise import cosine_similarity
import leidenalg
import igraph as ig
import umap
from scipy.sparse import csr_matrix
import json

@dataclass
class ClusteringConfig:
    """클러스터링 설정"""
    pca_components: int = 128
    k_neighbors: int = 20
    resolution: float = 1.0
    min_cluster_size: int = 8
    max_clusters: int = 8
    use_snn: bool = True
    snn_threshold: float = 0.4

class ClusteringPipeline:
    """실시간 클러스터링 파이프라인"""
    
    def __init__(self, config: Optional[ClusteringConfig] = None):
        self.config = config or ClusteringConfig()
        self.pca_model = None
        self.global_mean = None
        self.is_fitted = False
        
    def fit_global_pca(self, embeddings: np.ndarray) -> Dict[str, Any]:
        """전역 PCA 모델 학습"""
        print(f"Fitting global PCA with {len(embeddings)} embeddings...")
        
        # L2 정규화
        embeddings_norm = self._normalize_l2(embeddings)
        
        # PCA 학습
        self.pca_model = PCA(n_components=self.config.pca_components)
        embeddings_pca = self.pca_model.fit_transform(embeddings_norm)
        
        # 재정규화
        embeddings_pca_norm = self._normalize_l2(embeddings_pca)
        
        # 전역 평균 저장
        self.global_mean = self.pca_model.mean_
        self.is_fitted = True
        
        return {
            "status": "success",
            "n_components": self.config.pca_components,
            "explained_variance_ratio": self.pca_model.explained_variance_ratio_.tolist(),
            "total_variance": float(np.sum(self.pca_model.explained_variance_ratio_))
        }
    
    def cluster_search_results(self, query_embedding: np.ndarray, 
                             search_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """검색 결과 클러스터링"""
        if not self.is_fitted:
            return {"error": "PCA model not fitted"}
        
        if len(search_results) < self.config.min_cluster_size:
            return {
                "clusters": [],
                "query_embedding": query_embedding.tolist(),
                "message": "Not enough results for clustering"
            }
        
        # 임베딩 추출
        embeddings = np.array([result.get('embedding', [0] * 1024) for result in search_results])
        
        # PCA 변환
        embeddings_norm = self._normalize_l2(embeddings)
        embeddings_pca = self.pca_model.transform(embeddings_norm)
        embeddings_pca_norm = self._normalize_l2(embeddings_pca)
        
        # 쿼리 임베딩도 변환
        query_norm = self._normalize_l2(query_embedding.reshape(1, -1))
        query_pca = self.pca_model.transform(query_norm)
        query_pca_norm = self._normalize_l2(query_pca)
        
        # kNN 그래프 생성
        knn_graph = self._build_knn_graph(embeddings_pca_norm)
        
        # Leiden 클러스터링
        clusters = self._leiden_clustering(knn_graph, embeddings_pca_norm, query_pca_norm[0])
        
        return {
            "clusters": clusters,
            "query_embedding": query_pca_norm[0].tolist(),
            "n_clusters": len(clusters),
            "total_points": len(search_results)
        }
    
    def _normalize_l2(self, X: np.ndarray) -> np.ndarray:
        """L2 정규화"""
        norms = np.linalg.norm(X, axis=1, keepdims=True)
        norms[norms == 0] = 1
        return X / norms
    
    def _build_knn_graph(self, embeddings: np.ndarray) -> csr_matrix:
        """kNN 그래프 생성"""
        nbrs = NearestNeighbors(
            n_neighbors=min(self.config.k_neighbors, len(embeddings) - 1),
            metric='cosine'
        ).fit(embeddings)
        
        distances, indices = nbrs.kneighbors(embeddings)
        
        # Mutual kNN 적용
        n = len(embeddings)
        adjacency = np.zeros((n, n))
        
        for i in range(n):
            for j, neighbor_idx in enumerate(indices[i]):
                if i != neighbor_idx:
                    # Mutual kNN 체크
                    if i in indices[neighbor_idx]:
                        if self.config.use_snn:
                            # SNN 가중치 계산
                            weight = self._calculate_snn_weight(i, neighbor_idx, indices, distances)
                            if weight >= self.config.snn_threshold:
                                adjacency[i, neighbor_idx] = weight
                        else:
                            # 코사인 유사도 기반 가중치
                            similarity = 1 - distances[i, j]
                            adjacency[i, neighbor_idx] = similarity
        
        return csr_matrix(adjacency)
    
    def _calculate_snn_weight(self, i: int, j: int, indices: np.ndarray, 
                            distances: np.ndarray) -> float:
        """Shared Nearest Neighbors 가중치 계산"""
        neighbors_i = set(indices[i])
        neighbors_j = set(indices[j])
        
        intersection = len(neighbors_i.intersection(neighbors_j))
        union = len(neighbors_i.union(neighbors_j))
        
        return intersection / union if union > 0 else 0
    
    def _leiden_clustering(self, knn_graph: csr_matrix, embeddings: np.ndarray, 
                          query_embedding: np.ndarray) -> List[Dict[str, Any]]:
        """Leiden 클러스터링 수행"""
        # igraph 그래프 생성
        edges = []
        weights = []
        
        for i in range(knn_graph.shape[0]):
            for j in knn_graph[i].indices:
                if knn_graph[i, j] > 0:
                    edges.append((i, j))
                    weights.append(knn_graph[i, j])
        
        if not edges:
            return []
        
        g = ig.Graph(edges=edges, directed=False)
        g.es['weight'] = weights
        
        # Leiden 클러스터링
        partition = leidenalg.find_partition(
            g, 
            leidenalg.RBConfigurationVertexPartition,
            resolution_parameter=self.config.resolution,
            seed=42
        )
        
        # 클러스터 정보 생성
        clusters = []
        for cluster_id in range(len(partition)):
            cluster_indices = partition[cluster_id]
            
            if len(cluster_indices) < self.config.min_cluster_size:
                continue
            
            # 클러스터 중심 계산
            cluster_embeddings = embeddings[cluster_indices]
            centroid = np.mean(cluster_embeddings, axis=0)
            
            # 쿼리와의 유사도 계산
            query_similarity = float(cosine_similarity(
                query_embedding.reshape(1, -1), 
                centroid.reshape(1, -1)
            )[0, 0])
            
            clusters.append({
                "id": cluster_id,
                "size": len(cluster_indices),
                "indices": cluster_indices.tolist(),
                "centroid": centroid.tolist(),
                "query_similarity": query_similarity,
                "representative_items": cluster_indices[:3].tolist()  # 대표 아이템
            })
        
        # 크기와 유사도 기준으로 정렬
        clusters.sort(key=lambda x: (x['size'], x['query_similarity']), reverse=True)
        
        return clusters[:self.config.max_clusters]
    
    def quality_check(self, embeddings: np.ndarray) -> Dict[str, Any]:
        """클러스터링 품질 체크"""
        if not self.is_fitted:
            return {"error": "PCA model not fitted"}
        
        # PCA 변환
        embeddings_norm = self._normalize_l2(embeddings)
        embeddings_pca = self.pca_model.transform(embeddings_norm)
        embeddings_pca_norm = self._normalize_l2(embeddings_pca)
        
        # kNN 일치율 체크
        knn_original = NearestNeighbors(n_neighbors=20, metric='cosine').fit(embeddings_norm)
        knn_pca = NearestNeighbors(n_neighbors=20, metric='cosine').fit(embeddings_pca_norm)
        
        _, indices_original = knn_original.kneighbors(embeddings_norm)
        _, indices_pca = knn_pca.kneighbors(embeddings_pca_norm)
        
        # Recall@k 계산
        recall_scores = []
        for i in range(len(embeddings)):
            intersection = len(set(indices_original[i]).intersection(set(indices_pca[i])))
            recall = intersection / 20
            recall_scores.append(recall)
        
        avg_recall = np.mean(recall_scores)
        
        return {
            "pca_explained_variance": float(np.sum(self.pca_model.explained_variance_ratio_)),
            "knn_recall_at_20": float(avg_recall),
            "quality_passed": avg_recall >= 0.95,
            "n_components": self.config.pca_components,
            "total_samples": len(embeddings)
        }

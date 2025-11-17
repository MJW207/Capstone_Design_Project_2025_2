"""
K-Means 알고리즘 구현
"""

from typing import Any, Dict, Optional
import numpy as np
from sklearn.cluster import KMeans as SklearnKMeans
from .base import BaseClusteringAlgorithm


class KMeansAlgorithm(BaseClusteringAlgorithm):
    """K-Means 클러스터링 알고리즘"""
    
    def __init__(self, 
                 n_clusters: int = 8,
                 random_state: int = 42,
                 n_init: int = 10,
                 max_iter: int = 300):
        """
        Parameters:
        -----------
        n_clusters : int
            클러스터 수
        random_state : int
            랜덤 시드
        n_init : int
            초기화 횟수
        max_iter : int
            최대 반복 횟수
        """
        self.n_clusters = n_clusters
        self.random_state = random_state
        self.n_init = n_init
        self.max_iter = max_iter
        self.model: Optional[SklearnKMeans] = None
    
    def fit(self, X: np.ndarray, **kwargs) -> 'KMeansAlgorithm':
        """모델 학습"""
        n_clusters = kwargs.get('n_clusters', self.n_clusters)
        random_state = kwargs.get('random_state', self.random_state)
        n_init = kwargs.get('n_init', self.n_init)
        max_iter = kwargs.get('max_iter', self.max_iter)
        
        self.model = SklearnKMeans(
            n_clusters=n_clusters,
            random_state=random_state,
            n_init=n_init,
            max_iter=max_iter
        )
        self.model.fit(X)
        return self
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """클러스터 예측"""
        if self.model is None:
            raise ValueError("모델이 학습되지 않았습니다. fit()을 먼저 호출하세요.")
        return self.model.predict(X)
    
    def fit_predict(self, X: np.ndarray, **kwargs) -> np.ndarray:
        """학습 및 예측"""
        self.fit(X, **kwargs)
        return self.predict(X)
    
    def get_algorithm_info(self) -> Dict[str, Any]:
        """알고리즘 정보 반환"""
        return {
            'type': 'KMeans',
            'n_clusters': self.n_clusters,
            'random_state': self.random_state,
            'n_init': self.n_init,
            'max_iter': self.max_iter,
            'is_fitted': self.model is not None
        }





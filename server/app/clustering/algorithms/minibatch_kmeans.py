"""
MiniBatch K-Means 알고리즘 구현
"""

from typing import Any, Dict, Optional
import numpy as np
from sklearn.cluster import MiniBatchKMeans as SklearnMiniBatchKMeans
from .base import BaseClusteringAlgorithm


class MiniBatchKMeansAlgorithm(BaseClusteringAlgorithm):
    """MiniBatch K-Means 클러스터링 알고리즘"""
    
    def __init__(self, 
                 n_clusters: int = 8,
                 batch_size: int = 1024,
                 random_state: int = 42,
                 n_init: int = 10,
                 max_iter: int = 200):
        """
        Parameters:
        -----------
        n_clusters : int
            클러스터 수
        batch_size : int
            배치 크기
        random_state : int
            랜덤 시드
        n_init : int
            초기화 횟수
        max_iter : int
            최대 반복 횟수
        """
        self.n_clusters = n_clusters
        self.batch_size = batch_size
        self.random_state = random_state
        self.n_init = n_init
        self.max_iter = max_iter
        self.model: Optional[SklearnMiniBatchKMeans] = None
    
    def fit(self, X: np.ndarray, **kwargs) -> 'MiniBatchKMeansAlgorithm':
        """모델 학습"""
        n_clusters = kwargs.get('n_clusters', self.n_clusters)
        batch_size = kwargs.get('batch_size', self.batch_size)
        random_state = kwargs.get('random_state', self.random_state)
        n_init = kwargs.get('n_init', self.n_init)
        max_iter = kwargs.get('max_iter', self.max_iter)
        
        self.model = SklearnMiniBatchKMeans(
            n_clusters=n_clusters,
            batch_size=batch_size,
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
            'type': 'MiniBatchKMeans',
            'n_clusters': self.n_clusters,
            'batch_size': self.batch_size,
            'random_state': self.random_state,
            'n_init': self.n_init,
            'max_iter': self.max_iter,
            'is_fitted': self.model is not None
        }





"""클러스터링 API 엔드포인트"""
import sys
import traceback

try:
    from fastapi import APIRouter, HTTPException, Depends
except Exception as e:
    traceback.print_exc(file=sys.stderr)
    raise

try:
    from pydantic import BaseModel
except Exception as e:
    traceback.print_exc(file=sys.stderr)
    raise

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
import pandas as pd
import numpy as np
import uuid
import json
import logging
from pathlib import Path
from collections import Counter
import os
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import NearestNeighbors
from sklearn.cluster import KMeans
from sklearn.metrics import pairwise_distances

try:
    from app.db.session import get_session
except Exception as e:
    traceback.print_exc(file=sys.stderr)
    raise

try:
    from app.db.dao_panels import extract_features_for_clustering
except Exception as e:
    traceback.print_exc(file=sys.stderr)
    raise

try:
    from app.clustering.integrated_pipeline import IntegratedClusteringPipeline
except Exception as e:
    traceback.print_exc(file=sys.stderr)
    raise

try:
    from app.clustering.data_preprocessor import preprocess_for_clustering
except Exception as e:
    traceback.print_exc(file=sys.stderr)
    raise

try:
    from app.clustering.filters.panel_filter import PanelFilter
except Exception as e:
    traceback.print_exc(file=sys.stderr)
    raise

try:
    from app.clustering.processors.vector_processor import VectorProcessor
except Exception as e:
    traceback.print_exc(file=sys.stderr)
    raise

try:
    from app.clustering.algorithms.kmeans import KMeansAlgorithm
except Exception as e:
    traceback.print_exc(file=sys.stderr)
    raise

try:
    from app.clustering.algorithms.minibatch_kmeans import MiniBatchKMeansAlgorithm
except Exception as e:
    traceback.print_exc(file=sys.stderr)
    raise

try:
    from app.clustering.algorithms.hdbscan import HDBSCANAlgorithm
except Exception as e:
    traceback.print_exc(file=sys.stderr)
    raise

try:
    from app.clustering.artifacts import save_artifacts, new_session_dir
except Exception as e:
    traceback.print_exc(file=sys.stderr)
    raise

try:
    router = APIRouter(prefix="/api/clustering", tags=["clustering"])
except Exception as e:
    traceback.print_exc(file=sys.stderr)
    raise


class ClusterRequest(BaseModel):
    """클러스터링 요청"""
    panel_ids: List[str]
    algo: str = "auto"  # "auto", "kmeans", "minibatch_kmeans", "hdbscan"
    n_clusters: Optional[int] = None  # None이면 자동 선택
    use_dynamic_strategy: bool = True  # 동적 전략 사용 여부
    filter_params: Optional[Dict[str, Any]] = None
    processor_params: Optional[Dict[str, Any]] = None
    algorithm_params: Optional[Dict[str, Any]] = None
    sample_size: Optional[int] = None  # 샘플링 크기 (None이면 전체 데이터 사용)


class CompareRequest(BaseModel):
    """그룹 비교 요청"""
    session_id: str
    c1: int
    c2: int


class UMAPRequest(BaseModel):
    """UMAP 2D 좌표 요청"""
    session_id: str
    sample: Optional[int] = None
    metric: str = "cosine"
    n_neighbors: int = 15
    min_dist: float = 0.1
    seed: Optional[int] = 0


@router.post("/cluster-from-csv")
async def cluster_from_csv(
    req: ClusterRequest
):
    """
    CSV 파일에서 직접 클러스터링 실행 (DB 연동 없이)
    """
    logger = logging.getLogger(__name__)
    
    debug_info = {
        'step': 'start',
        'errors': []
    }
    
    try:
        logger.info("[CSV 클러스터링 시작]")
        debug_info['step'] = 'load_csv'
        
        # CSV 파일은 더 이상 사용하지 않음 - NeonDB에서만 데이터 로드
        error_msg = "CSV 파일 기반 클러스터링은 더 이상 지원하지 않습니다. NeonDB에 데이터를 마이그레이션하세요."
        debug_info['errors'].append(error_msg)
        logger.error(f"[CSV 파일 오류] {error_msg}")
        raise HTTPException(
            status_code=400,
            detail=json.dumps({
                "error": error_msg,
                "debug": debug_info
            }, ensure_ascii=False)
        )
        
        # CSV 파일 로드
        import pandas as pd
        try:
            logger.info(f"[CSV 파일 로드 시도] 경로: {csv_path}, 크기: {csv_path.stat().st_size if csv_path.exists() else 'N/A'} bytes")
            df_raw = pd.read_csv(csv_path, encoding='utf-8')
            logger.info(f"[CSV 로드 성공] {len(df_raw)}행, {len(df_raw.columns)}열")
            debug_info['csv_load_success'] = True
            debug_info['csv_rows'] = len(df_raw)
            debug_info['csv_columns'] = len(df_raw.columns)
        except Exception as csv_load_error:
            error_msg = f"CSV 파일 로드 실패: {str(csv_load_error)}"
            debug_info['errors'].append(error_msg)
            logger.error(f"[CSV 로드 오류] {error_msg}", exc_info=True)
            raise HTTPException(
                status_code=400,
                detail=json.dumps({
                    "error": error_msg,
                    "debug": debug_info
                }, ensure_ascii=False)
            )
        
        # 샘플링 옵션 (기본값: 전체 데이터 사용, sample_size가 지정되면 샘플링)
        import time
        import random
        sample_size = req.sample_size if hasattr(req, 'sample_size') and req.sample_size else None
        
        if sample_size and len(df_raw) > sample_size:
            # 매번 다른 랜덤 샘플을 위해 시간 기반 시드 사용
            random_seed = int(time.time() * 1000) % (2**31)  # 밀리초 기반 시드
            df_raw = df_raw.sample(n=sample_size, random_state=random_seed).reset_index(drop=True)
            logger.info(f"[샘플링] {sample_size}개 행 무작위 선택 (시드: {random_seed})")
            debug_info['sample_seed'] = random_seed
            debug_info['sample_size'] = sample_size
        else:
            logger.info(f"[전체 데이터 사용] {len(df_raw)}개 행 모두 사용")
            debug_info['sample_size'] = None
            debug_info['use_full_data'] = True
        
        # mb_sn 컬럼이 없으면 생성
        if 'mb_sn' not in df_raw.columns:
            df_raw['mb_sn'] = [f"csv_panel_{i}" for i in range(len(df_raw))]
        
        debug_info['step'] = 'preprocess'
        debug_info['raw_data_count'] = len(df_raw)
        
        # 데이터 전처리
        try:
            logger.info(f"[전처리 시작] 원본 데이터: {len(df_raw)}행")
            # CSV 데이터를 dict 리스트로 변환 (preprocess_for_clustering 호환 형식)
            panel_data = df_raw.to_dict('records')
            logger.info(f"[전처리] dict 변환 완료: {len(panel_data)}개 레코드")
            
            df = preprocess_for_clustering(panel_data, verbose=False)
            logger.info(f"[전처리 완료] 전처리된 데이터 행 수: {len(df)}, 열 수: {len(df.columns) if len(df) > 0 else 0}")
            if len(df) > 0:
                logger.info(f"[전처리 완료] 컬럼 목록 (처음 10개): {list(df.columns)[:10]}")
            debug_info['preprocessed_data_count'] = len(df)
            debug_info['preprocessed_columns'] = list(df.columns) if len(df) > 0 else []
            debug_info['preprocess_success'] = True
        except Exception as preprocess_error:
            import traceback
            error_trace = traceback.format_exc()
            error_msg = f'전처리 실패: {str(preprocess_error)}'
            debug_info['errors'].append(error_msg)
            debug_info['preprocess_error_trace'] = error_trace
            logger.error(f"[전처리 오류] {error_msg}\n{error_trace}", exc_info=True)
            raise HTTPException(
                status_code=400,
                detail=json.dumps({
                    "error": error_msg,
                    "debug": debug_info
                }, ensure_ascii=False)
            )
        
        if len(df) == 0:
            debug_info['errors'].append('전처리 후 데이터가 비어있습니다.')
            raise HTTPException(
                status_code=400,
                detail=json.dumps({
                    "error": "전처리 후 데이터가 없습니다.",
                    "debug": debug_info
                }, ensure_ascii=False)
            )
        
        debug_info['step'] = 'check_sample_size'
        debug_info['sample_size'] = len(df)
        
        # 샘플 수 확인 및 경고
        if len(df) < 100:
            debug_info['warnings'] = [f'샘플 수가 부족합니다 ({len(df)}개 < 100개). 동적 전략에 따라 프로파일링만 제공될 수 있습니다.']
            logger.warning(f"[샘플 수 부족] {len(df)}개 패널 - 프로파일링만 제공될 수 있음")
        
        # 나머지 로직은 기존 cluster_panels와 동일
        return await _execute_clustering(
            df=df,
            req=req,
            debug_info=debug_info,
            logger=logger
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        debug_info['step'] = 'error'
        error_msg = f'예상치 못한 오류: {str(e)}'
        debug_info['errors'].append(error_msg)
        debug_info['error_trace'] = error_trace
        debug_info['error_type'] = type(e).__name__
        logger.error(f"[CSV 클러스터링 오류] {error_msg}\n{error_trace}", exc_info=True)
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=json.dumps({
                "error": error_msg,
                "error_type": type(e).__name__,
                "debug": debug_info
            }, ensure_ascii=False)
        )


async def _execute_clustering(
    df: pd.DataFrame,
    req: ClusterRequest,
    debug_info: Dict[str, Any],
    logger: logging.Logger
):
    """공통 클러스터링 실행 로직"""
    # 3. 알고리즘 선택
    algorithm = None
    if req.algo != "auto":
        if req.algo == "kmeans":
            algorithm = KMeansAlgorithm(
                n_clusters=req.n_clusters or 8
            )
        elif req.algo == "minibatch_kmeans":
            algorithm = MiniBatchKMeansAlgorithm(
                n_clusters=req.n_clusters or 8
            )
        elif req.algo == "hdbscan":
            algorithm = HDBSCANAlgorithm()
    
    # 4. 파이프라인 구성
    pipeline = IntegratedClusteringPipeline(
        filter=PanelFilter(),
        processor=VectorProcessor(),
        algorithm=algorithm,
        use_dynamic_strategy=req.use_dynamic_strategy
    )
    
    debug_info['step'] = 'clustering'
    
    # 5. 클러스터링 실행
    try:
        # mb_sn 컬럼 제외하고 클러스터링
        df_for_clustering = df.drop(columns=['mb_sn']) if 'mb_sn' in df.columns else df
        result = pipeline.cluster(df_for_clustering, verbose=False)
        logger.info(f"[클러스터링 완료] 성공: {result.get('success', False)}")
    except Exception as clustering_error:
        debug_info['errors'].append(f'클러스터링 실행 실패: {str(clustering_error)}')
        logger.error(f"[클러스터링 오류] {str(clustering_error)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=json.dumps({
                "error": f"클러스터링 실행 실패: {str(clustering_error)}",
                "debug": debug_info
            }, ensure_ascii=False)
        )
    
    debug_info['step'] = 'complete'
    
    if not result.get('success'):
        # 프로파일링 모드
        return {
            "success": False,
            "session_id": None,
            "n_samples": result.get('n_samples', 0),
            "n_clusters": 0,
            "labels": [],
            "cluster_sizes": {},
            "meta": {
                "filter_info": result.get('filter_info'),
                "processor_info": result.get('processor_info'),
                "algorithm_info": result.get('algorithm_info'),
            },
            "profile": result.get('profile'),
            "reason": result.get('reason', '알 수 없는 오류'),
            "debug": {
                **debug_info,
                "sample_size": result.get('n_samples', 0),
                "warnings": debug_info.get('warnings', []) + [result.get('reason', '')]
            }
        }
    
    # 6. 세션 생성 및 아티팩트 저장
    session_dir = new_session_dir()
    session_id = session_dir.name  # 디렉토리 이름이 session_id
    
    # labels 추출 (여러 방법 시도)
    labels = None
    if result.get('labels') is not None:
        # result에 labels가 직접 있는 경우
        labels = result['labels']
        if hasattr(labels, 'tolist'):
            labels = labels.tolist()
        elif isinstance(labels, np.ndarray):
            labels = labels.tolist()
        elif not isinstance(labels, list):
            labels = list(labels)
    elif 'data' in result and isinstance(result['data'], pd.DataFrame):
        # DataFrame에 cluster 컬럼이 있는 경우
        if 'cluster' in result['data'].columns:
            labels = result['data']['cluster'].tolist()
    
    if labels is None:
        labels = []
        logger.warning("[세션 저장] labels를 찾을 수 없습니다.")
    
    # cluster_sizes 계산
    cluster_sizes = result.get('cluster_sizes', {})
    if not cluster_sizes and labels:
        # labels에서 cluster_sizes 계산
        from collections import Counter
        label_counts = Counter(labels)
        cluster_sizes = {k: int(v) for k, v in label_counts.items() if k != -1}  # 노이즈 제외, 키를 정수로 유지
    
    # n_clusters 계산 (cluster_sizes 또는 labels에서)
    n_clusters = result.get('n_clusters', 0)
    if n_clusters == 0:
        if cluster_sizes:
            # cluster_sizes에서 노이즈(-1) 제외한 클러스터 수 계산
            valid_clusters = [k for k in cluster_sizes.keys() if k != -1 and k != '-1' and k != '-1.0']
            n_clusters = len(valid_clusters)
            logger.info(f"[클러스터 수 계산] cluster_sizes에서 계산: {n_clusters}개 (keys: {list(cluster_sizes.keys())[:10]})")
        elif labels:
            # labels에서 고유 클러스터 수 계산
            unique_labels = set(labels)
            unique_labels.discard(-1)  # 노이즈 제외
            n_clusters = len(unique_labels)
            logger.info(f"[클러스터 수 계산] labels에서 계산: {n_clusters}개 (unique: {sorted(unique_labels)[:10]})")
    
    logger.info(f"[클러스터 수 최종] n_clusters={n_clusters}, cluster_sizes_keys={list(cluster_sizes.keys())[:10] if cluster_sizes else []}, labels_unique={len(set(labels)) if labels else 0}")
    
    # 아티팩트 저장
    result_data = result.get('data', df)
    
    # labels를 numpy array로 변환 (save_artifacts가 기대하는 형식)
    labels_array = np.array(labels) if labels else None
    
    # 피처 타입 정보 추출
    from app.clustering.data_preprocessor import get_feature_types
    feature_types = get_feature_types(result_data)
    
    logger.info(f"[피처 타입 추출] bin: {len(feature_types.get('bin_cols', []))}, cat: {len(feature_types.get('cat_cols', []))}, num: {len(feature_types.get('num_cols', []))}")
    
    save_artifacts(
        session_dir,
        result_data,
        labels_array,
        {
            'request': req.dict(),
            'feature_types': feature_types,  # 피처 타입 정보 추가
            'result_meta': {
                'success': result.get('success', False),
                'n_clusters': result.get('n_clusters'),
                'optimal_k': result.get('optimal_k'),
                'k_scores': result.get('k_scores', []),
                'strategy': result.get('strategy'),
                'filter_info': result.get('filter_info'),
                'processor_info': result.get('processor_info'),
                'algorithm_info': {
                    **(result.get('algorithm_info', {}) or {}),
                    'features': result.get('features', []),
                }
            }
        }
    )
    
    logger.info(f"[세션 생성] {session_id}")
    
    # 메트릭 추출 (여러 경로 시도)
    silhouette_score = result.get('silhouette_score') or result.get('algorithm_info', {}).get('silhouette_score')
    davies_bouldin_score = result.get('davies_bouldin_score') or result.get('algorithm_info', {}).get('davies_bouldin_score')
    calinski_harabasz = result.get('calinski_harabasz_score') or result.get('algorithm_info', {}).get('calinski_harabasz')
    
    logger.info(f"[메트릭 추출] silhouette={silhouette_score}, davies_bouldin={davies_bouldin_score}, calinski={calinski_harabasz}")
    
    return {
        "success": True,
        "session_id": session_id,
        "n_samples": result.get('n_samples', len(df)),
        "n_clusters": n_clusters,  # 계산된 n_clusters 사용
        "labels": labels,
        "cluster_sizes": cluster_sizes,
        "silhouette_score": silhouette_score,
        "davies_bouldin_score": davies_bouldin_score,
        "calinski_harabasz_score": calinski_harabasz,
        "optimal_k": result.get('optimal_k'),
        "strategy": result.get('strategy'),
        "meta": {
            "filter_info": result.get('filter_info'),
            "processor_info": result.get('processor_info'),
            "algorithm_info": {
                **(result.get('algorithm_info', {}) or {}),
                "features": result.get('features', []),
                "silhouette_score": silhouette_score,
                "davies_bouldin_score": davies_bouldin_score,
                "calinski_harabasz": calinski_harabasz,
            }
        },
        "debug": debug_info
    }


@router.post("/cluster")
async def cluster_panels(
    req: ClusterRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    클러스터링 실행 (DB에서 데이터 추출)
    """
    logger = logging.getLogger(__name__)
    
    debug_info = {
        'step': 'start',
        'panel_ids_count': len(req.panel_ids),
        'errors': []
    }
    
    try:
        logger.info(f"[클러스터링 시작] 패널 수: {len(req.panel_ids)}")
        debug_info['step'] = 'extract_data'
        
        # 1. 패널 데이터 추출
        panel_data = await extract_features_for_clustering(session, req.panel_ids)
        logger.info(f"[데이터 추출] 추출된 패널 수: {len(panel_data) if panel_data else 0}")
        
        if not panel_data:
            debug_info['errors'].append('패널 데이터 추출 실패: DB에서 데이터를 찾을 수 없습니다.')
            raise HTTPException(
                status_code=404,
                detail=json.dumps({
                    "error": "패널 데이터를 찾을 수 없습니다.",
                    "debug": debug_info
                }, ensure_ascii=False)
            )
        
        debug_info['step'] = 'preprocess'
        debug_info['raw_data_count'] = len(panel_data)
        
        # 2. 데이터 전처리 (원시 데이터 -> 클러스터링용 DataFrame)
        try:
            df = preprocess_for_clustering(panel_data, verbose=False)
            logger.info(f"[전처리 완료] 전처리된 데이터 행 수: {len(df)}, 열 수: {len(df.columns) if len(df) > 0 else 0}")
            debug_info['preprocessed_data_count'] = len(df)
            debug_info['preprocessed_columns'] = list(df.columns) if len(df) > 0 else []
        except Exception as preprocess_error:
            debug_info['errors'].append(f'전처리 실패: {str(preprocess_error)}')
            logger.error(f"[전처리 오류] {str(preprocess_error)}", exc_info=True)
            raise HTTPException(
                status_code=400,
                detail=json.dumps({
                    "error": f"데이터 전처리 실패: {str(preprocess_error)}",
                    "debug": debug_info
                }, ensure_ascii=False)
            )
        
        if len(df) == 0:
            debug_info['errors'].append('전처리 후 데이터가 비어있습니다.')
            raise HTTPException(
                status_code=400,
                detail=json.dumps({
                    "error": "전처리 후 데이터가 없습니다.",
                    "debug": debug_info
                }, ensure_ascii=False)
            )
        
        debug_info['step'] = 'check_sample_size'
        debug_info['sample_size'] = len(df)
        
        # 샘플 수 확인 및 경고
        if len(df) < 100:
            debug_info['warnings'] = [f'샘플 수가 부족합니다 ({len(df)}개 < 100개). 동적 전략에 따라 프로파일링만 제공될 수 있습니다.']
            logger.warning(f"[샘플 수 부족] {len(df)}개 패널 - 프로파일링만 제공될 수 있음")
        
        # 나머지 로직은 공통 함수로 분리
        return await _execute_clustering(
            df=df,
            req=req,
            debug_info=debug_info,
            logger=logger
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        debug_info['step'] = 'error'
        debug_info['errors'].append(f'예상치 못한 오류: {str(e)}')
        logger.error(f"[클러스터링 오류] {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=json.dumps({
                "error": f"클러스터링 실패: {str(e)}",
                "debug": debug_info
            }, ensure_ascii=False)
    )


@router.post("/compare")
async def compare_clusters(req: CompareRequest):
    """
    군집 비교 분석
    """
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"[비교 분석 시작] session_id: {req.session_id}, c1: {req.c1}, c2: {req.c2}")
        
        from app.clustering.compare import compare_groups
        
        # 세션에서 데이터 로드
        from app.clustering.artifacts import load_artifacts
        logger.info(f"[비교 분석] 아티팩트 로드 시도: {req.session_id}")
        artifacts = load_artifacts(req.session_id)
        
        if artifacts is None:
            logger.error(f"[비교 분석 오류] 세션을 찾을 수 없음: {req.session_id}")
            raise HTTPException(
                status_code=404,
                detail="세션을 찾을 수 없습니다."
            )
        
        logger.info(f"[비교 분석] 아티팩트 로드 성공, keys: {list(artifacts.keys())}")
        
        df = artifacts.get('data')
        labels = artifacts.get('labels')
        
        logger.info(f"[비교 분석] 데이터 확인] df: {df is not None}, labels: {labels is not None}")
        if df is not None:
            logger.info(f"[비교 분석] DataFrame 정보] 행 수: {len(df)}, 열 수: {len(df.columns)}, 컬럼: {list(df.columns)[:10]}")
        if labels is not None:
            logger.info(f"[비교 분석] Labels 정보] 타입: {type(labels)}, 길이: {len(labels) if hasattr(labels, '__len__') else 'N/A'}, 고유값: {sorted(set(labels))[:10] if hasattr(labels, '__iter__') else 'N/A'}")
        
        if df is None or labels is None:
            logger.error(f"[비교 분석 오류] 데이터 없음] df: {df is None}, labels: {labels is None}")
            raise HTTPException(
                status_code=400,
                detail="클러스터링 데이터가 없습니다."
            )
        
        # DataFrame이 문자열 경로인 경우 로드
        if isinstance(df, str):
            logger.info(f"[비교 분석] DataFrame 경로에서 로드: {df}")
            import pandas as pd
            df = pd.read_csv(df)
            logger.info(f"[비교 분석] DataFrame 로드 완료] 행 수: {len(df)}, 열 수: {len(df.columns)}")
        
        # labels를 numpy array로 변환
        if not isinstance(labels, np.ndarray):
            if isinstance(labels, list):
                labels = np.array(labels)
                logger.info(f"[비교 분석] Labels를 numpy array로 변환] 길이: {len(labels)}")
            else:
                logger.error(f"[비교 분석 오류] Labels 타입 오류] 타입: {type(labels)}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Labels 타입 오류: {type(labels)}"
                )
        
        # 클러스터 ID 확인
        unique_labels = sorted(set(labels))
        logger.info(f"[비교 분석] 고유 클러스터 ID] {unique_labels[:20]}")
        if req.c1 not in unique_labels:
            logger.warning(f"[비교 분석 경고] 클러스터 {req.c1}가 labels에 없음. 사용 가능한 ID: {unique_labels[:10]}")
        if req.c2 not in unique_labels:
            logger.warning(f"[비교 분석 경고] 클러스터 {req.c2}가 labels에 없음. 사용 가능한 ID: {unique_labels[:10]}")
        
        # 비교 분석 실행
        # 메타데이터에서 피처 타입 정보 가져오기
        feature_types = artifacts.get('meta', {}).get('feature_types', {})
        bin_cols = feature_types.get('bin_cols', [])
        cat_cols = feature_types.get('cat_cols', [])
        num_cols = feature_types.get('num_cols', [])
        
        logger.info(f"[비교 분석] 피처 타입 정보] bin_cols: {len(bin_cols)}, cat_cols: {len(cat_cols)}, num_cols: {len(num_cols)}")
        
        # 피처 타입 정보가 없으면 자동 감지
        if not bin_cols and not cat_cols and not num_cols:
            logger.info("[비교 분석] 피처 타입 자동 감지 시도")
            try:
                from app.clustering.data_preprocessor import get_feature_types
                feature_types = get_feature_types(df)
                bin_cols = feature_types.get('bin_cols', [])
                cat_cols = feature_types.get('cat_cols', [])
                num_cols = feature_types.get('num_cols', [])
                logger.info(f"[비교 분석] 자동 감지 완료] bin_cols: {len(bin_cols)}, cat_cols: {len(cat_cols)}, num_cols: {len(num_cols)}")
            except Exception as e:
                logger.warning(f"[비교 분석] 피처 타입 자동 감지 실패: {str(e)}, 기본값 사용")
                bin_cols = []
                cat_cols = []
                num_cols = []
        
        logger.info(f"[비교 분석] compare_groups 호출] c1: {req.c1}, c2: {req.c2}")
        comparison = compare_groups(
            df,
            labels,
            req.c1,
            req.c2,
            bin_cols=bin_cols,
            cat_cols=cat_cols,
            num_cols=num_cols
        )
        
        logger.info(f"[비교 분석 완료] comparison keys: {list(comparison.keys())}, comparison count: {len(comparison.get('comparison', []))}")
        
        return comparison
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"[비교 분석 오류] {str(e)}\n{error_trace}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"비교 분석 실패: {str(e)}"
    )


@router.post("/umap")
async def get_umap_coordinates(req: UMAPRequest):
    """
    UMAP 2D 좌표 계산
    """
    logger = logging.getLogger(__name__)
    
    try:
        from umap import UMAP
        
        logger.info(f"[UMAP 시작] session_id: {req.session_id}, sample: {req.sample}")
        
        # 세션에서 데이터 로드
        from app.clustering.artifacts import load_artifacts
        artifacts = load_artifacts(req.session_id)
        
        if artifacts is None:
            logger.error(f"[UMAP 오류] 세션을 찾을 수 없음: {req.session_id}")
            raise HTTPException(
                status_code=404,
                detail="세션을 찾을 수 없습니다."
            )
        
        df = artifacts.get('data')
        labels_raw = artifacts.get('labels')
        
        logger.info(f"[UMAP 데이터 로드] df: {df is not None}, labels: {labels_raw is not None}")
        if df is not None:
            logger.info(f"[UMAP 데이터 정보] 행 수: {len(df)}, 열 수: {len(df.columns)}")
        if labels_raw is not None:
            logger.info(f"[UMAP 라벨 정보] 타입: {type(labels_raw)}, 길이: {len(labels_raw) if hasattr(labels_raw, '__len__') else 'N/A'}")
        
        if df is None:
            logger.error("[UMAP 오류] 데이터가 없습니다.")
            raise HTTPException(
                status_code=400,
                detail="데이터가 없습니다."
            )

        # labels 처리 (numpy array인 경우 처리)
        labels = None
        if labels_raw is not None:
            if isinstance(labels_raw, np.ndarray):
                labels = labels_raw.tolist()
                logger.info(f"[UMAP 라벨 변환] numpy array -> list, 길이: {len(labels)}")
            elif isinstance(labels_raw, list):
                labels = labels_raw
                logger.info(f"[UMAP 라벨] 이미 list 형식, 길이: {len(labels)}")
            else:
                # 다른 타입인 경우 변환 시도
                try:
                    labels = list(labels_raw)
                    logger.info(f"[UMAP 라벨 변환] 다른 타입 -> list, 길이: {len(labels)}")
                except Exception as e:
                    logger.warning(f"[UMAP 라벨 변환 실패] {str(e)}")
                    labels = []
        else:
            logger.warning("[UMAP 라벨] labels가 None입니다.")
            labels = []

        # UMAP 적용
        umap = UMAP(
            n_components=2,
            n_neighbors=req.n_neighbors,
            min_dist=req.min_dist,
            metric=req.metric,
            random_state=req.seed
        )
        
        # 숫자형 컬럼만 선택
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        logger.info(f"[UMAP 피쳐 선택] 숫자형 컬럼: {len(numeric_cols)}개")
        X = df[numeric_cols].fillna(0).values
        
        # 샘플링
        sample_indices = None
        if req.sample and req.sample < len(X):
            np.random.seed(req.seed)
            sample_indices = np.random.choice(len(X), req.sample, replace=False)
            X = X[sample_indices]
            df_sample = df.iloc[sample_indices]
            logger.info(f"[UMAP 샘플링] {len(X)}개 샘플 선택 (전체: {len(df)}개)")
        else:
            df_sample = df
            logger.info(f"[UMAP 샘플링] 전체 데이터 사용: {len(X)}개")
        
        # UMAP 변환
        logger.info("[UMAP 변환 시작]")
        coords = umap.fit_transform(X)
        logger.info(f"[UMAP 변환 완료] 좌표 수: {len(coords)}")
        
        # labels 샘플링 (샘플링된 경우)
        if sample_indices is not None and labels:
            sampled_labels = [labels[i] for i in sample_indices]
            logger.info(f"[UMAP 라벨 샘플링] {len(sampled_labels)}개 라벨 선택")
        else:
            sampled_labels = labels[:len(coords)] if labels else []
            logger.info(f"[UMAP 라벨] 전체 라벨 사용: {len(sampled_labels)}개")
        
        # panel_ids 추출
        if 'mb_sn' in df_sample.columns:
            panel_ids = df_sample['mb_sn'].tolist()
        else:
            panel_ids = df_sample.index.astype(str).tolist()
        
        logger.info(f"[UMAP 완료] 좌표: {len(coords)}개, 라벨: {len(sampled_labels)}개, 패널ID: {len(panel_ids)}개")
        
        return {
            'coordinates': coords.tolist(),
            'panel_ids': panel_ids,
            'labels': sampled_labels
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"[UMAP 오류] {str(e)}\n{error_trace}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"UMAP 계산 실패: {str(e)}"
        )


class PanelClusterMappingRequest(BaseModel):
    """패널 ID와 클러스터 매칭 요청"""
    session_id: str
    panel_ids: List[str]


@router.post("/panel-cluster-mapping")
async def get_panel_cluster_mapping(req: PanelClusterMappingRequest):
    """
    검색된 패널 ID들의 클러스터 매핑 정보 반환
    """
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"[패널-클러스터 매핑] session_id: {req.session_id}, panel_ids: {len(req.panel_ids)}개")
        
        # Precomputed 데이터인 경우 NeonDB에서 로드
        if req.session_id == 'precomputed_default':
            logger.info(f"[패널-클러스터 매핑] Precomputed 데이터 사용 (NeonDB)")
            from app.utils.clustering_loader import get_precomputed_session_id, load_full_clustering_data_from_db
            
            # Precomputed 세션 ID 조회
            precomputed_name = "hdbscan_default"
            logger.debug(f"[패널-클러스터 매핑] Precomputed 세션 ID 조회: name={precomputed_name}")
            actual_session_id = await get_precomputed_session_id(precomputed_name)
            
            if not actual_session_id:
                logger.error(f"[패널-클러스터 매핑] Precomputed 세션을 찾을 수 없음: name={precomputed_name}")
                raise HTTPException(
                    status_code=404,
                    detail=f"Precomputed 데이터를 찾을 수 없습니다. name={precomputed_name}"
                )
            
            logger.info(f"[패널-클러스터 매핑] Precomputed 세션 ID 찾음: {actual_session_id}")
            
            # 전체 클러스터링 데이터 로드
            artifacts = await load_full_clustering_data_from_db(actual_session_id)
            if not artifacts:
                logger.error(f"[패널-클러스터 매핑] NeonDB에서 데이터를 찾을 수 없음: session_id={actual_session_id}")
                raise HTTPException(
                    status_code=404,
                    detail="Precomputed 데이터를 찾을 수 없습니다."
                )
            
            df = artifacts.get('data')
            labels_raw = artifacts.get('labels')
            
            if df is None or df.empty:
                raise HTTPException(
                    status_code=400,
                    detail="Precomputed 데이터가 비어있습니다."
                )
            
            logger.info(f"[패널-클러스터 매핑] NeonDB에서 데이터 로드 완료: {len(df)}행")
            
            # labels 처리
            if labels_raw is not None:
                if isinstance(labels_raw, np.ndarray):
                    labels = labels_raw.tolist()
                elif isinstance(labels_raw, list):
                    labels = labels_raw
                else:
                    labels = list(labels_raw)
            elif 'cluster' in df.columns:
                labels = df['cluster'].tolist()
            else:
                raise HTTPException(
                    status_code=400,
                    detail="클러스터 레이블을 찾을 수 없습니다."
                )
        else:
            # 일반 세션: artifacts에서 로드
            from app.clustering.artifacts import load_artifacts
            artifacts = load_artifacts(req.session_id)
            
            if artifacts is None:
                logger.error(f"[패널-클러스터 매핑] 세션을 찾을 수 없음: {req.session_id}")
                raise HTTPException(
                    status_code=404,
                    detail="세션을 찾을 수 없습니다."
                )
            
            df = artifacts.get('data')
            labels_raw = artifacts.get('labels')
            
            if df is None:
                raise HTTPException(
                    status_code=400,
                    detail="데이터가 없습니다."
                )
            
            # DataFrame이 경로 문자열이면 로드
            if isinstance(df, str):
                df = pd.read_csv(df)
            
            # labels 처리
            labels = None
            if labels_raw is not None:
                if isinstance(labels_raw, np.ndarray):
                    labels = labels_raw.tolist()
                elif isinstance(labels_raw, list):
                    labels = labels_raw
                else:
                    labels = list(labels_raw)
            
            if labels is None or len(labels) == 0:
                # DataFrame에 cluster 컬럼이 있는지 확인
                if 'cluster' in df.columns:
                    labels = df['cluster'].tolist()
                else:
                    raise HTTPException(
                        status_code=400,
                        detail="클러스터 레이블을 찾을 수 없습니다."
                    )
        
        # panel_ids 추출 (mb_sn 컬럼 또는 인덱스)
        if 'mb_sn' in df.columns:
            df_panel_ids = df['mb_sn'].tolist()
        else:
            df_panel_ids = df.index.astype(str).tolist()
        
        logger.info(f"[패널-클러스터 매핑] 데이터프레임 패널 수: {len(df_panel_ids)}, 레이블 수: {len(labels)}")
        
        # 패널 ID와 클러스터 매핑 생성 (정규화된 키로 저장)
        panel_to_cluster = {}
        for idx, panel_id in enumerate(df_panel_ids):
            if idx < len(labels):
                # 정규화: 문자열로 변환하고 공백 제거
                normalized_id = str(panel_id).strip()
                panel_to_cluster[normalized_id] = int(labels[idx])
        
        logger.info(f"[패널-클러스터 매핑] 매핑 테이블 생성 완료: {len(panel_to_cluster)}개 패널")
        logger.info(f"[패널-클러스터 매핑] 매핑 테이블 샘플: {list(panel_to_cluster.items())[:5]}")
        logger.info(f"[패널-클러스터 매핑] 요청된 패널 ID 샘플: {req.panel_ids[:5]}")
        
        # 매핑 테이블의 키 샘플 확인 (디버깅)
        sample_keys = list(panel_to_cluster.keys())[:10]
        logger.debug(f"[패널-클러스터 매핑] 매핑 테이블 키 샘플: {sample_keys}")
        logger.debug(f"[패널-클러스터 매핑] 매핑 테이블 키 타입 샘플: {[type(k).__name__ for k in sample_keys]}")
        
        # 요청된 패널 ID들의 클러스터 정보 추출 (정규화하여 매칭)
        mapping_results = []
        not_found_ids = []
        for panel_id in req.panel_ids:
            # 요청된 패널 ID도 정규화
            normalized_request_id = str(panel_id).strip()
            cluster_id = panel_to_cluster.get(normalized_request_id, None)
            
            # 대소문자 무시 매칭 시도
            if cluster_id is None:
                for key, value in panel_to_cluster.items():
                    if str(key).strip().lower() == normalized_request_id.lower():
                        cluster_id = value
                        logger.debug(f"[패널-클러스터 매핑] 대소문자 무시 매칭 성공: '{normalized_request_id}' -> '{key}'")
                        break
            
            if cluster_id is not None:
                mapping_results.append({
                    'panel_id': panel_id,
                    'cluster_id': cluster_id,
                    'found': True
                })
            else:
                # 매칭 실패 시 원본 ID와 정규화된 ID 모두 로그
                not_found_ids.append(normalized_request_id)
                logger.warning(f"[패널-클러스터 매핑] 패널 ID 매칭 실패: 원본='{panel_id}', 정규화='{normalized_request_id}'")
                mapping_results.append({
                    'panel_id': panel_id,
                    'cluster_id': None,
                    'found': False
                })
        
        if not_found_ids:
            logger.warning(f"[패널-클러스터 매핑] 매칭 실패한 패널 ID들: {not_found_ids[:10]}")
            logger.warning(f"[패널-클러스터 매핑] 매핑 테이블에 있는 유사한 키들: {[k for k in list(panel_to_cluster.keys())[:20] if any(nfid.lower() in str(k).lower() or str(k).lower() in nfid.lower() for nfid in not_found_ids[:3])]}")
        
        found_count = sum(1 for r in mapping_results if r['found'])
        logger.info(f"[패널-클러스터 매핑] 매칭 완료: {found_count}/{len(req.panel_ids)}개 패널 찾음")
        
        return {
            'session_id': req.session_id,
            'mappings': mapping_results,
            'total_requested': len(req.panel_ids),
            'total_found': found_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"[패널-클러스터 매핑 오류] {str(e)}\n{error_trace}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"패널-클러스터 매핑 실패: {str(e)}"
        )


# 디버그: 파일 로드 완료 확인


# ============================================
# 검색 결과 주변 클러스터링 관련 함수
# ============================================

# 전역 캐시 변수
_cached_data = None
_cached_file_mtime = None
_cached_file_path = None


def load_full_data_cached(file_path: Optional[str] = None):
    """
    전체 데이터 캐싱 (파일 수정 시간 기반)
    
    Parameters:
    -----------
    file_path : str, optional
        데이터 파일 경로 (None이면 기본 경로 사용)
    
    Returns:
    --------
    tuple : (X_scaled, df, available_features, scaler)
        - X_scaled: 스케일링된 피처 행렬
        - df: 원본 DataFrame
        - available_features: 사용 가능한 피처 리스트
        - scaler: StandardScaler 객체
    """
    global _cached_data, _cached_file_mtime, _cached_file_path
    
    if file_path is None:
        # CSV 파일 기반 로드는 더 이상 지원하지 않음
        raise FileNotFoundError(
            "CSV 파일 기반 데이터 로드는 더 이상 지원하지 않습니다. NeonDB에서 데이터를 로드하세요."
        )
    
    file_path = Path(file_path)
    
    if not file_path.exists():
        raise FileNotFoundError(f"데이터 파일을 찾을 수 없습니다: {file_path}")
    
    current_mtime = os.path.getmtime(file_path)
    
    # 캐시가 있고 파일이 변경되지 않았으면 재사용
    if (_cached_data is not None and 
        _cached_file_path == str(file_path) and 
        _cached_file_mtime == current_mtime):
        logger = logging.getLogger(__name__)
        logger.debug(f"[데이터 캐시] 캐시된 데이터 재사용: {file_path}")
        return _cached_data
    
    # 새로 로드
    logger = logging.getLogger(__name__)
    logger.info(f"[데이터 로드] 새로 로드 시작: {file_path}")
    
    df = pd.read_csv(file_path)
    
    # 원본 피처 사용 (스케일링 전)
    features = [
        'age',
        'Q6_income',  # 또는 'Q6'
        'Q7',  # 학력
        'Q8_count',
        'Q8_premium_index',
        'is_premium_car',
    ]
    
    # 존재하는 피처만 선택
    available_features = []
    for feat in features:
        if feat in df.columns:
            # 결측치 비율 확인
            missing_ratio = df[feat].isna().sum() / len(df)
            if missing_ratio <= 0.3:
                available_features.append(feat)
            else:
                logger.warning(f"[데이터 로드] 피처 {feat} 결측치 비율 {missing_ratio:.1%} (제외)")
        else:
            logger.warning(f"[데이터 로드] 피처 {feat} 컬럼이 존재하지 않음")
    
    if len(available_features) < 3:
        raise ValueError(f"사용 가능한 피처가 부족합니다: {len(available_features)}개 (최소 3개 필요)")
    
    # 결측치 처리 및 스케일링
    X = df[available_features].fillna(df[available_features].mean()).values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    logger.info(f"[데이터 로드] 완료: {len(df)}행, 피처 {len(available_features)}개")
    
    # 캐시 업데이트
    _cached_data = (X_scaled, df, available_features, scaler)
    _cached_file_mtime = current_mtime
    _cached_file_path = str(file_path)
    
    return _cached_data


class ClusterAroundSearchRequest(BaseModel):
    """검색 결과 주변 클러스터링 요청"""
    search_panel_ids: List[str]
    k_neighbors_per_panel: int = 100  # 각 검색 패널당 이웃 수


@router.post("/cluster-around-search")
async def cluster_around_search(req: ClusterAroundSearchRequest):
    """
    검색 결과 주변 유사 패널 조회 (HDBSCAN 결과 재사용)
    - Precomputed HDBSCAN 결과에서 검색된 패널이 속한 클러스터 찾기
    - 해당 클러스터의 모든 패널 반환 (재클러스터링 없음)
    - Precomputed UMAP 좌표 재사용
    """
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("=" * 80)
        logger.info(f"[🔍 확장 클러스터링 API 호출]")
        logger.info(f"[📋 요청 데이터] 검색 패널: {len(req.search_panel_ids)}개, 이웃 수: {req.k_neighbors_per_panel}개")
        logger.info(f"[📋 검색 패널 ID 샘플] {req.search_panel_ids[:10]}")
        logger.info(f"[📋 검색 패널 ID 타입] {[type(pid).__name__ for pid in req.search_panel_ids[:5]]}")
        logger.info("=" * 80)
        
        # 1. Precomputed HDBSCAN 데이터 로드 (NeonDB에서 로드, df_full 제거)
        logger.info(f"[2단계] Precomputed 데이터 로드 시작 (NeonDB)")
        from app.utils.clustering_loader import get_precomputed_session_id, load_full_clustering_data_from_db
        
        # Precomputed 세션 ID 조회
        precomputed_name = "hdbscan_default"
        actual_session_id = await get_precomputed_session_id(precomputed_name)
        
        if not actual_session_id:
            logger.error(f"[확장 클러스터링] Precomputed 세션을 찾을 수 없음: name={precomputed_name}")
            raise HTTPException(
                status_code=404,
                detail=f"Precomputed 데이터를 찾을 수 없습니다. name={precomputed_name}"
            )
        
        logger.info(f"[확장 클러스터링] Precomputed 세션 ID 찾음: {actual_session_id}")
        
        # 전체 클러스터링 데이터 로드
        artifacts = await load_full_clustering_data_from_db(actual_session_id)
        if not artifacts:
            logger.error(f"[확장 클러스터링] NeonDB에서 데이터를 찾을 수 없음: session_id={actual_session_id}")
            raise HTTPException(
                status_code=404,
                detail="Precomputed 데이터를 찾을 수 없습니다."
            )
        
        df_precomputed = artifacts.get('data')
        if df_precomputed is None or df_precomputed.empty:
            raise HTTPException(
                status_code=400,
                detail="Precomputed 데이터가 비어있습니다."
            )
        
        logger.info(f"[확장 클러스터링] NeonDB에서 Precomputed 데이터 로드 완료: {len(df_precomputed)}행")
        
        # Precomputed 데이터에서 패널 ID 컬럼 확인
        panel_id_col = 'mb_sn' if 'mb_sn' in df_precomputed.columns else 'panel_id'
        
        if panel_id_col not in df_precomputed.columns:
            raise HTTPException(
                status_code=400,
                detail=f"Precomputed 데이터에 패널 ID 컬럼이 없습니다. (mb_sn 또는 panel_id 필요)"
            )
        
        # 클러스터 컬럼명 확인
        cluster_col = 'cluster'
        has_cluster_col = cluster_col in df_precomputed.columns
        
        # 3. 검색 패널을 Precomputed 데이터에서 직접 매칭 (df_full 제거, NeonDB 데이터만 사용)
        logger.info(f"[3단계] 검색 패널을 Precomputed 데이터에서 직접 매칭 시작")
        logger.info(f"  - 요청된 패널 ID 수: {len(req.search_panel_ids)}개")
        logger.info(f"  - 요청된 패널 ID 샘플: {req.search_panel_ids[:5]}")
        logger.info(f"  - Precomputed 데이터 행 수: {len(df_precomputed)}개")
        
        # Precomputed 데이터의 mb_sn을 정규화하여 매칭 테이블 생성
        df_precomputed_normalized = df_precomputed.copy()
        df_precomputed_normalized['mb_sn_normalized'] = df_precomputed[panel_id_col].astype(str).str.strip().str.lower()
        precomputed_mb_sn_set = set(df_precomputed_normalized['mb_sn_normalized'].values)
        
        logger.info(f"[3단계] Precomputed 매칭 테이블 생성 완료: {len(precomputed_mb_sn_set)}개 고유 패널 ID")
        logger.info(f"[3단계] Precomputed 샘플 키: {list(precomputed_mb_sn_set)[:10]}")
        
        # 검색 패널 ID 정규화 및 매칭
        search_panel_mb_sns = set()
        not_found_panels = []
        found_panels = []
        
        for panel_id in req.search_panel_ids:
            panel_id_normalized = str(panel_id).strip().lower()
            
            if panel_id_normalized in precomputed_mb_sn_set:
                search_panel_mb_sns.add(panel_id_normalized)
                found_panels.append(panel_id)
                logger.debug(f"[✅ 3단계] 매칭 성공: '{panel_id}'")
            else:
                not_found_panels.append(panel_id)
                logger.debug(f"[❌ 3단계] 매칭 실패: '{panel_id}'")
        
        logger.info(f"[3단계 결과]")
        logger.info(f"  - 찾은 패널: {len(found_panels)}개 / {len(req.search_panel_ids)}개")
        logger.info(f"  - 찾지 못한 패널: {len(not_found_panels)}개")
        if found_panels:
            logger.info(f"  - 찾은 패널 샘플: {found_panels[:5]}")
        if not_found_panels:
            logger.warning(f"  - 찾지 못한 패널 샘플: {not_found_panels[:5]}")
        
        # 매칭 실패 시 전체 precomputed 데이터 반환
        if len(search_panel_mb_sns) == 0:
            logger.warning(f"[⚠️ 3단계] 모든 패널을 찾지 못함 - 전체 precomputed 데이터 반환")
            requested_set = set(str(pid).strip().lower() for pid in req.search_panel_ids)
            
            # 전체 precomputed 데이터 반환 (클러스터링 없이)
            logger.info(f"[전체 데이터 반환] precomputed UMAP 데이터 전체 반환")
            
            result_panels = []
            for _, row in df_precomputed.iterrows():
                panel_id = str(row[panel_id_col]).strip()
                panel_id_lower = panel_id.lower()
                is_search = panel_id_lower in requested_set
                
                # cluster 값 (없으면 -1)
                cluster_value = int(row[cluster_col]) if has_cluster_col else -1
                
                result_panels.append({
                    'panel_id': panel_id,
                    'umap_x': float(row['umap_x']),
                    'umap_y': float(row['umap_y']),
                    'cluster': cluster_value,
                    'is_search_result': bool(is_search),
                    'original_cluster': cluster_value
                })
            
            # 원본 클러스터 통계 (cluster 컬럼이 있을 때만)
            cluster_stats = {}
            if has_cluster_col:
                for cluster_id in df_precomputed[cluster_col].unique():
                    cluster_mask = df_precomputed[cluster_col] == cluster_id
                    cluster_panels = [p for p in result_panels if p['cluster'] == cluster_id]
                    search_count = sum(1 for p in cluster_panels if p['is_search_result'])
                    
                    cluster_stats[int(cluster_id)] = {
                        'size': int(cluster_mask.sum()),
                        'percentage': float(cluster_mask.sum() / len(df_precomputed) * 100),
                        'search_count': search_count,
                        'search_percentage': float(search_count / max(1, cluster_mask.sum()) * 100)
                    }
            else:
                logger.warning(f"[전체 데이터 반환] cluster 컬럼이 없어 클러스터 통계를 생성할 수 없습니다.")
            
            return {
                'success': True,
                'session_id': 'precomputed_default',
                'n_total_panels': len(result_panels),
                'n_search_panels': 0,
                'n_extended_panels': 0,
                'n_clusters': len(cluster_stats),
                'silhouette_score': None,
                'panels': result_panels,
                'cluster_stats': cluster_stats,
                'features_used': [],
                'dispersion_warning': False,
                'dispersion_ratio': 1.0,
                'warning': f'검색 패널을 클러스터링 데이터에서 찾을 수 없어 전체 데이터를 표시합니다. 요청된 {len(requested_set)}개 중 0개만 데이터에 존재합니다.'
            }
        
        if len(not_found_panels) > 0:
            logger.warning(f"[⚠️ 3단계 경고] {len(not_found_panels)}개 패널을 찾지 못했습니다. (계속 진행)")
        
        logger.info(f"[✅ 3단계 완료] 검색 패널 매칭 완료: {len(search_panel_mb_sns)}개")
        
        # 4. Precomputed HDBSCAN 결과에서 검색된 패널이 속한 클러스터 찾기 (재클러스터링 없이)
        logger.info(f"[4단계] HDBSCAN 결과에서 검색된 패널의 클러스터 찾기 (재클러스터링 없음)")
        
        # Precomputed 데이터에서 검색된 패널이 속한 클러스터 찾기
        has_cluster_col = cluster_col in df_precomputed.columns
        searched_cluster_ids = set()
        
        if has_cluster_col:
            for _, row in df_precomputed.iterrows():
                panel_id = str(row[panel_id_col]).strip().lower()
                if panel_id in search_panel_mb_sns:
                    cluster_id = int(row[cluster_col])
                    if cluster_id != -1:  # 노이즈 제외
                        searched_cluster_ids.add(cluster_id)
        else:
            logger.warning(f"[4단계] cluster 컬럼이 없어 클러스터 기반 확장을 수행할 수 없습니다.")
        
        logger.info(f"[4단계 완료] 검색된 패널이 속한 클러스터: {sorted(searched_cluster_ids)}")
        
        # 5. 해당 클러스터의 모든 패널 추출 (재클러스터링 없이 HDBSCAN 결과 그대로 사용)
        extended_panel_ids = set()
        if has_cluster_col:
            for _, row in df_precomputed.iterrows():
                panel_id = str(row[panel_id_col]).strip()
                cluster_id = int(row[cluster_col])
                if cluster_id in searched_cluster_ids:
                    extended_panel_ids.add(panel_id.lower())
        else:
            # cluster 컬럼이 없으면 검색된 패널만 포함
            extended_panel_ids = search_panel_mb_sns.copy()
        
        logger.info(f"[HDBSCAN 결과 사용] 재클러스터링 없이 기존 HDBSCAN 결과 사용")
        logger.info(f"  - 검색 패널: {len(search_panel_mb_sns)}개")
        logger.info(f"  - 클러스터 수: {len(searched_cluster_ids)}개")
        logger.info(f"  - 확장 패널: {len(extended_panel_ids)}개")
        
        # 6. 결과 구성 (HDBSCAN 결과 그대로 사용)
        result_panels = []
        
        for _, row in df_precomputed.iterrows():
            panel_id = str(row[panel_id_col]).strip()
            panel_id_lower = panel_id.lower()
            cluster_id = int(row[cluster_col]) if has_cluster_col else -1
            
            # 검색된 패널이 속한 클러스터의 패널만 포함 (또는 cluster 컬럼이 없으면 검색된 패널만)
            if has_cluster_col:
                include_panel = cluster_id in searched_cluster_ids
            else:
                include_panel = panel_id_lower in search_panel_mb_sns
            
            if include_panel:
                is_search = panel_id_lower in search_panel_mb_sns
                
                result_panels.append({
                    'panel_id': panel_id,
                    'umap_x': float(row['umap_x']),
                    'umap_y': float(row['umap_y']),
                    'cluster': cluster_id,  # HDBSCAN 클러스터 ID 그대로 사용
                    'is_search_result': bool(is_search),
                    'original_cluster': cluster_id
                })
        
        # 7. 클러스터별 통계 (HDBSCAN 결과 기반)
        cluster_stats = {}
        for cluster_id in searched_cluster_ids:
            cluster_panels = [p for p in result_panels if p['cluster'] == cluster_id]
            search_count = sum(1 for p in cluster_panels if p['is_search_result'])
            
            cluster_stats[int(cluster_id)] = {
                'size': len(cluster_panels),
                'percentage': float(len(cluster_panels) / len(result_panels) * 100) if result_panels else 0.0,
                'search_count': search_count,
                'search_percentage': float(search_count / max(1, len(cluster_panels)) * 100)
            }
        
        best_k = len(searched_cluster_ids)
        
        # 5. 세션 정보에서 품질 지표 가져오기 (NeonDB에서)
        from app.utils.clustering_loader import load_clustering_session_from_db
        quality_metrics = {}
        try:
            session_data = await load_clustering_session_from_db(actual_session_id)
            if session_data:
                quality_metrics['silhouette_score'] = session_data.get('silhouette_score')
                quality_metrics['davies_bouldin_score'] = session_data.get('davies_bouldin_score')
                quality_metrics['calinski_harabasz_score'] = session_data.get('calinski_harabasz_score')
        except Exception as e:
            logger.warning(f"[품질 지표 로드] 실패: {str(e)}")
        
        logger.info(f"[HDBSCAN 결과 사용 완료] 세션 ID: {actual_session_id}, 클러스터 수: {best_k} (재클러스터링 없음)")
        
        return {
            'success': True,
            'session_id': actual_session_id,
            'n_total_panels': len(result_panels),
            'n_search_panels': len(search_panel_mb_sns),
            'n_extended_panels': len(extended_panel_ids) - len(search_panel_mb_sns),
            'n_clusters': best_k,
            'silhouette_score': quality_metrics.get('silhouette_score'),
            'davies_bouldin_score': quality_metrics.get('davies_bouldin_score'),
            'calinski_harabasz_score': quality_metrics.get('calinski_harabasz_score'),
            'panels': result_panels,
            'cluster_stats': cluster_stats,
            'features_used': [],  # Precomputed 데이터는 피처 정보 없음
            'dispersion_warning': False,
            'dispersion_ratio': 1.0,
            'method': 'HDBSCAN (precomputed from NeonDB, no re-clustering)',
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[확장 클러스터링 오류] {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"확장 클러스터링 실패: {str(e)}"
        )

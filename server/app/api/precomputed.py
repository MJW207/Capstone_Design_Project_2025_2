"""
Precomputed 클러스터링 데이터 로드 API
실시간 클러스터링 대신 미리 계산된 데이터를 제공
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
import pandas as pd
import json
from pathlib import Path
import logging
from typing import Optional, Dict, List, Any

router = APIRouter(prefix="/api/precomputed", tags=["precomputed"])
logger = logging.getLogger(__name__)

# Precomputed 데이터 경로 (프로젝트 루트 기준)
# server/app/api/precomputed.py에서 프로젝트 루트로 이동
import os
PROJECT_ROOT = Path(__file__).resolve().parents[3]  # server/app/api/precomputed.py -> 프로젝트 루트
PRECOMPUTED_DIR = PROJECT_ROOT / 'clustering_data' / 'data' / 'precomputed'

# HDBSCAN 결과를 우선적으로 사용 (최고 성능)
HDBSCAN_CSV = PRECOMPUTED_DIR / 'flc_income_clustering_hdbscan.csv'
HDBSCAN_METADATA_JSON = PRECOMPUTED_DIR / 'flc_income_clustering_hdbscan_metadata.json'

# 기존 파일 (fallback)
CLUSTERING_CSV = PRECOMPUTED_DIR / 'clustering_results.csv'
METADATA_JSON = PRECOMPUTED_DIR / 'clustering_metadata.json'
COMPARISON_JSON = PRECOMPUTED_DIR / 'comparison_results.json'
PROFILES_JSON = PRECOMPUTED_DIR / 'cluster_profiles.json'

logger.info(f"[Precomputed API] 경로 설정: PRECOMPUTED_DIR={PRECOMPUTED_DIR}")
logger.info(f"[Precomputed API] 경로 존재 여부: {PRECOMPUTED_DIR.exists()}")


def _calculate_opportunity_areas(
    comparison_result: Dict[str, Any],
    cluster_a: int,
    cluster_b: int
) -> List[Dict[str, Any]]:
    """
    의향 - 사용 갭 분석을 통한 기회 영역 계산
    
    현재는 예시 데이터를 반환하지만, 실제 데이터가 있으면
    의향 변수와 실제 행동 변수를 비교하여 갭을 계산할 수 있습니다.
    """
    # TODO: 실제 데이터에서 의향-행동 갭을 계산
    # 예: Q5_* (의향) vs 실제 구매/이용 변수 비교
    
    # 예시 기회 영역 데이터
    opportunities = [
        {
            "title": "프리미엄 건강식품 구매의향 - 실제 구매",
            "intentionLabel": "구매의향",
            "actionLabel": "실제 구매",
            "gapPct": 34.0,
            "direction": "positive",
            "description": f"Cluster {cluster_a}이(가) Cluster {cluster_b}보다 34%p 높은 전환율"
        },
        {
            "title": "피트니스 앱 관심 - 유료 구독 전환",
            "intentionLabel": "관심",
            "actionLabel": "유료 구독 전환",
            "gapPct": 28.0,
            "direction": "positive",
            "description": f"Cluster {cluster_a}이(가) Cluster {cluster_b}보다 28%p 높은 전환율"
        },
        {
            "title": "온라인 PT 서비스 인지 - 이용의향",
            "intentionLabel": "인지",
            "actionLabel": "이용의향",
            "gapPct": 22.0,
            "direction": "positive",
            "description": f"Cluster {cluster_a}이(가) Cluster {cluster_b}보다 22%p 높은 전환율"
        }
    ]
    
    return opportunities


@router.get("/clustering")
async def get_precomputed_clustering(sample: Optional[int] = None):
    """
    Precomputed 클러스터링 결과 반환 (HDBSCAN 우선 사용)
    
    Args:
        sample: 샘플링할 포인트 수 (None이면 전체 반환)
    """
    # HDBSCAN 결과를 우선적으로 사용
    csv_path = HDBSCAN_CSV if HDBSCAN_CSV.exists() else CLUSTERING_CSV
    metadata_path = HDBSCAN_METADATA_JSON if HDBSCAN_METADATA_JSON.exists() else METADATA_JSON
    
    logger.info(f"[Precomputed 클러스터링 요청] 사용할 CSV: {csv_path.name}")
    logger.info(f"[Precomputed 클러스터링] 절대 경로: {csv_path.absolute()}")
    logger.debug(f"[Precomputed 클러스터링] CSV 존재 여부: {csv_path.exists()}")
    logger.debug(f"[Precomputed 클러스터링] 디렉토리 존재 여부: {PRECOMPUTED_DIR.exists()}")
    if PRECOMPUTED_DIR.exists():
        logger.debug(f"[Precomputed 클러스터링] 디렉토리 내용: {list(PRECOMPUTED_DIR.iterdir())}")
    
    try:
        if not csv_path.exists():
            error_msg = f"Precomputed 클러스터링 데이터가 없습니다. 경로: {csv_path.absolute()}"
            logger.error(f"[Precomputed 클러스터링 오류] {error_msg}")
            logger.error(f"[Precomputed 클러스터링] 프로젝트 루트: {PROJECT_ROOT}")
            logger.error(f"[Precomputed 클러스터링] PRECOMPUTED_DIR: {PRECOMPUTED_DIR}")
            logger.error(f"[Precomputed 클러스터링] 디렉토리 존재 여부: {PRECOMPUTED_DIR.exists()}")
            if PRECOMPUTED_DIR.exists():
                logger.error(f"[Precomputed 클러스터링] 디렉토리 내용: {list(PRECOMPUTED_DIR.iterdir())}")
            raise HTTPException(
                status_code=404,
                detail=error_msg + " 먼저 HDBSCAN 클러스터링을 실행하세요."
            )
        
        # CSV 로드
        logger.debug(f"[Precomputed 클러스터링] CSV 로드 시작: {csv_path}")
        df = pd.read_csv(csv_path)
        logger.debug(f"[Precomputed 클러스터링] CSV 로드 완료: {len(df)}행, {len(df.columns)}열")
        
        # UMAP 좌표 및 클러스터 정보 추출
        logger.debug(f"[Precomputed 클러스터링] UMAP 데이터 추출 시작")
        umap_data = []
        missing_cols = []
        
        # HDBSCAN은 cluster_hdbscan 컬럼 사용, 기존은 cluster 컬럼 사용
        cluster_col = 'cluster_hdbscan' if 'cluster_hdbscan' in df.columns else 'cluster'
        required_cols = ['umap_x', 'umap_y', cluster_col, 'mb_sn']
        for col in required_cols:
            if col not in df.columns:
                missing_cols.append(col)
        
        if missing_cols:
            error_msg = f"필수 컬럼이 없습니다: {missing_cols}. 존재하는 컬럼: {list(df.columns)[:20]}"
            logger.error(f"[Precomputed 클러스터링 오류] {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
        
        # UMAP 데이터 추출 (전체 데이터 사용, 하지만 메모리 효율적으로)
        logger.debug(f"[Precomputed 클러스터링] UMAP 데이터 추출 시작 (총 {len(df)}행), 클러스터 컬럼: {cluster_col}")
        
        # pandas iterrows()는 느리므로 벡터화된 연산 사용
        try:
            umap_data = [
                {
                    'x': float(x),
                    'y': float(y),
                    'cluster': int(c),
                    'panelId': str(p),
                }
                for x, y, c, p in zip(
                    df['umap_x'].values,
                    df['umap_y'].values,
                    df[cluster_col].values,
                    df['mb_sn'].values
                )
            ]
        except (ValueError, KeyError) as e:
            logger.error(f"[Precomputed 클러스터링] 벡터화 처리 실패, 행 단위 처리로 전환: {str(e)}")
            # 폴백: 행 단위 처리
            umap_data = []
            for idx, row in df.iterrows():
                try:
                    umap_data.append({
                        'x': float(row['umap_x']),
                        'y': float(row['umap_y']),
                        'cluster': int(row[cluster_col]),
                        'panelId': str(row['mb_sn']),
                    })
                except (ValueError, KeyError) as row_err:
                    logger.warning(f"[Precomputed 클러스터링] 행 {idx} 처리 실패: {str(row_err)}")
                    continue
        
        logger.info(f"[Precomputed 클러스터링] UMAP 데이터 추출 완료: {len(umap_data)}개 포인트")
        
        # 샘플링 옵션이 있으면 샘플링
        if sample is not None and sample > 0 and sample < len(umap_data):
            import random
            random.seed(42)  # 재현 가능한 샘플링
            umap_data = random.sample(umap_data, sample)
            logger.info(f"[Precomputed 클러스터링] 샘플링 적용: {len(umap_data)}개 포인트 (요청: {sample}개)")
        
        # 메타데이터 로드
        metadata = {}
        if metadata_path.exists():
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            logger.info(f"[Precomputed 클러스터링] 메타데이터 로드 완료: {metadata_path.name}")
        
        # 클러스터 정보 생성
        clusters = []
        if 'cluster_profiles' in metadata:
            # HDBSCAN 메타데이터 형식
            for cluster_id_str, profile in metadata['cluster_profiles'].items():
                cluster_id = int(cluster_id_str)
                clusters.append({
                    'id': cluster_id,
                    'size': int(profile.get('size', 0)),
                    'percentage': float(profile.get('size_pct', 0.0))
                })
        elif 'cluster_distribution' in metadata:
            # 기존 메타데이터 형식
            for cluster_id, count in metadata['cluster_distribution'].items():
                clusters.append({
                    'id': int(cluster_id),
                    'size': int(count),
                    'percentage': metadata['cluster_percentages'].get(str(cluster_id), 0.0)
                })
        else:
            # 메타데이터가 없으면 CSV에서 계산
            cluster_counts = df[cluster_col].value_counts().to_dict()
            total = len(df)
            for cluster_id, count in cluster_counts.items():
                if cluster_id == -1:  # 노이즈는 제외하거나 별도 처리
                    continue
                clusters.append({
                    'id': int(cluster_id),
                    'size': int(count),
                    'percentage': float(count / total * 100)
                })
        
        # 응답 데이터 구성
        response_data = {
            'success': True,
            'data': {
                'umap_coordinates': umap_data,
                'clusters': clusters,
                'metadata': metadata,
                'n_samples': len(df),
                'n_clusters': len(clusters),
                'method': metadata.get('method', 'Unknown'),
                'silhouette_score': metadata.get('silhouette_score'),
                'davies_bouldin_index': metadata.get('davies_bouldin_index'),
                'calinski_harabasz_index': metadata.get('calinski_harabasz_index'),
                'n_noise': metadata.get('n_noise', 0) if 'cluster_profiles' in metadata else 0
            }
        }
        
        # 응답 크기 확인 및 로깅
        try:
            import sys
            import json as json_module
            test_json = json_module.dumps(response_data, ensure_ascii=False)
            estimated_size_mb = sys.getsizeof(test_json) / (1024 * 1024)
            logger.info(f"[Precomputed 클러스터링] 응답 데이터 크기: {estimated_size_mb:.2f} MB ({len(test_json):,} bytes)")
            
            if estimated_size_mb > 10:
                logger.warning(f"[Precomputed 클러스터링] 응답 데이터가 큽니다 ({estimated_size_mb:.2f} MB). 전송 중 문제가 발생할 수 있습니다.")
        except Exception as size_err:
            logger.warning(f"[Precomputed 클러스터링] 응답 크기 계산 실패: {str(size_err)}")
        
        # JSONResponse 반환 (압축은 FastAPI/uvicorn이 자동으로 처리)
        return JSONResponse(response_data)
    
    except HTTPException:
        raise
    except pd.errors.EmptyDataError as e:
        error_msg = f"CSV 파일이 비어있습니다: {CLUSTERING_CSV}"
        logger.error(f"[Precomputed 클러스터링 오류] {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    except pd.errors.ParserError as e:
        error_msg = f"CSV 파일 파싱 오류: {str(e)}"
        logger.error(f"[Precomputed 클러스터링 오류] {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error(f"[Precomputed 클러스터링 예외 발생] {error_type}: {error_msg}", exc_info=True)
        logger.debug(f"[Precomputed 클러스터링] 예외 발생 위치: CSV={CLUSTERING_CSV}")
        raise HTTPException(
            status_code=500, 
            detail=f"데이터 로드 실패: {error_type} - {error_msg}"
        )


@router.get("/umap")
async def get_precomputed_umap():
    """
    Precomputed UMAP 좌표만 반환
    """
    logger.debug(f"[Precomputed UMAP 요청] CSV 경로: {CLUSTERING_CSV}")
    
    try:
        if not CLUSTERING_CSV.exists():
            error_msg = f"Precomputed 데이터가 없습니다. 경로: {CLUSTERING_CSV.absolute()}"
            logger.error(f"[Precomputed UMAP 오류] {error_msg}")
            raise HTTPException(status_code=404, detail=error_msg)
        
        df = pd.read_csv(CLUSTERING_CSV)
        logger.debug(f"[Precomputed UMAP] CSV 로드 완료: {len(df)}행")
        
        coordinates = []
        panel_ids = []
        labels = []
        
        required_cols = ['umap_x', 'umap_y', 'cluster', 'mb_sn']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            error_msg = f"필수 컬럼이 없습니다: {missing_cols}"
            logger.error(f"[Precomputed UMAP 오류] {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
        
        for idx, row in df.iterrows():
            try:
                coordinates.append([float(row['umap_x']), float(row['umap_y'])])
                panel_ids.append(str(row['mb_sn']))
                labels.append(int(row['cluster']))
            except (ValueError, KeyError) as e:
                logger.warning(f"[Precomputed UMAP] 행 {idx} 처리 실패: {str(e)}")
                continue
        
        logger.debug(f"[Precomputed UMAP] 데이터 추출 완료: {len(coordinates)}개 포인트")
        
        return JSONResponse({
            'coordinates': coordinates,
            'panel_ids': panel_ids,
            'labels': labels
        })
    
    except HTTPException:
        raise
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error(f"[Precomputed UMAP 예외 발생] {error_type}: {error_msg}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"UMAP 데이터 로드 실패: {error_type} - {error_msg}"
        )


@router.get("/comparison/{cluster_a}/{cluster_b}")
async def get_precomputed_comparison(cluster_a: int, cluster_b: int):
    """
    Precomputed 비교 분석 결과 반환
    """
    logger.info(f"[Precomputed 비교 분석 요청] Cluster {cluster_a} vs {cluster_b}")
    logger.debug(f"[Precomputed 비교 분석] JSON 경로: {COMPARISON_JSON}")
    
    try:
        comparison = None
        
        # COMPARISON_JSON이 있으면 먼저 확인
        if COMPARISON_JSON.exists():
            logger.debug(f"[Precomputed 비교 분석] JSON 로드 시작")
            try:
                with open(COMPARISON_JSON, 'r', encoding='utf-8') as f:
                    comparison_data = json.load(f)
                logger.debug(f"[Precomputed 비교 분석] JSON 로드 완료. 비교 쌍 수: {len(comparison_data.get('comparisons', {}))}")
                
                # 클러스터 쌍 찾기 (양방향 검색)
                pair_key1 = f"{cluster_a}_vs_{cluster_b}"
                pair_key2 = f"{cluster_b}_vs_{cluster_a}"
                
                logger.debug(f"[Precomputed 비교 분석] 검색 키: {pair_key1}, {pair_key2}")
                logger.debug(f"[Precomputed 비교 분석] 사용 가능한 키: {list(comparison_data.get('comparisons', {}).keys())[:10]}")
                
                if pair_key1 in comparison_data.get('comparisons', {}):
                    comp = comparison_data['comparisons'][pair_key1]
                    comparison = {
                        'cluster_a': cluster_a,
                        'cluster_b': cluster_b,
                        'comparison': comp.get('comparison', []),
                        'group_a': comp.get('group_a', {}),
                        'group_b': comp.get('group_b', {})
                    }
                    logger.debug(f"[Precomputed 비교 분석] {pair_key1} 찾음")
                elif pair_key2 in comparison_data.get('comparisons', {}):
                    # 방향 반전
                    comp = comparison_data['comparisons'][pair_key2]
                    comparison = {
                        'cluster_a': cluster_a,
                        'cluster_b': cluster_b,
                        'comparison': comp.get('comparison', []),
                        'group_a': comp.get('group_b', {}),
                        'group_b': comp.get('group_a', {})
                    }
                    logger.debug(f"[Precomputed 비교 분석] {pair_key2} 찾음 (방향 반전)")
                
                # 기회 영역 계산 추가
                if comparison is not None:
                    opportunities = _calculate_opportunity_areas(
                        comparison,
                        cluster_a,
                        cluster_b
                    )
                    comparison['opportunities'] = opportunities
            except (json.JSONDecodeError, IOError) as e:
                logger.warning(f"[Precomputed 비교 분석] JSON 로드 실패, 동적 생성으로 전환: {str(e)}")
        
        # 비교 데이터가 없으면 동적으로 생성
        if comparison is None:
            logger.info(f"[Precomputed 비교 분석] 비교 데이터 없음, 동적 생성 시도: {cluster_a} vs {cluster_b}")
            
            try:
                # HDBSCAN CSV 파일 로드
                import pandas as pd
                from app.clustering.compare import compare_groups, CONTINUOUS_FEATURES, BINARY_FEATURES, CATEGORICAL_FEATURES
                
                hdbscan_file = PROJECT_ROOT / 'clustering_data' / 'data' / 'precomputed' / 'flc_income_clustering_hdbscan.csv'
                if not hdbscan_file.exists():
                    error_msg = f"HDBSCAN 데이터 파일을 찾을 수 없습니다: {hdbscan_file}"
                    logger.error(f"[Precomputed 비교 분석 오류] {error_msg}")
                    raise HTTPException(status_code=404, detail=error_msg)
                
                df = pd.read_csv(hdbscan_file)
                cluster_col = 'cluster_hdbscan' if 'cluster_hdbscan' in df.columns else 'cluster'
                
                if cluster_col not in df.columns:
                    error_msg = f"클러스터 컬럼을 찾을 수 없습니다: {cluster_col}"
                    logger.error(f"[Precomputed 비교 분석 오류] {error_msg}")
                    raise HTTPException(status_code=400, detail=error_msg)
                
                labels = df[cluster_col].values
                
                # 비교 분석에 사용할 컬럼 준비 (정규화된 변수 제외, 원본 변수만 사용)
                numeric_cols = []
                for col in CONTINUOUS_FEATURES:
                    # 정규화된 변수는 제외
                    if col.endswith('_scaled'):
                        continue
                    # 원본 변수가 있으면 사용
                    if col in df.columns:
                        numeric_cols.append(col)
                    # Q6_income이 없으면 Q6 확인
                    elif col == "Q6_income" and "Q6" in df.columns:
                        numeric_cols.append("Q6")
                
                # Q8_premium_index는 항상 추가 (이미 있으면, 정규화되지 않은 값)
                if "Q8_premium_index" in df.columns and "Q8_premium_index" not in numeric_cols:
                    numeric_cols.append("Q8_premium_index")
                
                # 추가 원본 변수들
                original_numeric_cols = ['Q8_count', 'Q6_income', 'Q6', 'age', 'children_count']
                for col in original_numeric_cols:
                    if col in df.columns and col not in numeric_cols:
                        if df[col].dtype in ['int64', 'float64'] and df[col].nunique() > 2:
                            numeric_cols.append(col)
                
                binary_cols = []
                for col in BINARY_FEATURES:
                    if col in df.columns and df[col].nunique() <= 2:
                        binary_cols.append(col)
                
                # is_premium_car는 항상 추가 (이미 있으면)
                if "is_premium_car" in df.columns and "is_premium_car" not in binary_cols:
                    binary_cols.append("is_premium_car")
                
                categorical_cols = []
                for col in CATEGORICAL_FEATURES:
                    if col in df.columns:
                        categorical_cols.append(col)
                
                # HDBSCAN CSV에 있는 범주형 변수 추가
                if "life_stage" in df.columns and "life_stage" not in categorical_cols:
                    categorical_cols.append("life_stage")
                if "income_tier" in df.columns and "income_tier" not in categorical_cols:
                    categorical_cols.append("income_tier")
                
                logger.debug(f"[Precomputed 비교 분석] 동적 생성 - 연속형: {len(numeric_cols)}, 이진: {len(binary_cols)}, 범주형: {len(categorical_cols)}")
                
                # 비교 분석 수행
                comparison_result = compare_groups(
                    df,
                    labels,
                    cluster_a,
                    cluster_b,
                    bin_cols=binary_cols,
                    cat_cols=categorical_cols,
                    num_cols=numeric_cols
                )
                
                comparison = {
                    'cluster_a': cluster_a,
                    'cluster_b': cluster_b,
                    'comparison': comparison_result.get('comparison', []),
                    'group_a': comparison_result.get('group_a', {}),
                    'group_b': comparison_result.get('group_b', {})
                }
                
                # 기회 영역 계산 추가
                opportunities = _calculate_opportunity_areas(
                    comparison,
                    cluster_a,
                    cluster_b
                )
                comparison['opportunities'] = opportunities
                
                logger.info(f"[Precomputed 비교 분석] 동적 생성 완료: {len(comparison.get('comparison', []))}개 항목")
                
            except HTTPException:
                raise
            except Exception as e:
                error_type = type(e).__name__
                error_msg = str(e)
                logger.error(f"[Precomputed 비교 분석 동적 생성 실패] {error_type}: {error_msg}", exc_info=True)
                raise HTTPException(
                    status_code=500,
                    detail=f"비교 분석 동적 생성 실패: {error_type} - {error_msg}"
                )
        
        # 최종 검증: comparison이 여전히 None이면 에러
        if comparison is None:
            error_msg = f"Cluster {cluster_a} vs {cluster_b} 비교 데이터를 생성할 수 없습니다."
            logger.error(f"[Precomputed 비교 분석 오류] {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)
        
        logger.debug(f"[Precomputed 비교 분석] 비교 항목 수: {len(comparison.get('comparison', []))}")
        
        # 기회 영역이 없으면 추가
        if comparison is not None and 'opportunities' not in comparison:
            opportunities = _calculate_opportunity_areas(
                comparison,
                cluster_a,
                cluster_b
            )
            comparison['opportunities'] = opportunities
        
        return JSONResponse({
            'success': True,
            'data': comparison
        })
    
    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        error_msg = f"JSON 파싱 오류: {str(e)}"
        logger.error(f"[Precomputed 비교 분석 오류] {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error(f"[Precomputed 비교 분석 예외 발생] {error_type}: {error_msg}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"비교 분석 데이터 로드 실패: {error_type} - {error_msg}"
        )


@router.get("/profiles")
async def get_precomputed_profiles():
    """
    Precomputed 클러스터 프로필 반환 (NeonDB 우선 사용)
    """
    logger.info(f"[Precomputed 프로필 요청] NeonDB에서 프로필 로드 시도")
    
    try:
        # 1. NeonDB에서 프로필 로드 시도
        from app.utils.clustering_loader import get_precomputed_session_id, load_cluster_profiles_from_db
        
        precomputed_name = "hdbscan_default"
        session_id = await get_precomputed_session_id(precomputed_name)
        
        if session_id:
            logger.info(f"[Precomputed 프로필] Precomputed 세션 ID 찾음: {session_id}")
            profiles = await load_cluster_profiles_from_db(session_id)
            
            if profiles and len(profiles) > 0:
                logger.info(f"[Precomputed 프로필] NeonDB에서 {len(profiles)}개 프로필 로드 성공")
                
                # 디버깅: 첫 번째 프로필의 데이터 구조 확인
                if profiles:
                    first_profile = profiles[0]
                    logger.info(f"[Precomputed 프로필] 첫 번째 프로필 샘플: cluster={first_profile.get('cluster')}, "
                              f"name={first_profile.get('name')}, "
                              f"insights_count={len(first_profile.get('insights', []))}, "
                              f"tags_count={len(first_profile.get('tags', []))}, "
                              f"insights_by_category={bool(first_profile.get('insights_by_category'))}, "
                              f"segments={bool(first_profile.get('segments'))}")
                
                # 프론트엔드 형식으로 변환
                formatted_profiles = []
                for profile in profiles:
                    formatted_profile = {
                        'cluster': profile.get('cluster', -1),
                        'size': profile.get('size', 0),
                        'percentage': profile.get('percentage', 0.0),
                        'name': profile.get('name'),
                        'tags': profile.get('tags', []),
                        'distinctive_features': profile.get('distinctive_features', []),
                        'insights': profile.get('insights', []),
                        'insights_by_category': profile.get('insights_by_category', {}),
                        'segments': profile.get('segments', {}),
                        'features': profile.get('features', {}),
                    }
                    formatted_profiles.append(formatted_profile)
                    # 디버깅: 각 프로필의 insights 확인
                    if formatted_profile['insights']:
                        logger.debug(f"[Precomputed 프로필] cluster={formatted_profile['cluster']} insights: {formatted_profile['insights'][:2]}")
                
                return JSONResponse({
                    'success': True,
                    'data': formatted_profiles,
                    'source': 'neondb'
                })
            else:
                logger.warning(f"[Precomputed 프로필] NeonDB에서 프로필 데이터 없음, 파일 시스템 fallback 시도")
        else:
            logger.warning(f"[Precomputed 프로필] Precomputed 세션을 찾을 수 없음, 파일 시스템 fallback 시도")
        
        # 2. Fallback: 파일 시스템에서 로드 (기존 로직)
        profiles_path = HDBSCAN_METADATA_JSON if HDBSCAN_METADATA_JSON.exists() else PROFILES_JSON
        
        logger.info(f"[Precomputed 프로필] 파일 시스템 fallback: {profiles_path.name}")
        logger.debug(f"[Precomputed 프로필] JSON 존재 여부: {profiles_path.exists()}")
        
        if not profiles_path.exists():
            error_msg = f"프로필 데이터를 찾을 수 없습니다. NeonDB와 파일 시스템 모두 확인하세요."
            logger.error(f"[Precomputed 프로필] {error_msg}")
            raise HTTPException(status_code=404, detail=error_msg)
        
        try:
            if HDBSCAN_METADATA_JSON.exists():
                # HDBSCAN 메타데이터에서 프로필 추출
                logger.info(f"[Precomputed 프로필] HDBSCAN 메타데이터에서 프로필 추출 시도")
                logger.debug(f"[Precomputed 프로필] HDBSCAN 메타데이터 경로: {HDBSCAN_METADATA_JSON.absolute()}")
                with open(HDBSCAN_METADATA_JSON, 'r', encoding='utf-8') as f:
                    hdbscan_metadata = json.load(f)
                
                logger.debug(f"[Precomputed 프로필] HDBSCAN 메타데이터 키: {list(hdbscan_metadata.keys())[:10]}")
                logger.debug(f"[Precomputed 프로필] cluster_profiles 존재 여부: {'cluster_profiles' in hdbscan_metadata}")
                
                if 'cluster_profiles' in hdbscan_metadata:
                    logger.info(f"[Precomputed 프로필] HDBSCAN cluster_profiles 발견, 프로필 생성 시작")
                    # HDBSCAN 프로필 형식을 프론트엔드 형식으로 변환
                    cluster_profiles_raw = hdbscan_metadata['cluster_profiles']
                    
                    # 1. 전체 평균값 계산 (distinctive_features 생성을 위해)
                    feature_keys = ['avg_age', 'avg_income', 'college_graduate_rate', 'has_children_rate', 
                                   'avg_electronics_count', 'avg_premium_index', 'premium_car_rate', 'metro_rate']
                    overall_averages = {}
                    for key in feature_keys:
                        values = []
                        for cluster_id_str, profile in cluster_profiles_raw.items():
                            val = profile.get(key)
                            if val is not None:
                                values.append(float(val))
                        if values:
                            overall_averages[key] = sum(values) / len(values)
                    
                    # 2. 생애주기 라벨 매핑
                    life_stage_labels = {
                        1: 'Young Singles',
                        2: 'DINK',
                        3: 'Young Parents',
                        4: 'Mature Parents',
                        5: 'Middle Age',
                        6: 'Seniors'
                    }
                    
                    # 3. 클러스터별 사전 정의된 이름 (HDBSCAN 분석 문서 기반)
                    cluster_names = {
                        0: "프리미엄 젊은 싱글",
                        1: "실속형 젊은 싱글",
                        2: "중년 무자녀 저소득",
                        3: "프리미엄 DINK",
                        4: "중년 무자녀 고소득",
                        5: "혼합형 중고소득",
                        6: "시니어 저소득",
                        7: "젊은 부모 저소득",
                        8: "프리미엄 젊은 부모",
                        9: "DINK 중소득",
                        10: "프리미엄 시니어",
                        11: "중년 부모 저소득",
                        12: "중년 무자녀 저소득",
                        13: "시니어 저소득",
                        14: "젊은 부모 저소득",
                        15: "중년 부모 저소득",
                        16: "프리미엄 중년 부모",
                        17: "DINK 저소득",
                        18: "젊은 싱글 저소득"
                    }
                    
                    # 4. 각 클러스터별로 프로필 구성
                    profiles_list = []
                    for cluster_id_str, profile in cluster_profiles_raw.items():
                        cluster_id = int(cluster_id_str)
                        
                        # features 객체 생성
                        features = {
                            'avg_age': profile.get('avg_age', 0),
                            'avg_income': profile.get('avg_income', 0),
                            'college_graduate_rate': profile.get('college_graduate_rate', 0),
                            'has_children_rate': profile.get('has_children_rate', 0),
                            'avg_electronics_count': profile.get('avg_electronics_count', 0),
                            'avg_premium_index': profile.get('avg_premium_index', 0),
                            'premium_car_rate': profile.get('premium_car_rate', 0),
                            'metro_rate': profile.get('metro_rate', 0),
                        }
                        
                        # distinctive_features 계산 (전체 평균 대비 차이)
                        distinctive_features = []
                        for key in feature_keys:
                            cluster_value = profile.get(key)
                            overall_avg = overall_averages.get(key)
                            if cluster_value is not None and overall_avg is not None:
                                cluster_value = float(cluster_value)
                                overall_avg = float(overall_avg)
                                diff = cluster_value - overall_avg
                                diff_percent = (diff / overall_avg * 100) if overall_avg != 0 else 0
                                
                                # 차이가 10% 이상이면 특징적인 피처로 간주
                                if abs(diff_percent) >= 10:
                                    distinctive_features.append({
                                        'feature': key,
                                        'value': cluster_value,
                                        'overall': overall_avg,
                                        'diff': diff,
                                        'diff_percent': diff_percent,
                                        'effect_size': diff / overall_avg if overall_avg != 0 else 0,
                                        'lift': cluster_value / overall_avg if overall_avg != 0 else 1.0
                                    })
                        
                        # 차이가 큰 순서로 정렬
                        distinctive_features.sort(key=lambda x: abs(x['diff_percent']), reverse=True)
                        
                        # name 생성 (사전 정의된 이름 사용)
                        name = cluster_names.get(cluster_id, f"군집 {cluster_id}")
                        
                        # tags 생성 (클러스터별 특징 기반)
                        tags = []
                        top_income_tier = profile.get('top_income_tier', '')
                        top_life_stage = profile.get('top_life_stage')
                        avg_age = profile.get('avg_age', 0)
                        avg_income = profile.get('avg_income', 0)
                        college_rate = profile.get('college_graduate_rate', 0)
                        premium_car_rate = profile.get('premium_car_rate', 0)
                        premium_index = profile.get('avg_premium_index', 0)
                        metro_rate = profile.get('metro_rate', 0)
                        electronics_count = profile.get('avg_electronics_count', 0)
                        has_children_rate = profile.get('has_children_rate', 0)
                        
                        # 소득 계층 태그
                        if top_income_tier == 'high':
                            tags.append('고소득')
                        elif top_income_tier == 'mid':
                            tags.append('중소득')
                        elif top_income_tier == 'low':
                            tags.append('저소득')
                        
                        # 생애주기 태그
                        if top_life_stage:
                            life_stage_name = life_stage_labels.get(top_life_stage, '')
                            if life_stage_name == 'Young Singles':
                                tags.append('젊은 싱글')
                            elif life_stage_name == 'DINK':
                                tags.append('DINK')
                            elif life_stage_name == 'Young Parents':
                                tags.append('젊은 부모')
                            elif life_stage_name == 'Mature Parents':
                                tags.append('중년 부모')
                            elif life_stage_name == 'Middle Age':
                                tags.append('중년 무자녀')
                            elif life_stage_name == 'Seniors':
                                tags.append('시니어')
                        
                        # 특별한 특징 태그
                        if premium_car_rate >= 0.5:
                            tags.append('프리미엄차 보유')
                        elif premium_car_rate > 0:
                            tags.append('프리미엄차 일부 보유')
                        
                        if premium_index > overall_averages.get('avg_premium_index', 0) * 1.2:
                            tags.append('프리미엄 제품 선호')
                        elif premium_index < overall_averages.get('avg_premium_index', 0) * 0.8:
                            tags.append('실속형 소비')
                        
                        if metro_rate > 0.65:
                            tags.append('수도권 집중')
                        elif metro_rate > 0.55:
                            tags.append('수도권 거주')
                        
                        if college_rate > 0.75:
                            tags.append('고학력')
                        elif college_rate < 0.4:
                            tags.append('중저학력')
                        
                        if has_children_rate >= 0.95:
                            tags.append('자녀 보유')
                        elif has_children_rate == 0:
                            tags.append('무자녀')
                        
                        if electronics_count > overall_averages.get('avg_electronics_count', 0) * 1.2:
                            tags.append('전자제품 다수 보유')
                        elif electronics_count < overall_averages.get('avg_electronics_count', 0) * 0.8:
                            tags.append('전자제품 적게 보유')
                        
                        # 클러스터별 특별 태그
                        if cluster_id == 5:
                            tags.append('혼합형')
                        elif cluster_id == 16:
                            tags.append('최대 군집')
                        elif cluster_id == 18:
                            tags.append('최대 군집')
                        
                        # insights 생성 (분석 문서 기반 상세 인사이트)
                        insights = []
                        size_pct = profile.get('size_pct', 0)
                        size = profile.get('size', 0)
                        
                        # 기본 정보
                        if size_pct >= 10:
                            insights.append(f"전체의 {size_pct:.1f}%를 차지하는 대형 군집 ({size:,}명)")
                        elif size_pct >= 5:
                            insights.append(f"전체의 {size_pct:.1f}%를 차지하는 중형 군집 ({size:,}명)")
                        else:
                            insights.append(f"전체의 {size_pct:.1f}%를 차지하는 소형 군집 ({size:,}명)")
                        
                        # 연령 및 소득 정보
                        insights.append(f"평균 연령 {avg_age:.1f}세, 평균 소득 {avg_income:.0f}만원")
                        
                        # 대졸 비율
                        if college_rate > 0.75:
                            insights.append(f"대졸 이상 비율이 {college_rate*100:.1f}%로 매우 높음")
                        elif college_rate < 0.45:
                            insights.append(f"대졸 이상 비율이 {college_rate*100:.1f}%로 낮음")
                        
                        # 자녀 정보
                        if has_children_rate >= 0.95:
                            avg_children = profile.get('avg_children_count', 0)
                            if avg_children > 0:
                                insights.append(f"자녀 보유율 {has_children_rate*100:.0f}%, 평균 자녀 수 {avg_children:.1f}명")
                            else:
                                insights.append(f"자녀 보유율 {has_children_rate*100:.0f}%")
                        elif has_children_rate == 0:
                            insights.append("무자녀")
                        
                        # 프리미엄 제품 소비
                        if premium_car_rate >= 0.5:
                            insights.append(f"프리미엄 차량 보유율 {premium_car_rate*100:.0f}%로 매우 높음")
                        elif premium_index > overall_averages.get('avg_premium_index', 0) * 1.2:
                            insights.append(f"프리미엄 제품 지수 {premium_index:.3f}로 프리미엄 제품 선호도 높음")
                        elif premium_index < overall_averages.get('avg_premium_index', 0) * 0.7:
                            insights.append(f"프리미엄 제품 지수 {premium_index:.3f}로 실속형 소비 성향")
                        
                        # 전자제품 수
                        if electronics_count > overall_averages.get('avg_electronics_count', 0) * 1.2:
                            insights.append(f"전자제품 수 {electronics_count:.1f}개로 평균보다 많음")
                        elif electronics_count < overall_averages.get('avg_electronics_count', 0) * 0.8:
                            insights.append(f"전자제품 수 {electronics_count:.1f}개로 평균보다 적음")
                        
                        # 수도권 거주
                        if metro_rate > 0.65:
                            insights.append(f"수도권 거주율 {metro_rate*100:.1f}%로 높음")
                        elif metro_rate < 0.5:
                            insights.append(f"수도권 거주율 {metro_rate*100:.1f}%로 낮음")
                        
                        # 클러스터별 특별 인사이트
                        if cluster_id == 5:
                            std_age = profile.get('std_age', 0)
                            if std_age > 10:
                                insights.append(f"연령 표준편차 {std_age:.1f}세로 다양한 연령대 혼재")
                            insights.append("프리미엄 차량 보유율 100%로 매우 특이함")
                        elif cluster_id == 16:
                            insights.append("가장 큰 군집 중 하나로 프리미엄 중년 부모층의 대표 그룹")
                        elif cluster_id == 18:
                            insights.append("가장 큰 군집으로 저소득 젊은 싱글층의 대표 그룹")
                        
                        # 최종 프로필 객체
                        profiles_list.append({
                            'cluster': cluster_id,
                            'size': profile.get('size', 0),
                            'size_pct': profile.get('size_pct', 0.0),
                            'features': features,
                            'distinctive_features': distinctive_features[:5],  # 상위 5개만
                            'name': name,
                            'tags': tags,
                            'insights': insights,
                            # 기존 필드도 유지 (하위 호환성)
                            'avg_age': profile.get('avg_age'),
                            'avg_income': profile.get('avg_income'),
                            'college_graduate_rate': profile.get('college_graduate_rate'),
                            'has_children_rate': profile.get('has_children_rate'),
                            'avg_electronics_count': profile.get('avg_electronics_count'),
                            'avg_premium_index': profile.get('avg_premium_index'),
                            'premium_car_rate': profile.get('premium_car_rate'),
                            'top_life_stage': profile.get('top_life_stage'),
                            'top_income_tier': profile.get('top_income_tier'),
                            'metro_rate': profile.get('metro_rate'),
                        })
                    
                    logger.info(f"[Precomputed 프로필] HDBSCAN 프로필 생성 완료: {len(profiles_list)}개 클러스터")
                    logger.debug(f"[Precomputed 프로필] 첫 번째 프로필 샘플: {profiles_list[0] if profiles_list else 'None'}")
                    
                    return JSONResponse({
                        'success': True,
                        'data': profiles_list,
                        'method': 'HDBSCAN',
                        'metadata': {
                            'silhouette_score': hdbscan_metadata.get('silhouette_score'),
                            'davies_bouldin_index': hdbscan_metadata.get('davies_bouldin_index'),
                            'n_clusters': hdbscan_metadata.get('n_clusters'),
                            'n_noise': hdbscan_metadata.get('n_noise')
                        }
                    })
                else:
                    logger.warning(f"[Precomputed 프로필] HDBSCAN 메타데이터에 cluster_profiles 키가 없음. 기존 프로필 파일 사용")
        except Exception as e:
            logger.error(f"[Precomputed 프로필] 파일 시스템 fallback 중 오류: {str(e)}", exc_info=True)
            # 오류가 발생해도 계속 진행 (빈 응답 반환)
        
        # 기존 프로필 파일 사용
        if not PROFILES_JSON.exists():
            error_msg = f"Precomputed 클러스터 프로필 데이터가 없습니다. 경로: {PROFILES_JSON.absolute()}"
            logger.warning(f"[Precomputed 프로필] {error_msg}")
            logger.debug(f"[Precomputed 프로필] 디렉토리 존재 여부: {PROFILES_JSON.parent.exists()}")
            # 프로필이 없어도 빈 응답 반환 (다른 데이터는 있으므로)
            return JSONResponse({
                'success': True,
                'data': [],
                'message': '프로필 데이터가 없습니다. 클러스터링은 정상적으로 완료되었습니다.'
            })
        
        logger.debug(f"[Precomputed 프로필] JSON 로드 시작")
        with open(PROFILES_JSON, 'r', encoding='utf-8') as f:
            profiles_data = json.load(f)
        logger.debug(f"[Precomputed 프로필] JSON 로드 완료")
        
        if isinstance(profiles_data, dict) and 'data' in profiles_data:
            logger.debug(f"[Precomputed 프로필] 프로필 수: {len(profiles_data.get('data', []))}")
        else:
            logger.warning(f"[Precomputed 프로필] 예상치 못한 데이터 형식: {type(profiles_data)}")
        
        return JSONResponse(profiles_data)
    
    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        error_msg = f"JSON 파싱 오류: {str(e)}"
        logger.error(f"[Precomputed 프로필 오류] {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error(f"[Precomputed 프로필 예외 발생] {error_type}: {error_msg}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"프로필 데이터 로드 실패: {error_type} - {error_msg}"
        )


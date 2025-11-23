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

# Precomputed 데이터는 NeonDB에서만 로드 (파일 시스템 fallback 제거)
# clustering_data 폴더는 더 이상 사용하지 않음


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
    Precomputed 클러스터링 결과 반환 (NeonDB에서 로드)
    
    Args:
        sample: 샘플링할 포인트 수 (None이면 전체 반환)
    """
    logger.info(f"[Precomputed 클러스터링 요청] NeonDB에서 로드 시작, sample={sample}")
    
    try:
        from app.utils.clustering_loader import get_precomputed_session_id, load_full_clustering_data_from_db
        
        # 1. Precomputed 세션 ID 조회
        precomputed_name = "hdbscan_default"
        logger.debug(f"[Precomputed 클러스터링] Precomputed 세션 ID 조회: name={precomputed_name}")
        session_id = await get_precomputed_session_id(precomputed_name)
        
        if not session_id:
            error_msg = f"Precomputed 세션을 찾을 수 없습니다: {precomputed_name}. 먼저 데이터를 NeonDB에 마이그레이션하세요."
            logger.error(f"[Precomputed 클러스터링 오류] {error_msg}")
            raise HTTPException(status_code=404, detail=error_msg)
        
        logger.info(f"[Precomputed 클러스터링] Precomputed 세션 ID 찾음: {session_id}")
        
        # 2. 전체 클러스터링 데이터 로드
        artifacts = await load_full_clustering_data_from_db(session_id)
        if not artifacts:
            error_msg = f"NeonDB에서 클러스터링 데이터를 찾을 수 없습니다: {session_id}. 먼저 데이터를 마이그레이션하세요."
            logger.error(f"[Precomputed 클러스터링 오류] {error_msg}")
            raise HTTPException(status_code=404, detail=error_msg)
        
        logger.info(f"[Precomputed 클러스터링] NeonDB에서 데이터 로드 완료: {len(artifacts.get('data', []))}행")
        
        # 3. 데이터 추출
        df = artifacts.get('data')
        if df is None or df.empty:
            error_msg = "데이터가 비어있습니다."
            logger.error(f"[Precomputed 클러스터링 오류] {error_msg}")
            raise HTTPException(status_code=404, detail=error_msg)
        
        # 4. UMAP 좌표 및 클러스터 정보 추출
        logger.debug(f"[Precomputed 클러스터링] UMAP 데이터 추출 시작: {len(df)}행")
        
        required_cols = ['umap_x', 'umap_y', 'cluster', 'mb_sn']
        missing_cols = [col for col in required_cols if col not in df.columns]
        
        if missing_cols:
            error_msg = f"필수 컬럼이 없습니다: {missing_cols}. 존재하는 컬럼: {list(df.columns)[:20]}"
            logger.error(f"[Precomputed 클러스터링 오류] {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
        
        # UMAP 데이터 추출
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
                    df['cluster'].values,
                    df['mb_sn'].values
                )
            ]
        except (ValueError, KeyError) as e:
            logger.error(f"[Precomputed 클러스터링] 벡터화 처리 실패, 행 단위 처리로 전환: {str(e)}")
            umap_data = []
            for idx, row in df.iterrows():
                try:
                    umap_data.append({
                        'x': float(row['umap_x']),
                        'y': float(row['umap_y']),
                        'cluster': int(row['cluster']),
                        'panelId': str(row['mb_sn']),
                    })
                except (ValueError, KeyError) as row_err:
                    logger.warning(f"[Precomputed 클러스터링] 행 {idx} 처리 실패: {str(row_err)}")
                    continue
        
        logger.info(f"[Precomputed 클러스터링] UMAP 데이터 추출 완료: {len(umap_data)}개 포인트")
        
        # 5. 샘플링 옵션이 있으면 샘플링
        if sample is not None and sample > 0 and sample < len(umap_data):
            import random
            random.seed(42)
            umap_data = random.sample(umap_data, sample)
            logger.info(f"[Precomputed 클러스터링] 샘플링 적용: {len(umap_data)}개 포인트 (요청: {sample}개)")
        
        # 6. 메타데이터 추출
        meta = artifacts.get('meta', {})
        result_meta = meta.get('result_meta', {})
        
        metadata = {
            'method': result_meta.get('algorithm', 'HDBSCAN'),
            'silhouette_score': result_meta.get('silhouette_score'),
            'davies_bouldin_index': result_meta.get('davies_bouldin_score'),
            'calinski_harabasz_index': result_meta.get('calinski_harabasz_score'),
            'n_clusters': result_meta.get('n_clusters'),
            'n_samples': result_meta.get('n_samples'),
        }
        
        # 7. 클러스터 정보 생성
        cluster_counts = df['cluster'].value_counts().to_dict()
        total = len(df)
        clusters = []
        for cluster_id, count in cluster_counts.items():
            if cluster_id == -1:  # 노이즈는 제외
                continue
            clusters.append({
                'id': int(cluster_id),
                'size': int(count),
                'percentage': float(count / total * 100)
            })
        
        # 8. 응답 데이터 구성
        response_data = {
            'success': True,
            'data': {
                'umap_coordinates': umap_data,
                'clusters': clusters,
                'metadata': metadata,
                'n_samples': len(df),
                'n_clusters': len(clusters),
                'method': metadata.get('method', 'HDBSCAN'),
                'silhouette_score': metadata.get('silhouette_score'),
                'davies_bouldin_index': metadata.get('davies_bouldin_index'),
                'calinski_harabasz_index': metadata.get('calinski_harabasz_index'),
                'n_noise': int(cluster_counts.get(-1, 0))
            }
        }
        
        logger.info(f"[Precomputed 클러스터링] 응답 데이터 구성 완료: {len(umap_data)}개 포인트, {len(clusters)}개 클러스터")
        
        return JSONResponse(response_data)
    
    except HTTPException:
        raise
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error(f"[Precomputed 클러스터링 예외 발생] {error_type}: {error_msg}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"데이터 로드 실패: {error_type} - {error_msg}"
        )


# 파일 시스템 fallback 함수 제거됨 - NeonDB만 사용


@router.get("/umap")
async def get_precomputed_umap():
    """
    Precomputed UMAP 좌표만 반환 (NeonDB에서 로드)
    """
    logger.info(f"[Precomputed UMAP 요청] NeonDB에서 로드 시작")
    
    try:
        from app.utils.clustering_loader import get_precomputed_session_id, load_full_clustering_data_from_db
        
        # Precomputed 세션 ID 조회
        precomputed_name = "hdbscan_default"
        session_id = await get_precomputed_session_id(precomputed_name)
        
        if not session_id:
            error_msg = f"Precomputed 세션을 찾을 수 없습니다: {precomputed_name}. 먼저 데이터를 NeonDB에 마이그레이션하세요."
            logger.error(f"[Precomputed UMAP 오류] {error_msg}")
            raise HTTPException(status_code=404, detail=error_msg)
        
        # NeonDB에서 데이터 로드
        artifacts = await load_full_clustering_data_from_db(session_id)
        if not artifacts or 'data' not in artifacts:
            error_msg = f"NeonDB에서 클러스터링 데이터를 찾을 수 없습니다: {session_id}"
            logger.error(f"[Precomputed UMAP 오류] {error_msg}")
            raise HTTPException(status_code=404, detail=error_msg)
        
        df = artifacts['data']
        logger.debug(f"[Precomputed UMAP] 데이터 로드 완료: {len(df)}행")
        
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
    우선순위: NeonDB > JSON 파일 > 동적 생성
    """
    logger.info(f"[Precomputed 비교 분석 요청] Cluster {cluster_a} vs {cluster_b}")
    
    try:
        comparison = None
        
        # 1. NeonDB에서 먼저 조회 시도
        try:
            from app.db.session import get_session
            from sqlalchemy import text
            import uuid
            
            # Precomputed 세션 ID 생성 (hdbscan_default)
            precomputed_name = "hdbscan_default"
            session_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, f"precomputed_{precomputed_name}")
            session_id = str(session_uuid)
            
            async for session in get_session():
                # 양방향 검색 (cluster_a vs cluster_b 또는 cluster_b vs cluster_a, merged 스키마 사용)
                result = await session.execute(
                    text("""
                        SELECT comparison_data 
                        FROM merged.cluster_comparisons 
                        WHERE session_id = :session_id 
                        AND ((cluster_a = :cluster_a AND cluster_b = :cluster_b)
                             OR (cluster_a = :cluster_b AND cluster_b = :cluster_a))
                        LIMIT 1
                    """),
                    {
                        "session_id": session_id,
                        "cluster_a": cluster_a,
                        "cluster_b": cluster_b
                    }
                )
                row = result.fetchone()
                
                if row:
                    comparison_data = row[0]  # JSONB는 dict로 자동 변환됨
                    
                    # 방향 확인 및 조정
                    if comparison_data.get('group_a', {}).get('id') == cluster_b:
                        # 방향 반전 필요
                        comparison = {
                            'cluster_a': cluster_a,
                            'cluster_b': cluster_b,
                            'comparison': comparison_data.get('comparison', []),
                            'group_a': comparison_data.get('group_b', {}),
                            'group_b': comparison_data.get('group_a', {}),
                            'highlights': comparison_data.get('highlights', {})
                        }
                    else:
                        comparison = {
                            'cluster_a': cluster_a,
                            'cluster_b': cluster_b,
                            'comparison': comparison_data.get('comparison', []),
                            'group_a': comparison_data.get('group_a', {}),
                            'group_b': comparison_data.get('group_b', {}),
                            'highlights': comparison_data.get('highlights', {})
                        }
                    
                    logger.info(f"[Precomputed 비교 분석] NeonDB에서 로드 완료: {len(comparison.get('comparison', []))}개 항목")
                    break
        except Exception as e:
            logger.debug(f"[Precomputed 비교 분석] NeonDB 조회 실패: {str(e)}")
        
        # 2. NeonDB에 없으면 동적으로 생성
        if comparison is None:
            logger.info(f"[Precomputed 비교 분석] 비교 데이터 없음, 동적 생성 시도: {cluster_a} vs {cluster_b}")
            
            try:
                # NeonDB에서 데이터 로드하여 동적 생성
                from app.utils.clustering_loader import get_precomputed_session_id, load_full_clustering_data_from_db
                import pandas as pd
                from app.clustering.compare import compare_groups, CONTINUOUS_FEATURES, BINARY_FEATURES, CATEGORICAL_FEATURES
                
                # Precomputed 세션 ID 조회
                precomputed_name = "hdbscan_default"
                session_id = await get_precomputed_session_id(precomputed_name)
                
                if not session_id:
                    error_msg = f"Precomputed 세션을 찾을 수 없습니다: {precomputed_name}. 먼저 데이터를 NeonDB에 마이그레이션하세요."
                    logger.error(f"[Precomputed 비교 분석 오류] {error_msg}")
                    raise HTTPException(status_code=404, detail=error_msg)
                
                # NeonDB에서 데이터 로드
                artifacts = await load_full_clustering_data_from_db(session_id)
                if not artifacts or 'data' not in artifacts:
                    error_msg = f"NeonDB에서 클러스터링 데이터를 찾을 수 없습니다: {session_id}"
                    logger.error(f"[Precomputed 비교 분석 오류] {error_msg}")
                    raise HTTPException(status_code=404, detail=error_msg)
                
                df = artifacts['data']
                
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
    Precomputed 클러스터 프로필 반환 (NeonDB에서 로드)
    """
    logger.info(f"[Precomputed 프로필 요청] NeonDB에서 로드 시작")
    
    try:
        from app.utils.clustering_loader import get_precomputed_session_id, load_cluster_profiles_from_db
        
        # 1. Precomputed 세션 ID 조회
        precomputed_name = "hdbscan_default"
        logger.debug(f"[Precomputed 프로필] Precomputed 세션 ID 조회: name={precomputed_name}")
        session_id = await get_precomputed_session_id(precomputed_name)
        
        if not session_id:
            error_msg = f"Precomputed 세션을 찾을 수 없습니다: name={precomputed_name}. NeonDB에 데이터가 마이그레이션되었는지 확인하세요."
            logger.error(f"[Precomputed 프로필 오류] {error_msg}")
            raise HTTPException(status_code=404, detail=error_msg)
        
        logger.info(f"[Precomputed 프로필] Precomputed 세션 ID 찾음: {session_id}")
        
        # 2. 프로필 로드
        profiles = await load_cluster_profiles_from_db(session_id)
        if profiles is None:
            error_msg = f"NeonDB에서 프로필 데이터를 찾을 수 없습니다: session_id={session_id}. 데이터가 올바르게 저장되었는지 확인하세요."
            logger.error(f"[Precomputed 프로필 오류] {error_msg}")
            raise HTTPException(status_code=404, detail=error_msg)
        
        if not profiles:
            logger.warning(f"[Precomputed 프로필] 프로필 데이터가 비어있음")
            return JSONResponse({
                'success': True,
                'data': [],
                'message': '프로필 데이터가 없습니다. 클러스터링은 정상적으로 완료되었습니다.'
            })
        
        logger.info(f"[Precomputed 프로필] NeonDB에서 프로필 로드 완료: {len(profiles)}개 프로필")
        
        # 3. 세션 정보에서 메타데이터 추출
        from app.utils.clustering_loader import load_clustering_session_from_db
        session_data = await load_clustering_session_from_db(session_id)
        
        metadata = {}
        if session_data:
            metadata = {
                'silhouette_score': session_data.get('silhouette_score'),
                'davies_bouldin_index': session_data.get('davies_bouldin_score'),
                'n_clusters': session_data.get('n_clusters'),
                'n_noise': 0  # TODO: 노이즈 계산 필요
            }
        
        return JSONResponse({
            'success': True,
            'data': profiles,
            'method': 'HDBSCAN',
            'metadata': metadata
        })
    
    except HTTPException:
        raise
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error(f"[Precomputed 프로필 예외 발생] {error_type}: {error_msg}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"프로필 데이터 로드 실패: {error_type} - {error_msg}"
        )


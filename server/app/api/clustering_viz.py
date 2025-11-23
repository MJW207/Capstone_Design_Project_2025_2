"""
클러스터링 시각화 데이터 API
프론트엔드에서 recharts로 시각화하기 위한 데이터 제공
"""
import json
import logging
from typing import Dict, Any, Optional, List, Tuple
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import pandas as pd
import pandas.api.types as pd_types
import numpy as np

from app.clustering.artifacts import load_artifacts

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/clustering/viz", tags=["clustering-viz"])


# 프로파일용 피쳐 세트 정의
PROFILE_FEATURES = {
    "demographic": [
        "age", "age_group", "generation",
        "family_type", "has_children", "children_category",
        "region_category", "is_metro", "is_metro_city",
    ],
    "economic": [
        "Q6_income", "Q6_scaled", "Q6_category",
        "is_employed", "is_unemployed", "is_student",
    ],
    "device_premium": [
        "Q8_count", "Q8_count_scaled",
        "Q8_premium_index", "Q8_premium_count",
        "is_apple_user", "is_samsung_user", "is_premium_phone",
        "has_car", "is_premium_car", "is_domestic_car",
    ],
    "lifestyle": [
        "has_drinking_experience", "drinking_types_count",
        "drinks_beer", "drinks_soju", "drinks_wine", "drinks_western",
        "drinks_makgeolli", "drinks_low_alcohol", "drinks_cocktail",
        "has_smoking_experience", "smoking_types_count",
        "smokes_regular", "smokes_heet", "smokes_liquid", "smokes_other",
    ],
}

# 효과 크기 임계값
EFFECT_THRESHOLDS = {
    "numeric": 0.4,
    "binary": 0.2,
}


def summarize_feature(df: pd.DataFrame, col: str) -> Optional[dict]:
    """전체 df 및 각 클러스터 df에 대해 feature별 요약 통계를 계산"""
    if col not in df.columns:
        return None
    
    s = df[col].dropna()
    if s.empty:
        return None
    
    # 이진 (0/1 또는 bool)
    if pd_types.is_bool_dtype(s) or s.dropna().isin([0, 1]).all():
        return {"type": "binary", "p": float(s.mean()), "n": int(s.count())}
    
    # 숫자형
    if pd_types.is_numeric_dtype(s):
        return {
            "type": "numeric",
            "mean": float(s.mean()),
            "std": float(s.std(ddof=0) or 0.0),
            "median": float(s.median()),
            "n": int(s.count()),
        }
    
    # 범주형
    vc = s.value_counts(normalize=True).head(5)
    return {
        "type": "categorical",
        "top": [{"value": idx, "p": float(p)} for idx, p in vc.items()],
        "n": int(s.count()),
    }


def numeric_effect(cluster_stat: dict, overall_stat: dict) -> Optional[dict]:
    """클러스터 vs 전체 간 차이를 effect size 형태로 계산"""
    if not cluster_stat or not overall_stat:
        return None
    if overall_stat.get("type") != "numeric":
        return None
    
    std = overall_stat.get("std") or 0.0
    if std == 0:
        return None
    
    cm = cluster_stat["mean"]
    om = overall_stat["mean"]
    diff = cm - om
    d = diff / std  # effect size (Cohen's d 느낌)
    
    return {
        "type": "numeric",
        "cluster_mean": float(cm),
        "overall_mean": float(om),
        "diff": float(diff),
        "effect_size": float(d),
    }


def binary_effect(cluster_stat: dict, overall_stat: dict, min_p: float = 0.05) -> Optional[dict]:
    """클러스터 vs 전체 간 차이를 penetration index 형태로 계산"""
    if not cluster_stat or not overall_stat:
        return None
    if overall_stat.get("type") != "binary":
        return None
    
    p_c = float(cluster_stat["p"])
    p_o = float(overall_stat["p"])
    if p_o < min_p:
        # 전체에서 너무 희귀하면 효과 계산 스킵
        return None
    
    index = p_c / p_o if p_o > 0 else 0.0
    lift = index - 1.0
    
    return {
        "type": "binary",
        "cluster_p": p_c,
        "overall_p": p_o,
        "index": float(index),
        "lift": float(lift),
    }


def collect_distinctive_features(
    df: pd.DataFrame,
    cluster_id: int,
    profile_features: dict,
    overall_stats: dict,
) -> Tuple[List[dict], Dict[str, dict]]:
    """도메인별로 특징적인 피쳐를 골라내서, 전체 상위 5개 정도만 남김"""
    cluster_df = df[df["cluster"] == cluster_id]
    cluster_stats: Dict[str, dict] = {}
    
    # 각 프로파일 feature에 대한 클러스터 요약 통계 계산
    for group_cols in profile_features.values():
        for col in group_cols:
            if col not in df.columns:
                continue
            if col not in cluster_stats:
                cluster_stats[col] = summarize_feature(cluster_df, col)
    
    results_by_group: Dict[str, List[dict]] = {g: [] for g in profile_features.keys()}
    
    for group, cols in profile_features.items():
        for col in cols:
            if col not in df.columns:
                continue
            
            c_stat = cluster_stats.get(col)
            o_stat = overall_stats.get(col)
            if not c_stat or not o_stat:
                continue
            
            if c_stat["type"] == "numeric" and o_stat["type"] == "numeric":
                eff = numeric_effect(c_stat, o_stat)
                if not eff:
                    continue
                if abs(eff["effect_size"]) < EFFECT_THRESHOLDS["numeric"]:
                    continue
                score = abs(eff["effect_size"])
                eff_type = "numeric"
            elif c_stat["type"] == "binary" and o_stat["type"] == "binary":
                eff = binary_effect(c_stat, o_stat)
                if not eff:
                    continue
                if abs(eff["lift"]) < EFFECT_THRESHOLDS["binary"]:
                    continue
                score = abs(eff["lift"])
                eff_type = "binary"
            else:
                # 범주형 등은 현재 버전에서는 distinctive 후보에서 제외
                continue
            
            results_by_group[group].append({
                "feature": col,
                "group": group,
                "type": eff_type,
                "effect": eff,
                "score": float(score),
            })
    
    # 그룹별 상위 2개씩
    distinctive: List[dict] = []
    for group, items in results_by_group.items():
        items.sort(key=lambda x: x["score"], reverse=True)
        distinctive.extend(items[:2])
    
    # 전체 상위 5개
    distinctive.sort(key=lambda x: x["score"], reverse=True)
    distinctive = distinctive[:5]
    
    return distinctive, cluster_stats


def life_stage(cluster_stats: Dict[str, dict], overall_stats: Dict[str, dict]) -> str:
    """라이프 스테이지 판단"""
    age_cs = cluster_stats.get("age")
    age_os = overall_stats.get("age")
    if age_cs and age_os and age_cs.get("type") == "numeric" and age_os.get("type") == "numeric":
        cm = age_cs["mean"]
        om = age_os["mean"]
        diff = cm - om
        if diff <= -5:
            return "젊은"
        elif diff >= 5:
            return "중장년"
        else:
            return "중간 연령"
    return "일반"


def value_level(distinctive: List[dict]) -> str:
    """소득 레벨 판단"""
    income_eff = next(
        (
            d
            for d in distinctive
            if d["feature"] in ("Q6_income", "Q6_scaled")
            and d["effect"].get("type") == "numeric"
        ),
        None,
    )
    if not income_eff:
        return "실속형"
    
    d = income_eff["effect"]["effect_size"]
    if d >= 0.7:
        return "고소득"
    if d <= -0.7:
        return "저소득"
    return "중간 소득"


def flavor_tag(distinctive: List[dict]) -> str:
    """프리미엄/라이프스타일 태그"""
    by_feature = {d["feature"]: d for d in distinctive}
    
    def get_lift(feat: str) -> float:
        eff = by_feature.get(feat, {}).get("effect")
        if not eff or eff.get("type") != "binary":
            return 0.0
        return float(eff.get("lift") or 0.0)
    
    def get_d(feat: str) -> float:
        eff = by_feature.get(feat, {}).get("effect")
        if not eff or eff.get("type") != "numeric":
            return 0.0
        return float(eff.get("effect_size") or 0.0)
    
    # 프리미엄 소비
    if get_d("Q8_premium_index") > 0.5 or get_lift("is_premium_car") > 0.3:
        return "프리미엄 소비"
    
    # 테크 프리미엄
    if get_lift("is_apple_user") > 0.3 and get_lift("is_premium_phone") > 0.3:
        return "테크 프리미엄"
    
    # 와인·양주 선호
    if get_lift("drinks_wine") > 0.3 or get_lift("drinks_western") > 0.3:
        return "와인·양주 선호"
    
    # 건강 지향 (흡연/음주 모두 낮음)
    if get_lift("has_smoking_experience") < -0.3 and get_lift("has_drinking_experience") < -0.3:
        return "건강 지향"
    
    return ""


def build_cluster_name(
    cluster_id: int,
    distinctive: List[dict],
    cluster_stats: Dict[str, dict],
    overall_stats: Dict[str, dict],
) -> str:
    """군집 이름 자동 생성"""
    ls = life_stage(cluster_stats, overall_stats)   # 젊은 / 중장년 / 중간 연령 / 일반
    vl = value_level(distinctive)                  # 고소득 / 저소득 / 중간 소득 / 실속형
    fv = flavor_tag(distinctive)                   # 프리미엄 소비 / 테크 프리미엄 / ...
    
    base = f"{vl} {ls}".strip()  # 예: "고소득 젊은"
    if fv:
        return f"{base} · {fv} 군집"
    return f"{base} 군집"


def build_insights(
    cluster_id: int,
    df: pd.DataFrame,
    distinctive: List[dict],
    cluster_stats: Dict[str, dict],
    overall_stats: Dict[str, dict],
) -> Dict[str, List[str]]:
    """카테고리별 인사이트 생성"""
    insights: Dict[str, List[str]] = {
        "size": [],
        "demographic": [],
        "economic": [],
        "device_premium": [],
        "lifestyle": [],
    }
    
    cluster_df = df[df["cluster"] == cluster_id]
    size = len(cluster_df)
    total = len(df)
    pct = (size / total * 100.0) if total > 0 else 0.0
    
    # 1) 크기
    if pct >= 30:
        insights["size"].append(f"대형 군집 ({size}명, 전체의 {pct:.1f}%)")
    elif pct >= 15:
        insights["size"].append(f"중형 군집 ({size}명, 전체의 {pct:.1f}%)")
    else:
        insights["size"].append(f"소형 군집 ({size}명, 전체의 {pct:.1f}%)")
    
    # helper: distinctive에서 feature별 effect 가져오기
    by_feature = {d["feature"]: d for d in distinctive}
    
    def get_numeric_eff(name: str) -> Optional[dict]:
        d = by_feature.get(name)
        if not d:
            return None
        eff = d.get("effect")
        if eff and eff.get("type") == "numeric":
            return eff
        return None
    
    def get_binary_eff(name: str) -> Optional[dict]:
        d = by_feature.get(name)
        if not d:
            return None
        eff = d.get("effect")
        if eff and eff.get("type") == "binary":
            return eff
        return None
    
    # 2) 연령
    age_eff = get_numeric_eff("age")
    if age_eff:
        d = age_eff["effect_size"]
        cm = age_eff["cluster_mean"]
        om = age_eff["overall_mean"]
        if d > 0.4:
            insights["demographic"].append(f"평균 연령이 {cm:.1f}세로 전체({om:.1f}세)보다 높음")
        elif d < -0.4:
            insights["demographic"].append(f"평균 연령이 {cm:.1f}세로 전체({om:.1f}세)보다 낮음")
    
    # 3) 소득
    income_eff = get_numeric_eff("Q6_income") or get_numeric_eff("Q6_scaled")
    if income_eff:
        d = income_eff["effect_size"]
        cm = income_eff["cluster_mean"]
        om = income_eff["overall_mean"]
        if d > 0.4:
            insights["economic"].append(f"평균 소득이 {cm:.0f}만원으로 전체({om:.0f}만원)보다 높음")
        elif d < -0.4:
            insights["economic"].append(f"평균 소득이 {cm:.0f}만원으로 전체({om:.0f}만원)보다 낮음")
    
    # 4) 프리미엄/디바이스
    premium_eff = get_numeric_eff("Q8_premium_index")
    if premium_eff and premium_eff["effect_size"] > 0.4:
        insights["device_premium"].append("프리미엄 가전/디바이스 보유 수준이 전체보다 높음")
    
    apple_eff = get_binary_eff("is_apple_user")
    if apple_eff and apple_eff["lift"] > 0.3:
        insights["device_premium"].append("애플 사용자 비율이 전체 대비 크게 높음")
    
    phone_eff = get_binary_eff("is_premium_phone")
    if phone_eff and phone_eff["lift"] > 0.3:
        insights["device_premium"].append("프리미엄 스마트폰 비율이 전체보다 높음")
    
    # 5) 라이프스타일
    wine_eff = get_binary_eff("drinks_wine")
    if wine_eff and wine_eff["lift"] > 0.3:
        insights["lifestyle"].append("와인 음용 비율이 전체보다 높음")
    
    smoke_eff = get_binary_eff("has_smoking_experience")
    if smoke_eff and smoke_eff["lift"] < -0.3:
        insights["lifestyle"].append("흡연 경험 비율이 전체보다 낮음")
    
    return insights


@router.get("/k-analysis/{session_id}")
async def get_k_analysis_data(session_id: str):
    """
    최적 K 분석 데이터 반환
    k별 Silhouette, Davies-Bouldin, Calinski-Harabasz 점수
    """
    try:
        artifacts = load_artifacts(session_id)
        if not artifacts:
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
        
        meta = artifacts.get('meta', {})
        result_meta = meta.get('result_meta', {})
        
        # k_scores가 메타데이터에 있는지 확인
        k_scores = result_meta.get('k_scores', [])
        
        if not k_scores:
            # 메타데이터에 없으면 빈 배열 반환
            return {
                'success': False,
                'message': 'K 분석 데이터가 없습니다.',
                'data': []
            }
        
        # 데이터 포맷팅
        formatted_data = []
        for score in k_scores:
            formatted_data.append({
                'k': score.get('k'),
                'silhouette': float(score.get('silhouette', 0)),
                'davies_bouldin': float(score.get('davies_bouldin', 0)),
                'calinski_harabasz': float(score.get('calinski_harabasz', 0)),
                'min_cluster_size': int(score.get('min_cluster_size', 0))
            })
        
        return {
            'success': True,
            'data': formatted_data,
            'optimal_k': result_meta.get('optimal_k')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[K 분석 데이터 오류] {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"K 분석 데이터 조회 실패: {str(e)}")


@router.get("/cluster-profiles/{session_id}")
async def get_cluster_profiles(session_id: str) -> JSONResponse:
    """
    클러스터별 피처 프로파일 데이터 반환 (v2 엔진)
    """
    logger.info(f"[클러스터 프로필 요청] session_id: {session_id}")
    
    try:
        # Precomputed 세션인 경우 precomputed API로 리다이렉트
        if session_id == 'precomputed_default':
            logger.info(f"[클러스터 프로필] Precomputed 세션 감지, precomputed API 사용")
            from app.api.precomputed import get_precomputed_profiles
            return await get_precomputed_profiles()
        
        # 1) artifacts / df / meta 로드
        logger.debug(f"[클러스터 프로필] artifacts 로드 시작: {session_id}")
        artifacts = load_artifacts(session_id)
        
        if not artifacts:
            error_msg = f"세션을 찾을 수 없습니다: {session_id}"
            logger.error(f"[클러스터 프로필 오류] {error_msg}")
            logger.debug(f"[클러스터 프로필] 세션 디렉토리 확인: runs/{session_id}")
            raise HTTPException(status_code=404, detail=error_msg)
        
        logger.debug(f"[클러스터 프로필] artifacts 로드 완료. 키: {list(artifacts.keys())}")
        
        data = artifacts.get('data')
        if data is None:
            error_msg = "데이터를 찾을 수 없습니다."
            logger.error(f"[클러스터 프로필 오류] {error_msg}")
            logger.debug(f"[클러스터 프로필] artifacts 키: {list(artifacts.keys())}")
            raise HTTPException(status_code=404, detail=error_msg)
        
        logger.debug(f"[클러스터 프로필] 데이터 타입: {type(data)}")
        df = pd.read_csv(data) if isinstance(data, str) else data
        logger.debug(f"[클러스터 프로필] DataFrame shape: {df.shape}, 컬럼: {list(df.columns)[:10]}")
        
        if 'cluster' not in df.columns:
            error_msg = f"클러스터 정보가 없습니다. 컬럼: {list(df.columns)[:20]}"
            logger.error(f"[클러스터 프로필 오류] {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
        
        logger.debug(f"[클러스터 프로필] 클러스터 정보 확인 완료. 고유 클러스터: {df['cluster'].unique()[:10]}")
        
        # 메타데이터에서 사용된 피처 확인 (참고용, 프로파일에는 사용 안 함)
        meta = artifacts.get('meta', {})
        result_meta = meta.get('result_meta', {})
        algorithm_info = result_meta.get('algorithm_info', {})
        used_features = algorithm_info.get('features', [])  # 클러스터링에 사용한 피처 (참고용)
        
        # 2) 전체 stats 계산
        overall_stats: Dict[str, dict] = {}
        for group, cols in PROFILE_FEATURES.items():
            for col in cols:
                if col not in df.columns:
                    continue
                if col not in overall_stats:
                    overall_stats[col] = summarize_feature(df, col)
        
        result_clusters: List[dict] = []
        total = len(df)
        
        # 노이즈 클러스터 제외하고 처리
        valid_clusters = sorted([c for c in df['cluster'].unique() if c != -1])
        
        for cluster_id in valid_clusters:
            cluster_id_int = int(cluster_id)
            cluster_df = df[df['cluster'] == cluster_id_int]
            size = len(cluster_df)
            percentage = (size / total * 100.0) if total > 0 else 0.0
            
            # 3) 특징 피쳐 및 클러스터별 stats
            distinctive, cluster_stats = collect_distinctive_features(
                df=df,
                cluster_id=cluster_id_int,
                profile_features=PROFILE_FEATURES,
                overall_stats=overall_stats,
            )
            
            # 4) 이름/인사이트 생성
            name = build_cluster_name(
                cluster_id=cluster_id_int,
                distinctive=distinctive,
                cluster_stats=cluster_stats,
                overall_stats=overall_stats,
            )
            insights_dict = build_insights(
                cluster_id=cluster_id_int,
                df=df,
                distinctive=distinctive,
                cluster_stats=cluster_stats,
                overall_stats=overall_stats,
            )
            
            # 5) 태그: flavor_tag + size 정보 등으로 구성
            flavor = flavor_tag(distinctive)
            tags: List[str] = []
            if flavor:
                tags.append(flavor)
            if percentage >= 30:
                tags.append("대형 군집")
            elif percentage >= 15:
                tags.append("중형 군집")
            else:
                tags.append("소형 군집")
            
            # 기존 v1 호환을 위한 fields 유지
            # distinctive_features는 v2 구조를 그대로 넘기되, 기존 프론트가 기대하는 필드도 포함
            distinctive_features_v1_compat = []
            for d in distinctive:
                eff = d.get("effect", {})
                if eff.get("type") == "numeric":
                    distinctive_features_v1_compat.append({
                        "feature": d["feature"],
                        "value": eff.get("cluster_mean", 0.0),
                        "overall": eff.get("overall_mean", 0.0),
                        "diff": eff.get("diff", 0.0),
                        "diff_percent": eff.get("effect_size", 0.0) * 100,  # effect_size를 퍼센트로 변환
                    })
                elif eff.get("type") == "binary":
                    distinctive_features_v1_compat.append({
                        "feature": d["feature"],
                        "value": eff.get("cluster_p", 0.0),
                        "overall": eff.get("overall_p", 0.0),
                        "diff": eff.get("lift", 0.0),
                        "diff_percent": eff.get("lift", 0.0) * 100,
                    })
            
            # insights를 기존 형식(리스트)과 새 형식(딕셔너리) 모두 지원
            insights_list = []
            for category, items in insights_dict.items():
                insights_list.extend(items)
            
            cluster_profile = {
                "cluster": cluster_id_int,
                "size": size,
                "percentage": float(percentage),
                "name": name,
                "tags": tags,
                "distinctive_features": distinctive_features_v1_compat,  # v1 호환
                "insights": insights_list,  # v1 호환 (리스트)
                "insights_by_category": insights_dict,  # v2 새 필드 (카테고리별)
                "segments": {
                    "life_stage": life_stage(cluster_stats, overall_stats),
                    "value_level": value_level(distinctive),
                },
                # 기존 features 필드도 유지 (클러스터링에 사용한 피처 평균값)
                "features": {},
            }
            
            # 기존 features 필드 채우기 (클러스터링에 사용한 피처의 평균값)
            if used_features:
                for feat in used_features:
                    if feat in df.columns:
                        cluster_profile["features"][feat] = float(cluster_df[feat].mean())
            
            result_clusters.append(cluster_profile)
        
        response_payload = {
            "success": True,
            "data": result_clusters,
            "profile_features": PROFILE_FEATURES,
            "used_features": used_features,  # 클러스터링에 사용한 피처 (참고용)
        }
        
        return JSONResponse(content=jsonable_encoder(response_payload))
        
    except HTTPException as http_err:
        logger.error(f"[클러스터 프로필 HTTP 오류] {http_err.status_code}: {http_err.detail}")
        logger.debug(f"[클러스터 프로필] HTTP 오류 상세: session_id={session_id}")
        raise
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error(f"[클러스터 프로필 예외 발생] {error_type}: {error_msg}", exc_info=True)
        logger.debug(f"[클러스터 프로필] 예외 발생 위치: session_id={session_id}")
        raise HTTPException(
            status_code=500, 
            detail=f"클러스터 프로파일 조회 실패: {error_type} - {error_msg}"
        )


@router.get("/cluster-distribution/{session_id}")
async def get_cluster_distribution(session_id: str):
    """
    클러스터 분포 데이터 반환 (막대그래프 + 파이차트용)
    """
    try:
        artifacts = load_artifacts(session_id)
        if not artifacts:
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
        
        data = artifacts.get('data')
        if data is None:
            raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다.")
        
        df = pd.read_csv(data) if isinstance(data, str) else data
        
        if 'cluster' not in df.columns:
            raise HTTPException(status_code=400, detail="클러스터 정보가 없습니다.")
        
        # 클러스터별 개수 계산
        cluster_counts = df['cluster'].value_counts().sort_index()
        total = len(df)
        
        distribution_data = []
        for cluster_id, count in cluster_counts.items():
            if cluster_id == -1:  # 노이즈는 별도 처리
                continue
            distribution_data.append({
                'cluster': int(cluster_id),
                'count': int(count),
                'percentage': float(count / total * 100)
            })
        
        # 노이즈가 있으면 별도 추가
        if -1 in cluster_counts.index:
            noise_count = int(cluster_counts[-1])
            distribution_data.append({
                'cluster': -1,
                'count': noise_count,
                'percentage': float(noise_count / total * 100),
                'is_noise': True
            })
        
        return {
            'success': True,
            'data': distribution_data,
            'total': int(total)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[클러스터 분포 오류] {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"클러스터 분포 조회 실패: {str(e)}")


@router.get("/correlation-matrix/{session_id}")
async def get_correlation_matrix(session_id: str):
    """
    피처 간 상관계수 매트릭스 반환
    """
    try:
        artifacts = load_artifacts(session_id)
        if not artifacts:
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
        
        data = artifacts.get('data')
        if data is None:
            raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다.")
        
        df = pd.read_csv(data) if isinstance(data, str) else data
        
        # 메타데이터에서 사용된 피처 확인
        meta = artifacts.get('meta', {})
        result_meta = meta.get('result_meta', {})
        algorithm_info = result_meta.get('algorithm_info', {})
        
        # 사용된 피처 목록
        used_features = algorithm_info.get('features', [])
        if not used_features:
            # 숫자형 컬럼 중 cluster, mb_sn 제외
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            if 'cluster' in numeric_cols:
                numeric_cols.remove('cluster')
            if 'mb_sn' in numeric_cols:
                numeric_cols.remove('mb_sn')
            used_features = numeric_cols[:10]  # 최대 10개
        
        # 상관계수 계산
        corr_matrix = df[used_features].corr()
        
        # JSON 직렬화 가능한 형태로 변환
        correlation_data = []
        for i, feature1 in enumerate(used_features):
            row = {'feature': feature1, 'correlations': {}}
            for j, feature2 in enumerate(used_features):
                row['correlations'][feature2] = float(corr_matrix.loc[feature1, feature2])
            correlation_data.append(row)
        
        return {
            'success': True,
            'data': correlation_data,
            'features': used_features
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[상관계수 매트릭스 오류] {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"상관계수 매트릭스 조회 실패: {str(e)}")

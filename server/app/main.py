from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import numpy as np
import pandas as pd
from typing import List, Dict, Optional, Any
import json
import uuid
from datetime import datetime

try:
  from anthropic import Anthropic
except Exception:
  Anthropic = None  # Optional at dev time

from .clustering import ClusteringPipeline, ClusteringConfig

# Pydantic 모델들

class SearchRequest(BaseModel):
  query: str
  filters: Optional[Dict[str, Any]] = None
  page: int = 1
  limit: int = 20

class PanelDetail(BaseModel):
  id: str
  name: str
  age: int
  gender: str
  region: str
  responses: Dict[str, Any]
  embedding: Optional[List[float]] = None
  created_at: str

class ClusteringRequest(BaseModel):
  query: str
  search_results: List[Dict[str, Any]]
  config: Optional[Dict[str, Any]] = None

class AIInsightRequest(BaseModel):
  query: str
  context: Dict[str, Any]

class ExportRequest(BaseModel):
  format: str  # 'csv', 'json', 'excel'
  data: List[Dict[str, Any]]

class ComparisonRequest(BaseModel):
  group_a_id: str
  group_b_id: str
  group_type: str = "cluster"
  analysis_type: str = "difference"  # difference, lift, smd

# FastAPI 앱 초기화
app = FastAPI(title="Panel Insight API", version="0.1.0")

app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://localhost:3005"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

# 클러스터링 파이프라인 초기화
clustering_pipeline = ClusteringPipeline()

# RAG 시스템 제거됨 - 더미데이터만 사용

# 샘플 데이터 (실제로는 DB에서 가져옴)
SAMPLE_PANELS = [
    {
        "id": str(uuid.uuid4()),
        "name": "김철수",
        "age": 28,
        "gender": "남성",
        "region": "서울",
        "responses": {
            "q1": "",
            "q2": "",
            "q3": ""
        },
        "embedding": np.random.rand(1024).tolist(),
        "created_at": datetime.now().isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "name": "이영희",
        "age": 35,
        "gender": "여성",
        "region": "부산",
        "responses": {
            "q1": "",
            "q2": "",
            "q3": ""
        },
        "embedding": np.random.rand(1024).tolist(),
        "created_at": datetime.now().isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "name": "박민수",
        "age": 42,
        "gender": "남성",
        "region": "대구",
        "responses": {
            "q1": "",
            "q2": "",
            "q3": ""
        },
        "embedding": np.random.rand(1024).tolist(),
        "created_at": datetime.now().isoformat()
    }
]

# 더 많은 샘플 데이터 생성 - 필터에 맞는 다양한 조합
regions = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"]
genders = ["남성", "여성"]
income_ranges = ["~200", "200~300", "300~400", "400~600", "600~"]

# 서울 20대 여성 패널들 (10명)
for i in range(10):
    SAMPLE_PANELS.append({
        "id": str(uuid.uuid4()),
        "name": f"서울20대여성{i+1}",
        "age": np.random.randint(20, 29),
        "gender": "여성",
        "region": "서울",
        "income": np.random.choice(income_ranges),
        "responses": {
            "q1": "",
            "q2": "",
            "q3": ""
        },
        "embedding": np.random.rand(1024).tolist(),
        "created_at": datetime.now().isoformat()
    })

# 서울 30대 남성 패널들 (8명)
for i in range(8):
    SAMPLE_PANELS.append({
        "id": str(uuid.uuid4()),
        "name": f"서울30대남성{i+1}",
        "age": np.random.randint(30, 39),
        "gender": "남성",
        "region": "서울",
        "income": np.random.choice(["300~400", "400~600", "600~"]),
        "responses": {
            "q1": "",
            "q2": "",
            "q3": ""
        },
        "embedding": np.random.rand(1024).tolist(),
        "created_at": datetime.now().isoformat()
    })

# 경기 20대 여성 패널들 (6명)
for i in range(6):
    SAMPLE_PANELS.append({
        "id": str(uuid.uuid4()),
        "name": f"경기20대여성{i+1}",
        "age": np.random.randint(20, 29),
        "gender": "여성",
        "region": "경기",
        "income": np.random.choice(income_ranges),
        "responses": {
            "q1": "",
            "q2": "",
            "q3": ""
        },
        "embedding": np.random.rand(1024).tolist(),
        "created_at": datetime.now().isoformat()
    })

# 부산 30대 여성 패널들 (5명)
for i in range(5):
    SAMPLE_PANELS.append({
        "id": str(uuid.uuid4()),
        "name": f"부산30대여성{i+1}",
        "age": np.random.randint(30, 39),
        "gender": "여성",
        "region": "부산",
        "income": np.random.choice(["200~300", "300~400", "400~600"]),
        "responses": {
            "q1": "",
            "q2": "",
            "q3": ""
        },
        "embedding": np.random.rand(1024).tolist(),
        "created_at": datetime.now().isoformat()
    })

# 대구 40대 남성 패널들 (4명)
for i in range(4):
    SAMPLE_PANELS.append({
        "id": str(uuid.uuid4()),
        "name": f"대구40대남성{i+1}",
        "age": np.random.randint(40, 49),
        "gender": "남성",
        "region": "대구",
        "income": np.random.choice(["300~400", "400~600", "600~"]),
        "responses": {
            "q1": "",
            "q2": "",
            "q3": ""
        },
        "embedding": np.random.rand(1024).tolist(),
        "created_at": datetime.now().isoformat()
    })

# 기타 지역 패널들 (17명)
for i in range(17):
    SAMPLE_PANELS.append({
        "id": str(uuid.uuid4()),
        "name": f"기타지역패널{i+1}",
        "age": np.random.randint(20, 60),
        "gender": np.random.choice(genders),
        "region": np.random.choice(regions[2:]),  # 서울, 경기 제외
        "income": np.random.choice(income_ranges),
        "responses": {
            "q1": "",
            "q2": "",
            "q3": ""
        },
        "embedding": np.random.rand(1024).tolist(),
        "created_at": datetime.now().isoformat()
    })


# 기본 엔드포인트
@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"name": "Panel Insight API", "version": "0.1.0"}

# 패널 관련 API
@app.get("/api/panels")
def get_panels(page: int = 1, limit: int = 20):
    """패널 목록 조회"""
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    
    panels = SAMPLE_PANELS[start_idx:end_idx]
    total = len(SAMPLE_PANELS)
    
    return {
        "panels": panels,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }

@app.get("/api/panels/{panel_id}")
def get_panel(panel_id: str):
    """패널 상세 조회"""
    panel = next((p for p in SAMPLE_PANELS if p["id"] == panel_id), None)
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    return panel

@app.post("/api/search")
def search_panels(request: SearchRequest):
    """패널 검색"""
    query = request.query.lower()
    filters = request.filters or {}
    
    # 검색 로직 (실제로는 벡터 검색 사용)
    results = []
    qw_results = []  # Q+W 결과 (쿼리 + 워드)
    w_only_results = []  # Wonly 결과 (워드만)
    
    for panel in SAMPLE_PANELS:
        # 텍스트 검색 (빈 응답 제외)
        responses = [panel['responses']['q1'], panel['responses']['q2'], panel['responses']['q3']]
        non_empty_responses = [r for r in responses if r.strip()]
        searchable_text = f"{panel['name']} {' '.join(non_empty_responses)}".lower()
        
        if query in searchable_text:
            # 필터 적용 (프론트엔드 형식에 맞게 수정)
            
            # 나이 필터 (ageRange: [min, max])
            if filters.get('ageRange'):
                age_min, age_max = filters['ageRange']
                if panel['age'] < age_min or panel['age'] > age_max:
                    continue
            
            # 성별 필터 (selectedGenders: ['여성', '남성'])
            if filters.get('selectedGenders') and len(filters['selectedGenders']) > 0:
                if panel['gender'] not in filters['selectedGenders']:
                    continue
            
            # 지역 필터 (selectedRegions: ['서울', '경기'])
            if filters.get('selectedRegions') and len(filters['selectedRegions']) > 0:
                if panel['region'] not in filters['selectedRegions']:
                    continue
            
            # 소득 필터 (selectedIncomes: ['200~300', '300~400'])
            if filters.get('selectedIncomes') and len(filters['selectedIncomes']) > 0:
                if panel['income'] not in filters['selectedIncomes']:
                    continue
            
            # 퀵폴 필터 (quickpollOnly: true/false)
            if filters.get('quickpollOnly'):
                # 퀵폴 응답이 있는 패널만 (q1 응답이 있는 경우)
                if not panel['responses'].get('q1') or not panel['responses']['q1'].strip():
                    continue
            
            # Q+W vs Wonly 분류
            # Q+W: 쿼리가 질문 응답에 포함된 경우
            q_responses = f"{panel['responses']['q1']} {panel['responses']['q2']} {panel['responses']['q3']}".lower()
            if query in q_responses and any(r.strip() for r in [panel['responses']['q1'], panel['responses']['q2'], panel['responses']['q3']]):
                qw_results.append(panel)
            else:
                w_only_results.append(panel)
            
            results.append(panel)
    
    # 페이지네이션
    start_idx = (request.page - 1) * request.limit
    end_idx = start_idx + request.limit
    paginated_results = results[start_idx:end_idx]
    
    return {
        "results": paginated_results,
        "query": request.query,
        "total": len(results),
        "qw_count": len(qw_results),
        "w_only_count": len(w_only_results),
        "page": request.page,
        "limit": request.limit,
        "pages": (len(results) + request.limit - 1) // request.limit
    }

@app.post("/api/panels/compare")
def compare_panels(request: Dict[str, List[str]]):
    """패널 비교"""
    panel_ids = request.get("ids", [])
    panels = [p for p in SAMPLE_PANELS if p["id"] in panel_ids]
    
    if len(panels) < 2:
        raise HTTPException(status_code=400, detail="At least 2 panels required for comparison")
    
    # 비교 분석 로직
    comparison = {
        "panels": panels,
        "analysis": {
            "age_range": {
                "min": min(p["age"] for p in panels),
                "max": max(p["age"] for p in panels),
                "avg": sum(p["age"] for p in panels) / len(panels)
            },
            "gender_distribution": {},
            "region_distribution": {},
            "common_themes": []
        }
    }
    
    # 성별 분포
    for panel in panels:
        gender = panel["gender"]
        comparison["analysis"]["gender_distribution"][gender] = comparison["analysis"]["gender_distribution"].get(gender, 0) + 1
    
    # 지역 분포
    for panel in panels:
        region = panel["region"]
        comparison["analysis"]["region_distribution"][region] = comparison["analysis"]["region_distribution"].get(region, 0) + 1
    
    return comparison

# 클러스터링 API
@app.post("/api/clustering/global-pca")
def fit_global_pca():
    """전역 PCA 모델 학습"""
    # 모든 패널의 임베딩 추출
    embeddings = np.array([panel["embedding"] for panel in SAMPLE_PANELS])
    
    result = clustering_pipeline.fit_global_pca(embeddings)
    return result

@app.post("/api/clustering/cluster")
def cluster_search_results(request: ClusteringRequest):
    """검색 결과 클러스터링"""
    if not clustering_pipeline.is_fitted:
        # PCA 모델이 학습되지 않은 경우 먼저 학습
        embeddings = np.array([panel["embedding"] for panel in SAMPLE_PANELS])
        clustering_pipeline.fit_global_pca(embeddings)
    
    # 쿼리 임베딩 생성 (실제로는 임베딩 모델 사용)
    query_embedding = np.random.rand(1024)
    
    result = clustering_pipeline.cluster_search_results(query_embedding, request.search_results)
    return result

@app.get("/api/clustering/config")
def get_clustering_config():
    """클러스터링 설정 조회"""
    return {
        "pca_components": clustering_pipeline.config.pca_components,
        "k_neighbors": clustering_pipeline.config.k_neighbors,
        "resolution": clustering_pipeline.config.resolution,
        "min_cluster_size": clustering_pipeline.config.min_cluster_size,
        "max_clusters": clustering_pipeline.config.max_clusters,
        "use_snn": clustering_pipeline.config.use_snn,
        "snn_threshold": clustering_pipeline.config.snn_threshold
    }

@app.post("/api/clustering/config")
def update_clustering_config(config: Dict[str, Any]):
    """클러스터링 설정 업데이트"""
    for key, value in config.items():
        if hasattr(clustering_pipeline.config, key):
            setattr(clustering_pipeline.config, key, value)
    
    return {"status": "success", "config": config}

@app.post("/api/clustering/quality-check")
def quality_check():
    """클러스터링 품질 체크"""
    embeddings = np.array([panel["embedding"] for panel in SAMPLE_PANELS])
    result = clustering_pipeline.quality_check(embeddings)
    return result

# 퀵 인사이트 API
@app.post("/api/quick-insight")
def generate_quick_insight(request: Dict[str, Any]):
    """검색 결과 기반 퀵 인사이트 생성"""
    query = request.get("query", "")
    panels = request.get("panels", [])
    filters = request.get("filters", {})
    
    if not panels:
        return {
            "insight": "검색 결과가 없어 인사이트를 생성할 수 없습니다.",
            "confidence": 0.0,
            "summary": {
                "total": 0,
                "q_cnt": 0,
                "w_cnt": 0,
                "gender_top": 0,
                "top_regions": [],
                "top_tags": [],
                "age_med": 0
            }
        }
    
    # 기본 통계 계산
    total = len(panels)
    q_cnt = len([p for p in panels if p.get('responses', {}).get('q1') and p['responses']['q1'].strip()])
    w_cnt = total - q_cnt
    
    # 성별 분포
    gender_counts = {}
    for panel in panels:
        gender = panel.get('gender', '기타')
        gender_counts[gender] = gender_counts.get(gender, 0) + 1
    gender_top = max(gender_counts.values()) if gender_counts else 0
    
    # 지역 분포
    region_counts = {}
    for panel in panels:
        region = panel.get('region', '기타')
        region_counts[region] = region_counts.get(region, 0) + 1
    top_regions = sorted(region_counts.items(), key=lambda x: x[1], reverse=True)[:3]
    top_regions = [r[0] for r in top_regions]
    
    # 나이 중앙값
    ages = [p.get('age', 0) for p in panels if p.get('age')]
    age_med = sorted(ages)[len(ages)//2] if ages else 0
    
    # LLM 인사이트 생성
    insight_text = generate_llm_insight(query, panels, filters)
    
    return {
        "insight": insight_text,
        "confidence": 0.8,
        "summary": {
            "total": total,
            "q_cnt": q_cnt,
            "w_cnt": w_cnt,
            "gender_top": gender_top,
            "top_regions": top_regions,
            "top_tags": [],  # 추후 태그 분석 추가
            "age_med": age_med
        }
    }

def generate_llm_insight(query: str, panels: List[Dict], filters: Dict) -> str:
    """LLM을 사용한 인사이트 생성"""
    if not panels:
        return "검색 결과가 없습니다."
    
    # 패널 데이터 요약
    total = len(panels)
    age_range = f"{min(p.get('age', 0) for p in panels)}-{max(p.get('age', 0) for p in panels)}세"
    
    # 성별 분포
    gender_dist = {}
    for panel in panels:
        gender = panel.get('gender', '기타')
        gender_dist[gender] = gender_dist.get(gender, 0) + 1
    
    # 지역 분포
    region_dist = {}
    for panel in panels:
        region = panel.get('region', '기타')
        region_dist[region] = region_dist.get(region, 0) + 1
    
    # 간단한 인사이트 생성 (현재는 더미, 추후 LLM 연동)
    insights = []
    
    if total > 0:
        insights.append(f"총 {total}명의 패널이 검색되었습니다.")
        
        if gender_dist:
            top_gender = max(gender_dist.items(), key=lambda x: x[1])
            insights.append(f"성별로는 {top_gender[0]}이 {top_gender[1]}명({round(top_gender[1]/total*100)}%)로 가장 많습니다.")
        
        if region_dist:
            top_region = max(region_dist.items(), key=lambda x: x[1])
            insights.append(f"지역별로는 {top_region[0]}이 {top_region[1]}명으로 가장 많습니다.")
        
        insights.append(f"나이 분포는 {age_range}입니다.")
    
    # LLM API 연동 시 (추후 구현)
    # api_key = os.getenv("ANTHROPIC_API_KEY")
    # if Anthropic and api_key:
    #     client = Anthropic(api_key=api_key)
    #     prompt = f"""
    #     다음 패널 데이터를 분석하여 간단한 인사이트를 제공해주세요:
    #     - 검색 쿼리: {query}
    #     - 총 패널 수: {total}
    #     - 성별 분포: {gender_dist}
    #     - 지역 분포: {region_dist}
    #     - 나이 범위: {age_range}
    #     
    #     간단하고 명확한 인사이트를 2-3문장으로 작성해주세요.
    #     """
    #     
    #     response = client.messages.create(
    #         model="claude-3-haiku-20240307",
    #         max_tokens=200,
    #         messages=[{"role": "user", "content": prompt}]
    #     )
    #     return response.content[0].text
    
    return " ".join(insights) if insights else "인사이트를 생성할 수 없습니다."

# AI 인사이트 API
@app.post("/api/ai-insight")
def generate_ai_insight(request: AIInsightRequest):
    """AI 인사이트 생성"""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if Anthropic is None or not api_key:
        return {
            "insight": "AI 인사이트 기능을 사용하려면 ANTHROPIC_API_KEY를 설정해주세요.",
            "error": "API key not configured"
        }
    
    try:
        client = Anthropic(api_key=api_key)
        
        # 컨텍스트 정보를 프롬프트에 포함
        context_str = json.dumps(request.context, ensure_ascii=False, indent=2)
        
        message = client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=1000,
            system=(
                "당신은 패널 데이터 분석 전문가입니다. 주어진 패널 데이터를 분석하여 "
                "유용한 인사이트를 제공해주세요. 데이터의 패턴, 트렌드, 특징 등을 "
                "명확하고 이해하기 쉽게 설명해주세요."
            ),
            messages=[{
                "role": "user", 
                "content": f"질문: {request.query}\n\n데이터 컨텍스트:\n{context_str}"
            }],
        )
        
        text = "".join([b.text for b in message.content if getattr(b, "type", "") == "text"])
        return {"insight": text, "query": request.query}
        
    except Exception as e:
        return {
            "insight": f"AI 인사이트 생성 중 오류가 발생했습니다: {str(e)}",
            "error": str(e)
        }

# 내보내기 API
@app.post("/api/export")
def export_data(request: ExportRequest):
    """데이터 내보내기"""
    if request.format == "json":
        return {"data": request.data, "format": "json"}
    elif request.format == "csv":
        # CSV 변환 로직
        df = pd.DataFrame(request.data)
        csv_data = df.to_csv(index=False)
        return {"data": csv_data, "format": "csv"}
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")

# RAG API 제거됨 - 더미데이터만 사용

@app.get("/api/groups")
def get_groups(group_type: str = "cluster"):
    """그룹 목록 조회 (클러스터 또는 세그먼트)"""
    # Mock 데이터 - 실제로는 데이터베이스에서 조회
    if group_type == "cluster":
        groups = [
            {
                "id": "C1",
                "type": "cluster",
                "label": "C1 · 건강관리형",
                "count": 520,
                "percentage": 24.3,
                "color": "#2563EB",
                "description": "건강, 웰빙, 운동에 관심이 많고 자기계발에 적극적인 그룹. 프리미엄 건강식품과 피트니스 서비스에 높은 구매의향.",
                "tags": ["건강", "운동", "프리미엄", "자기계발", "웰빙", "영양제"],
                "evidence": ["주 3회 이상 운동하며 건강식품 정기구독", "피트니스 앱 사용 및 건강관리 적극적"],
                "qualityWarnings": []
            },
            {
                "id": "C2",
                "type": "cluster",
                "label": "C2 · 트렌디소비형",
                "count": 430,
                "percentage": 20.1,
                "color": "#7C3AED",
                "description": "최신 트렌드에 민감하며 패션, 뷰티에 관심 많음. SNS 활동 활발하고 브랜드 이미지 중시.",
                "tags": ["패션", "뷰티", "SNS", "트렌드", "브랜드", "스타일"],
                "qualityWarnings": []
            },
            {
                "id": "C3",
                "type": "cluster",
                "label": "C3 · 가성비추구형",
                "count": 380,
                "percentage": 17.8,
                "color": "#16A34A",
                "description": "합리적 소비를 추구하며 가격 대비 성능을 중시. 쿠폰과 할인 정보에 적극적.",
                "tags": ["가성비", "합리적", "할인", "쿠폰", "비교", "리뷰"],
                "qualityWarnings": ["low-coverage"]
            },
            {
                "id": "C4",
                "type": "cluster",
                "label": "C4 · 가족중심형",
                "count": 410,
                "percentage": 19.2,
                "color": "#F59E0B",
                "description": "가족과 자녀를 위한 소비에 집중. 교육, 육아 관련 제품과 서비스에 관심.",
                "tags": ["가족", "육아", "교육", "자녀", "안전", "품질"],
                "qualityWarnings": []
            },
            {
                "id": "C5",
                "type": "cluster",
                "label": "C5 · 문화향유형",
                "count": 400,
                "percentage": 18.7,
                "color": "#EC4899",
                "description": "OTT, 음악, 전시회 등 문화 콘텐츠 소비가 많음. 취미생활에 시간과 비용 투자.",
                "tags": ["OTT", "문화", "취미", "여행", "공연", "전시"],
                "qualityWarnings": ["low-sample"]
            }
        ]
    else:  # segment
        groups = [
            {
                "id": "S1",
                "type": "segment",
                "label": "S1 · 프리미엄 세그먼트",
                "count": 250,
                "percentage": 15.2,
                "color": "#DC2626",
                "description": "고소득층을 대상으로 한 프리미엄 제품과 서비스에 관심이 높은 세그먼트.",
                "tags": ["프리미엄", "고소득", "럭셔리", "브랜드", "품질"],
                "qualityWarnings": []
            }
        ]
    
    return {"groups": groups}

@app.post("/api/compare")
def compare_groups(request: ComparisonRequest):
    """그룹 비교 분석"""
    # Mock 비교 분석 데이터
    if request.analysis_type == "difference":
        return {
            "analysis_type": "difference",
            "group_a": {"id": request.group_a_id, "name": f"{request.group_a_id} 그룹"},
            "group_b": {"id": request.group_b_id, "name": f"{request.group_b_id} 그룹"},
            "data": [
                {"category": "여성", "groupA": 68, "groupB": 72, "delta": -4},
                {"category": "남성", "groupA": 32, "groupB": 28, "delta": 4},
                {"category": "20대", "groupA": 15, "groupB": 45, "delta": -30},
                {"category": "30대", "groupA": 45, "groupB": 35, "delta": 10},
                {"category": "40대", "groupA": 28, "groupB": 15, "delta": 13},
                {"category": "50대+", "groupA": 12, "groupB": 5, "delta": 7},
            ]
        }
    elif request.analysis_type == "lift":
        return {
            "analysis_type": "lift",
            "group_a": {"id": request.group_a_id, "name": f"{request.group_a_id} 그룹"},
            "group_b": {"id": request.group_b_id, "name": f"{request.group_b_id} 그룹"},
            "data": [
                {"feature": "건강식품 구매", "liftA": 2.4, "liftB": 0.8},
                {"feature": "피트니스 이용", "liftA": 3.1, "liftB": 1.2},
                {"feature": "프리미엄 브랜드", "liftA": 1.8, "liftB": 0.6},
                {"feature": "SNS 활동", "liftA": 1.2, "liftB": 2.8},
                {"feature": "패션/뷰티", "liftA": 0.7, "liftB": 2.9},
            ]
        }
    elif request.analysis_type == "smd":
        return {
            "analysis_type": "smd",
            "group_a": {"id": request.group_a_id, "name": f"{request.group_a_id} 그룹"},
            "group_b": {"id": request.group_b_id, "name": f"{request.group_b_id} 그룹"},
            "data": [
                {"metric": "월 평균 소비액", "groupA": 420000, "groupB": 280000, "smd": 0.82, "ci": [0.65, 0.99]},
                {"metric": "건강관심도 (1-5)", "groupA": 4.2, "groupB": 3.1, "smd": 0.71, "ci": [0.58, 0.84]},
                {"metric": "운동 횟수/주", "groupA": 3.8, "groupB": 1.9, "smd": 0.65, "ci": [0.52, 0.78]},
            ]
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid analysis type")
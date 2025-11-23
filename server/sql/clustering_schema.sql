-- ============================================================================
-- 클러스터링 데이터 스키마
-- NeonDB에 클러스터링 결과를 저장하기 위한 테이블 구조
-- ============================================================================

-- 스키마 생성 (필요한 경우)
-- CREATE SCHEMA IF NOT EXISTS clustering;

-- ============================================================================
-- 1. 클러스터링 세션 정보
-- ============================================================================
CREATE TABLE IF NOT EXISTS clustering_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 기본 정보
    n_samples INTEGER NOT NULL,
    n_clusters INTEGER NOT NULL,
    algorithm VARCHAR(50) NOT NULL, -- 'kmeans', 'minibatch_kmeans', 'hdbscan', 'auto'
    optimal_k INTEGER, -- 최적 K 값 (자동 선택 시)
    strategy VARCHAR(100), -- 사용된 전략
    
    -- 메트릭
    silhouette_score FLOAT,
    davies_bouldin_score FLOAT,
    calinski_harabasz_score FLOAT,
    
    -- 요청 파라미터 및 메타데이터 (JSONB)
    request_params JSONB, -- 요청 파라미터 (panel_ids, filter_params, processor_params, algorithm_params 등)
    feature_types JSONB, -- 피처 타입 정보 (bin_cols, cat_cols, num_cols)
    algorithm_info JSONB, -- 알고리즘 상세 정보 (features, k_scores 등)
    filter_info JSONB, -- 필터 정보
    processor_info JSONB, -- 프로세서 정보
    
    -- Precomputed 데이터 여부
    is_precomputed BOOLEAN NOT NULL DEFAULT FALSE,
    precomputed_name VARCHAR(100) -- Precomputed 데이터 이름 (예: 'hdbscan_default')
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_clustering_sessions_created_at ON clustering_sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clustering_sessions_is_precomputed ON clustering_sessions (is_precomputed);

-- ============================================================================
-- 2. 패널-클러스터 매핑
-- ============================================================================
CREATE TABLE IF NOT EXISTS panel_cluster_mappings (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES clustering_sessions(session_id) ON DELETE CASCADE,
    mb_sn VARCHAR(50) NOT NULL,
    cluster_id INTEGER NOT NULL, -- -1은 노이즈
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 제약조건: 한 세션에서 한 패널은 하나의 클러스터에만 속함
    CONSTRAINT unique_session_panel UNIQUE (session_id, mb_sn)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_panel_cluster_mappings_session_id ON panel_cluster_mappings (session_id);
CREATE INDEX IF NOT EXISTS idx_panel_cluster_mappings_mb_sn ON panel_cluster_mappings (mb_sn);
CREATE INDEX IF NOT EXISTS idx_panel_cluster_mappings_cluster_id ON panel_cluster_mappings (cluster_id);
CREATE INDEX IF NOT EXISTS idx_panel_cluster_mappings_session_cluster ON panel_cluster_mappings (session_id, cluster_id);

-- ============================================================================
-- 3. UMAP 좌표
-- ============================================================================
CREATE TABLE IF NOT EXISTS umap_coordinates (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES clustering_sessions(session_id) ON DELETE CASCADE,
    mb_sn VARCHAR(50) NOT NULL,
    umap_x FLOAT NOT NULL,
    umap_y FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 제약조건: 한 세션에서 한 패널은 하나의 좌표만 가짐
    CONSTRAINT unique_session_panel_coord UNIQUE (session_id, mb_sn)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_umap_coordinates_session_id ON umap_coordinates (session_id);
CREATE INDEX IF NOT EXISTS idx_umap_coordinates_mb_sn ON umap_coordinates (mb_sn);

-- ============================================================================
-- 4. 클러스터 프로필
-- ============================================================================
CREATE TABLE IF NOT EXISTS cluster_profiles (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES clustering_sessions(session_id) ON DELETE CASCADE,
    cluster_id INTEGER NOT NULL,
    size INTEGER NOT NULL, -- 클러스터 크기 (패널 수)
    percentage FLOAT NOT NULL, -- 전체 대비 비율 (%)
    name VARCHAR(200), -- 클러스터 이름
    tags TEXT[], -- 태그 배열
    distinctive_features JSONB, -- 특징적인 피처 정보
    insights TEXT[], -- 인사이트 텍스트 배열
    insights_by_category JSONB, -- 카테고리별 인사이트
    segments JSONB, -- 세그먼트 정보 (life_stage, value_level)
    features JSONB, -- 피처 평균값
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 제약조건: 한 세션에서 한 클러스터는 하나의 프로필만 가짐
    CONSTRAINT unique_session_cluster_profile UNIQUE (session_id, cluster_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_cluster_profiles_session_id ON cluster_profiles (session_id);
CREATE INDEX IF NOT EXISTS idx_cluster_profiles_cluster_id ON cluster_profiles (cluster_id);

-- ============================================================================
-- 5. 클러스터 메타데이터 (선택적)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cluster_metadata (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES clustering_sessions(session_id) ON DELETE CASCADE,
    cluster_id INTEGER NOT NULL,
    metadata JSONB NOT NULL, -- 유연한 메타데이터 구조
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 제약조건: 한 세션에서 한 클러스터는 하나의 메타데이터만 가짐
    CONSTRAINT unique_session_cluster_metadata UNIQUE (session_id, cluster_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_cluster_metadata_session_id ON cluster_metadata (session_id);
CREATE INDEX IF NOT EXISTS idx_cluster_metadata_cluster_id ON cluster_metadata (cluster_id);

-- ============================================================================
-- 6. 클러스터 비교 분석 (선택적)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cluster_comparisons (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES clustering_sessions(session_id) ON DELETE CASCADE,
    cluster_a INTEGER NOT NULL,
    cluster_b INTEGER NOT NULL,
    comparison_data JSONB NOT NULL, -- 비교 분석 결과
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 제약조건: 한 세션에서 같은 클러스터 쌍은 하나의 비교 결과만 가짐
    CONSTRAINT unique_session_cluster_pair UNIQUE (session_id, cluster_a, cluster_b),
    -- 제약조건: 같은 클러스터끼리는 비교 불가
    CONSTRAINT check_different_clusters CHECK (cluster_a != cluster_b)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_cluster_comparisons_session_id ON cluster_comparisons (session_id);
CREATE INDEX IF NOT EXISTS idx_cluster_comparisons_clusters ON cluster_comparisons (cluster_a, cluster_b);

-- ============================================================================
-- 업데이트 트리거 함수 (updated_at 자동 갱신)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_clustering_sessions_updated_at
    BEFORE UPDATE ON clustering_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cluster_profiles_updated_at
    BEFORE UPDATE ON cluster_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cluster_metadata_updated_at
    BEFORE UPDATE ON cluster_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cluster_comparisons_updated_at
    BEFORE UPDATE ON cluster_comparisons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 뷰 생성 (편의를 위한 뷰)
-- ============================================================================

-- 클러스터링 세션 요약 뷰
CREATE OR REPLACE VIEW clustering_sessions_summary AS
SELECT 
    cs.session_id,
    cs.created_at,
    cs.n_samples,
    cs.n_clusters,
    cs.algorithm,
    cs.silhouette_score,
    cs.davies_bouldin_score,
    cs.calinski_harabasz_score,
    cs.is_precomputed,
    cs.precomputed_name,
    COUNT(DISTINCT pcm.mb_sn) as actual_panel_count,
    COUNT(DISTINCT pcm.cluster_id) as actual_cluster_count
FROM clustering_sessions cs
LEFT JOIN panel_cluster_mappings pcm ON cs.session_id = pcm.session_id
GROUP BY cs.session_id, cs.created_at, cs.n_samples, cs.n_clusters, cs.algorithm,
         cs.silhouette_score, cs.davies_bouldin_score, cs.calinski_harabasz_score,
         cs.is_precomputed, cs.precomputed_name;

-- 클러스터별 패널 수 뷰
CREATE OR REPLACE VIEW cluster_panel_counts AS
SELECT 
    session_id,
    cluster_id,
    COUNT(*) as panel_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY session_id), 2) as percentage
FROM panel_cluster_mappings
WHERE cluster_id != -1  -- 노이즈 제외
GROUP BY session_id, cluster_id;

-- ============================================================================
-- 코멘트 추가 (테이블 설명)
-- ============================================================================
COMMENT ON TABLE clustering_sessions IS '클러스터링 세션 메타데이터';
COMMENT ON TABLE panel_cluster_mappings IS '패널-클러스터 매핑 정보';
COMMENT ON TABLE umap_coordinates IS 'UMAP 2D 좌표';
COMMENT ON TABLE cluster_profiles IS '클러스터 프로필 정보';
COMMENT ON TABLE cluster_metadata IS '클러스터 추가 메타데이터 (선택적)';
COMMENT ON TABLE cluster_comparisons IS '클러스터 비교 분석 결과 (선택적)';

COMMENT ON COLUMN clustering_sessions.session_id IS '세션 고유 ID (UUID)';
COMMENT ON COLUMN clustering_sessions.algorithm IS '사용된 알고리즘 (kmeans, minibatch_kmeans, hdbscan, auto)';
COMMENT ON COLUMN panel_cluster_mappings.cluster_id IS '클러스터 ID (-1은 노이즈)';
COMMENT ON COLUMN cluster_profiles.distinctive_features IS '특징적인 피처 정보 (JSONB 배열)';
COMMENT ON COLUMN cluster_profiles.insights_by_category IS '카테고리별 인사이트 (JSONB 객체)';
COMMENT ON COLUMN cluster_comparisons.comparison_data IS '비교 분석 결과 (JSONB 객체)';


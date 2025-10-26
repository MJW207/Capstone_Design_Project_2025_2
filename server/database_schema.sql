-- 패널 분석 시스템을 위한 데이터베이스 스키마

-- 1. 패널 데이터 테이블
CREATE TABLE IF NOT EXISTS panels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    age INTEGER NOT NULL,
    gender VARCHAR(10) NOT NULL,
    region VARCHAR(50) NOT NULL,
    income VARCHAR(50),
    responses JSONB,
    embedding VECTOR(1024),  -- pgvector 확장 사용
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 벡터 검색을 위한 인덱스
CREATE INDEX IF NOT EXISTS panels_embedding_idx ON panels 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- 3. 일반 검색을 위한 인덱스
CREATE INDEX IF NOT EXISTS panels_name_idx ON panels (name);
CREATE INDEX IF NOT EXISTS panels_gender_idx ON panels (gender);
CREATE INDEX IF NOT EXISTS panels_region_idx ON panels (region);
CREATE INDEX IF NOT EXISTS panels_age_idx ON panels (age);

-- 4. 클러스터링 결과 저장 테이블
CREATE TABLE IF NOT EXISTS clustering_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panel_id UUID REFERENCES panels(id),
    cluster_id INTEGER,
    cluster_confidence FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


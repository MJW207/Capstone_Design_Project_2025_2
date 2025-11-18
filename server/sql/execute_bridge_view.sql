-- 브릿지 뷰 생성 실행 스크립트
-- psql로 실행: \i server/sql/execute_bridge_view.sql
-- 또는 DBeaver에서 직접 실행

-- 1. testcl 스키마와 panel_embeddings 테이블 존재 확인
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'testcl') THEN
        RAISE EXCEPTION 'testcl 스키마가 존재하지 않습니다.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'testcl' AND table_name = 'panel_embeddings') THEN
        RAISE WARNING 'testcl.panel_embeddings 테이블이 존재하지 않습니다. 뷰 생성을 건너뜁니다.';
    ELSE
        -- 2. RawData 스키마 생성 (없으면)
        CREATE SCHEMA IF NOT EXISTS "RawData";
        
        -- 3. 브릿지 뷰 생성
        CREATE OR REPLACE VIEW "RawData".panel_embeddings_v AS
        SELECT
          mb_sn,
          demographics,
          combined_text,
          labeled_text,
          chunks,
          chunk_count,
          categories,
          all_labels,
          embedding,
          created_at
        FROM testcl.panel_embeddings;
        
        -- 4. 뷰 주석 추가
        COMMENT ON VIEW "RawData".panel_embeddings_v IS 
          'Bridge view from testcl.panel_embeddings to RawData schema for consistency';
        
        RAISE NOTICE '브릿지 뷰가 성공적으로 생성되었습니다: RawData.panel_embeddings_v';
    END IF;
END $$;

-- 5. 뷰 확인
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'RawData' 
  AND table_name = 'panel_embeddings_v';


































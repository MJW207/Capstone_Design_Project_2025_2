-- 빠른 확인 스크립트
-- psql에서 실행하여 필요한 정보 확인

-- ============================================
-- 1. testcl.panel_embeddings 존재 확인
-- ============================================
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'testcl' AND table_name = 'panel_embeddings'
        ) THEN '✓ testcl.panel_embeddings 테이블 존재'
        ELSE '✗ testcl.panel_embeddings 테이블 없음'
    END AS check_result;

-- ============================================
-- 2. 브릿지 뷰 존재 확인
-- ============================================
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.views 
            WHERE table_schema = 'RawData' AND table_name = 'panel_embeddings_v'
        ) THEN '✓ RawData.panel_embeddings_v 뷰 존재'
        ELSE '✗ RawData.panel_embeddings_v 뷰 없음 (생성 필요)'
    END AS check_result;

-- ============================================
-- 3. RawData 스키마 테이블 데이터 개수
-- ============================================
SELECT 
    'welcome_1st' AS table_name,
    COUNT(*) AS row_count
FROM "RawData".welcome_1st
UNION ALL
SELECT 
    'welcome_2nd',
    COUNT(*)
FROM "RawData".welcome_2nd
UNION ALL
SELECT 
    'quick_answer',
    COUNT(*)
FROM "RawData".quick_answer;

-- ============================================
-- 4. 샘플 데이터 확인
-- ============================================
SELECT 
    w1.mb_sn,
    w1.gender,
    w1."location",
    CASE 
        WHEN w1.birth_year IS NOT NULL AND w1.birth_year ~ '^[0-9]+$'
        THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, MAKE_DATE(w1.birth_year::int, 1, 1)))::int
        ELSE NULL 
    END AS age,
    LEFT(COALESCE(w2."data"::text, ''), 50) AS data_sample,
    LEFT(COALESCE(qa.answers::text, ''), 50) AS answers_sample
FROM "RawData".welcome_1st w1
LEFT JOIN "RawData".welcome_2nd w2 ON w1.mb_sn = w2.mb_sn
LEFT JOIN "RawData".quick_answer qa ON w1.mb_sn = qa.mb_sn
LIMIT 3;

-- ============================================
-- 5. testcl.panel_embeddings 구조 확인 (있는 경우)
-- ============================================
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'testcl' 
  AND table_name = 'panel_embeddings'
ORDER BY ordinal_position;















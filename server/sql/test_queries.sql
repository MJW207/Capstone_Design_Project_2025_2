-- 리팩토링된 쿼리 테스트 스크립트
-- 실제 DB에서 작동하는지 확인

SET search_path TO "RawData", public;

-- ============================================
-- 테스트 1: 기본 검색 쿼리 (쿼리 빌더와 동일)
-- ============================================
SELECT
  w1.mb_sn,
  w1.gender,
  CASE 
    WHEN COALESCE(NULLIF(w1.birth_year, ''), NULL) IS NOT NULL
         AND w1.birth_year ~ '^[0-9]+$'
    THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, MAKE_DATE(w1.birth_year::int, 1, 1)))::int
    ELSE NULL 
  END AS age_raw,
  w1."location" AS location,
  w1.detail_location,
  w2."data" AS w2_data,
  qa.answers AS qa_answers
FROM "RawData".welcome_1st w1
LEFT JOIN "RawData".welcome_2nd w2 ON w1.mb_sn = w2.mb_sn
LEFT JOIN "RawData".quick_answer qa ON w1.mb_sn = qa.mb_sn
WHERE 1=1
ORDER BY w1.mb_sn 
LIMIT 5;

-- ============================================
-- 테스트 2: 텍스트 검색 (JSONB 필드)
-- ============================================
SELECT
  w1.mb_sn,
  w1.gender,
  w1."location",
  LEFT(COALESCE(w2."data"::text, ''), 100) AS data_sample,
  LEFT(COALESCE(qa.answers::text, ''), 100) AS answers_sample
FROM "RawData".welcome_1st w1
LEFT JOIN "RawData".welcome_2nd w2 ON w1.mb_sn = w2.mb_sn
LEFT JOIN "RawData".quick_answer qa ON w1.mb_sn = qa.mb_sn
WHERE LOWER(COALESCE(w2."data"::text, '')) LIKE '%넷플릭스%' 
   OR LOWER(COALESCE(qa.answers::text, '')) LIKE '%넷플릭스%'
LIMIT 5;

-- ============================================
-- 테스트 3: 성별 필터
-- ============================================
SELECT
  w1.mb_sn,
  w1.gender,
  w1."location"
FROM "RawData".welcome_1st w1
WHERE LOWER(COALESCE(w1.gender, '')) IN ('남성', '여성')
LIMIT 10;

-- ============================================
-- 테스트 4: 지역 필터
-- ============================================
SELECT
  w1.mb_sn,
  w1."location",
  COUNT(*) OVER() AS total_count
FROM "RawData".welcome_1st w1
WHERE LOWER(COALESCE(w1."location", '')) LIKE '%서울%'
LIMIT 10;

-- ============================================
-- 테스트 5: 브릿지 뷰 확인 (패널 상세)
-- ============================================
-- 먼저 샘플 ID 하나 선택
SELECT mb_sn FROM "RawData".welcome_1st LIMIT 1;

-- 뷰가 있으면 테스트 (없으면 에러)
-- SELECT * FROM "RawData".panel_embeddings_v 
-- WHERE mb_sn = (SELECT mb_sn FROM "RawData".welcome_1st LIMIT 1);

-- ============================================
-- 테스트 6: COUNT 쿼리 (페이지네이션)
-- ============================================
SELECT COUNT(*) AS total_count
FROM "RawData".welcome_1st w1
LEFT JOIN "RawData".welcome_2nd w2 ON w1.mb_sn = w2.mb_sn
LEFT JOIN "RawData".quick_answer qa ON w1.mb_sn = qa.mb_sn
WHERE 1=1;






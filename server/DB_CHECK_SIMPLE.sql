-- ============================================
-- 빠른 확인용 간단한 쿼리 (우선 실행)
-- ============================================

-- 1. welcome_2nd.data의 모든 키 목록 (가장 중요!)
SELECT DISTINCT
    jsonb_object_keys(data) as key_name
FROM "RawData".welcome_2nd
WHERE data IS NOT NULL
ORDER BY key_name;

-- 2. quick_answer.answers의 모든 키 목록 (가장 중요!)
SELECT DISTINCT
    jsonb_object_keys(answers) as key_name
FROM "RawData".quick_answer
WHERE answers IS NOT NULL
ORDER BY key_name;

-- 3. welcome_2nd.data 샘플 (실제 데이터 확인)
SELECT 
    mb_sn,
    data
FROM "RawData".welcome_2nd
LIMIT 3;

-- 4. quick_answer.answers 샘플 (실제 데이터 확인)
SELECT 
    mb_sn,
    answers
FROM "RawData".quick_answer
LIMIT 3;

-- 5. 3개 테이블 모두에 데이터가 있는 패널 ID 샘플
SELECT 
    w1.mb_sn
FROM "RawData".welcome_1st w1
WHERE EXISTS (SELECT 1 FROM "RawData".welcome_2nd w2 WHERE w2.mb_sn = w1.mb_sn)
  AND EXISTS (SELECT 1 FROM "RawData".quick_answer qa WHERE qa.mb_sn = w1.mb_sn)
LIMIT 10;






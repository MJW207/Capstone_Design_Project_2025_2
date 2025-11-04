-- ============================================
-- DB 구조 확인 쿼리문
-- RawData 스키마의 실제 데이터 구조를 확인하기 위한 쿼리들
-- ============================================

-- 1. welcome_1st 테이블 샘플 데이터 확인 (기본 구조)
SELECT 
    mb_sn,
    gender,
    birth_year,
    location,
    detail_location
FROM "RawData".welcome_1st
LIMIT 5;

-- 2. welcome_2nd.data JSONB 구조 확인 (가장 중요!)
-- income_personal, income_household 필드가 있는지 확인
SELECT 
    w2.mb_sn,
    w2.data,
    w2.data->>'income_personal' as income_personal,
    w2.data->>'income_household' as income_household,
    -- data JSONB의 모든 키 목록 확인
    jsonb_object_keys(w2.data) as data_keys
FROM "RawData".welcome_2nd w2
LIMIT 5;

-- 3. welcome_2nd.data의 모든 키 목록 확인 (중복 제거)
SELECT DISTINCT
    jsonb_object_keys(data) as key_name
FROM "RawData".welcome_2nd
WHERE data IS NOT NULL
ORDER BY key_name;

-- 4. quick_answer.answers JSONB 구조 확인
SELECT 
    qa.mb_sn,
    qa.answers,
    -- answers JSONB의 모든 키 목록 확인
    jsonb_object_keys(qa.answers) as answer_keys,
    -- 키 개수 (chunk_count)
    (SELECT COUNT(*) FROM jsonb_object_keys(qa.answers)) as chunk_count
FROM "RawData".quick_answer qa
LIMIT 5;

-- 5. quick_answer.answers의 모든 키 목록 확인 (중복 제거)
SELECT DISTINCT
    jsonb_object_keys(answers) as key_name
FROM "RawData".quick_answer
WHERE answers IS NOT NULL
ORDER BY key_name;

-- 6. quick_answer.answers에서 실제 답변 내용 샘플 확인
SELECT 
    mb_sn,
    jsonb_object_keys(answers) as question_key,
    answers->jsonb_object_keys(answers) as answer_value
FROM "RawData".quick_answer
LIMIT 10;

-- 7. 카테고리 정보 확인 (건강, 뷰티, 패션 등이 어디에 있는지)
-- welcome_2nd.data에서 카테고리 관련 키 확인
SELECT 
    mb_sn,
    data->'category' as category,
    data->'categories' as categories,
    data->'tags' as tags,
    data->'labels' as labels,
    data::text
FROM "RawData".welcome_2nd
WHERE data IS NOT NULL
LIMIT 5;

-- 8. 전체 조인 샘플 데이터 확인 (3개 테이블 조인)
SELECT 
    w1.mb_sn,
    w1.gender,
    w1.birth_year,
    w1.location,
    w2.data,
    qa.answers
FROM "RawData".welcome_1st w1
LEFT JOIN "RawData".welcome_2nd w2 ON w1.mb_sn = w2.mb_sn
LEFT JOIN "RawData".quick_answer qa ON w1.mb_sn = qa.mb_sn
LIMIT 3;

-- 9. 실제 사용 가능한 패널 ID 샘플 (3개 테이블 모두에 데이터가 있는 경우)
SELECT 
    w1.mb_sn
FROM "RawData".welcome_1st w1
WHERE EXISTS (SELECT 1 FROM "RawData".welcome_2nd w2 WHERE w2.mb_sn = w1.mb_sn)
  AND EXISTS (SELECT 1 FROM "RawData".quick_answer qa WHERE qa.mb_sn = w1.mb_sn)
LIMIT 10;

-- 10. 각 테이블의 행 수 확인
SELECT 
    'welcome_1st' as table_name,
    COUNT(*) as row_count
FROM "RawData".welcome_1st
UNION ALL
SELECT 
    'welcome_2nd' as table_name,
    COUNT(*) as row_count
FROM "RawData".welcome_2nd
UNION ALL
SELECT 
    'quick_answer' as table_name,
    COUNT(*) as row_count
FROM "RawData".quick_answer;















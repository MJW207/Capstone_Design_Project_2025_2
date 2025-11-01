-- JSONB 조회 최적화를 위한 GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_quick_answer_answers_gin
ON "RawData".quick_answer USING GIN (answers);

CREATE INDEX IF NOT EXISTS idx_welcome2_data_gin
ON "RawData".welcome_2nd USING GIN ("data");

-- 조인/필터 키를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_w1_mb_sn ON "RawData".welcome_1st (mb_sn);
CREATE INDEX IF NOT EXISTS idx_w2_mb_sn ON "RawData".welcome_2nd (mb_sn);
CREATE INDEX IF NOT EXISTS idx_qa_mb_sn ON "RawData".quick_answer (mb_sn);

-- 필터링을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_w1_gender ON "RawData".welcome_1st (gender);
CREATE INDEX IF NOT EXISTS idx_w1_location ON "RawData".welcome_1st ("location");
CREATE INDEX IF NOT EXISTS idx_w1_birth_year ON "RawData".welcome_1st (birth_year) WHERE birth_year IS NOT NULL;


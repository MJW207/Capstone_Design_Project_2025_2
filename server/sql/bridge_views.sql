-- RawData에서 panel_embeddings를 볼 수 있도록 브릿지 뷰 생성
-- 이 뷰를 통해 testcl.panel_embeddings를 RawData 스키마에서 접근 가능

CREATE SCHEMA IF NOT EXISTS "RawData";

-- testcl.panel_embeddings를 RawData 스키마에서 접근할 수 있는 뷰 생성
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

-- 뷰에 대한 주석 추가
COMMENT ON VIEW "RawData".panel_embeddings_v IS 
  'Bridge view from testcl.panel_embeddings to RawData schema for consistency';


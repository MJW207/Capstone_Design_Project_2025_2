-- Bridge view creation (no Korean comments to avoid encoding issues)
-- This view exposes testcl.panel_embeddings in RawData schema

CREATE SCHEMA IF NOT EXISTS "RawData";

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

COMMENT ON VIEW "RawData".panel_embeddings_v IS 
  'Bridge view from testcl.panel_embeddings to RawData schema for consistency';































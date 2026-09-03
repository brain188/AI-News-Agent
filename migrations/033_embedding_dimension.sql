DROP INDEX IF EXISTS idx_article_analysis_embedding;

ALTER TABLE article_analysis ALTER COLUMN embedding TYPE vector(384);

CREATE INDEX idx_article_analysis_embedding ON article_analysis
    USING hnsw (embedding vector_cosine_ops);
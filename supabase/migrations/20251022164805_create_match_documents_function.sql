/*
  # Create Vector Similarity Search Function

  ## Overview
  Creates a PostgreSQL function for performing semantic search using vector embeddings.

  ## Function Details
  - `match_documents` - Finds document chunks similar to a query embedding
    - Parameters:
      - query_embedding (vector) - The embedded query vector
      - match_threshold (float) - Minimum similarity score (0-1)
      - match_count (int) - Maximum number of results to return
    - Returns: Document chunks ordered by similarity score

  ## Purpose
  Enables the chatbot to find relevant document chunks based on semantic similarity
  to user queries, which forms the basis of RAG (Retrieval Augmented Generation).
*/

CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_text text,
  page_number int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.chunk_text,
    document_chunks.page_number,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity
  FROM document_chunks
  WHERE 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

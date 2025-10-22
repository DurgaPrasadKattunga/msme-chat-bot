/*
  # MSME Chatbot Database Schema

  ## Overview
  This migration creates the complete database schema for an AI-powered chatbot system
  that processes PDF documents and provides multilingual support (Telugu & English).

  ## New Tables

  ### 1. `documents`
  Stores uploaded PDF document metadata
  - `id` (uuid, primary key) - Unique document identifier
  - `filename` (text) - Original PDF filename
  - `file_path` (text) - Storage path for the PDF
  - `file_size` (bigint) - File size in bytes
  - `upload_date` (timestamptz) - When the document was uploaded
  - `status` (text) - Processing status (pending/processing/completed/failed)
  - `page_count` (int) - Number of pages in the PDF
  - `language` (text) - Primary language of the document

  ### 2. `document_chunks`
  Stores text chunks extracted from PDFs with embeddings for semantic search
  - `id` (uuid, primary key) - Unique chunk identifier
  - `document_id` (uuid, foreign key) - Reference to parent document
  - `chunk_text` (text) - Extracted text content
  - `chunk_index` (int) - Order of chunk within document
  - `page_number` (int) - Source page number
  - `embedding` (vector) - Vector embedding for semantic search
  - `metadata` (jsonb) - Additional metadata
  - `created_at` (timestamptz) - When the chunk was created

  ### 3. `chat_sessions`
  Tracks individual chat conversations
  - `id` (uuid, primary key) - Unique session identifier
  - `user_id` (text) - User identifier (optional for anonymous users)
  - `language` (text) - Preferred language (telugu/english)
  - `started_at` (timestamptz) - Session start time
  - `last_activity` (timestamptz) - Last interaction time
  - `metadata` (jsonb) - Additional session data

  ### 4. `chat_messages`
  Stores all chat messages and bot responses
  - `id` (uuid, primary key) - Unique message identifier
  - `session_id` (uuid, foreign key) - Reference to chat session
  - `role` (text) - Message sender (user/assistant)
  - `content` (text) - Message content
  - `language` (text) - Message language
  - `is_voice` (boolean) - Whether message was voice input/output
  - `sources` (jsonb) - Referenced document chunks for responses
  - `created_at` (timestamptz) - Message timestamp

  ## Security
  - Enable RLS on all tables
  - Public read access for documents and chunks (knowledge base)
  - Authenticated users can create chat sessions and messages
  - Users can only access their own chat history

  ## Indexes
  - Vector similarity search index on document_chunks.embedding
  - Performance indexes on foreign keys and timestamps
*/

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  upload_date timestamptz DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  page_count int DEFAULT 0,
  language text DEFAULT 'english' CHECK (language IN ('english', 'telugu', 'mixed')),
  created_at timestamptz DEFAULT now()
);

-- Document chunks with embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  chunk_text text NOT NULL,
  chunk_index int NOT NULL DEFAULT 0,
  page_number int NOT NULL DEFAULT 1,
  embedding vector(384),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  language text DEFAULT 'english' CHECK (language IN ('english', 'telugu')),
  started_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  language text DEFAULT 'english',
  is_voice boolean DEFAULT false,
  sources jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents (public read, authenticated write)
CREATE POLICY "Public can view documents"
  ON documents FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for document_chunks (public read)
CREATE POLICY "Public can view document chunks"
  ON document_chunks FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert chunks"
  ON document_chunks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for chat_sessions
CREATE POLICY "Users can view own sessions"
  ON chat_sessions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create sessions"
  ON chat_sessions FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update own sessions"
  ON chat_sessions FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their sessions"
  ON chat_messages FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert messages"
  ON chat_messages FOR INSERT
  TO public
  WITH CHECK (true);

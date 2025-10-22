export interface Document {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  upload_date: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  page_count: number;
  language: 'english' | 'telugu' | 'mixed';
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_text: string;
  chunk_index: number;
  page_number: number;
  embedding: number[];
  metadata: Record<string, any>;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id?: string;
  language: 'english' | 'telugu';
  started_at: string;
  last_activity: string;
  metadata: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  language: string;
  is_voice: boolean;
  sources: MessageSource[];
  created_at: string;
}

export interface MessageSource {
  documentId: string;
  chunkId: string;
  pageNumber: number;
  similarity: number;
}

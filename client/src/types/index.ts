export interface WalrusBlob {
  blobId: string;
  size: number;
  uploadedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface StoredDocument {
  id: string;
  blobId: string;
  filename: string;
  content: string;
  metadata: {
    uploadedAt: Date;
    fileType: string;
    size: number;
    owner?: string;
    isEncrypted?: boolean;
    accessPolicy?: string;
  };
}

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  metadata: Record<string, unknown>;
}

export interface RAGQuery {
  query: string;
  topK?: number;
  filter?: Record<string, unknown>;
}

export interface RAGResult {
  answer: string;
  sources: Array<{
    blobId: string;
    filename: string;
    content: string;
    score: number;
  }>;
  metadata: {
    processingTime: number;
    documentsRetrieved: number;
  };
}

export interface AccessControlPolicy {
  documentId: string;
  owner: string;
  allowedUsers: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

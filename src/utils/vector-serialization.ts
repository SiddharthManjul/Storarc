/**
 * Vector Serialization Utilities
 * Handles efficient serialization/deserialization of embeddings for Walrus storage
 */

export interface SerializedVectorStore {
  version: string;
  embeddingModel: string;
  dimensions: number;
  vectors: SerializedVector[];
  createdAt: string;
}

export interface SerializedVector {
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
}

/**
 * Serialize vectors to JSON format for Walrus storage
 */
export function serializeVectors(vectors: SerializedVector[], metadata: {
  embeddingModel: string;
  dimensions: number;
}): string {
  const data: SerializedVectorStore = {
    version: '1.0',
    embeddingModel: metadata.embeddingModel,
    dimensions: metadata.dimensions,
    vectors,
    createdAt: new Date().toISOString(),
  };

  return JSON.stringify(data);
}

/**
 * Deserialize vectors from Walrus storage
 */
export function deserializeVectors(data: string): SerializedVectorStore {
  const parsed = JSON.parse(data);

  // Validate structure
  if (!parsed.version || !parsed.vectors || !Array.isArray(parsed.vectors)) {
    throw new Error('Invalid serialized vector format');
  }

  return parsed as SerializedVectorStore;
}

/**
 * Convert MemoryVectorStore vectors to serializable format
 */
export function convertMemoryVectorsToSerializable(
  memoryVectors: any[]
): SerializedVector[] {
  return memoryVectors.map(vec => ({
    content: vec.content,
    embedding: vec.embedding,
    metadata: vec.metadata || {},
  }));
}

/**
 * Compress vectors using simple techniques
 * (For production, consider using better compression like msgpack or protobuf)
 */
export function compressVectors(vectors: SerializedVector[]): Buffer {
  const json = JSON.stringify(vectors);
  // For now, just convert to buffer. In production, add gzip compression
  return Buffer.from(json, 'utf-8');
}

/**
 * Decompress vectors
 */
export function decompressVectors(data: Buffer): SerializedVector[] {
  // For now, just parse JSON. In production, add gzip decompression
  const json = data.toString('utf-8');
  return JSON.parse(json);
}

/**
 * Calculate size of serialized vectors
 */
export function calculateVectorSize(vectors: SerializedVector[]): number {
  const json = JSON.stringify(vectors);
  return Buffer.from(json, 'utf-8').length;
}

/**
 * Split large vector sets into chunks for efficient Walrus storage
 * (Walrus has blob size limits)
 */
export function chunkVectors(
  vectors: SerializedVector[],
  maxChunkSize: number = 10 * 1024 * 1024 // 10MB default
): SerializedVector[][] {
  const chunks: SerializedVector[][] = [];
  let currentChunk: SerializedVector[] = [];
  let currentSize = 0;

  for (const vector of vectors) {
    const vectorSize = Buffer.from(JSON.stringify(vector), 'utf-8').length;

    if (currentSize + vectorSize > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 0;
    }

    currentChunk.push(vector);
    currentSize += vectorSize;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Merge vector chunks back together
 */
export function mergeVectorChunks(chunks: SerializedVector[][]): SerializedVector[] {
  return chunks.flat();
}

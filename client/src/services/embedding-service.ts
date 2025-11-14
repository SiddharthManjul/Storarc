import { OpenAIEmbeddings } from '@langchain/openai';
import { config } from '@/config';
import { EmbeddingResult } from '../types/index.js';

export class EmbeddingService {
  private embeddings: OpenAIEmbeddings;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.openai.apiKey,
      modelName: config.openai.embeddingModel,
    });
  }

  /**
   * Generate embeddings for a single text
   */
  async generateEmbedding(text: string, metadata: Record<string, any> = {}): Promise<EmbeddingResult> {
    const embedding = await this.embeddings.embedQuery(text);
    return {
      embedding,
      text,
      metadata,
    };
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(
    texts: string[],
    metadata: Record<string, any>[] = []
  ): Promise<EmbeddingResult[]> {
    const embeddings = await this.embeddings.embedDocuments(texts);

    return embeddings.map((embedding, index) => ({
      embedding,
      text: texts[index],
      metadata: metadata[index] || {},
    }));
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}

// Singleton instance
export const embeddingService = new EmbeddingService();

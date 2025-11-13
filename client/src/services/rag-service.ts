import { ChatOpenAI } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { walrusClient } from '@/services/walrus-client.js';
import { vectorStoreService } from '@/services/vector-store.js';
import { suiVectorRegistry } from '@/services/sui-vector-registry.js';
import { config } from '@/services/config';
import { RAGQuery, RAGResult, StoredDocument } from '../types/index.js';

export class RAGService {
  private llm: ChatOpenAI;

  constructor() {
    this.llm = new ChatOpenAI({
      openAIApiKey: config.openai.apiKey,
      modelName: config.openai.chatModel,
      temperature: 0.3,  // Some models don't support temperature: 0
    });
  }

  /**
   * Process a RAG query
   */
  async query(query: RAGQuery): Promise<RAGResult> {
    const startTime = Date.now();
    const topK = query.topK || config.rag.topK;

    console.log(`\n🔍 Processing query: "${query.query}"`);
    console.log(`   Retrieving top ${topK} documents...\n`);

    try {
      // Step 1: Search vector store for similar documents
      const searchResults = await vectorStoreService.similaritySearch(
        query.query,
        topK,
        query.filter
      );

      if (searchResults.length === 0) {
        return {
          answer: 'I could not find any relevant documents to answer your question.',
          sources: [],
          metadata: {
            processingTime: Date.now() - startTime,
            documentsRetrieved: 0,
          },
        };
      }

      console.log(`✓ Found ${searchResults.length} relevant documents from vector store\n`);

      // Step 2: Retrieve full documents from Walrus
      const sources = await Promise.all(
        searchResults.map(async ({ document, score }) => {
          const blobId = document.metadata.blobId;
          const filename = document.metadata.filename || 'unknown';

          try {
            // Retrieve full content from Walrus
            const content = await walrusClient.getBlobAsString(blobId);

            console.log(`✓ Retrieved: ${filename} (score: ${score.toFixed(3)}, blob: ${blobId.substring(0, 8)}...)`);

            return {
              blobId,
              filename,
              content,
              score,
            };
          } catch (error) {
            console.warn(`⚠ Failed to retrieve blob ${blobId}:`, error);
            return null;
          }
        })
      );

      // Filter out failed retrievals
      const validSources = sources.filter((s): s is NonNullable<typeof s> => s !== null);

      if (validSources.length === 0) {
        return {
          answer: 'I found relevant documents but could not retrieve them from storage.',
          sources: [],
          metadata: {
            processingTime: Date.now() - startTime,
            documentsRetrieved: 0,
          },
        };
      }

      // Step 3: Generate answer using LLM with context
      console.log(`\n💭 Generating answer with ${validSources.length} documents...\n`);

      const context = validSources
        .map((source, index) =>
          `Document ${index + 1} (${source.filename}):\n${source.content}\n`
        )
        .join('\n---\n\n');

      const prompt = ChatPromptTemplate.fromMessages([
        ['system', 'You are a helpful assistant that answers questions based on the provided context. ' +
                   'Always cite which document(s) you used to answer. ' +
                   'If the context does not contain enough information to answer the question, say so.'],
        ['user', `Context:\n\n{context}\n\n---\n\nQuestion: {question}\n\nAnswer:`],
      ]);

      const chain = RunnableSequence.from([
        prompt,
        this.llm,
        new StringOutputParser(),
      ]);

      const answer = await chain.invoke({
        context,
        question: query.query,
      });

      const processingTime = Date.now() - startTime;

      console.log(`✓ Answer generated in ${processingTime}ms\n`);

      return {
        answer,
        sources: validSources,
        metadata: {
          processingTime,
          documentsRetrieved: validSources.length,
        },
      };

    } catch (error) {
      console.error('RAG query failed:', error);
      throw error;
    }
  }

  /**
   * Ingest a document into the RAG system
   */
  async ingestDocument(content: string, metadata: {
    filename: string;
    fileType?: string;
  }): Promise<StoredDocument> {
    console.log(`\n📄 Ingesting document: ${metadata.filename}`);

    try {
      // Step 1: Upload to Walrus
      console.log('   Uploading to Walrus...');
      const blob = await walrusClient.uploadBlob(content);
      console.log(`   ✓ Uploaded to Walrus: ${blob.blobId}`);

      // Step 2: Create chunks for embedding
      const chunks = this.chunkDocument(content);
      console.log(`   ✓ Created ${chunks.length} chunks`);

      // Step 3: Create Langchain documents with metadata
      const documents = chunks.map((chunk, index) =>
        new Document({
          pageContent: chunk,
          metadata: {
            blobId: blob.blobId,
            filename: metadata.filename,
            fileType: metadata.fileType || 'text/plain',
            chunkIndex: index,
            totalChunks: chunks.length,
            uploadedAt: blob.uploadedAt.toISOString(),
          },
        })
      );

      // Step 4: Add to vector store (this generates embeddings)
      console.log('   Adding to vector store...');
      await vectorStoreService.addDocuments(documents);
      console.log(`   ✓ Added ${documents.length} embeddings to vector store`);

      // Step 5: Register in Sui if configured (hybrid mode)
      if (suiVectorRegistry.isConfigured()) {
        try {
          console.log('   Registering in Sui vector registry...');
          const store = vectorStoreService.getStore();

          // Get the vectors for this document
          const docVectors = store.memoryVectors.filter(
            (v: any) => v.metadata.filename === metadata.filename
          );

          // Register vectors in Sui + upload to Walrus
          await suiVectorRegistry.addDocument({
            filename: metadata.filename,
            vectors: docVectors,
            documentBlobId: blob.blobId,
            embeddingModel: config.openai.embeddingModel,
          });

          console.log('   ✓ Registered in Sui registry');
        } catch (error) {
          console.warn('   ⚠️  Failed to register in Sui (continuing anyway):', error);
        }
      }

      const storedDoc: StoredDocument = {
        id: blob.blobId,
        blobId: blob.blobId,
        filename: metadata.filename,
        content,
        metadata: {
          uploadedAt: blob.uploadedAt,
          fileType: metadata.fileType || 'text/plain',
          size: blob.size,
        },
      };

      console.log(`✅ Document ingested successfully!\n`);

      return storedDoc;

    } catch (error) {
      console.error('Document ingestion failed:', error);
      throw error;
    }
  }

  /**
   * Chunk document into smaller pieces for embedding
   */
  private chunkDocument(content: string): string[] {
    const { chunkSize, chunkOverlap } = config.rag;
    const chunks: string[] = [];

    // Simple chunking by characters
    // For production, consider using Langchain's text splitters
    for (let i = 0; i < content.length; i += (chunkSize - chunkOverlap)) {
      const chunk = content.slice(i, i + chunkSize);
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
    }

    return chunks.length > 0 ? chunks : [content];
  }
}

// Singleton instance
export const ragService = new RAGService();

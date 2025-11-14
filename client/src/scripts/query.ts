#!/usr/bin/env node
/**
 * Quick query script
 * Usage: npm run query "What is dVector?"
 */

import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
loadEnv({ path: resolve(process.cwd(), '.env.local') });

import { vectorStoreService } from '../services/vector-store';
import { ragService } from '../services/rag-service';

async function main() {
  const question = process.argv[2];

  if (!question) {
    console.error('Usage: npm run query "Your question here"');
    process.exit(1);
  }

  try {
    console.log(`\n🔍 Question: ${question}\n`);

    // Initialize vector store if needed
    if (!vectorStoreService.isInitialized()) {
      console.log('Initializing vector store...');
      await vectorStoreService.initialize();
    }

    const stats = vectorStoreService.getStats();
    if (stats.totalVectors === 0) {
      console.log('⚠️  No documents in vector store. Please ingest documents first.');
      process.exit(1);
    }

    console.log('Searching...\n');

    const result = await ragService.query({ query: question, topK: 4 });

    console.log('📝 Answer:');
    console.log(result.answer);

    console.log('\n📚 Sources:');
    result.sources.forEach((source, i) => {
      console.log(`\n  ${i + 1}. ${source.filename} (score: ${source.score.toFixed(3)})`);
      console.log(`     ${source.content.substring(0, 150)}...`);
    });

    console.log(`\n✓ Query completed in ${result.metadata.processingTime}ms\n`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();

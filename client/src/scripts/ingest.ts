#!/usr/bin/env node
/**
 * Quick ingest script
 * Usage: npm run ingest path/to/document.txt
 */

import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
loadEnv({ path: resolve(process.cwd(), '.env.local') });

import { vectorStoreService } from '../services/vector-store';
import { ragService } from '../services/rag-service';
import * as fs from 'fs/promises';
import * as path from 'path';

async function main() {
  const filepath = process.argv[2];

  if (!filepath) {
    console.error('Usage: npm run ingest path/to/document.txt');
    process.exit(1);
  }

  try {
    // Read file
    console.log(`\n📄 Reading file: ${filepath}`);
    const content = await fs.readFile(filepath, 'utf-8');
    const filename = path.basename(filepath);

    console.log(`✓ Loaded ${filename} (${content.length} characters)\n`);

    // Initialize vector store if needed
    if (!vectorStoreService.isInitialized()) {
      console.log('Initializing vector store...');
      await vectorStoreService.initialize();
    }

    console.log('Ingesting document...\n');

    const result = await ragService.ingestDocument(content, { filename });

    console.log('✅ Document ingested successfully!');
    console.log(`   Filename: ${result.filename}`);
    console.log(`   Blob ID: ${result.blobId}`);
    console.log(`   Size: ${result.metadata.size} bytes`);

    const stats = vectorStoreService.getStats();
    console.log(`\n📊 Total vectors in store: ${stats.totalVectors}\n`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();

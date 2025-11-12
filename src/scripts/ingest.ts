#!/usr/bin/env tsx

import { ragService } from '../services/rag-service.js';
import { vectorStoreService } from '../services/vector-store.js';
import { validateConfig } from '../config/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const DOCUMENTS_DIR = './documents';

async function ingestDocuments() {
  console.log('📚 dVector Document Ingestion\n');

  validateConfig();

  try {
    // Initialize vector store
    console.log('Initializing vector store...');
    await vectorStoreService.initialize();
    console.log('');

    // Check documents directory
    try {
      await fs.access(DOCUMENTS_DIR);
    } catch {
      console.error(`❌ Documents directory not found: ${DOCUMENTS_DIR}`);
      console.log('\nCreate it and add some documents:');
      console.log(`  mkdir -p ${DOCUMENTS_DIR}`);
      console.log(`  echo "Your document content" > ${DOCUMENTS_DIR}/example.txt`);
      process.exit(1);
    }

    // Read all files from documents directory
    const files = await fs.readdir(DOCUMENTS_DIR);
    const textFiles = files.filter(f =>
      f.endsWith('.txt') ||
      f.endsWith('.md') ||
      f.endsWith('.json')
    );

    if (textFiles.length === 0) {
      console.error(`❌ No supported files found in ${DOCUMENTS_DIR}`);
      console.log('\nSupported formats: .txt, .md, .json');
      process.exit(1);
    }

    console.log(`Found ${textFiles.length} documents to ingest:\n`);
    textFiles.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    console.log('');

    // Ingest each document
    const results = [];
    for (const file of textFiles) {
      const filePath = path.join(DOCUMENTS_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');

      const fileType = file.endsWith('.json') ? 'application/json' :
                       file.endsWith('.md') ? 'text/markdown' :
                       'text/plain';

      const result = await ragService.ingestDocument(content, {
        filename: file,
        fileType,
      });

      results.push(result);
    }

    console.log('─'.repeat(60));
    console.log('✅ Ingestion Complete!\n');
    console.log(`📊 Summary:`);
    console.log(`   Documents ingested: ${results.length}`);
    console.log(`   Total size: ${results.reduce((sum, r) => sum + r.metadata.size, 0)} bytes`);
    console.log('');
    console.log('💡 Next steps:');
    console.log('   Run queries: npm run query');
    console.log('');
    console.log('📋 Blob IDs (for reference):');
    results.forEach(r => {
      console.log(`   ${r.filename}: ${r.blobId}`);
    });
    console.log('');

  } catch (error) {
    console.error('\n❌ Ingestion failed:', error);
    process.exit(1);
  }
}

ingestDocuments();

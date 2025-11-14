#!/usr/bin/env node
/**
 * Interactive CLI for dVector Backend
 * Test all API endpoints from the terminal
 */

import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
loadEnv({ path: resolve(process.cwd(), '.env.local') });

import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { vectorStoreService } from '../services/vector-store';
import { ragService } from '../services/rag-service';
import { suiVectorRegistry } from '../services/sui-vector-registry';
import { documentLoader } from '../services/document-loader';
import { config, validateConfig } from '../config';

const rl = readline.createInterface({ input, output });

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function print(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function printHeader(title: string) {
  console.log('\n' + '='.repeat(60));
  print(title, colors.bright + colors.cyan);
  console.log('='.repeat(60) + '\n');
}

async function showStatus() {
  printHeader('📊 System Status');

  try {
    // Config validation
    const isValid = validateConfig();
    print(`Config Valid: ${isValid ? '✅ Yes' : '❌ No'}`, isValid ? colors.green : colors.red);
    print(`Sui Network: ${config.sui.network}`, colors.blue);
    print(`Registry ID: ${config.sui.vectorRegistryObjectId.substring(0, 20)}...`, colors.blue);

    // Registry stats
    const registryStats = await suiVectorRegistry.getRegistryStats();
    print(`\nRegistry Documents: ${registryStats.totalDocuments}`, colors.cyan);
    print(`Registry Version: ${registryStats.version}`, colors.cyan);

    // Local cache stats
    const localStats = vectorStoreService.getStats();
    print(`\nLocal Vectors: ${localStats.totalVectors}`, colors.cyan);
    print(`Cache Version: ${localStats.version}`, colors.cyan);
    print(`Cache Initialized: ${localStats.isInitialized ? 'Yes' : 'No'}`, colors.cyan);
    print(`Cache Stale: ${registryStats.version > localStats.version ? 'Yes' : 'No'}`,
      registryStats.version > localStats.version ? colors.yellow : colors.green);
  } catch (error) {
    print(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red);
  }
}

async function queryDocuments() {
  printHeader('🔍 Query Documents');

  const question = await rl.question('Enter your question: ');

  if (!question.trim()) {
    print('Question cannot be empty', colors.red);
    return;
  }

  try {
    // Initialize if needed
    if (!vectorStoreService.isInitialized()) {
      print('Initializing vector store...', colors.yellow);
      await vectorStoreService.initialize();
    }

    const stats = vectorStoreService.getStats();
    if (stats.totalVectors === 0) {
      print('No documents in vector store. Please sync or ingest documents first.', colors.yellow);
      return;
    }

    print('\nSearching...', colors.yellow);
    const startTime = Date.now();

    const result = await ragService.query({ query: question, topK: 4 });
    const duration = Date.now() - startTime;

    print('\n📝 Answer:', colors.green + colors.bright);
    print(result.answer, colors.green);

    print('\n📚 Sources:', colors.cyan);
    result.sources.forEach((source, i) => {
      print(`\n  ${i + 1}. ${source.filename} (score: ${source.score.toFixed(3)})`, colors.blue);
      print(`     ${source.content.substring(0, 150)}...`, colors.reset);
    });

    print(`\n⏱️  Duration: ${duration}ms`, colors.yellow);
  } catch (error) {
    print(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red);
  }
}

async function ingestDocument() {
  printHeader('📄 Ingest Document');

  print(`Supported formats: ${documentLoader.getSupportedExtensions().join(', ')}`, colors.cyan);
  const filepath = await rl.question('\nEnter file path (or press Enter for inline content): ');

  let content: string;
  let filename: string;
  let fileType: string = 'text/plain';

  if (filepath.trim()) {
    try {
      const trimmedPath = filepath.trim();
      filename = trimmedPath.split('/').pop() || 'document.txt';

      // Check if file is supported
      if (!documentLoader.isSupported(filename)) {
        print(`Unsupported file type. Supported: ${documentLoader.getSupportedExtensions().join(', ')}`, colors.red);
        return;
      }

      // Use document loader for supported file types
      const { content: loadedContent, metadata } = await documentLoader.loadDocument(trimmedPath);
      content = loadedContent;
      fileType = metadata.fileType;

      print(`✓ Loaded ${filename} (${content.length} characters)`, colors.green);
      if (metadata.pageCount) {
        print(`✓ Pages: ${metadata.pageCount}`, colors.green);
      }
    } catch (error) {
      print(`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red);
      return;
    }
  } else {
    filename = await rl.question('Enter filename: ');
    print('Enter content (type END on a new line when done):', colors.yellow);
    const lines: string[] = [];

    while (true) {
      const line = await rl.question('');
      if (line === 'END') break;
      lines.push(line);
    }

    content = lines.join('\n');
  }

  if (!content.trim()) {
    print('Content cannot be empty', colors.red);
    return;
  }

  try {
    // Initialize if needed
    if (!vectorStoreService.isInitialized()) {
      print('Initializing vector store...', colors.yellow);
      await vectorStoreService.initialize();
    }

    print('\nIngesting document...', colors.yellow);
    const result = await ragService.ingestDocument(content, { filename, fileType });

    print('\n✅ Document ingested successfully!', colors.green);
    print(`   Filename: ${result.filename}`, colors.blue);
    print(`   File Type: ${fileType}`, colors.blue);
    print(`   Blob ID: ${result.blobId}`, colors.blue);
    print(`   Size: ${result.metadata.size} bytes`, colors.blue);
  } catch (error) {
    print(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red);
  }
}

async function syncCache() {
  printHeader('🔄 Sync Cache');

  try {
    print('Syncing from Sui registry...', colors.yellow);

    if (!vectorStoreService.isInitialized()) {
      await vectorStoreService.initialize();
    }

    const wasSynced = await vectorStoreService.syncIfStale();

    if (wasSynced) {
      const stats = vectorStoreService.getStats();
      print(`✅ Cache synced successfully!`, colors.green);
      print(`   Total vectors: ${stats.totalVectors}`, colors.blue);
      print(`   Version: ${stats.version}`, colors.blue);
    } else {
      print('✓ Cache is already up to date', colors.green);
    }
  } catch (error) {
    print(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red);
  }
}

async function showMenu() {
  console.log('\n');
  print('╔════════════════════════════════════════════════╗', colors.bright);
  print('║          dVector Backend CLI v1.0              ║', colors.bright + colors.cyan);
  print('╚════════════════════════════════════════════════╝', colors.bright);
  console.log('');
  print('1. Show Status', colors.blue);
  print('2. Query Documents', colors.blue);
  print('3. Ingest Document', colors.blue);
  print('4. Sync Cache', colors.blue);
  print('5. Exit', colors.blue);
  console.log('');
}

async function main() {
  print('\n🚀 Welcome to dVector Backend CLI!', colors.bright + colors.green);

  // Validate config on startup
  const isValid = validateConfig();
  if (!isValid) {
    print('\n⚠️  Configuration is incomplete. Some features may not work.', colors.yellow);
  }

  let running = true;

  while (running) {
    await showMenu();
    const choice = await rl.question('Select an option (1-5): ');

    switch (choice.trim()) {
      case '1':
        await showStatus();
        break;
      case '2':
        await queryDocuments();
        break;
      case '3':
        await ingestDocument();
        break;
      case '4':
        await syncCache();
        break;
      case '5':
        print('\n👋 Goodbye!', colors.green);
        running = false;
        break;
      default:
        print('Invalid option. Please select 1-5.', colors.red);
    }

    if (running) {
      await rl.question('\nPress Enter to continue...');
    }
  }

  rl.close();
  process.exit(0);
}

// Handle errors
process.on('uncaughtException', (error) => {
  print(`\nFatal error: ${error.message}`, colors.red);
  process.exit(1);
});

process.on('SIGINT', () => {
  print('\n\n👋 Goodbye!', colors.green);
  process.exit(0);
});

// Run CLI
main().catch((error) => {
  print(`Error: ${error.message}`, colors.red);
  process.exit(1);
});

/**
 * Backend API Configuration
 * Loads from environment variables
 */

import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local (for CLI scripts)
// This is safe to call multiple times - dotenv will only load once
loadEnv({ path: resolve(process.cwd(), '.env.local') });

export const config = {
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    embeddingModel: 'text-embedding-3-small',
    chatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    temperature: 0.3,
  },

  // Sui Blockchain Configuration
  sui: {
    network: process.env.SUI_NETWORK || process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet',
    rpcUrl: process.env.SUI_RPC_URL || process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
    privateKey: process.env.SUI_PRIVATE_KEY || '',
    vectorRegistryPackageId: process.env.VECTOR_REGISTRY_PACKAGE_ID || '',
    vectorRegistryObjectId: process.env.VECTOR_REGISTRY_OBJECT_ID || '',
    chatRegistryPackageId: process.env.CHAT_REGISTRY_PACKAGE_ID || '',
    chatRegistryObjectId: process.env.CHAT_REGISTRY_OBJECT_ID || '',
    documentRegistryPackageId: process.env.DOCUMENT_REGISTRY_PACKAGE_ID || process.env.NEXT_PUBLIC_DOCUMENT_REGISTRY_PACKAGE_ID || '',
    accessControlPackageId: process.env.ACCESS_CONTROL_PACKAGE_ID || process.env.NEXT_PUBLIC_ACCESS_CONTROL_PACKAGE_ID || '',
  },

  // Walrus Configuration
  walrus: {
    publisherUrl: process.env.WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space',
    aggregatorUrl: process.env.WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space',
    storageEpochs: 5,
  },

  // Vector Store Configuration
  vectorStore: {
    path: process.env.VECTOR_DB_PATH || './data/vector-store',
    autoSyncInterval: 5 * 60 * 1000, // 5 minutes
    dimensions: 1536, // text-embedding-3-small dimensions
  },

  // RAG Configuration
  rag: {
    topK: 4, // Number of documents to retrieve
    chunkSize: 1000, // Characters per chunk
    chunkOverlap: 200, // Overlap between chunks
  },

  // API Configuration
  api: {
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    maxRequestSize: '10mb',
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
  },

  // SEAL Configuration (Simple Encrypted Application Library)
  seal: {
    accessControlPackageId: process.env.NEXT_PUBLIC_ACCESS_CONTROL_PACKAGE_ID ||
                           process.env.ACCESS_CONTROL_PACKAGE_ID || '',
    keyServerIds: (process.env.NEXT_PUBLIC_SEAL_KEY_SERVER_IDS || '').split(',').filter(id => id && !id.includes('TODO')),
    threshold: parseInt(process.env.NEXT_PUBLIC_SEAL_THRESHOLD || '2'),
    verifyServers: process.env.NEXT_PUBLIC_SEAL_VERIFY_SERVERS === 'true',
    sessionTTLMinutes: parseInt(process.env.SEAL_SESSION_TTL_MINUTES || '60'),
  },
};

/**
 * Validate required configuration
 */
export function validateConfig() {
  const required = {
    'OPENAI_API_KEY': config.openai.apiKey,
    'VECTOR_REGISTRY_PACKAGE_ID': config.sui.vectorRegistryPackageId,
    'VECTOR_REGISTRY_OBJECT_ID': config.sui.vectorRegistryObjectId,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.warn('Some features may not work correctly.');
  }

  return missing.length === 0;
}

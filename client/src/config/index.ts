/**
 * Backend API Configuration
 * Loads from environment variables
 */

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
    network: process.env.SUI_NETWORK || 'testnet',
    rpcUrl: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
    privateKey: process.env.SUI_PRIVATE_KEY || '',
    vectorRegistryPackageId: process.env.VECTOR_REGISTRY_PACKAGE_ID || '',
    vectorRegistryObjectId: process.env.VECTOR_REGISTRY_OBJECT_ID || '',
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

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const config = {
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    embeddingModel: 'text-embedding-3-small',
    chatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
  },

  // Sui Configuration
  sui: {
    network: process.env.SUI_NETWORK || 'testnet',
    privateKey: process.env.SUI_PRIVATE_KEY || '',
    rpcUrl: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
    // Vector Registry smart contract
    vectorRegistryPackageId: process.env.VECTOR_REGISTRY_PACKAGE_ID || '',
    vectorRegistryObjectId: process.env.VECTOR_REGISTRY_OBJECT_ID || '',
  },

  // Walrus Configuration
  walrus: {
    apiUrl: process.env.WALRUS_API_URL || 'https://walrus-testnet-api.mystenlabs.com',
    publisherUrl: process.env.WALRUS_PUBLISHER_URL || 'https://walrus-testnet-publisher.mystenlabs.com',
    aggregatorUrl: process.env.WALRUS_AGGREGATOR_URL || 'https://walrus-testnet-aggregator.mystenlabs.com',
    epochs: 5, // Storage duration in epochs
  },

  // Vector Database Configuration
  vectorDb: {
    path: process.env.VECTOR_DB_PATH || join(__dirname, '../../data/vector-store'),
    dimensions: 1536, // OpenAI text-embedding-3-small dimensions
  },

  // RAG Configuration
  rag: {
    topK: 4, // Number of documents to retrieve
    chunkSize: 1000,
    chunkOverlap: 200,
  },
};

export function validateConfig() {
  const errors: string[] = [];

  if (!config.openai.apiKey) {
    errors.push('OPENAI_API_KEY is required');
  }

  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(err => console.error(`  - ${err}`));
    console.error('\nPlease check your .env file');
    process.exit(1);
  }
}

# dVector Client

Next.js application with integrated backend for decentralized RAG (Retrieval-Augmented Generation) using Walrus storage and Sui blockchain.

## 🚀 Features

- **Decentralized Storage**: Documents stored on Walrus
- **Blockchain Registry**: Metadata tracked on Sui blockchain
- **Vector Search**: Local RAG with OpenAI embeddings
- **Interactive CLI**: Terminal-based document management
- **API Routes**: Next.js API for programmatic access

## 📦 Installation

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your API keys and configuration
```

## ⚙️ Configuration

Create a `.env.local` file with the following variables:

```env
# OpenAI API (for embeddings and LLM)
OPENAI_API_KEY="your-openai-api-key"

# Sui Configuration
SUI_NETWORK=testnet
SUI_PRIVATE_KEY="your-sui-private-key"

# Walrus Configuration
WALRUS_API_URL="https://walrus-testnet-api.mystenlabs.com"
WALRUS_PUBLISHER_URL="https://publisher.walrus-testnet.walrus.space"
WALRUS_AGGREGATOR_URL="https://aggregator.walrus-testnet.walrus.space"

# Vector Registry (from your deployed Sui contracts)
VECTOR_REGISTRY_PACKAGE_ID="your-package-id"
VECTOR_REGISTRY_OBJECT_ID="your-registry-object-id"

# Vector DB Configuration
VECTOR_DB_PATH="./data/vector-store"
```

## 🎯 Usage

### Next.js Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the web interface.

### CLI Commands

#### 1. Interactive CLI

Full-featured terminal interface with menu options:

```bash
npm run cli
```

Features:
- Show system status
- Query documents
- Ingest documents (interactive)
- Sync cache from Sui registry

#### 2. Auto-Ingest Documents

**Automatically ingest all files from the `documents/` folder:**

```bash
npm run ingest
```

This will:
- Scan the `documents/` folder
- Upload each document to Walrus
- Create embeddings with OpenAI
- Store vectors locally
- Register metadata in Sui blockchain

**Add files to ingest:**

```bash
# 1. Place your documents in the documents folder
cp your-document.txt documents/
cp your-markdown.md documents/

# 2. Run the auto-ingest
npm run ingest
```

**Supported file formats:**
- Text files (.txt)
- Markdown (.md)
- Any UTF-8 encoded text file

#### 3. Quick Query

Query the vector store from command line:

```bash
npm run query "What is dVector?"
```

#### 4. Sync Cache

Sync local cache from Sui registry:

```bash
npm run sync
```

## 📁 Project Structure

```
client/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── api/          # API routes
│   │   └── page.tsx      # Home page
│   ├── config/           # Configuration
│   ├── scripts/          # CLI scripts
│   │   ├── cli.ts        # Interactive CLI
│   │   ├── ingest.ts     # Auto-ingest script
│   │   ├── query.ts      # Quick query
│   │   └── sync.ts       # Cache sync
│   ├── services/         # Core services
│   │   ├── vector-store.ts      # Vector storage
│   │   ├── rag-service.ts       # RAG logic
│   │   ├── walrus-client.ts     # Walrus integration
│   │   ├── sui-client.ts        # Sui blockchain
│   │   └── sui-vector-registry.ts
│   └── utils/            # Utilities
├── documents/            # 📄 Place documents here for auto-ingest
├── data/                 # Local vector store cache
└── package.json
```

## 🔄 Workflow

### Backend Testing (Current Setup)

1. **Add Documents**

Place documents in the `documents/` folder:

```bash
echo "Your content here" > documents/my-document.txt
```

2. **Auto-Ingest All Documents**

```bash
npm run ingest
```

The script will automatically:
- Find all files in `documents/`
- Upload to Walrus
- Create embeddings
- Register in Sui blockchain
- Add to local vector store

3. **Query Documents**

```bash
# Interactive query
npm run cli
# Select option 2: Query Documents

# Or quick query
npm run query "your question here"
```

4. **Sync from Sui Registry**

If you want to pull latest data from the blockchain:

```bash
npm run sync
```

### Frontend Integration (Coming Soon)

The frontend will use the same backend services through Next.js API routes.

## 📝 API Routes

### POST /api/ingest

Upload and ingest a document:

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Your document content",
    "filename": "document.txt"
  }'
```

### POST /api/query

Query the vector store:

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is this about?",
    "topK": 4
  }'
```

### GET /api/sync

Sync cache from Sui registry:

```bash
curl http://localhost:3000/api/sync
```

### GET /api/status

Get system status:

```bash
curl http://localhost:3000/api/status
```

## 🔧 Development

### Build for Production

```bash
npm run build
npm run start
```

### Lint Code

```bash
npm run lint
```

## 🐛 Troubleshooting

### Missing Environment Variables

If you see warnings about missing environment variables:

1. Make sure `.env.local` exists in the client directory
2. Verify all required variables are set
3. Restart the CLI/server after updating environment variables

### Sui Registry Failures

If Sui transactions fail:
- Check that your `SUI_PRIVATE_KEY` is correct and has testnet SUI
- Verify `VECTOR_REGISTRY_PACKAGE_ID` and `VECTOR_REGISTRY_OBJECT_ID` are correct
- The system will continue working with local cache even if Sui fails

### Walrus Upload Issues

If Walrus uploads fail:
- Verify Walrus testnet is accessible
- Check that your environment variables for Walrus URLs are correct
- Try again - testnet may have occasional downtime

### No Documents Found

If `npm run ingest` shows no files:
- Make sure you have files in the `documents/` folder
- Check that files are text-based (not binary)
- Hidden files (starting with `.`) are automatically skipped

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Walrus Documentation](https://docs.walrus.site/)
- [Sui Documentation](https://docs.sui.io/)
- [LangChain Documentation](https://js.langchain.com/)

## 🎓 Example Usage

```bash
# 1. Add some documents
echo "dVector is a decentralized RAG system" > documents/intro.txt
echo "Walrus provides decentralized storage" > documents/walrus.txt

# 2. Ingest all documents
npm run ingest

# Expected output:
# ✅ Successful: 2
# ❌ Failed: 0
# 📦 Total vectors in store: X

# 3. Query the documents
npm run query "What is dVector?"

# Expected output:
# 📝 Answer: dVector is a decentralized RAG system...
# 📚 Sources: intro.txt, walrus.txt

# 4. Use interactive CLI for more options
npm run cli
```

## 🚧 Current Status

- ✅ Vector storage and retrieval
- ✅ Walrus integration
- ✅ Sui blockchain registry
- ✅ CLI tools for testing
- ✅ Auto-ingest from documents folder
- ✅ API routes
- 🚧 Frontend UI (in progress)

---

**Version**: 1.0.0
**License**: MIT

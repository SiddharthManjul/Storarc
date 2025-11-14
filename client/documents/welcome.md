# Welcome to dVector!

This is a sample document to test the RAG system.

## What is dVector?

dVector is a decentralized RAG (Retrieval-Augmented Generation) system that uses:

- **Walrus**: Decentralized blob storage on Sui blockchain
- **Seal**: Access control and encryption for sensitive documents
- **FAISS**: Fast vector similarity search
- **Langchain**: RAG pipeline orchestration
- **OpenAI**: Embeddings and language models

## Key Features

1. **Cost-Effective Storage**: 80-100x cheaper than traditional cloud storage
2. **Decentralized**: No single point of failure
3. **Access Control**: Permission-based document access with Seal
4. **Fast Retrieval**: Sub-50ms document retrieval from Walrus
5. **Scalable**: Handle millions of documents

## How It Works

When you ask a question:
1. Your query is converted to an embedding vector
2. Similar document chunks are found in the vector store
3. Full documents are retrieved from Walrus storage
4. The LLM generates an answer using the retrieved context

## Getting Started

Try asking questions like:
- "What is dVector?"
- "What are the key features?"
- "How does it work?"

Happy querying! 🎉

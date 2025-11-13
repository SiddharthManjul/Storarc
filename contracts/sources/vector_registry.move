
// Sui Move Smart Contract for Vector Registry
// Stores metadata about document vectors and their Walrus blob IDs

module WalRag::vector_registry {
    use sui::table::{Self, Table};
    use sui::event;
    use std::string::{Self, String};

    /// Main registry object storing all document vector metadata
    public struct VectorRegistry has key {
        id: UID,
        /// Maps document filename to its metadata
        documents: Table<String, DocumentVectorInfo>,
        /// Total number of documents in registry
        total_documents: u64,
        /// Version number (increments on each update)
        version: u64,
        /// Registry owner
        owner: address,
        /// Creation timestamp
        created_at: u64,
    }

    /// Metadata for a document's vectors stored on Walrus
    public struct DocumentVectorInfo has store, drop, copy {
        /// Walrus blob ID containing the serialized vectors
        vector_blob_id: String,
        /// Walrus blob ID containing the full document
        document_blob_id: String,
        /// Number of chunks/vectors for this document
        chunk_count: u64,
        /// Embedding model used
        embedding_model: String,
        /// Document owner
        owner: address,
        /// Upload timestamp
        uploaded_at: u64,
        /// Optional access policy ID reference
        access_policy_id: Option<address>,
    }

    /// Event emitted when a new document is added to the registry
    public struct DocumentAdded has copy, drop {
        registry_id: address,
        filename: String,
        vector_blob_id: String,
        document_blob_id: String,
        chunk_count: u64,
        owner: address,
        version: u64,
    }

    /// Event emitted when a document is updated
    public struct DocumentUpdated has copy, drop {
        registry_id: address,
        filename: String,
        vector_blob_id: String,
        version: u64,
    }

    /// Event emitted when a document is removed
    public struct DocumentRemoved has copy, drop {
        registry_id: address,
        filename: String,
        owner: address,
        version: u64,
    }

    /// Event emitted when registry version changes
    public struct RegistryVersionUpdated has copy, drop {
        registry_id: address,
        old_version: u64,
        new_version: u64,
    }

    /// Error codes
    const E_NOT_OWNER: u64 = 1;
    const E_DOCUMENT_EXISTS: u64 = 2;
    const E_DOCUMENT_NOT_FOUND: u64 = 3;
    const E_INVALID_CHUNK_COUNT: u64 = 4;

    /// Create a new vector registry (shared object)
    entry fun create_registry(ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let timestamp = tx_context::epoch(ctx);

        let registry = VectorRegistry {
            id: object::new(ctx),
            documents: table::new(ctx),
            total_documents: 0,
            version: 1,
            owner: sender,
            created_at: timestamp,
        };

        // Share the registry so anyone can read it
        transfer::share_object(registry);
    }

    /// Add a new document's vector metadata to the registry
    entry fun add_document(
        registry: &mut VectorRegistry,
        filename: vector<u8>,
        vector_blob_id: vector<u8>,
        document_blob_id: vector<u8>,
        chunk_count: u64,
        embedding_model: vector<u8>,
        access_policy_id: Option<address>,
        ctx: &TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let timestamp = tx_context::epoch(ctx);

        assert!(chunk_count > 0, E_INVALID_CHUNK_COUNT);

        let filename_str = string::utf8(filename);
        assert!(!table::contains(&registry.documents, filename_str), E_DOCUMENT_EXISTS);

        let doc_info = DocumentVectorInfo {
            vector_blob_id: string::utf8(vector_blob_id),
            document_blob_id: string::utf8(document_blob_id),
            chunk_count,
            embedding_model: string::utf8(embedding_model),
            owner: sender,
            uploaded_at: timestamp,
            access_policy_id,
        };

        table::add(&mut registry.documents, filename_str, doc_info);
        registry.total_documents = registry.total_documents + 1;

        // Increment version
        let old_version = registry.version;
        registry.version = registry.version + 1;

        // Emit events
        event::emit(DocumentAdded {
            registry_id: object::uid_to_address(&registry.id),
            filename: filename_str,
            vector_blob_id: doc_info.vector_blob_id,
            document_blob_id: doc_info.document_blob_id,
            chunk_count,
            owner: sender,
            version: registry.version,
        });

        event::emit(RegistryVersionUpdated {
            registry_id: object::uid_to_address(&registry.id),
            old_version,
            new_version: registry.version,
        });
    }

    /// Update an existing document's vector blob ID (for re-indexing)
    entry fun update_document_vectors(
        registry: &mut VectorRegistry,
        filename: vector<u8>,
        new_vector_blob_id: vector<u8>,
        new_chunk_count: u64,
        ctx: &TxContext  // Used for epoch timestamp
    ) {
        let sender = tx_context::sender(ctx);
        let filename_str = string::utf8(filename);

        assert!(table::contains(&registry.documents, filename_str), E_DOCUMENT_NOT_FOUND);

        let doc_info = table::borrow_mut(&mut registry.documents, filename_str);
        assert!(doc_info.owner == sender, E_NOT_OWNER);
        assert!(new_chunk_count > 0, E_INVALID_CHUNK_COUNT);

        doc_info.vector_blob_id = string::utf8(new_vector_blob_id);
        doc_info.chunk_count = new_chunk_count;
        doc_info.uploaded_at = tx_context::epoch(ctx);

        // Increment version
        let old_version = registry.version;
        registry.version = registry.version + 1;

        event::emit(DocumentUpdated {
            registry_id: object::uid_to_address(&registry.id),
            filename: filename_str,
            vector_blob_id: doc_info.vector_blob_id,
            version: registry.version,
        });

        event::emit(RegistryVersionUpdated {
            registry_id: object::uid_to_address(&registry.id),
            old_version,
            new_version: registry.version,
        });
    }

    /// Remove a document from the registry
    entry fun remove_document(
        registry: &mut VectorRegistry,
        filename: vector<u8>,
        ctx: &TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let filename_str = string::utf8(filename);

        assert!(table::contains(&registry.documents, filename_str), E_DOCUMENT_NOT_FOUND);

        let doc_info = table::borrow(&registry.documents, filename_str);
        assert!(doc_info.owner == sender, E_NOT_OWNER);

        table::remove(&mut registry.documents, filename_str);
        registry.total_documents = registry.total_documents - 1;

        // Increment version
        let old_version = registry.version;
        registry.version = registry.version + 1;

        event::emit(DocumentRemoved {
            registry_id: object::uid_to_address(&registry.id),
            filename: filename_str,
            owner: sender,
            version: registry.version,
        });

        event::emit(RegistryVersionUpdated {
            registry_id: object::uid_to_address(&registry.id),
            old_version,
            new_version: registry.version,
        });
    }

    /// Get document vector info (view function)
    public fun get_document_info(
        registry: &VectorRegistry,
        filename: String
    ): &DocumentVectorInfo {
        assert!(table::contains(&registry.documents, filename), E_DOCUMENT_NOT_FOUND);
        table::borrow(&registry.documents, filename)
    }

    /// Check if document exists in registry (view function)
    public fun document_exists(
        registry: &VectorRegistry,
        filename: String
    ): bool {
        table::contains(&registry.documents, filename)
    }

    /// Get registry stats (view function)
    public fun get_registry_stats(registry: &VectorRegistry): (u64, u64, address) {
        (registry.total_documents, registry.version, registry.owner)
    }

    /// Get registry version (view function)
    public fun get_version(registry: &VectorRegistry): u64 {
        registry.version
    }

    // Accessor functions for DocumentVectorInfo
    public fun get_vector_blob_id(info: &DocumentVectorInfo): String {
        info.vector_blob_id
    }

    public fun get_document_blob_id(info: &DocumentVectorInfo): String {
        info.document_blob_id
    }

    public fun get_chunk_count(info: &DocumentVectorInfo): u64 {
        info.chunk_count
    }

    public fun get_embedding_model(info: &DocumentVectorInfo): String {
        info.embedding_model
    }

    public fun get_owner(info: &DocumentVectorInfo): address {
        info.owner
    }

    public fun get_uploaded_at(info: &DocumentVectorInfo): u64 {
        info.uploaded_at
    }

    public fun get_access_policy_id(info: &DocumentVectorInfo): Option<address> {
        info.access_policy_id
    }
}

// Deployment Instructions:
//
// 1. Build the contract:
//    cd contracts && sui move build
//
// 2. Deploy to testnet:
//    sui client publish --gas-budget 100000000
//
// 3. Create a registry instance:
//    sui client call --package <PACKAGE_ID> --module vector_registry \
//      --function create_registry --gas-budget 10000000
//
// 4. Save the registry object ID for use in your application
//
// 5. Update src/config/index.ts with:
//    - VECTOR_REGISTRY_PACKAGE_ID
//    - VECTOR_REGISTRY_OBJECT_ID

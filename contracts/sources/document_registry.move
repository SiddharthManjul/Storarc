// Sui Move Smart Contract for Document Registry
// Users pay gas fees to register documents on-chain

module WalRag::document_registry {
    use sui::table::{Self, Table};
    use sui::event;
    use std::string::String;

    /// Error codes
    const E_NOT_OWNER: u64 = 1;
    const E_DOCUMENT_NOT_FOUND: u64 = 2;
    const E_INVALID_HASH: u64 = 3;

    /// Document metadata stored on-chain
    public struct DocumentInfo has store, copy, drop {
        document_id: String,
        filename: String,
        file_hash: vector<u8>,      // SHA-256 hash
        file_size: u64,
        file_type: String,
        walrus_blob_id: String,      // Walrus storage reference
        owner: address,
        uploaded_at: u64,            // Epoch timestamp
    }

    /// User's document registry
    public struct DocumentRegistry has key {
        id: UID,
        owner: address,
        documents: Table<String, DocumentInfo>,
        total_documents: u64,
        total_size: u64,             // Total bytes uploaded
        created_at: u64,
    }

    /// Event emitted when document is registered
    public struct DocumentRegistered has copy, drop {
        document_id: String,
        owner: address,
        filename: String,
        file_size: u64,
        walrus_blob_id: String,
        timestamp: u64,
    }

    /// Event emitted when document is deleted
    public struct DocumentDeleted has copy, drop {
        document_id: String,
        owner: address,
        timestamp: u64,
    }

    /// Create a new document registry for user
    public entry fun create_registry(ctx: &mut TxContext) {
        let registry = DocumentRegistry {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            documents: table::new(ctx),
            total_documents: 0,
            total_size: 0,
            created_at: tx_context::epoch(ctx),
        };

        transfer::share_object(registry);
    }

    /// Register a new document (USER PAYS GAS)
    public entry fun register_document(
        registry: &mut DocumentRegistry,
        document_id: String,
        filename: String,
        file_hash: vector<u8>,
        file_size: u64,
        file_type: String,
        walrus_blob_id: String,
        ctx: &mut TxContext
    ) {
        // Verify ownership
        let sender = tx_context::sender(ctx);
        assert!(registry.owner == sender, E_NOT_OWNER);

        // Verify hash length (SHA-256 = 32 bytes)
        assert!(vector::length(&file_hash) == 32, E_INVALID_HASH);

        // Create document info
        let doc_info = DocumentInfo {
            document_id,
            filename,
            file_hash,
            file_size,
            file_type,
            walrus_blob_id,
            owner: sender,
            uploaded_at: tx_context::epoch(ctx),
        };

        // Add to registry
        table::add(&mut registry.documents, document_id, doc_info);
        registry.total_documents = registry.total_documents + 1;
        registry.total_size = registry.total_size + file_size;

        // Emit event
        event::emit(DocumentRegistered {
            document_id,
            owner: sender,
            filename,
            file_size,
            walrus_blob_id,
            timestamp: tx_context::epoch(ctx),
        });
    }

    /// Delete a document
    public entry fun delete_document(
        registry: &mut DocumentRegistry,
        document_id: String,
        ctx: &TxContext
    ) {
        // Verify ownership
        let sender = tx_context::sender(ctx);
        assert!(registry.owner == sender, E_NOT_OWNER);

        // Check document exists
        assert!(table::contains(&registry.documents, document_id), E_DOCUMENT_NOT_FOUND);

        // Get document info for size update
        let doc_info = table::borrow(&registry.documents, document_id);
        let file_size = doc_info.file_size;

        // Remove from registry
        table::remove(&mut registry.documents, document_id);
        registry.total_documents = registry.total_documents - 1;
        registry.total_size = registry.total_size - file_size;

        // Emit event
        event::emit(DocumentDeleted {
            document_id,
            owner: sender,
            timestamp: tx_context::epoch(ctx),
        });
    }

    /// Get document count
    public fun get_document_count(registry: &DocumentRegistry): u64 {
        registry.total_documents
    }

    /// Get total size
    public fun get_total_size(registry: &DocumentRegistry): u64 {
        registry.total_size
    }

    /// Check if document exists
    public fun has_document(registry: &DocumentRegistry, document_id: String): bool {
        table::contains(&registry.documents, document_id)
    }
}

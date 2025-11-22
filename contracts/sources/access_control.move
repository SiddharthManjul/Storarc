// Sui Move Smart Contract for Document Access Control
// Day 3 Implementation

module WalRag::access_control {
    use sui::event;

    /// Represents an access control policy for a document
    public struct AccessPolicy has key, store {
        id: UID,
        document_id: vector<u8>,      // Walrus blob ID
        owner: address,
        is_public: bool,
        allowed_users: vector<address>,
        created_at: u64,
        updated_at: u64,
    }

    /// Event emitted when a policy is created
    public struct PolicyCreated has copy, drop {
        policy_id: address,
        document_id: vector<u8>,
        owner: address,
        is_public: bool,
    }

    /// Event emitted when access is granted
    public struct AccessGranted has copy, drop {
        policy_id: address,
        document_id: vector<u8>,
        user: address,
        granted_by: address,
    }

    /// Event emitted when access is revoked
    public struct AccessRevoked has copy, drop {
        policy_id: address,
        document_id: vector<u8>,
        user: address,
        revoked_by: address,
    }

    /// Error codes
    const E_NOT_OWNER: u64 = 1;
    const E_ALREADY_HAS_ACCESS: u64 = 2;
    const E_NO_ACCESS: u64 = 3;

    /// Create a new access policy for a document
    entry fun create_policy(
        document_id: vector<u8>,
        is_public: bool,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let timestamp = tx_context::epoch(ctx);

        let policy = AccessPolicy {
            id: object::new(ctx),
            document_id,
            owner: sender,
            is_public,
            allowed_users: vector::empty(),
            created_at: timestamp,
            updated_at: timestamp,
        };

        let policy_address = object::uid_to_address(&policy.id);

        event::emit(PolicyCreated {
            policy_id: policy_address,
            document_id,
            owner: sender,
            is_public,
        });

        transfer::share_object(policy);
    }

    /// Grant access to a user
    entry fun grant_access(
        policy: &mut AccessPolicy,
        user: address,
        ctx: &TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == policy.owner, E_NOT_OWNER);
        assert!(!vector::contains(&policy.allowed_users, &user), E_ALREADY_HAS_ACCESS);

        vector::push_back(&mut policy.allowed_users, user);
        policy.updated_at = tx_context::epoch(ctx);

        event::emit(AccessGranted {
            policy_id: object::uid_to_address(&policy.id),
            document_id: policy.document_id,
            user,
            granted_by: sender,
        });
    }

    /// Revoke access from a user
    entry fun revoke_access(
        policy: &mut AccessPolicy,
        user: address,
        ctx: &TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == policy.owner, E_NOT_OWNER);

        let (exists, index) = vector::index_of(&policy.allowed_users, &user);
        assert!(exists, E_NO_ACCESS);

        vector::remove(&mut policy.allowed_users, index);
        policy.updated_at = tx_context::epoch(ctx);

        event::emit(AccessRevoked {
            policy_id: object::uid_to_address(&policy.id),
            document_id: policy.document_id,
            user,
            revoked_by: sender,
        });
    }

    /// Make a document public
    entry fun make_public(
        policy: &mut AccessPolicy,
        ctx: &TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == policy.owner, E_NOT_OWNER);

        policy.is_public = true;
        policy.updated_at = tx_context::epoch(ctx);
    }

    /// Make a document private
    entry fun make_private(
        policy: &mut AccessPolicy,
        ctx: &TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == policy.owner, E_NOT_OWNER);

        policy.is_public = false;
        policy.updated_at = tx_context::epoch(ctx);
    }

    /// Check if a user has access (view function)
    public fun has_access(
        policy: &AccessPolicy,
        user: address
    ): bool {
        // Owner always has access
        if (user == policy.owner) {
            return true
        };

        // Public documents are accessible to all
        if (policy.is_public) {
            return true
        };

        // Check if user is in allowed list
        vector::contains(&policy.allowed_users, &user)
    }

    /// Get policy details (view function)
    public fun get_policy_info(policy: &AccessPolicy): (vector<u8>, address, bool, u64) {
        (policy.document_id, policy.owner, policy.is_public, policy.updated_at)
    }

    /// SEAL approval function - validates access for decryption
    /// This function is called by SEAL key servers to validate that a user
    /// has permission to decrypt a document before returning decryption keys
    public entry fun seal_approve_document_access(
        _package_id: address,  // SEAL package ID (unused but required by SEAL)
        policy: &AccessPolicy,
        requester: address,
        _ctx: &TxContext
    ) {
        // Owner always has access
        if (policy.owner == requester) {
            return
        };

        // Public documents are accessible to all
        if (policy.is_public) {
            return
        };

        // Check if requester is in allowed list
        assert!(
            vector::contains(&policy.allowed_users, &requester),
            E_NO_ACCESS
        );
    }
}

// Day 3 Deployment Instructions:
//
// 1. Install Sui CLI:
//    brew install sui  # macOS
//
// 2. Create new wallet:
//    sui client new-address ed25519
//
// 3. Get testnet SUI:
//    Visit discord.gg/sui and use #testnet-faucet
//
// 4. Build the contract:
//    sui move build
//
// 5. Deploy to testnet:
//    sui client publish --gas-budget 100000000
//
// 6. Save the package ID from deployment output
//
// 7. Update src/config/index.ts with contract address

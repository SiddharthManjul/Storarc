
// Sui Move Smart Contract for Chat Registry
// Stores chat metadata and manages Walrus blob persistence with auto-renewal

module WalRag::chat_registry {
    use sui::table::{Self, Table};
    use sui::event;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use std::string::String;

    /// Maximum number of important chats per user (configurable)
    const MAX_IMPORTANT_CHATS: u64 = 1000; // Set high for "unlimited", easy to change later

    /// Epoch durations for different chat types
    const IMPORTANT_CHAT_EPOCHS: u64 = 53;  // Maximum allowed on Walrus
    const ACTIVE_CHAT_EPOCHS: u64 = 30;
    const INACTIVE_CHAT_EPOCHS: u64 = 30;
    const RENEWAL_THRESHOLD_DAYS: u64 = 7;   // Renew if <7 days remaining

    /// Estimated SUI cost per renewal (adjust based on actual costs)
    const RENEWAL_COST_MIST: u64 = 1_000_000; // 0.001 SUI per renewal

    /// Error codes
    const E_NOT_OWNER: u64 = 1;
    const E_CHAT_NOT_FOUND: u64 = 2;
    const E_INSUFFICIENT_RENEWAL_BUDGET: u64 = 3;
    const E_MAX_IMPORTANT_CHATS_REACHED: u64 = 4;
    const E_MESSAGE_NOT_FOUND: u64 = 5;

    /// Main chat registry object (shared, one per user or global)
    public struct ChatRegistry has key {
        id: UID,
        /// Maps chat_id to Chat metadata
        chats: Table<String, Chat>,
        /// Ordered list of chat IDs for display (sorted by last_activity)
        chat_ids: vector<String>,
        /// Total number of chats
        total_chats: u64,
        /// Registry owner
        owner: address,
        /// Pre-funded renewal budget (in SUI)
        renewal_budget: Balance<SUI>,
        /// Creation timestamp
        created_at: u64,
    }

    /// Chat metadata structure
    public struct Chat has store, drop, copy {
        id: String,
        title: String,
        created_at: u64,
        last_activity: u64,
        message_count: u64,
        /// Walrus blob ID containing all messages (JSON array)
        messages_blob_id: String,
        /// When the blob was uploaded to Walrus
        blob_uploaded_at: u64,
        /// When the blob will expire (upload_time + epochs * 24h)
        blob_expiry_timestamp: u64,
        /// Epochs used for current blob
        blob_epochs: u64,
        /// User-marked importance
        is_important: bool,
        /// Owner address
        owner: address,
        /// Message metadata (for querying without fetching from Walrus)
        messages: vector<MessageMetadata>,
    }

    /// Message metadata (simplified - full data in Walrus)
    public struct MessageMetadata has store, drop, copy {
        id: String,
        role: String,  // "user" or "assistant"
    }

    /// Events
    public struct ChatCreated has copy, drop {
        registry_id: address,
        chat_id: String,
        owner: address,
        timestamp: u64,
    }

    public struct MessageAdded has copy, drop {
        chat_id: String,
        message_id: String,
        role: String,
        timestamp: u64,
    }

    public struct ChatMarkedImportant has copy, drop {
        chat_id: String,
        is_important: bool,
        timestamp: u64,
    }

    public struct ChatRenewed has copy, drop {
        chat_id: String,
        old_blob_id: String,
        new_blob_id: String,
        new_expiry: u64,
        cost: u64,
    }

    public struct RenewalBudgetAdded has copy, drop {
        registry_id: address,
        amount: u64,
        new_balance: u64,
    }

    /// Initialize a new chat registry for a user
    public entry fun create_registry(ctx: &mut TxContext) {
        let registry = ChatRegistry {
            id: object::new(ctx),
            chats: table::new(ctx),
            chat_ids: vector::empty(),
            total_chats: 0,
            owner: tx_context::sender(ctx),
            renewal_budget: balance::zero(),
            created_at: tx_context::epoch_timestamp_ms(ctx),
        };

        transfer::share_object(registry);
    }

    /// Add funds to renewal budget
    public entry fun add_renewal_budget(
        registry: &mut ChatRegistry,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        assert!(registry.owner == tx_context::sender(ctx), E_NOT_OWNER);

        let amount = coin::value(&payment);
        let balance = coin::into_balance(payment);
        balance::join(&mut registry.renewal_budget, balance);

        event::emit(RenewalBudgetAdded {
            registry_id: object::uid_to_address(&registry.id),
            amount,
            new_balance: balance::value(&registry.renewal_budget),
        });
    }

    /// Create a new chat
    public entry fun create_chat(
        registry: &mut ChatRegistry,
        chat_id: String,
        title: String,
        initial_messages_blob_id: String,
        blob_epochs: u64,
        message_count: u64,
        ctx: &mut TxContext
    ) {
        assert!(registry.owner == tx_context::sender(ctx), E_NOT_OWNER);
        assert!(!table::contains(&registry.chats, chat_id), E_CHAT_NOT_FOUND);

        let now = tx_context::epoch_timestamp_ms(ctx);
        let expiry = now + (blob_epochs * 24 * 60 * 60 * 1000); // epochs to milliseconds

        let chat = Chat {
            id: chat_id,
            title,
            created_at: now,
            last_activity: now,
            message_count,
            messages_blob_id: initial_messages_blob_id,
            blob_uploaded_at: now,
            blob_expiry_timestamp: expiry,
            blob_epochs,
            is_important: false,
            owner: tx_context::sender(ctx),
            messages: vector::empty(),
        };

        table::add(&mut registry.chats, chat_id, chat);
        vector::push_back(&mut registry.chat_ids, chat_id);
        registry.total_chats = registry.total_chats + 1;

        event::emit(ChatCreated {
            registry_id: object::uid_to_address(&registry.id),
            chat_id,
            owner: tx_context::sender(ctx),
            timestamp: now,
        });
    }

    /// Add a message to existing chat (re-uploads entire chat to Walrus)
    public entry fun add_message(
        registry: &mut ChatRegistry,
        chat_id: String,
        message_id: String,
        role: String,
        new_messages_blob_id: String,
        blob_epochs: u64,
        ctx: &mut TxContext
    ) {
        assert!(registry.owner == tx_context::sender(ctx), E_NOT_OWNER);
        assert!(table::contains(&registry.chats, chat_id), E_CHAT_NOT_FOUND);

        let chat = table::borrow_mut(&mut registry.chats, chat_id);

        let now = tx_context::epoch_timestamp_ms(ctx);

        // Increment message count
        chat.message_count = chat.message_count + 1;
        chat.last_activity = now;

        // Update Walrus blob info
        chat.messages_blob_id = new_messages_blob_id;
        chat.blob_uploaded_at = now;
        chat.blob_expiry_timestamp = now + (blob_epochs * 24 * 60 * 60 * 1000);
        chat.blob_epochs = blob_epochs;

        event::emit(MessageAdded {
            chat_id,
            message_id,
            role,
            timestamp: now,
        });
    }

    /// Mark/unmark chat as important
    public entry fun set_chat_importance(
        registry: &mut ChatRegistry,
        chat_id: String,
        is_important: bool,
        ctx: &mut TxContext
    ) {
        assert!(registry.owner == tx_context::sender(ctx), E_NOT_OWNER);
        assert!(table::contains(&registry.chats, chat_id), E_CHAT_NOT_FOUND);

        // Check limit when marking as important
        if (is_important) {
            let important_count = count_important_chats(registry);
            assert!(important_count < MAX_IMPORTANT_CHATS, E_MAX_IMPORTANT_CHATS_REACHED);
        };

        let chat = table::borrow_mut(&mut registry.chats, chat_id);
        chat.is_important = is_important;

        event::emit(ChatMarkedImportant {
            chat_id,
            is_important,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    /// Renew chat storage (re-upload to Walrus before expiry)
    public entry fun renew_chat(
        registry: &mut ChatRegistry,
        chat_id: String,
        new_messages_blob_id: String,
        blob_epochs: u64,
        ctx: &mut TxContext
    ) {
        assert!(registry.owner == tx_context::sender(ctx), E_NOT_OWNER);
        assert!(table::contains(&registry.chats, chat_id), E_CHAT_NOT_FOUND);

        // Check renewal budget
        assert!(
            balance::value(&registry.renewal_budget) >= RENEWAL_COST_MIST,
            E_INSUFFICIENT_RENEWAL_BUDGET
        );

        let chat = table::borrow_mut(&mut registry.chats, chat_id);
        let old_blob_id = chat.messages_blob_id;

        let now = tx_context::epoch_timestamp_ms(ctx);

        // Update blob info
        chat.messages_blob_id = new_messages_blob_id;
        chat.blob_uploaded_at = now;
        chat.blob_expiry_timestamp = now + (blob_epochs * 24 * 60 * 60 * 1000);
        chat.blob_epochs = blob_epochs;

        // Deduct from renewal budget
        let cost_balance = balance::split(&mut registry.renewal_budget, RENEWAL_COST_MIST);

        // Transfer to owner (or could burn/send to treasury)
        let cost_coin = coin::from_balance(cost_balance, ctx);
        transfer::public_transfer(cost_coin, registry.owner);

        event::emit(ChatRenewed {
            chat_id,
            old_blob_id,
            new_blob_id: new_messages_blob_id,
            new_expiry: chat.blob_expiry_timestamp,
            cost: RENEWAL_COST_MIST,
        });
    }

    /// Update chat's last activity timestamp
    public entry fun update_last_activity(
        registry: &mut ChatRegistry,
        chat_id: String,
        ctx: &mut TxContext
    ) {
        assert!(registry.owner == tx_context::sender(ctx), E_NOT_OWNER);
        assert!(table::contains(&registry.chats, chat_id), E_CHAT_NOT_FOUND);

        let chat = table::borrow_mut(&mut registry.chats, chat_id);
        chat.last_activity = tx_context::epoch_timestamp_ms(ctx);
    }

    /// Delete chat (removes from registry, blob will expire naturally)
    public entry fun delete_chat(
        registry: &mut ChatRegistry,
        chat_id: String,
        ctx: &mut TxContext
    ) {
        assert!(registry.owner == tx_context::sender(ctx), E_NOT_OWNER);
        assert!(table::contains(&registry.chats, chat_id), E_CHAT_NOT_FOUND);

        table::remove(&mut registry.chats, chat_id);

        // Remove from chat_ids vector
        let (found, index) = vector::index_of(&registry.chat_ids, &chat_id);
        if (found) {
            vector::remove(&mut registry.chat_ids, index);
        };

        registry.total_chats = registry.total_chats - 1;
    }

    // ========== Query Functions ==========

    /// Get chat metadata
    public fun get_chat(registry: &ChatRegistry, chat_id: String): &Chat {
        assert!(table::contains(&registry.chats, chat_id), E_CHAT_NOT_FOUND);
        table::borrow(&registry.chats, chat_id)
    }

    /// Get all chat IDs for a registry
    public fun get_chat_ids(registry: &ChatRegistry): &vector<String> {
        &registry.chat_ids
    }

    /// Get renewal budget balance
    public fun get_renewal_budget(registry: &ChatRegistry): u64 {
        balance::value(&registry.renewal_budget)
    }

    /// Get total chats count
    public fun get_total_chats(registry: &ChatRegistry): u64 {
        registry.total_chats
    }

    /// Check if chat needs renewal (expires in <7 days)
    public fun needs_renewal(chat: &Chat, current_time: u64): bool {
        let time_until_expiry = if (chat.blob_expiry_timestamp > current_time) {
            chat.blob_expiry_timestamp - current_time
        } else {
            0
        };

        let threshold_ms = RENEWAL_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
        time_until_expiry < threshold_ms
    }

    /// Calculate recommended epochs for renewal based on chat status
    public fun get_recommended_epochs(
        chat: &Chat,
        current_time: u64
    ): u64 {
        if (chat.is_important) {
            IMPORTANT_CHAT_EPOCHS
        } else {
            // Check if active (accessed in last 30 days)
            let thirty_days_ms = 30 * 24 * 60 * 60 * 1000;
            let time_since_activity = current_time - chat.last_activity;

            if (time_since_activity < thirty_days_ms) {
                ACTIVE_CHAT_EPOCHS
            } else {
                INACTIVE_CHAT_EPOCHS
            }
        }
    }

    /// Count important chats for limit checking
    fun count_important_chats(registry: &ChatRegistry): u64 {
        let mut count = 0u64;
        let mut i = 0u64;
        let len = vector::length(&registry.chat_ids);

        while (i < len) {
            let chat_id = vector::borrow(&registry.chat_ids, i);
            let chat = table::borrow(&registry.chats, *chat_id);
            if (chat.is_important) {
                count = count + 1;
            };
            i = i + 1;
        };

        count
    }

    /// Get message metadata by index
    public fun get_message(chat: &Chat, index: u64): &MessageMetadata {
        assert!(index < vector::length(&chat.messages), E_MESSAGE_NOT_FOUND);
        vector::borrow(&chat.messages, index)
    }

    /// Get all messages metadata
    public fun get_all_messages(chat: &Chat): &vector<MessageMetadata> {
        &chat.messages
    }
}

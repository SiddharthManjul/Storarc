/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Send, FileText, Clock, Plus, MessageSquare, Star, AlertCircle, Trash2, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  sources?: Array<{
    filename: string;
    blobId: string;
    relevance: number;
    preview: string;
  }>;
}

interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: number;
  messages: Message[];
  isImportant?: boolean;
  expiresAt?: number;
  daysRemaining?: number;
}

const CHAT_REGISTRY_PACKAGE_ID = process.env.NEXT_PUBLIC_CHAT_REGISTRY_PACKAGE_ID ||
  "0x59fc8bb84869c440fefffa12e919999e042b09e686840411b010c9199df64e26";
const BACKEND_OPERATOR_ADDRESS = process.env.NEXT_PUBLIC_BACKEND_OPERATOR_ADDRESS ||
  "0xa7d0740b247a14ea578bf6f65b352d56e4fa6fdc8f69a6ce4b1276513bb85d2c";

function ChatPageContent() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsRegistry, setNeedsRegistry] = useState(false);
  const [creatingRegistry, setCreatingRegistry] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Helper to get auth headers
  const getAuthHeaders = (): Record<string, string> => {
    if (!currentAccount) return {};
    return {
      'x-user-address': currentAccount.address,
    };
  };

  // Load all chats when wallet is connected
  useEffect(() => {
    if (currentAccount) {
      loadChats();
    } else {
      setLoadingChats(false);
      setChats([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount]);

  const loadChats = async () => {
    if (!currentAccount) {
      setError("Please connect your wallet to view chats");
      return;
    }

    try {
      setLoadingChats(true);
      setError(null);
      const response = await fetch("/api/chat/list", {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        // Check if user needs to create registry
        if (data.needsRegistry) {
          setNeedsRegistry(true);
          setChats([]);
        } else {
          setNeedsRegistry(false);
          // Convert chat metadata to UI format
          const loadedChats: Chat[] = data.chats.map((chat: any) => ({
            id: chat.id,
            title: chat.title || "Untitled Chat",
            lastMessage: "Click to load messages",
            timestamp: chat.last_activity,
            messages: [],
            isImportant: chat.is_important,
            expiresAt: chat.blob_expiry_timestamp,
            daysRemaining: Math.floor((chat.blob_expiry_timestamp - Date.now()) / (24 * 60 * 60 * 1000)),
          }));

          setChats(loadedChats);
        }
      }
    } catch (error) {
      console.error("Error loading chats:", error);
      setError(error instanceof Error ? error.message : "Failed to load chats");
    } finally {
      setLoadingChats(false);
    }
  };

  // Create chat registry via wallet signature (one-time setup)
  const createRegistry = async () => {
    if (!currentAccount) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setCreatingRegistry(true);
      setError(null);

      // Build transaction to create chat registry with backend as operator
      const tx = new Transaction();
      tx.setSender(currentAccount.address);
      tx.moveCall({
        target: `${CHAT_REGISTRY_PACKAGE_ID}::chat_registry::create_registry`,
        arguments: [
          tx.pure.address(BACKEND_OPERATOR_ADDRESS), // Backend can write on behalf of user
        ],
      });

      // Sign and execute transaction
      const result = await signAndExecuteTransaction({ transaction: tx });

      if (!result.digest) {
        throw new Error("Failed to create registry - no transaction digest");
      }

      // Wait for transaction and extract created registry object ID
      const txResponse = await suiClient.waitForTransaction({
        digest: result.digest,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      // Find the created ChatRegistry object
      const createdObject = txResponse.objectChanges?.find(
        (change) => change.type === "created" &&
        change.objectType?.includes("ChatRegistry")
      );

      if (!createdObject || !("objectId" in createdObject)) {
        throw new Error("Failed to extract registry ID from transaction");
      }

      const registryId = createdObject.objectId;

      // Store registry ID in backend
      const storeResponse = await fetch("/api/chat/registry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ registryId }),
      });

      const storeData = await storeResponse.json();

      if (!storeData.success) {
        throw new Error(storeData.error || "Failed to store registry ID");
      }

      // Success! Reload chats
      setNeedsRegistry(false);
      await loadChats();
    } catch (error) {
      console.error("Error creating registry:", error);
      setError(error instanceof Error ? error.message : "Failed to create registry");
    } finally {
      setCreatingRegistry(false);
    }
  };

  // Load chat messages when selected
  const loadChatMessages = async (chatId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/chat/load", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ chatId }),
      });
      const data = await response.json();

      if (data.success) {
        // Update chat with loaded messages
        setChats((prevChats) =>
          prevChats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: data.chat.messages.map((msg: any) => ({
                    ...msg,
                    timestamp: msg.timestamp,
                  })),
                  lastMessage: data.chat.messages.length > 0
                    ? data.chat.messages[data.chat.messages.length - 1].content.slice(0, 50)
                    : "",
                  daysRemaining: data.expiryInfo?.daysRemaining,
                }
              : c
          )
        );
      } else {
        setError(data.error || "Failed to load chat");
      }
    } catch (error) {
      console.error("Error loading chat messages:", error);
      setError(error instanceof Error ? error.message : "Failed to load chat messages");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle chat selection
  const handleChatSelect = async (chatId: string) => {
    setSelectedChatId(chatId);
    setIsSidebarOpen(false); // Close sidebar on mobile
    const chat = chats.find((c) => c.id === chatId);

    // Load messages if not already loaded
    if (chat && chat.messages.length === 0) {
      await loadChatMessages(chatId);
    }
  };

  const selectedChat = chats.find((chat) => chat.id === selectedChatId);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    if (!currentAccount) {
      setError("Please connect your wallet to send messages");
      return;
    }

    if (needsRegistry) {
      setError("Please create your chat registry first");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: Date.now(),
    };

    let currentChatId = selectedChatId;
    const currentInput = inputMessage;
    setInputMessage("");
    setIsLoading(true);
    setError(null);

    try {
      // Create new chat or add to existing
      if (!selectedChatId) {
        // Create new chat
        const newChatId = Date.now().toString();
        currentChatId = newChatId;

        const newChat: Chat = {
          id: newChatId,
          title: currentInput.slice(0, 30) + (currentInput.length > 30 ? "..." : ""),
          lastMessage: currentInput,
          timestamp: Date.now(),
          messages: [userMessage],
          isImportant: false,
        };

        setChats((prevChats) => [newChat, ...prevChats]);
        setSelectedChatId(newChatId);

        // Save to backend
        const createResponse = await fetch("/api/chat/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            chatId: newChatId,
            title: newChat.title,
            initialMessage: userMessage,
          }),
        });

        const createData = await createResponse.json();
        if (!createData.success) {
          throw new Error(createData.error || "Failed to create chat");
        }
      } else {
        // Add message to existing chat
        setChats((prevChats) =>
          prevChats.map((c) =>
            c.id === selectedChatId
              ? {
                  ...c,
                  messages: [...c.messages, userMessage],
                  lastMessage: currentInput,
                  timestamp: Date.now(),
                }
              : c
          )
        );

        // Save message to backend
        const userMessageResponse = await fetch("/api/chat/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            chatId: selectedChatId,
            message: userMessage,
          }),
        });

        const userMessageData = await userMessageResponse.json();
        if (!userMessageData.success) {
          throw new Error(userMessageData.error || "Failed to save message");
        }
      }

      // Query RAG system for response
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(), // Add user address for access control
        },
        body: JSON.stringify({ question: currentInput, topK: 4 }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer || data.error || "Sorry, I couldn't process that.",
        timestamp: Date.now(),
        sources: data.sources,
      };

      // Update UI with assistant response
      setChats((prevChats) =>
        prevChats.map((c) =>
          c.id === currentChatId
            ? { ...c, messages: [...c.messages, assistantMessage] }
            : c
        )
      );

      // Save assistant message to backend
      if (currentChatId) {
        const messageResponse = await fetch("/api/chat/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            chatId: currentChatId,
            message: assistantMessage,
          }),
        });

        const messageData = await messageResponse.json();
        if (!messageData.success) {
          console.error("Failed to save assistant message:", messageData.error);
          // Don't throw - message is already shown in UI
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setError(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setSelectedChatId(null);
    setInputMessage("");
    setIsSidebarOpen(false); // Close sidebar on mobile
  };

  const toggleImportant = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;

    const newImportantStatus = !chat.isImportant;

    // Optimistic update
    setChats((prevChats) =>
      prevChats.map((c) =>
        c.id === chatId ? { ...c, isImportant: newImportantStatus } : c
      )
    );

    // Update backend
    try {
      await fetch("/api/chat/importance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          chatId,
          isImportant: newImportantStatus,
        }),
      });
    } catch (error) {
      console.error("Error updating importance:", error);
      // Revert on error
      setChats((prevChats) =>
        prevChats.map((c) =>
          c.id === chatId ? { ...c, isImportant: !newImportantStatus } : c
        )
      );
    }
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this chat? This action cannot be undone.")) {
      return;
    }

    // Optimistic removal
    setChats((prevChats) => prevChats.filter((c) => c.id !== chatId));

    // If deleted chat was selected, clear selection
    if (selectedChatId === chatId) {
      setSelectedChatId(null);
    }

    // Delete from backend
    try {
      await fetch("/api/chat/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ chatId }),
      });
    } catch (error) {
      console.error("Error deleting chat:", error);
      setError("Failed to delete chat");
      // Reload chats to restore state
      loadChats();
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 pt-16 md:pt-16 bg-background flex">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-20 left-4 z-50 p-2 rounded-lg bg-[#3d3436] text-[#ffedea] shadow-lg"
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      {/* Sidebar Overlay on mobile */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 pt-16"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "w-80 border-r-2 border-[#b35340] bg-[#feb47b] flex flex-col h-full transition-transform duration-300 z-40",
        "fixed lg:relative",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* New Chat Button */}
        <div className="p-4 border-b-2 border-[#b35340] shrink-0">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[#ff7e5f] text-[#ffedea] hover:bg-[#ff9a76] transition-all duration-200 font-semibold shadow-md"
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium">New Chat</span>
          </button>
        </div>

        {/* Chat List - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {!currentAccount ? (
            <div className="p-4 text-center">
              <div className="text-[#3d3436] mb-2 font-medium">
                Wallet not connected
              </div>
              <div className="text-sm text-[#3d3436]/70">
                Connect your wallet to view and create chats
              </div>
            </div>
          ) : loadingChats ? (
            <div className="p-4 text-center text-[#3d3436] font-medium">Loading chats...</div>
          ) : needsRegistry ? (
            <div className="p-4">
              <div className="bg-[#ffedea] border-2 border-[#ff7e5f]/30 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <Wallet className="h-5 w-5 text-[#ff7e5f] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-[#3d3436] mb-1">
                      Create Your Chat Registry
                    </h3>
                    <p className="text-sm text-[#3d3436]/80 mb-3">
                      One-time setup: Create your personal chat registry on Sui blockchain.
                      You will sign one transaction (~0.002 SUI gas), then all future chats
                      will be stored without additional signatures.
                    </p>
                    <button
                      onClick={createRegistry}
                      disabled={creatingRegistry}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#ff7e5f] text-[#ffedea] hover:bg-[#ff9a76] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {creatingRegistry ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Creating Registry...
                        </>
                      ) : (
                        <>
                          <Wallet className="h-4 w-4" />
                          Create Registry
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center text-[#3d3436]/70">
              No chats yet. Start a new conversation!
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => handleChatSelect(chat.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-all duration-200 group border-2",
                    selectedChatId === chat.id
                      ? "bg-[#ffedea] border-[#ff7e5f] shadow-md"
                      : "hover:bg-[#ffedea]/50 border-transparent"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <MessageSquare
                      className={cn(
                        "h-5 w-5 mt-0.5 shrink-0",
                        selectedChatId === chat.id
                          ? "text-[#ff7e5f]"
                          : "text-[#3d3436]/60"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className={cn(
                            "font-medium text-sm truncate",
                            selectedChatId === chat.id
                              ? "text-[#3d3436]"
                              : "text-[#3d3436]/80"
                          )}
                        >
                          {chat.title}
                        </h3>
                        <div className="flex items-center gap-1">
                          <div
                            onClick={(e) => toggleImportant(chat.id, e)}
                            className="shrink-0 cursor-pointer p-1 hover:bg-[#ff7e5f]/20 rounded"
                            title={chat.isImportant ? "Unmark as important" : "Mark as important"}
                          >
                            <Star
                              className={cn(
                                "h-4 w-4 transition-colors",
                                chat.isImportant
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-[#3d3436]/40 hover:text-yellow-400"
                              )}
                            />
                          </div>
                          <div
                            onClick={(e) => deleteChat(chat.id, e)}
                            className="shrink-0 cursor-pointer p-1 hover:bg-red-100 rounded"
                            title="Delete chat"
                          >
                            <Trash2
                              className="h-4 w-4 text-[#3d3436]/40 hover:text-red-600 transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-[#3d3436]/60 truncate mt-1">
                        {chat.lastMessage}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-xs text-[#3d3436]/50">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimestamp(chat.timestamp)}</span>
                        </div>
                        {chat.daysRemaining !== undefined && chat.daysRemaining < 7 && (
                          <div className="flex items-center gap-1 text-xs text-orange-600">
                            <AlertCircle className="h-3 w-3" />
                            <span>{chat.daysRemaining}d left</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t-2 border-[#b35340] shrink-0">
          <p className="text-xs text-[#3d3436]/70 text-center font-medium">
            Chat history stored on Walrus + Sui
          </p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="border-b-2 border-[#b35340] bg-[#feb47b] px-4 md:px-6 py-3 md:py-4 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h1 className="text-base md:text-xl font-semibold text-[#3d3436] truncate">
                    {selectedChat.title}
                  </h1>
                  <p className="text-xs md:text-sm text-[#3d3436]/70 mt-0.5 md:mt-1">
                    {selectedChat.messages.length} messages
                  </p>
                </div>
                {selectedChat.daysRemaining !== undefined && (
                  <div
                    className={cn(
                      "px-2 md:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0",
                      selectedChat.daysRemaining < 7
                        ? "bg-orange-100 text-orange-700"
                        : "bg-green-100 text-green-700"
                    )}
                  >
                    {selectedChat.daysRemaining}d left
                  </div>
                )}
              </div>
            </div>

            {/* Messages - Scrollable */}
            <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6 min-h-0">
              <AnimatePresence>
                {selectedChat.messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={cn(
                      "flex gap-2 md:gap-4",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] md:max-w-3xl rounded-xl md:rounded-2xl px-3 md:px-6 py-3 md:py-4 shadow-md",
                        message.role === "user"
                          ? "bg-[#ff7e5f] text-[#ffedea]"
                          : "bg-[#feb47b] text-[#3d3436] border-2 border-[#b35340]/20"
                      )}
                    >
                      <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
                        {message.content}
                      </p>

                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-[#3d3436]/20 space-y-2">
                          <p className="text-xs font-medium text-[#3d3436]/80 mb-2">
                            Sources:
                          </p>
                          {message.sources.map((source, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 text-xs bg-[#ffedea] rounded-lg p-2 md:p-3 border border-[#b35340]/10"
                            >
                              <FileText className="h-3.5 md:h-4 md:w-4 text-[#ff7e5f] shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[#3d3436] truncate text-xs">
                                  {source.filename}
                                </p>
                                <p className="text-[#3d3436]/60 text-xs mt-1">
                                  Relevance: {(source.relevance * 100).toFixed(0)}%
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="text-xs mt-2 md:mt-3 opacity-70">
                        {formatTimestamp(message.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2 md:gap-4"
                >
                  <div className="max-w-[85%] md:max-w-3xl rounded-xl md:rounded-2xl px-3 md:px-6 py-3 md:py-4 bg-[#feb47b] border-2 border-[#b35340]/20 shadow-md">
                    <div className="flex gap-2">
                      <div
                        className="w-2 h-2 bg-[#ff7e5f] rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-[#ff7e5f] rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-[#ff7e5f] rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Empty State */}
            <div className="flex-1 flex items-center justify-center min-h-0 px-4">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 md:h-16 md:w-16 text-[#ff7e5f]/40 mx-auto mb-3 md:mb-4" />
                <h2 className="text-lg md:text-2xl font-semibold text-[#3d3436] mb-2">
                  Welcome to Storarc Chat
                </h2>
                <p className="text-sm md:text-base text-[#3d3436]/70 mb-4 md:mb-6">
                  Start typing below to begin a new conversation
                </p>
              </div>
            </div>
          </>
        )}

        {/* Input Area - Fixed at bottom */}
        <div className="border-t-2 border-[#b35340] bg-[#feb47b] px-3 md:px-6 py-3 md:py-4 shrink-0">
          {error && (
            <div className="max-w-4xl mx-auto mb-2 md:mb-3 p-2 md:p-3 bg-red-50 border-2 border-red-200 rounded-lg text-xs md:text-sm text-red-700 font-medium">
              {error}
            </div>
          )}
          <div className="max-w-4xl mx-auto flex gap-2 md:gap-4">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSendMessage()
              }
              placeholder="Ask a question about your documents..."
              className="flex-1 px-3 md:px-4 py-2 md:py-3 rounded-lg border-2 border-[#b35340]/30 bg-[#ffedea] text-sm md:text-base text-[#3d3436] placeholder-[#3d3436]/50 focus:outline-none focus:ring-2 focus:ring-[#ff7e5f] focus:border-[#ff7e5f]"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-3 md:px-6 py-2 md:py-3 rounded-lg bg-[#ff7e5f] text-[#ffedea] font-semibold hover:bg-[#ff9a76] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 md:gap-2 shadow-md"
            >
              <Send className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return <ChatPageContent />;
}

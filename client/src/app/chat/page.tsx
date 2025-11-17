/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Send, FileText, Clock, Plus, MessageSquare, Star, AlertCircle, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { apiGet, apiPost } from "@/lib/api-client";

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

function ChatPageContent() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all chats on mount
  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      setLoadingChats(true);
      const data = await apiGet("/api/chat/list");

      if (data.success) {
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
    } catch (error) {
      console.error("Error loading chats:", error);
      setError(error instanceof Error ? error.message : "Failed to load chats");
    } finally {
      setLoadingChats(false);
    }
  };

  // Load chat messages when selected
  const loadChatMessages = async (chatId: string) => {
    try {
      setIsLoading(true);
      const data = await apiPost("/api/chat/load", { chatId });

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
    const chat = chats.find((c) => c.id === chatId);

    // Load messages if not already loaded
    if (chat && chat.messages.length === 0) {
      await loadChatMessages(chatId);
    }
  };

  const selectedChat = chats.find((chat) => chat.id === selectedChatId);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

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
        await apiPost("/api/chat/create", {
          chatId: newChatId,
          title: newChat.title,
          initialMessage: userMessage,
        });
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
        await apiPost("/api/chat/message", {
          chatId: selectedChatId,
          message: userMessage,
        });
      }

      // Query RAG system for response
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        await apiPost("/api/chat/message", {
          chatId: currentChatId,
          message: assistantMessage,
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setSelectedChatId(null);
    setInputMessage("");
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
      await apiPost("/api/chat/importance", {
        chatId,
        isImportant: newImportantStatus,
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
      await apiPost("/api/chat/delete", { chatId });
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
    <div className="min-h-screen bg-background pt-16 flex">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
        {/* New Chat Button */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-linear-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium">New Chat</span>
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loadingChats ? (
            <div className="p-4 text-center text-gray-500">Loading chats...</div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No chats yet. Start a new conversation!
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => handleChatSelect(chat.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-all duration-200 group",
                    selectedChatId === chat.id
                      ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <MessageSquare
                      className={cn(
                        "h-5 w-5 mt-0.5 shrink-0",
                        selectedChatId === chat.id
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-400"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className={cn(
                            "font-medium text-sm truncate",
                            selectedChatId === chat.id
                              ? "text-blue-900 dark:text-blue-100"
                              : "text-gray-900 dark:text-gray-100"
                          )}
                        >
                          {chat.title}
                        </h3>
                        <div className="flex items-center gap-1">
                          <div
                            onClick={(e) => toggleImportant(chat.id, e)}
                            className="shrink-0 cursor-pointer p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                            title={chat.isImportant ? "Unmark as important" : "Mark as important"}
                          >
                            <Star
                              className={cn(
                                "h-4 w-4 transition-colors",
                                chat.isImportant
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300 hover:text-yellow-400"
                              )}
                            />
                          </div>
                          <div
                            onClick={(e) => deleteChat(chat.id, e)}
                            className="shrink-0 cursor-pointer p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                            title="Delete chat"
                          >
                            <Trash2
                              className="h-4 w-4 text-gray-400 hover:text-red-600 transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                        {chat.lastMessage}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimestamp(chat.timestamp)}</span>
                        </div>
                        {chat.daysRemaining !== undefined && chat.daysRemaining < 7 && (
                          <div className="flex items-center gap-1 text-xs text-orange-500">
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
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Chat history stored on Walrus + Sui
          </p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {selectedChat.title}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {selectedChat.messages.length} messages
                  </p>
                </div>
                {selectedChat.daysRemaining !== undefined && (
                  <div
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium",
                      selectedChat.daysRemaining < 7
                        ? "bg-orange-100 text-orange-700"
                        : "bg-green-100 text-green-700"
                    )}
                  >
                    Expires in {selectedChat.daysRemaining} days
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <AnimatePresence>
                {selectedChat.messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={cn(
                      "flex gap-4",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-3xl rounded-2xl px-6 py-4",
                        message.role === "user"
                          ? "bg-linear-to-r from-blue-500 to-purple-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      )}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>

                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            Sources:
                          </p>
                          {message.sources.map((source, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 text-xs bg-white dark:bg-gray-700 rounded-lg p-3"
                            >
                              <FileText className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {source.filename}
                                </p>
                                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                                  Relevance: {(source.relevance * 100).toFixed(0)}%
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="text-xs mt-3 opacity-70">
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
                  className="flex gap-4"
                >
                  <div className="max-w-3xl rounded-2xl px-6 py-4 bg-gray-100 dark:bg-gray-800">
                    <div className="flex gap-2">
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
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
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Welcome to Storarc Chat
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Start typing below to begin a new conversation
                </p>
              </div>
            </div>
          </>
        )}

        {/* Input Area - Always visible */}
        <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
          {error && (
            <div className="max-w-4xl mx-auto mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="max-w-4xl mx-auto flex gap-4">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSendMessage()
              }
              placeholder="Ask a question about your documents..."
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-6 py-3 rounded-lg bg-linear-to-r from-blue-500 to-purple-600 text-white font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="h-5 w-5" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatPageContent />
    </ProtectedRoute>
  );
}

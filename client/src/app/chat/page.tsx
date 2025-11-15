"use client";

import { useState } from "react";
import { Send, FileText, Clock, Plus, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
  timestamp: Date;
  messages: Message[];
}

export default function ChatPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Mock chat data - will be replaced with Walrus persistence later
  const [chats, setChats] = useState<Chat[]>([
    {
      id: "1",
      title: "Document Analysis",
      lastMessage: "What are the main features?",
      timestamp: new Date(Date.now() - 3600000),
      messages: [
        {
          id: "1-1",
          role: "user",
          content: "What are the main features?",
          timestamp: new Date(Date.now() - 3600000),
        },
        {
          id: "1-2",
          role: "assistant",
          content: "Based on the documents, the main features include decentralized storage using Walrus, AI-powered search capabilities, and blockchain verification through Sui.",
          timestamp: new Date(Date.now() - 3599000),
          sources: [
            {
              filename: "features.txt",
              blobId: "abc123",
              relevance: 0.95,
              preview: "The system provides decentralized storage...",
            },
          ],
        },
      ],
    },
    {
      id: "2",
      title: "Technical Overview",
      lastMessage: "How does RAG work?",
      timestamp: new Date(Date.now() - 7200000),
      messages: [],
    },
  ]);

  const selectedChat = chats.find((chat) => chat.id === selectedChatId);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    let currentChatId = selectedChatId;

    // Add user message to chat
    if (selectedChatId) {
      // Update existing chat
      currentChatId = selectedChatId;
      setChats((prevChats) =>
        prevChats.map((c) =>
          c.id === selectedChatId
            ? {
                ...c,
                messages: [...c.messages, userMessage],
                lastMessage: inputMessage,
                timestamp: new Date(),
              }
            : c
        )
      );
    } else {
      // Create new chat
      const newChatId = Date.now().toString();
      currentChatId = newChatId;
      const newChat: Chat = {
        id: newChatId,
        title: inputMessage.slice(0, 30) + (inputMessage.length > 30 ? "..." : ""),
        lastMessage: inputMessage,
        timestamp: new Date(),
        messages: [userMessage],
      };
      setChats((prevChats) => [newChat, ...prevChats]);
      setSelectedChatId(newChatId);
    }

    const currentInput = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentInput, topK: 4 }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle error
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.error === "No documents in vector store"
            ? "I don&apos;t have any documents in my knowledge base yet. Please upload some documents first to start querying."
            : "I don&apos;t have the context required to answer this question. Please try uploading relevant documents first.",
          timestamp: new Date(),
        };

        setChats((prevChats) =>
          prevChats.map((c) =>
            c.id === currentChatId
              ? { ...c, messages: [...c.messages, errorMessage] }
              : c
          )
        );
      } else {
        // Success - add assistant response
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.answer,
          timestamp: new Date(),
          sources: data.sources,
        };

        setChats((prevChats) =>
          prevChats.map((c) =>
            c.id === currentChatId
              ? { ...c, messages: [...c.messages, assistantMessage] }
              : c
          )
        );
      }
    } catch (error) {
      console.error("Query error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error while processing your question. Please try again.",
        timestamp: new Date(),
      };

      setChats((prevChats) =>
        prevChats.map((c) =>
          c.id === currentChatId
            ? { ...c, messages: [...c.messages, errorMessage] }
            : c
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setSelectedChatId(null);
    setInputMessage("");
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
          <div className="p-2 space-y-1">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-all duration-200 group",
                  selectedChatId === chat.id
                    ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent"
                )}
              >
                <div className="flex items-start gap-3">
                  <MessageSquare className={cn(
                    "h-5 w-5 mt-0.5 shrink-0",
                    selectedChatId === chat.id
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-400"
                  )} />
                  <div className="flex-1 min-w-0">
                    <h3 className={cn(
                      "font-medium text-sm truncate",
                      selectedChatId === chat.id
                        ? "text-blue-900 dark:text-blue-100"
                        : "text-gray-900 dark:text-gray-100"
                    )}>
                      {chat.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                      {chat.lastMessage}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimestamp(chat.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Chat history stored on Walrus
          </p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {selectedChat.title}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedChat.messages.length} messages
              </p>
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
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
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
          <div className="max-w-4xl mx-auto flex gap-4">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
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

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  FileText,
  MessageSquare,
  Activity,
  ExternalLink,
  Clock,
  Wallet
} from 'lucide-react';

interface DashboardStats {
  totalDocuments: number;
  totalUsers: number;
  totalTransactions: number;
  totalChats: number;
}

interface Transaction {
  id: string;
  timestamp: number;
  type: 'upload' | 'chat';
  userAddress: string;
  blobId?: string;
  suiTxId?: string;
  metadata?: {
    filename?: string;
    chatTitle?: string;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    totalUsers: 0,
    totalTransactions: 0,
    totalChats: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();

    // Poll for updates every 10 seconds
    const interval = setInterval(() => {
      loadDashboardData();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    if (address.length < 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // All transactions are uploads only (no chat transactions)
  const filteredTransactions = transactions;

  const statCards = [
    {
      title: 'Total Documents',
      value: stats.totalDocuments,
      icon: FileText,
      color: 'bg-[#ff7e5f]',
      iconColor: 'text-[#ff7e5f]',
      bgColor: 'bg-[#ff7e5f]/10',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-purple-500',
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Total Transactions',
      value: stats.totalTransactions,
      icon: Activity,
      color: 'bg-green-500',
      iconColor: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Total Chats',
      value: stats.totalChats,
      icon: MessageSquare,
      color: 'bg-blue-500',
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
  ];

  return (
    <div className="min-h-screen bg-background pt-20 md:pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 md:mb-12"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-[#3d3436] mb-3 md:mb-4">
            <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 md:mb-4 text-[#3d3436]">
            Platform Dashboard
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-[#b35340]">
            Real-time analytics and transaction monitoring
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-[#feb47b] border-2 border-[#b35340] rounded-xl p-4 md:p-6 shadow-lg"
            >
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className={`p-2 md:p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.iconColor}`} />
                </div>
              </div>
              <h3 className="text-xs md:text-sm font-medium text-[#3d3436]/70 mb-1 md:mb-2">
                {stat.title}
              </h3>
              <p className="text-2xl md:text-3xl font-bold text-[#3d3436]">
                {loading ? '...' : stat.value.toLocaleString()}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Transactions Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-[#feb47b] border-2 border-[#b35340] rounded-xl shadow-lg overflow-hidden"
        >
          {/* Table Header */}
          <div className="p-4 md:p-6 border-b-2 border-[#b35340]">
            <h2 className="text-xl md:text-2xl font-bold text-[#3d3436]">
              Recent Upload Transactions
            </h2>
            <p className="text-xs md:text-sm text-[#3d3436]/70 mt-1">
              Document uploads across all users
            </p>
          </div>

          {/* Transactions List */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 md:p-12 text-center text-[#3d3436]">
                Loading transactions...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-8 md:p-12 text-center">
                <Activity className="w-12 h-12 md:w-16 md:h-16 text-[#3d3436]/30 mx-auto mb-3 md:mb-4" />
                <p className="text-[#3d3436]/70 text-sm md:text-base">
                  No transactions yet
                </p>
              </div>
            ) : (
              <div className="divide-y-2 divide-[#b35340]/20">
                {filteredTransactions.map((tx, index) => (
                  <div
                    key={`${tx.type}_${tx.userAddress}_${tx.id}_${index}`}
                    className="p-3 md:p-4 hover:bg-[#ffedea]/50 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
                      {/* Type Badge */}
                      <div className="flex items-center gap-2 lg:w-24 shrink-0">
                        <div
                          className={`px-2 md:px-3 py-1 rounded-lg text-xs font-medium ${
                            tx.type === 'upload'
                              ? 'bg-[#ff7e5f]/20 text-[#ff7e5f] border border-[#ff7e5f]/30'
                              : 'bg-blue-500/20 text-blue-600 border border-blue-500/30'
                          }`}
                        >
                          {tx.type === 'upload' ? (
                            <FileText className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />
                          ) : (
                            <MessageSquare className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />
                          )}
                          {tx.type === 'upload' ? 'Upload' : 'Chat'}
                        </div>
                      </div>

                      {/* User Address */}
                      <div className="flex items-center gap-2 lg:flex-1 min-w-0">
                        <Wallet className="w-4 h-4 text-[#3d3436]/60 shrink-0" />
                        <span className="text-xs md:text-sm font-mono text-[#3d3436] truncate">
                          {formatAddress(tx.userAddress)}
                        </span>
                      </div>

                      {/* Blob ID */}
                      {tx.blobId && (
                        <div className="flex items-center gap-2 lg:w-48 min-w-0">
                          <span className="text-xs text-[#3d3436]/60 shrink-0">Blob:</span>
                          <a
                            href={`https://aggregator.walrus-testnet.walrus.space/v1/${tx.blobId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-[#ff7e5f] hover:text-[#ff9a76] transition-colors truncate flex items-center gap-1"
                          >
                            {formatAddress(tx.blobId)}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      )}

                      {/* Sui TX ID */}
                      {tx.suiTxId && (
                        <div className="flex items-center gap-2 lg:w-48 min-w-0">
                          <span className="text-xs text-[#3d3436]/60 shrink-0">Sui:</span>
                          <a
                            href={`https://suiscan.xyz/testnet/tx/${tx.suiTxId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-[#ff7e5f] hover:text-[#ff9a76] transition-colors truncate flex items-center gap-1"
                          >
                            {formatAddress(tx.suiTxId)}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="flex items-center gap-1 lg:w-32 text-xs text-[#3d3436]/60">
                        <Clock className="w-3 h-3 shrink-0" />
                        {formatTimestamp(tx.timestamp)}
                      </div>
                    </div>

                    {/* Metadata */}
                    {tx.metadata && (
                      <div className="mt-2 text-xs text-[#3d3436]/70 ml-0 lg:ml-28">
                        {tx.metadata.filename && `=� ${tx.metadata.filename}`}
                        {tx.metadata.chatTitle && `=� ${tx.metadata.chatTitle}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t-2 border-[#b35340] bg-[#ffedea]/50">
            <p className="text-xs md:text-sm text-[#3d3436]/70 text-center">
              Showing {filteredTransactions.length} upload transactions &bull; Updates every 10 seconds
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

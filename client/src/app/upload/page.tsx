"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  AlertCircle
} from "lucide-react";
import {
  SUPPORTED_FORMATS,
  getFormatName
} from "@/lib/supported-formats";

export default function UploadPage() {

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-linear-to-r from-blue-500 to-purple-600 mb-4">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="bg-linear-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              Upload Your Documents
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload your documents to Storarc&apos;s decentralized storage. Your files will be securely stored on Walrus and indexed for AI-powered search.
          </p>
        </motion.div>

        {/* Supported Formats Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Supported File Formats
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Text Documents</h4>
                <div className="flex flex-wrap gap-2">
                  {SUPPORTED_FORMATS.TEXT.map((ext) => (
                    <span key={ext} className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-sm">
                      {getFormatName(ext)}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Office Documents</h4>
                <div className="flex flex-wrap gap-2">
                  {SUPPORTED_FORMATS.OFFICE.map((ext) => (
                    <span key={ext} className="px-2 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded text-sm">
                      {getFormatName(ext)}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Data Formats</h4>
                <div className="flex flex-wrap gap-2">
                  {SUPPORTED_FORMATS.DATA.map((ext) => (
                    <span key={ext} className="px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded text-sm">
                      {getFormatName(ext)}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Web Formats</h4>
                <div className="flex flex-wrap gap-2">
                  {SUPPORTED_FORMATS.WEB.map((ext) => (
                    <span key={ext} className="px-2 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded text-sm">
                      {getFormatName(ext)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Upload Area - Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div className="bg-card border border-border rounded-xl shadow-lg p-12 text-center">
            <AlertCircle className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Wallet Integration Required</h3>
            <p className="text-muted-foreground">
              Upload functionality will be available after wallet provider integration is complete.
            </p>
          </div>
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-500" />
              How It Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold mb-3">
                  1
                </div>
                <h4 className="font-semibold text-foreground mb-2">Upload</h4>
                <p className="text-sm text-muted-foreground">
                  Select or drag your document. Supported formats include PDF, Word, Text, and more.
                </p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold mb-3">
                  2
                </div>
                <h4 className="font-semibold text-foreground mb-2">Process</h4>
                <p className="text-sm text-muted-foreground">
                  Your document is processed, chunked, and embedded for AI-powered search.
                </p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-bold mb-3">
                  3
                </div>
                <h4 className="font-semibold text-foreground mb-2">Query</h4>
                <p className="text-sm text-muted-foreground">
                  Ask questions about your documents using natural language in the Chat page.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

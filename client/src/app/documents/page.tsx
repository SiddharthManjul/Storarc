/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { FileText, Lock, Unlock, Users, Loader2 } from 'lucide-react';
import { AccessControlPanel } from '@/components/AccessControlPanel';
import { Transaction } from '@mysten/sui/transactions';

interface Document {
  documentId: string;
  filename: string;
  size: number;
  uploadedAt: number;
  blobId: string;
  isPrivate: boolean;
  policyId?: string;
  owner: string;
  allowedUsers?: string[];
}

export default function DocumentsPage() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const _suiClient = useSuiClient();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [grantingAccess, setGrantingAccess] = useState(false);

  useEffect(() => {
    if (currentAccount) {
      loadDocuments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount]);

  const loadDocuments = async () => {
    if (!currentAccount) return;

    try {
      setLoading(true);

      const response = await fetch('/api/documents/list', {
        method: 'GET',
        headers: {
          'x-user-address': currentAccount.address,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load documents');
      }

      setDocuments(data.documents || []);
      console.log(`📚 Loaded ${data.documents?.length || 0} documents`);
    } catch (error) {
      console.error('Failed to load documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAccess = async (userAddress: string) => {
    if (!selectedDoc?.policyId || !currentAccount) return;

    setGrantingAccess(true);
    try {
      console.log('🔓 Granting access to:', userAddress);

      // Call the grant access API
      const response = await fetch('/api/access/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-address': currentAccount.address,
        },
        body: JSON.stringify({
          policyId: selectedDoc.policyId,
          userAddress,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to grant access');
      }

      // User needs to sign the transaction
      const txBytes = Buffer.from(data.transactionBytes, 'base64');
      const tx = Transaction.from(txBytes);

      console.log('📝 Signing grant access transaction...');
      const result = await signAndExecuteTransaction({ transaction: tx });

      console.log('✅ Access granted:', result.digest);

      // Refresh document data
      await loadDocuments();
    } catch (error) {
      console.error('❌ Failed to grant access:', error);
      alert(error instanceof Error ? error.message : 'Failed to grant access');
    } finally {
      setGrantingAccess(false);
    }
  };

  const handleRevokeAccess = async (userAddress: string) => {
    if (!selectedDoc?.policyId || !currentAccount) return;

    try {
      console.log('🔒 Revoking access from:', userAddress);

      const response = await fetch('/api/access/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-address': currentAccount.address,
        },
        body: JSON.stringify({
          policyId: selectedDoc.policyId,
          userAddress,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to revoke access');
      }

      // User needs to sign the transaction
      const txBytes = Buffer.from(data.transactionBytes, 'base64');
      const tx = Transaction.from(txBytes);

      console.log('📝 Signing revoke access transaction...');
      const result = await signAndExecuteTransaction({ transaction: tx });

      console.log('✅ Access revoked:', result.digest);

      // Refresh document data
      await loadDocuments();
    } catch (error) {
      console.error('❌ Failed to revoke access:', error);
      alert(error instanceof Error ? error.message : 'Failed to revoke access');
    }
  };

  if (!currentAccount) {
    return (
      <div className="min-h-screen bg-background pt-20 md:pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-[#feb47b] border-2 border-[#b35340] rounded-xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 shadow-lg">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#ff7e5f]/20 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-[#ff7e5f]" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-semibold text-[#3d3436]">Wallet Connection Required</h3>
              <p className="text-xs md:text-sm text-[#3d3436]/70">
                Please connect your Sui wallet to view and manage your documents.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 md:pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-[#3d3436] mb-3 md:mb-4">
            <FileText className="w-6 h-6 md:w-8 md:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
            <span className="text-[#3d3436]">
              My Documents
            </span>
          </h1>
          <p className="text-[#b35340] text-base sm:text-lg md:text-xl">
            Manage your uploaded documents and access control
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col sm:flex-row items-center justify-center py-12 gap-2 sm:gap-3">
            <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-[#ff7e5f]" />
            <span className="text-sm md:text-base text-[#3d3436] font-medium">Loading documents...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-[#feb47b] border-2 border-[#b35340] rounded-xl p-6 md:p-12 text-center shadow-lg">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-[#ff7e5f]/20 flex items-center justify-center mx-auto mb-3 md:mb-4">
              <FileText className="w-6 h-6 md:w-8 md:h-8 text-[#ff7e5f]" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-[#3d3436] mb-2">No documents yet</h3>
            <p className="text-sm md:text-base text-[#3d3436]/70 mb-4 md:mb-6">
              Upload your first document to get started
            </p>
            <a
              href="/upload"
              className="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-[#ff7e5f] text-[#ffedea] rounded-lg hover:bg-[#ff9a76] transition-colors text-sm md:text-base font-semibold shadow-md"
            >
              <FileText className="w-4 h-4 md:w-5 md:h-5" />
              Upload Document
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Documents List */}
            <div className="space-y-3 md:space-y-4">
              {documents.map((doc) => (
                <button
                  key={doc.documentId}
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full text-left p-3 md:p-4 rounded-lg border-2 transition-all shadow-md ${
                    selectedDoc?.documentId === doc.documentId
                      ? 'border-[#ff7e5f] bg-[#feb47b]'
                      : 'border-[#b35340]/30 bg-[#ffedea] hover:border-[#b35340]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                      <div className={`p-1.5 md:p-2 rounded-lg shrink-0 ${
                        selectedDoc?.documentId === doc.documentId
                          ? 'bg-[#ff7e5f]/20'
                          : 'bg-[#feb47b]'
                      }`}>
                        <FileText className={`w-4 h-4 md:w-5 md:h-5 ${
                          selectedDoc?.documentId === doc.documentId
                            ? 'text-[#ff7e5f]'
                            : 'text-[#3d3436]'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <h3 className="font-semibold text-sm md:text-base text-[#3d3436] truncate">
                          {doc.filename}
                        </h3>
                        <p className="text-xs md:text-sm text-[#3d3436]/60 mt-1 break-words">
                          {(doc.size / 1024).toFixed(2)} KB •{' '}
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {doc.isPrivate ? (
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <Lock className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#3d3436]/10 flex items-center justify-center shrink-0">
                        <Unlock className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#3d3436]/60" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Access Control Panel */}
            <div>
              {selectedDoc ? (
                <AccessControlPanel
                  documentId={selectedDoc.documentId}
                  documentName={selectedDoc.filename}
                  owner={selectedDoc.owner}
                  allowedUsers={selectedDoc.allowedUsers || []}
                  isPublic={!selectedDoc.isPrivate}
                  policyId={selectedDoc.policyId}
                  onGrantAccess={handleGrantAccess}
                  onRevokeAccess={handleRevokeAccess}
                />
              ) : (
                <div className="bg-[#feb47b] border-2 border-[#b35340] rounded-xl p-6 md:p-8 text-center shadow-lg">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#ff7e5f]/20 flex items-center justify-center mx-auto mb-3 md:mb-4">
                    <Users className="w-5 h-5 md:w-6 md:h-6 text-[#ff7e5f]" />
                  </div>
                  <p className="text-sm md:text-base text-[#3d3436]/70 font-medium">
                    Select a document to manage access control
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

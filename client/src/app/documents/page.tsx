'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { FileText, Lock, Unlock, Users, ExternalLink, Loader2 } from 'lucide-react';
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
  const suiClient = useSuiClient();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [grantingAccess, setGrantingAccess] = useState(false);

  useEffect(() => {
    if (currentAccount) {
      loadDocuments();
    }
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
      <div className="min-h-screen bg-background pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 flex items-center gap-4">
            <Users className="w-6 h-6 text-blue-500" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Wallet Connection Required</h3>
              <p className="text-sm text-muted-foreground">
                Please connect your Sui wallet to view and manage your documents.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              My Documents
            </span>
          </h1>
          <p className="text-muted-foreground">
            Manage your uploaded documents and access control
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-muted-foreground">Loading documents...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No documents yet</h3>
            <p className="text-muted-foreground mb-6">
              Upload your first document to get started
            </p>
            <a
              href="/upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <FileText className="w-5 h-5" />
              Upload Document
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Documents List */}
            <div className="space-y-4">
              {documents.map((doc) => (
                <button
                  key={doc.documentId}
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedDoc?.documentId === doc.documentId
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-gray-700 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-100 truncate">
                          {doc.filename}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {(doc.size / 1024).toFixed(2)} KB •{' '}
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {doc.isPrivate ? (
                      <Lock className="w-5 h-5 text-green-400 flex-shrink-0" />
                    ) : (
                      <Unlock className="w-5 h-5 text-gray-400 flex-shrink-0" />
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
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
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

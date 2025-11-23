'use client';

import React, { useState } from 'react';
import { Lock, UserPlus, X, Copy, Check, ExternalLink } from 'lucide-react';

interface AccessControlPanelProps {
  documentId: string;
  documentName: string;
  owner: string;
  allowedUsers: string[];
  isPublic: boolean;
  policyId?: string;
  onGrantAccess?: (userAddress: string) => Promise<void>;
  onRevokeAccess?: (userAddress: string) => Promise<void>;
}

export function AccessControlPanel({
  documentId,
  documentName,
  owner,
  allowedUsers,
  isPublic,
  policyId,
  onGrantAccess,
  onRevokeAccess,
}: AccessControlPanelProps) {
  const [newUserAddress, setNewUserAddress] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleGrantAccess = async () => {
    if (!newUserAddress.trim() || !onGrantAccess) return;

    setIsGranting(true);
    try {
      await onGrantAccess(newUserAddress.trim());
      setNewUserAddress('');
    } catch (error) {
      console.error('Failed to grant access:', error);
    } finally {
      setIsGranting(false);
    }
  };

  const handleRevokeAccess = async (userAddress: string) => {
    if (!onRevokeAccess) return;

    if (confirm(`Are you sure you want to revoke access from ${userAddress}?`)) {
      try {
        await onRevokeAccess(userAddress);
      } catch (error) {
        console.error('Failed to revoke access:', error);
      }
    }
  };

  const copyShareableLink = () => {
    const link = `${window.location.origin}/document/${documentId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatAddress = (address: string) => {
    if (address.length < 16) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="bg-[#feb47b] border-2 border-[#b35340] rounded-lg p-6 space-y-6 shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-[#ff7e5f]/20 rounded-lg">
            <Lock className="w-5 h-5 text-[#ff7e5f]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#3d3436]">
              {documentName}
            </h3>
            <p className="text-sm text-[#3d3436]/70 mt-1">
              Owner: {formatAddress(owner)}
            </p>
            {policyId && (
              <p className="text-xs text-[#3d3436]/50 mt-1">
                Policy ID: {formatAddress(policyId)}
              </p>
            )}
          </div>
        </div>
        <span
          className={`px-3 py-1 text-xs font-medium rounded-full ${
            isPublic
              ? 'bg-[#ffedea] text-[#ff7e5f] border border-[#ff7e5f]/30'
              : 'bg-green-100 text-green-700 border border-green-200'
          }`}
        >
          {isPublic ? 'Public' : 'Private'}
        </span>
      </div>

      {/* Access Control Section */}
      {!isPublic && (
        <>
          <div className="border-t-2 border-[#b35340]/20 pt-6">
            <h4 className="text-sm font-medium text-[#3d3436] mb-4">
              Granted Access ({allowedUsers.length})
            </h4>

            {allowedUsers.length === 0 ? (
              <p className="text-sm text-[#3d3436]/60 italic">
                No users have been granted access yet
              </p>
            ) : (
              <div className="space-y-2">
                {allowedUsers.map((userAddress) => (
                  <div
                    key={userAddress}
                    className="flex items-center justify-between p-3 bg-[#ffedea] rounded-lg border border-[#b35340]/20"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm font-mono text-[#3d3436]">
                        {formatAddress(userAddress)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRevokeAccess(userAddress)}
                      className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                      title="Revoke access"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grant Access Form */}
          <div className="border-t-2 border-[#b35340]/20 pt-6">
            <h4 className="text-sm font-medium text-[#3d3436] mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#ff7e5f]" />
              Grant New Access
            </h4>

            <div className="flex gap-2">
              <input
                type="text"
                value={newUserAddress}
                onChange={(e) => setNewUserAddress(e.target.value)}
                placeholder="Enter Sui address (0x...)"
                className="flex-1 px-4 py-2 bg-[#ffedea] border-2 border-[#b35340]/30 rounded-lg text-sm text-[#3d3436] placeholder-[#3d3436]/50 focus:outline-none focus:ring-2 focus:ring-[#ff7e5f] focus:border-[#ff7e5f]"
                disabled={isGranting}
              />
              <button
                onClick={handleGrantAccess}
                disabled={!newUserAddress.trim() || isGranting}
                className="px-4 py-2 bg-[#ff7e5f] text-[#ffedea] rounded-lg text-sm font-medium hover:bg-[#ff9a76] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
              >
                {isGranting ? 'Granting...' : 'Grant'}
              </button>
            </div>

            <p className="text-xs text-[#3d3436]/60 mt-2">
              This will require a wallet signature to update the access policy on-chain
            </p>
          </div>
        </>
      )}

      {/* Shareable Link */}
      <div className="border-t-2 border-[#b35340]/20 pt-6">
        <button
          onClick={copyShareableLink}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#ffedea] border-2 border-[#b35340]/30 rounded-lg text-sm text-[#3d3436] hover:bg-[#feb47b] transition-colors font-medium"
        >
          {copiedLink ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              Link Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Shareable Link
            </>
          )}
        </button>

        {!isPublic && (
          <p className="text-xs text-[#3d3436]/60 mt-2 text-center">
            Only users with granted access can view this document
          </p>
        )}
      </div>

      {/* View on Explorer */}
      {policyId && (
        <div className="border-t-2 border-[#b35340]/20 pt-4">
          <a
            href={`https://suiscan.xyz/testnet/object/${policyId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-[#ff7e5f] hover:text-[#ff9a76] transition-colors font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            View Policy on Sui Explorer
          </a>
        </div>
      )}
    </div>
  );
}

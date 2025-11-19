/**
 * zkLogin Service for Sui Authentication
 * Implements zkLogin flow for user authentication
 */

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { generateNonce, generateRandomness, getZkLoginSignature, getExtendedEphemeralPublicKey } from '@mysten/sui/zklogin';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { ZKLOGIN_CONFIG } from '@/config/zklogin';
import { jwtToAddress } from '@mysten/zklogin';

export interface ZkLoginSession {
  ephemeralPrivateKey: string;
  ephemeralPublicKey: string;
  nonce: string;
  randomness: string;
  maxEpoch: number;
  provider: string;
}

export interface ZkLoginAccount {
  userAddr: string;
  provider: string;
  email?: string;
  name?: string;
  picture?: string;
}

export class ZkLoginService {
  private suiClient: SuiClient;

  constructor() {
    this.suiClient = new SuiClient({
      url: 'https://fullnode.testnet.sui.io:443',
    });
  }

  /**
   * Start zkLogin flow - generates ephemeral keypair and redirects to OAuth
   */
  async startLoginFlow(provider: 'google'): Promise<void> {
    try {
      // Generate ephemeral keypair
      const ephemeralKeyPair = new Ed25519Keypair();
      const ephemeralPrivateKey = ephemeralKeyPair.getSecretKey();
      const ephemeralPublicKey = ephemeralKeyPair.getPublicKey();

      // Get current epoch for maxEpoch calculation
      const { epoch } = await this.suiClient.getLatestSuiSystemState();
      const maxEpoch = Number(epoch) + ZKLOGIN_CONFIG.maxEpoch;

      // Generate randomness and nonce
      const randomness = generateRandomness();
      const nonce = generateNonce(
        ephemeralPublicKey,
        maxEpoch,
        randomness
      );

      // Store session data in sessionStorage (temporary, for OAuth callback)
      const session: ZkLoginSession = {
        ephemeralPrivateKey: ephemeralPrivateKey,
        ephemeralPublicKey: ephemeralPublicKey.toSuiPublicKey(),
        nonce,
        randomness,
        maxEpoch,
        provider,
      };

      sessionStorage.setItem('zklogin_session', JSON.stringify(session));

      // Build OAuth URL
      const providerConfig = ZKLOGIN_CONFIG.providers[provider];
      const params = new URLSearchParams({
        client_id: providerConfig.clientId,
        redirect_uri: ZKLOGIN_CONFIG.redirectUrl,
        response_type: providerConfig.responseType,
        scope: providerConfig.scope,
        nonce: nonce,
      });

      // Redirect to OAuth provider
      const authUrl = `${providerConfig.authUrl}?${params.toString()}`;
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to start zkLogin flow:', error);
      throw error;
    }
  }

  /**
   * Complete zkLogin flow - handles OAuth callback
   */
  async completeLoginFlow(jwt: string): Promise<ZkLoginAccount> {
    try {
      // Retrieve session data
      const sessionData = sessionStorage.getItem('zklogin_session');
      if (!sessionData) {
        throw new Error('No active zkLogin session found');
      }

      const session: ZkLoginSession = JSON.parse(sessionData);

      // Decode JWT to get user info (basic parsing, no verification needed for display)
      const jwtPayload = this.decodeJWT(jwt);

      // Generate user salt (for development, using a simple approach)
      // In production, this should be managed securely on the backend
      const salt = await this.getUserSalt(jwtPayload.sub);

      // Get zkLogin address
      const userAddr = await this.getZkLoginAddress(jwt, salt);

      // Store authentication data
      const account: ZkLoginAccount = {
        userAddr,
        provider: session.provider,
        email: jwtPayload.email,
        name: jwtPayload.name,
        picture: jwtPayload.picture,
      };

      // Store in localStorage for persistence
      localStorage.setItem('zklogin_account', JSON.stringify(account));
      localStorage.setItem('zklogin_jwt', jwt);
      localStorage.setItem('zklogin_salt', salt);

      // Keep session data in localStorage for transaction signing
      // (We need the ephemeral keypair to sign transactions)
      localStorage.setItem('zklogin_session', JSON.stringify(session));

      // Clear temporary session storage (we've moved it to localStorage)
      sessionStorage.removeItem('zklogin_session');

      return account;
    } catch (error) {
      console.error('Failed to complete zkLogin flow:', error);
      throw error;
    }
  }

  /**
   * Get current authenticated account
   */
  getCurrentAccount(): ZkLoginAccount | null {
    const accountData = localStorage.getItem('zklogin_account');
    if (!accountData) {
      return null;
    }

    try {
      return JSON.parse(accountData);
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getCurrentAccount() !== null;
  }

  /**
   * Logout user
   */
  logout(): void {
    localStorage.removeItem('zklogin_account');
    localStorage.removeItem('zklogin_jwt');
    localStorage.removeItem('zklogin_salt');
    localStorage.removeItem('zklogin_session');
    sessionStorage.removeItem('zklogin_session');
  }

  /**
   * Decode JWT (client-side only for display purposes)
   */
  private decodeJWT(jwt: string): any {
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = parts[1];
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64').toString('utf-8')
    );

    return decoded;
  }

  /**
   * Get user salt
   * In production, this should be fetched from a secure backend
   */
  private async getUserSalt(sub: string): Promise<string> {
    // For development: generate deterministic salt from subject
    // In production: fetch from secure backend or use user input
    const encoder = new TextEncoder();
    const data = encoder.encode(sub);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.slice(0, 32); // Use first 32 chars as salt
  }

  /**
   * Get zkLogin Sui address using proper zkLogin derivation
   */
  private async getZkLoginAddress(jwt: string, salt: string): Promise<string> {
    // Use the official zkLogin address derivation
    return jwtToAddress(jwt, salt);
  }

  /**
   * Get zkProof from Mysten's prover service
   */
  private async getZkProof(
    jwt: string,
    ephemeralPublicKey: string,
    maxEpoch: number,
    randomness: string,
    userSalt: string
  ): Promise<any> {
    const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(ephemeralPublicKey);

    const payload = {
      jwt,
      extendedEphemeralPublicKey,
      maxEpoch: maxEpoch.toString(),
      jwtRandomness: randomness,
      salt: userSalt,
      keyClaimName: 'sub',
    };

    console.log('Requesting zkProof from prover service...');

    const response = await fetch('https://prover-dev.mystenlabs.com/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Prover request failed: ${response.status} ${errorText}`);
    }

    const zkProof = await response.json();
    console.log('✓ zkProof received');
    return zkProof;
  }

  /**
   * Sign and execute transaction with full zkLogin signature
   * Uses zkProof from Mysten's prover service for proper zkLogin signatures
   */
  async signAndExecuteTransaction(transaction: Transaction): Promise<any> {
    try {
      // Get session data from localStorage (stored after login)
      const sessionData = localStorage.getItem('zklogin_session');
      if (!sessionData) {
        throw new Error('No active zkLogin session. Please login first.');
      }

      const session: ZkLoginSession = JSON.parse(sessionData);

      // Get JWT and salt
      const jwt = localStorage.getItem('zklogin_jwt');
      const salt = localStorage.getItem('zklogin_salt');

      if (!jwt || !salt) {
        throw new Error('Missing JWT or salt. Please login again.');
      }

      // Create ephemeral keypair from stored private key
      const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(
        session.ephemeralPrivateKey
      );

      console.log('Signing transaction with zkLogin...');

      // 1. Sign the transaction bytes with ephemeral keypair
      const transactionBytes = await transaction.build({
        client: this.suiClient,
      });

      const ephemeralSignature = await ephemeralKeyPair.signTransaction(transactionBytes);

      // 2. Get zkProof from Mysten's prover service
      const zkProof = await this.getZkProof(
        jwt,
        session.ephemeralPublicKey,
        session.maxEpoch,
        session.randomness,
        salt
      );

      // 3. Generate zkLogin address for verification
      const userAddr = jwtToAddress(jwt, salt);

      // 4. Create zkLogin signature
      const zkLoginSignature = getZkLoginSignature({
        inputs: {
          ...zkProof,
          addressSeed: salt,
        },
        maxEpoch: session.maxEpoch,
        userSignature: ephemeralSignature.signature,
      });

      console.log('✓ zkLogin signature created');

      // 5. Execute transaction with zkLogin signature
      const result = await this.suiClient.executeTransactionBlock({
        transactionBlock: transactionBytes,
        signature: zkLoginSignature,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      console.log('✓ Transaction executed successfully');
      return result;
    } catch (error) {
      console.error('Transaction signing failed:', error);
      throw error;
    }
  }

  /**
   * Estimate gas cost for transaction
   */
  async estimateGas(transaction: Transaction): Promise<number> {
    try {
      const dryRun = await this.suiClient.dryRunTransactionBlock({
        transactionBlock: await transaction.build({ client: this.suiClient }),
      });

      const gasUsed = dryRun.effects.gasUsed;
      const totalGas =
        parseInt(gasUsed.computationCost) +
        parseInt(gasUsed.storageCost) -
        parseInt(gasUsed.storageRebate);

      return totalGas;
    } catch (error) {
      console.error('Gas estimation failed:', error);
      return 10000000; // Default estimate: 0.01 SUI
    }
  }

  /**
   * Check if user has sufficient balance
   */
  async checkBalance(estimatedGas?: number): Promise<{
    hasBalance: boolean;
    balance: string;
    required?: string;
  }> {
    const account = this.getCurrentAccount();
    if (!account) {
      return { hasBalance: false, balance: '0' };
    }

    try {
      const balanceData = await this.suiClient.getBalance({
        owner: account.userAddr,
      });

      const balance = parseInt(balanceData.totalBalance);

      if (estimatedGas) {
        return {
          hasBalance: balance >= estimatedGas,
          balance: balanceData.totalBalance,
          required: estimatedGas.toString(),
        };
      }

      return {
        hasBalance: balance > 0,
        balance: balanceData.totalBalance,
      };
    } catch (error) {
      console.error('Balance check failed:', error);
      return { hasBalance: false, balance: '0' };
    }
  }
}

// Export singleton instance
export const zkLoginService = new ZkLoginService();

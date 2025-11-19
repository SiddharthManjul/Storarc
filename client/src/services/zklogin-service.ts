/**
 * zkLogin Service for Sui Authentication
 * Implements zkLogin flow for user authentication
 */

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { generateNonce, generateRandomness, getZkLoginSignature, getExtendedEphemeralPublicKey, jwtToAddress, genAddressSeed, toZkLoginPublicIdentifier } from '@mysten/sui/zklogin';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { ZKLOGIN_CONFIG } from '@/config/zklogin';

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
      const account = JSON.parse(accountData);

      // Validate that stored salt is valid (16 bytes)
      // If not, clear session to force re-login
      const salt = localStorage.getItem('zklogin_salt');
      if (salt && !this.isValidSalt(salt)) {
        console.warn('Invalid salt detected in session. Clearing session - please log in again.');
        this.logout();
        return null;
      }

      return account;
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

    // zkLogin requires salt to be exactly 16 bytes (128 bits)
    // Take only the first 16 bytes of the SHA-256 hash
    const salt16Bytes = hashArray.slice(0, 16);
    const saltHex = salt16Bytes.map(b => b.toString(16).padStart(2, '0')).join('');

    // Convert to BigInt and return as decimal string
    const saltBigInt = BigInt('0x' + saltHex);
    return saltBigInt.toString();
  }

  /**
   * Get zkLogin Sui address using proper zkLogin derivation
   */
  private async getZkLoginAddress(jwt: string, salt: string): Promise<string> {
    // Decode JWT to get claims
    const jwtPayload = this.decodeJWT(jwt);

    // Generate addressSeed from salt + JWT claims
    const addressSeed = genAddressSeed(
      BigInt(salt),
      'sub',
      jwtPayload.sub,
      jwtPayload.aud
    );

    // Convert addressSeed to zkLogin public identifier and then to Sui address
    // Note: Using default address format (not legacy)
    const zkLoginPublicIdentifier = toZkLoginPublicIdentifier(
      addressSeed,
      jwtPayload.iss
    );

    const address = zkLoginPublicIdentifier.toSuiAddress();
    console.log('Address derived from:', {
      salt,
      sub: jwtPayload.sub,
      aud: jwtPayload.aud,
      iss: jwtPayload.iss,
      addressSeed: addressSeed.toString(),
      finalAddress: address
    });

    return address;
  }

  /**
   * Get zkProof from Mysten's prover service
   */
  private async getZkProof(
    jwt: string,
    ephemeralPrivateKey: string,
    maxEpoch: number,
    randomness: string,
    userSalt: string
  ): Promise<any> {
    // Reconstruct keypair to get PublicKey object
    const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(ephemeralPrivateKey);
    const ephemeralPublicKey = ephemeralKeyPair.getPublicKey();
    const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(ephemeralPublicKey);

    const payload = {
      jwt,
      extendedEphemeralPublicKey,
      maxEpoch: maxEpoch.toString(),
      jwtRandomness: randomness,
      salt: userSalt,
      keyClaimName: 'sub',
    };

    console.log('=== Prover Service Request ===');
    console.log('Requesting zkProof from prover service...');
    console.log('Payload:', {
      jwt_length: jwt.length,
      jwt_first_50: jwt.substring(0, 50) + '...',
      extendedEphemeralPublicKey,
      maxEpoch: maxEpoch.toString(),
      jwtRandomness: randomness,
      salt: userSalt,
      keyClaimName: 'sub',
    });

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
   * Validate salt is 16 bytes (128 bits max value: 2^128 - 1)
   */
  private isValidSalt(salt: string): boolean {
    try {
      const saltBigInt = BigInt(salt);
      const maxValid = BigInt('340282366920938463463374607431768211455'); // 2^128 - 1
      return saltBigInt >= 0 && saltBigInt <= maxValid;
    } catch {
      return false;
    }
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

      // Validate salt - if invalid, force re-login (don't regenerate during signing)
      if (!this.isValidSalt(salt)) {
        this.logout();
        throw new Error('Invalid authentication session detected. Please log out and log back in.');
      }

      // Check if JWT has expired
      const jwtPayload = this.decodeJWT(jwt);
      const currentTime = Math.floor(Date.now() / 1000);

      console.log('JWT issued at (iat):', jwtPayload.iat, new Date(jwtPayload.iat * 1000));
      console.log('JWT expires at (exp):', jwtPayload.exp, new Date(jwtPayload.exp * 1000));
      console.log('Current time:', currentTime, new Date(currentTime * 1000));

      if (jwtPayload.exp && currentTime >= jwtPayload.exp) {
        console.error('❌ JWT has EXPIRED!');
        console.error(`JWT expired at ${new Date(jwtPayload.exp * 1000)}`);
        console.error(`Current time is ${new Date(currentTime * 1000)}`);
        this.logout();
        throw new Error('Your authentication token has expired. Please log out and log back in.');
      }

      console.log('✓ JWT is still valid');

      // Check if ephemeral keypair has expired
      const { epoch: currentEpoch } = await this.suiClient.getLatestSuiSystemState();
      const currentEpochNum = Number(currentEpoch);
      console.log('Current epoch:', currentEpochNum);
      console.log('Session maxEpoch:', session.maxEpoch);

      if (currentEpochNum >= session.maxEpoch) {
        console.error('❌ Ephemeral keypair has EXPIRED!');
        console.error(`Current epoch ${currentEpochNum} >= maxEpoch ${session.maxEpoch}`);
        this.logout();
        throw new Error('Your login session has expired. Please log out and log back in.');
      }

      console.log('✓ Ephemeral keypair is still valid');

      // Create ephemeral keypair from stored private key
      const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(
        session.ephemeralPrivateKey
      );

      // Debug: Check address derivation
      const derivedAddress = jwtToAddress(jwt, salt);
      const cachedAddress = this.getCurrentAccount()?.userAddr;

      console.log('=== zkLogin Transaction Signing Debug ===');
      console.log('Cached address (localStorage):', cachedAddress);
      console.log('Derived address (from JWT+salt):', derivedAddress);
      console.log('Salt:', salt);
      console.log('Salt is valid:', this.isValidSalt(salt));

      if (derivedAddress !== cachedAddress) {
        console.error('❌ ADDRESS MISMATCH DETECTED!');
        console.error('The cached address does not match the derived address.');
        console.error('This means the salt or JWT has changed since login.');
        this.logout();
        throw new Error('Address mismatch detected. Your session is invalid. Please log out and log back in.');
      }

      console.log('✓ Address verification passed');
      console.log('Signing transaction with zkLogin...');

      // 1. Sign the transaction bytes with ephemeral keypair
      const transactionBytes = await transaction.build({
        client: this.suiClient,
      });

      console.log('Transaction built successfully');
      console.log('Transaction sender:', transaction.getData().sender || '(not set - will use signature address)');

      const ephemeralSignature = await ephemeralKeyPair.signTransaction(transactionBytes);

      // 2. Get zkProof from Mysten's prover service
      const zkProof = await this.getZkProof(
        jwt,
        session.ephemeralPrivateKey,
        session.maxEpoch,
        session.randomness,
        salt
      );

      console.log('zkProof received from prover:', zkProof);

      // 3. Generate addressSeed (different from salt!)
      // addressSeed = genAddressSeed(salt, sub, aud)
      // Note: jwtPayload already decoded earlier for JWT validation
      console.log('JWT Payload for addressSeed generation:', {
        sub: jwtPayload.sub,
        aud: jwtPayload.aud,
        iss: jwtPayload.iss,
        nonce: jwtPayload.nonce,
      });

      // Verify nonce exists in JWT
      if (!jwtPayload.nonce) {
        console.error('❌ JWT is missing nonce!');
        console.error('The OAuth provider did not include the nonce in the JWT.');
        this.logout();
        throw new Error('Invalid JWT: missing nonce. Please log out and log back in.');
      }

      console.log('JWT nonce:', jwtPayload.nonce);
      console.log('Session nonce:', session.nonce);

      if (jwtPayload.nonce !== session.nonce) {
        console.error('❌ NONCE MISMATCH!');
        console.error('JWT nonce does not match session nonce');
        this.logout();
        throw new Error('Session mismatch: JWT nonce does not match. Please log out and log back in.');
      }

      console.log('✓ Nonce verification passed');

      const addressSeed = genAddressSeed(
        BigInt(salt),
        'sub',  // key claim name
        jwtPayload.sub,  // sub value from JWT
        jwtPayload.aud   // aud value from JWT
      ).toString();

      console.log('Generated addressSeed:', addressSeed);
      console.log('Salt (different from addressSeed):', salt);

      // Create zkLogin signature inputs
      const signatureInputs = {
        ...zkProof,
        addressSeed: addressSeed,
      };

      console.log('Signature inputs keys:', Object.keys(signatureInputs));
      console.log('maxEpoch:', session.maxEpoch);
      console.log('userSignature:', ephemeralSignature.signature);

      const zkLoginSignature = getZkLoginSignature({
        inputs: signatureInputs,
        maxEpoch: session.maxEpoch,
        userSignature: ephemeralSignature.signature,
      });

      console.log('✓ zkLogin signature created');
      console.log('zkLogin signature (first 100 chars):', zkLoginSignature.substring(0, 100));
      console.log('zkLogin signature length:', zkLoginSignature.length);

      // Verify the signature will derive to the correct address
      console.log('Expected transaction sender:', derivedAddress);

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

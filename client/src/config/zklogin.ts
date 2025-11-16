/**
 * zkLogin Configuration for Sui Testnet
 */

export const ZKLOGIN_CONFIG = {
  // OpenID Providers
  providers: {
    google: {
      name: 'Google',
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      scope: 'openid email profile',
      responseType: 'id_token',
    },
  },

  // Sui Network Configuration
  network: 'testnet' as const,

  // Prover Service (Mysten Labs testnet prover)
  proverUrl: 'https://prover-dev.mystenlabs.com/v1',

  // Salt Service (for development - in production, use secure backend)
  saltUrl: process.env.NEXT_PUBLIC_SALT_SERVICE_URL || '',

  // Redirect URI after OAuth
  redirectUrl: typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : process.env.NEXT_PUBLIC_REDIRECT_URL || 'http://localhost:3000/auth/callback',

  // Max epoch for ephemeral key (2 weeks in epochs, ~1 epoch = 24 hours)
  maxEpoch: 2,
};

/**
 * Validate zkLogin configuration
 */
export function validateZkLoginConfig(): boolean {
  const { providers } = ZKLOGIN_CONFIG;

  if (!providers.google.clientId) {
    console.warn('⚠️  Google Client ID not configured for zkLogin');
    return false;
  }

  return true;
}

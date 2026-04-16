/**
 * Vault Service - Securely retrieve system secrets from Supabase Vault
 * 
 * This service provides cached access to system-level API keys stored in Supabase Vault.
 * Secrets are encrypted at rest and only decrypted when accessed.
 * 
 * The cache is in-memory only and cleared on app restart for security.
 */

import { supabase } from '@/integrations/supabase/client';

// In-memory cache for secrets (cleared on app restart)
const secretsCache: Record<string, { value: string; timestamp: number }> = {};

// Cache TTL: 1 hour (secrets don't change often, but we want to pick up updates eventually)
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Generic function to fetch a secret from Vault with caching
 */
async function getVaultSecret(
  rpcFunctionName: string,
  cacheKey: string
): Promise<string | null> {
  try {
    // Check cache first
    const cached = secretsCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`[Vault] Using cached ${cacheKey}`);
      return cached.value;
    }

    // Fetch from Vault via RPC
    console.log(`[Vault] Fetching ${cacheKey} from Vault...`);
    const { data, error } = await supabase.rpc(rpcFunctionName);

    if (error) {
      console.error(`[Vault] Error fetching ${cacheKey}:`, error);
      return null;
    }

    if (!data) {
      console.warn(`[Vault] No ${cacheKey} found in Vault`);
      return null;
    }

    // Cache the result
    secretsCache[cacheKey] = {
      value: data,
      timestamp: Date.now(),
    };

    console.log(`[Vault] Successfully fetched and cached ${cacheKey}`);
    return data;
  } catch (error) {
    console.error(`[Vault] Exception fetching ${cacheKey}:`, error);
    return null;
  }
}

/**
 * Get system YouTube API key from Vault
 * Used for fetching video metadata when user hasn't provided their own key
 */
export async function getSystemYouTubeApiKey(): Promise<string | null> {
  return getVaultSecret('get_system_youtube_api_key', 'youtube_api_key');
}

/**
 * Get system Gemini API key from Vault
 * Used for AI summarization when user hasn't provided their own key
 */
export async function getSystemGeminiApiKey(): Promise<string | null> {
  return getVaultSecret('get_system_gemini_api_key', 'gemini_api_key');
}

/**
 * Get system Dropbox app key from Vault
 * Used for OAuth integration
 */
export async function getSystemDropboxAppKey(): Promise<string | null> {
  return getVaultSecret('get_system_dropbox_app_key', 'dropbox_app_key');
}

/**
 * Get system Dropbox app secret from Vault
 * Used for OAuth integration
 */
export async function getSystemDropboxAppSecret(): Promise<string | null> {
  return getVaultSecret('get_system_dropbox_app_secret', 'dropbox_app_secret');
}

/**
 * Clear the secrets cache (useful for testing or forcing a refresh)
 */
export function clearSecretsCache(): void {
  Object.keys(secretsCache).forEach(key => delete secretsCache[key]);
  console.log('[Vault] Secrets cache cleared');
}

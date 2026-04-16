import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Handles OAuth callback for Electron apps using HashRouter.
 * 
 * Problem: When Supabase redirects after OAuth, it returns with hash fragments like:
 * #access_token=...&refresh_token=...
 * 
 * But HashRouter treats everything after # as a route, causing a 404.
 * 
 * Solution: This component detects OAuth callback hash fragments, extracts them,
 * passes them to Supabase for session establishment, then navigates to dashboard.
 */
export const OAuthCallbackHandler = () => {
  const navigate = useNavigate();
  const processingRef = useRef(false);

  useEffect(() => {
    // Only run once
    if (processingRef.current) return;
    
    const handleOAuthCallback = async () => {
      const hash = window.location.hash;
      
      // Check if this is an OAuth callback (contains access_token)
      if (!hash || !hash.includes('access_token=')) {
        return;
      }

      console.log('[OAuthCallback] Detected OAuth callback hash fragment');
      processingRef.current = true;

      try {
        // Parse the hash fragment (remove leading # or #/)
        const hashParams = new URLSearchParams(
          hash.replace(/^#\/?/, '').split('&').join('&')
        );

        // Extract OAuth parameters
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');
        const expires_in = hashParams.get('expires_in');
        const token_type = hashParams.get('token_type');

        if (!access_token || !refresh_token) {
          console.error('[OAuthCallback] Missing required OAuth parameters');
          navigate('/auth');
          return;
        }

        console.log('[OAuthCallback] Setting session from OAuth tokens');

        // Set the session using Supabase (it will handle token storage)
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          console.error('[OAuthCallback] Error setting session:', error);
          navigate('/auth');
          return;
        }

        if (data.session) {
          console.log('[OAuthCallback] Session established successfully');
          // Clean up the hash and navigate to dashboard
          window.history.replaceState(null, '', window.location.pathname);
          navigate('/dashboard');
        } else {
          console.error('[OAuthCallback] No session returned');
          navigate('/auth');
        }
      } catch (error) {
        console.error('[OAuthCallback] Error processing OAuth callback:', error);
        navigate('/auth');
      }
    };

    handleOAuthCallback();
  }, [navigate]);

  return null; // This is a utility component, renders nothing
};

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Authentication middleware for API routes
 * Checks if user is authenticated and returns user data
 * @param {Function} handler - The API route handler function
 * @returns {Function} Wrapped handler with authentication
 */
export function withAuth(handler) {
  return async (request, context) => {
    try {
      const supabase = await createClient();
      
      // Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      // Add user to context for the handler
      const enhancedContext = {
        ...context,
        user,
        supabase
      };
      
      return await handler(request, enhancedContext);
      
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      );
    }
  };
}

/**
 * Get authenticated user and supabase client
 * Use this in API routes that need authentication
 * @returns {Promise<{user: Object, supabase: Object}>}
 * @throws {Response} 401 response if not authenticated
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    // Return null for unauthenticated users - let the caller handle the response
    return null;
  }
  
  return { user, supabase };
}
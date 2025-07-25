import { createClient } from '@/utils/supabase/server';

/**
 * Validates if the current user has admin privileges
 * @returns {Promise<{user: object|null, isAdmin: boolean, error: string|null}>}
 */
export async function validateAdminAuth() {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { user: null, isAdmin: false, error: 'Unauthorized' };
    }

    // Check admin environment variable
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    if (adminEmails.length === 0) {
      console.warn('⚠️ ADMIN_EMAILS environment variable not set. Admin routes disabled.');
      return { user, isAdmin: false, error: 'Admin access not configured' };
    }

    // Check if user email is in admin list
    const isAdmin = adminEmails.includes(user.email);
    if (!isAdmin) {
      console.warn(`🚫 Admin access denied for user: ${user.email}`);
      return { user, isAdmin: false, error: 'Admin access denied' };
    }

    return { user, isAdmin: true, error: null };
  } catch (error) {
    console.error('Error validating admin auth:', error);
    return { user: null, isAdmin: false, error: 'Authentication error' };
  }
}

/**
 * Middleware function to protect admin routes
 * @param {Request} request - The request object
 * @returns {Promise<Response|null>} Response if unauthorized, null if authorized
 */
export async function requireAdmin(request) {
  const { user, isAdmin, error } = await validateAdminAuth();
  
  if (!isAdmin) {
    return Response.json(
      { 
        status: 'error',
        error: error || 'Admin access required'
      },
      { status: 403 }
    );
  }
  
  return null; // Authorized
}
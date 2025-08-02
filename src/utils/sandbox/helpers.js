/**
 * Shared utilities for sandbox operations
 */

/**
 * Finds a project with associated sandbox for a given user
 * @param {Object} supabase - Supabase client instance
 * @param {string} id - Project ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Project with sandbox
 * @throws {Error} If project not found or no sandbox associated
 */
export const findProjectWithSandbox = async (supabase, id, userId) => {
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', parseInt(id))
    .eq('user_id', userId)
    .single();

  if (error || !project) {
    throw new Error('Project not found');
  }
  
  if (!project.sandbox_id) {
    throw new Error('No sandbox associated with this project');
  }
  
  return project;
};
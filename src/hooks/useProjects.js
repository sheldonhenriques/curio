import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { filterProjects } from '@/utils/projectFilters';
import { useSocket } from './useSocket';

export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingProjects, setDeletingProjects] = useState(new Set());
  const pollingIntervalRef = useRef(null);

  // Initialize Socket.IO connection
  const { isConnected, onProjectUpdate } = useSocket();
  console.log('🔌 useProjects - Socket.IO connected:', isConnected);

  // Handle real-time project updates via Socket.IO
  const handleProjectUpdate = useCallback((projectId, status, data) => {
    setProjects(prevProjects => 
      prevProjects.map(project => 
        project.id === parseInt(projectId)
          ? { 
              ...project, 
              sandboxStatus: status, 
              updated_at: new Date().toISOString(),
              previewUrl: data?.previewUrl || project.previewUrl
            }
          : project
      )
    );
  }, []);

  // Connect to Socket.IO for real-time updates
  useEffect(() => {
    const unsubscribe = onProjectUpdate(handleProjectUpdate);
    return unsubscribe;
  }, [onProjectUpdate, handleProjectUpdate]);

  // Webhook-enhanced project loading with minimal polling
  const refreshWithWebhook = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      
      // Get latest project data
      const response = await fetch('/api/projects', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const data = await response.json();
      let updatedProjects = [...data];
      const projectsWithSandboxes = data.filter(p => p.sandboxId);
      
      // Use webhook to get live sandbox statuses, but only for projects with "started" database status
      const projectsNeedingLiveStatus = projectsWithSandboxes.filter(p => p.sandboxStatus === 'started');
      
      if (projectsNeedingLiveStatus.length > 0) {
        try {
          const webhookResponse = await fetch('/api/webhook/sandbox-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              type: 'selective-batch-status',
              projectIds: projectsNeedingLiveStatus.map(p => p.id)
            })
          });

          if (webhookResponse.ok) {
            const webhookData = await webhookResponse.json();
            
            if (webhookData.success && webhookData.statuses) {
              // Update projects with live Daytona status, but only for projects that were "started" in DB
              updatedProjects = data.map(project => {
                // Only update if project was "started" in database and we have live status
                if (project.sandboxStatus === 'started') {
                  const liveStatus = webhookData.statuses[project.id];
                  if (liveStatus) {
                    return {
                      ...project,
                      sandboxStatus: liveStatus.status,
                      previewUrl: liveStatus.previewUrl || project.previewUrl
                    };
                  }
                }
                // For all other statuses (creating, failed, stopped, etc.), use database status
                return project;
              });
            }
          } else {
            console.warn('Webhook unavailable, using database status for all projects');
          }
        } catch (webhookError) {
          console.warn('Webhook failed, using database status for all projects:', webhookError.message);
        }
      }
      
      // Filter out projects being deleted and update with live status data
      const filteredProjects = updatedProjects.filter(project => !deletingProjects.has(project.id));
      setProjects(filteredProjects);
      
      if (showLoading) setError(null);
    } catch (error) {
      console.error('Error refreshing projects:', error);
      if (showLoading) setError(error.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [deletingProjects]);

  const fetchProjects = useCallback(async () => {
    await refreshWithWebhook(true);
  }, [refreshWithWebhook]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // No polling - Socket.IO handles real-time updates
  useEffect(() => {
    // Clean up any existing polling intervals
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  const filteredProjects = useMemo(() => {
    return filterProjects(projects, activeTab, searchTerm);
  }, [projects, activeTab, searchTerm]);

  const handleToggleStar = async (projectId) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const updatedProject = { ...project, starred: !project.starred };
      
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedProject),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      setProjects(prevProjects => 
        prevProjects.map(p => 
          p.id === projectId 
            ? { ...p, starred: !p.starred }
            : p
        )
      );
    } catch (err) {
      console.error('Error toggling star:', err);
    }
  };

  const handleCreateProject = async (projectData) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const newProject = await response.json();
      setProjects(prevProjects => [newProject, ...prevProjects]);
      return newProject;
    } catch (err) {
      console.error('Error creating project:', err);
      throw err;
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      // Mark project as being deleted
      setDeletingProjects(prev => new Set([...prev, projectId]));
      
      // Immediately remove from UI
      setProjects(prevProjects => 
        prevProjects.filter(p => p.id !== projectId)
      );

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        // If deletion failed, remove from deleting set and restore project
        setDeletingProjects(prev => {
          const newSet = new Set(prev);
          newSet.delete(projectId);
          return newSet;
        });
        
        // Re-fetch projects to restore the project in UI
        await fetchProjects();
        
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete project');
      }

      const result = await response.json();
      

      // Remove from deleting set after successful deletion
      setDeletingProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });

      return result;
    } catch (err) {
      console.error('Error deleting project:', err);
      throw err;
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  return {
    projects: filteredProjects,
    loading,
    error,
    activeTab,
    setActiveTab,
    searchTerm,
    handleSearchChange,
    handleToggleStar,
    handleCreateProject,
    handleDeleteProject,
    refreshProjects: fetchProjects,
    refreshWithWebhook: () => refreshWithWebhook(false)
  };
};
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { filterProjects } from '@/utils/projectFilters';

export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingProjects, setDeletingProjects] = useState(new Set());
  const pollingIntervalRef = useRef(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      
      // For projects with sandboxId but static status, clear the status to show "Checking..."
      const processedData = data.map(project => {
        if (project.sandboxId && (project.sandboxStatus === 'created' || project.sandboxStatus === 'failed')) {
          return { ...project, sandboxStatus: null };
        }
        return project;
      }).filter(project => !deletingProjects.has(project.id)); // Filter out projects being deleted
      
      setProjects(processedData);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  }, [deletingProjects]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Polling effect for projects with 'creating' status
  useEffect(() => {
    const projectsWithCreatingStatus = projects.filter(p => p.sandboxStatus === 'creating');
    const projectsWithSandboxId = projects.filter(p => p.sandboxId);
    
    const shouldPoll = projectsWithCreatingStatus.length > 0 || projectsWithSandboxId.length > 0;
    
    if (shouldPoll) {
      // Start polling if not already active
      if (!pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(async () => {
          try {
            const response = await fetch('/api/projects', {
              credentials: 'include'
            });
            if (response.ok) {
              const data = await response.json();
              
              // Only check Daytona API status for projects with "started" database status
              const updatedProjects = [...data];
              for (const project of data.filter(p => p.sandboxId && p.sandboxStatus === 'started')) {
                try {
                  const statusResponse = await fetch(`/api/projects/${project.id}/sandbox/status`, {
                    credentials: 'include'
                  });
                  if (statusResponse.ok) {
                    const statusData = await statusResponse.json();
                    
                    // Update the project's sandbox status with live Daytona status
                    const projectIndex = updatedProjects.findIndex(p => p.id === project.id);
                    if (projectIndex !== -1) {
                      updatedProjects[projectIndex].sandboxStatus = statusData.status;
                      if (statusData.previewUrl) {
                        updatedProjects[projectIndex].previewUrl = statusData.previewUrl;
                      }
                    }
                  }
                } catch (error) {
                  console.error(`Error checking sandbox status for project ${project.id}:`, error);
                }
              }
              
              // Filter out projects being deleted and update projects with live status data
              const filteredProjects = updatedProjects.filter(project => !deletingProjects.has(project.id));
              setProjects(filteredProjects);
              
              // Check if we should stop polling (only stop if no creating projects)
              const stillCreating = data.filter(p => p.sandboxStatus === 'creating');
              if (stillCreating.length === 0 && projectsWithCreatingStatus.length > 0) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
            } else {
              console.error('API request failed:', response.status, response.statusText);
            }
          } catch (error) {
            console.error('Error polling for project updates:', error);
          }
        }, 5000); // Poll every 5 seconds for better debugging
      }
    } else {
      // Stop polling if no projects are creating
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [projects, deletingProjects]);

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
    refreshProjects: fetchProjects
  };
};
import { useState, useMemo, useEffect, useRef } from 'react';
import { filterProjects } from '@/utils/projectFilters';

export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const pollingIntervalRef = useRef(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Polling effect for projects with 'creating' status
  useEffect(() => {
    const projectsWithCreatingStatus = projects.filter(p => p.sandboxStatus === 'creating');
    const projectsWithSandboxId = projects.filter(p => p.sandboxId);
    
    console.log('🔄 Polling check - All projects:', projects.length);
    console.log('🔄 Projects with creating status:', projectsWithCreatingStatus.length);
    console.log('🔄 Projects with sandboxId:', projectsWithSandboxId.length);
    console.log('🔄 Current polling interval exists:', !!pollingIntervalRef.current);
    
    // For debugging: poll if ANY projects have sandboxId (not just creating)
    const shouldPoll = projectsWithCreatingStatus.length > 0 || projectsWithSandboxId.length > 0;
    
    if (shouldPoll) {
      // Start polling if not already active
      if (!pollingIntervalRef.current) {
        console.log('🚀 Starting polling for sandbox creation updates...');
        pollingIntervalRef.current = setInterval(async () => {
          console.log('📡 Polling for project updates...');
          try {
            const response = await fetch('/api/projects');
            console.log('📡 API Response status:', response.status);
            if (response.ok) {
              const data = await response.json();
              console.log('📊 Received project data:', data.map(p => ({ 
                id: p.id, 
                title: p.title, 
                sandboxStatus: p.sandboxStatus,
                sandboxId: p.sandboxId 
              })));
              setProjects(data);
              
              // Also check individual sandbox statuses via Daytona SDK
              for (const project of data.filter(p => p.sandboxId)) {
                try {
                  console.log(`🔍 Checking sandbox status for project ${project.id}...`);
                  const statusResponse = await fetch(`/api/projects/${project.id}/sandbox/status`);
                  console.log(`📡 Sandbox status API response for project ${project.id}:`, statusResponse.status);
                  if (statusResponse.ok) {
                    const statusData = await statusResponse.json();
                    console.log(`📊 Live sandbox status for project ${project.id}:`, statusData);
                  }
                } catch (error) {
                  console.error(`❌ Error checking sandbox status for project ${project.id}:`, error);
                }
              }
              
              // Check if we should stop polling (only stop if no creating projects)
              const stillCreating = data.filter(p => p.sandboxStatus === 'creating');
              if (stillCreating.length === 0 && projectsWithCreatingStatus.length > 0) {
                console.log('✅ No more projects creating, stopping polling');
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
            } else {
              console.error('❌ API request failed:', response.status, response.statusText);
            }
          } catch (error) {
            console.error('❌ Error polling for project updates:', error);
          }
        }, 5000); // Poll every 5 seconds for better debugging
      }
    } else {
      // Stop polling if no projects are creating
      if (pollingIntervalRef.current) {
        console.log('🛑 Stopping polling - no projects requiring polling');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [projects]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        console.log('🧹 Cleaning up polling interval on unmount');
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
    refreshProjects: fetchProjects
  };
};
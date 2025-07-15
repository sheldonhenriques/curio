import { useState, useMemo, useEffect } from 'react';
import { filterProjects } from '@/utils/projectFilters';

export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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
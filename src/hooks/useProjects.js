import { useState, useMemo } from 'react';
import { projectsData } from '@/data/projects';
import { filterProjects } from '@/utils/projectFilters';

export const useProjects = () => {
  const [projects, setProjects] = useState(projectsData);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProjects = useMemo(() => {
    return filterProjects(projects, activeTab, searchTerm);
  }, [projects, activeTab, searchTerm]);

  const handleToggleStar = (projectId) => {
    setProjects(prevProjects => 
      prevProjects.map(project => 
        project.id === projectId 
          ? { ...project, starred: !project.starred }
          : project
      )
    );
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  return {
    projects: filteredProjects,
    activeTab,
    setActiveTab,
    searchTerm,
    handleSearchChange,
    handleToggleStar
  };
};
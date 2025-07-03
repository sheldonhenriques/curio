// app/projects/page.js
'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { ProjectFilters } from '@/components/project/ProjectFilters';
import { ProjectGrid } from '@/components/project/ProjectGrid';
import { useProjects } from '@/hooks/useProjects';

const DashboardPage = () => {
  const {
    projects,
    activeTab,
    setActiveTab,
    searchTerm,
    handleSearchChange,
    handleToggleStar
  } = useProjects();

  const handleNewProject = () => {
    console.log('Create new project');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <Sidebar />
      
      <div className="ml-64 p-6">
        <ProjectHeader onNewProject={handleNewProject} />
        
        <ProjectFilters
          activeTab={activeTab}
          onTabChange={setActiveTab}
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
        />
        
        <ProjectGrid 
          projects={projects} 
          onToggleStar={handleToggleStar} 
        />
      </div>
    </div>
  );
};

export default DashboardPage;